#!/bin/bash
set -euo pipefail

# Blue-green deployment / rollback script for the StellarVeriphy frontend.
#
# Runs ON THE DEPLOY TARGET HOST (invoked over SSH by
# .github/workflows/deploy.yml). Assumes:
#   - Docker is installed and the invoking user can run `docker`.
#   - nginx is installed and reloadable via `nginx -s reload`
#     (or the equivalent — see NGINX_RELOAD_CMD below), proxying to
#     whichever of the two fixed host ports is currently "active".
#   - STATE_DIR is writable by the invoking user.
#
# Two named containers, "blue" and "green", alternate as the live version.
# A new deploy always starts the *inactive* color, health-checks it, and
# only then flips nginx + the state file to point at it — so a failed
# health check never touches live traffic (the "rollback" in that case is
# simply "never promoted," not an undo). `--rollback` flips traffic back to
# the previously active color without deploying anything new, for the case
# where a bad version was already promoted.
#
# Usage:
#   blue-green-deploy.sh deploy <image-ref>
#   blue-green-deploy.sh rollback
#
# Required environment variables:
#   BLUE_PORT    Host port for the "blue" container (default: 8081)
#   GREEN_PORT   Host port for the "green" container (default: 8082)
#   STATE_DIR    Where active_color is tracked (default: /opt/stellarveriphy)
#   HEALTH_TIMEOUT_SECONDS  Max time to wait for the new container to report healthy (default: 90)

BLUE_PORT="${BLUE_PORT:-8081}"
GREEN_PORT="${GREEN_PORT:-8082}"
STATE_DIR="${STATE_DIR:-/opt/stellarveriphy}"
STATE_FILE="$STATE_DIR/active_color"
NGINX_UPSTREAM_CONF="${NGINX_UPSTREAM_CONF:-/etc/nginx/conf.d/stellarveriphy_active_upstream.conf}"
NGINX_RELOAD_CMD="${NGINX_RELOAD_CMD:-nginx -s reload}"
HEALTH_TIMEOUT_SECONDS="${HEALTH_TIMEOUT_SECONDS:-90}"

mkdir -p "$STATE_DIR"

port_for() {
  if [[ "$1" == "blue" ]]; then echo "$BLUE_PORT"; else echo "$GREEN_PORT"; fi
}

other_color() {
  if [[ "$1" == "blue" ]]; then echo "green"; else echo "blue"; fi
}

current_color() {
  if [[ -f "$STATE_FILE" ]]; then cat "$STATE_FILE"; else echo "blue"; fi
}

write_upstream_conf() {
  local color="$1"
  local port
  port="$(port_for "$color")"
  cat > "$NGINX_UPSTREAM_CONF" <<EOF
# Managed by scripts/deploy/blue-green-deploy.sh — do not edit by hand.
upstream stellarveriphy_active {
    server 127.0.0.1:${port};
}
EOF
  $NGINX_RELOAD_CMD
}

wait_for_healthy() {
  local color="$1"
  local container="stellarveriphy-${color}"
  local waited=0
  echo "Waiting for ${container} to report healthy (timeout ${HEALTH_TIMEOUT_SECONDS}s)..."
  while (( waited < HEALTH_TIMEOUT_SECONDS )); do
    status="$(docker inspect --format='{{.State.Health.Status}}' "$container" 2>/dev/null || echo "starting")"
    if [[ "$status" == "healthy" ]]; then
      echo "${container} is healthy."
      return 0
    fi
    sleep 3
    waited=$((waited + 3))
  done
  echo "Timed out waiting for ${container} to become healthy (last status: ${status:-unknown})."
  return 1
}

cmd_deploy() {
  local image_ref="$1"
  local active target
  active="$(current_color)"
  target="$(other_color "$active")"
  local target_port
  target_port="$(port_for "$target")"

  echo "Active color: ${active}. Deploying ${image_ref} to inactive color: ${target} (port ${target_port})."

  docker pull "$image_ref"

  docker rm -f "stellarveriphy-${target}" >/dev/null 2>&1 || true
  docker run -d \
    --name "stellarveriphy-${target}" \
    --restart unless-stopped \
    -p "${target_port}:3000" \
    "$image_ref"

  if ! wait_for_healthy "$target"; then
    echo "Health check failed — leaving ${active} live, removing failed ${target} container. Deploy aborted (no traffic was switched)."
    docker rm -f "stellarveriphy-${target}" >/dev/null 2>&1 || true
    exit 1
  fi

  echo "Promoting ${target} to live traffic."
  write_upstream_conf "$target"
  echo "$target" > "$STATE_FILE"

  echo "Deploy successful. Live color is now: ${target} (image: ${image_ref})."
  echo "Previous color (${active}) is left running for fast rollback — stop it manually once you're confident, or it will be reused/replaced by the next deploy."
}

cmd_rollback() {
  local active previous
  active="$(current_color)"
  previous="$(other_color "$active")"

  if ! docker inspect "stellarveriphy-${previous}" >/dev/null 2>&1; then
    echo "Cannot roll back: previous color container (stellarveriphy-${previous}) is not running on this host."
    exit 1
  fi

  echo "Rolling back live traffic from ${active} to ${previous}."
  write_upstream_conf "$previous"
  echo "$previous" > "$STATE_FILE"
  echo "Rollback complete. Live color is now: ${previous}."
}

case "${1:-}" in
  deploy)
    [[ -n "${2:-}" ]] || { echo "Usage: $0 deploy <image-ref>"; exit 1; }
    cmd_deploy "$2"
    ;;
  rollback)
    cmd_rollback
    ;;
  *)
    echo "Usage: $0 deploy <image-ref> | rollback"
    exit 1
    ;;
esac
