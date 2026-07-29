# Docker Quick Reference

Quick commands for working with Docker in the Stellar-Veriphy project.

## Prerequisites

```bash
# Check Docker installation
docker --version
docker compose version
```

## Quick Start

### Using Make (Recommended)

```bash
# Build and run production
make quick-start

# Build and run development
make quick-dev

# View all available commands
make help
```

### Using Docker Directly

```bash
# Build
docker build -t stellarveriphy:latest .

# Run
docker run -p 3000:3000 stellarveriphy:latest

# Access
open http://localhost:3000
```

### Using Docker Compose

```bash
# Start production
docker compose up

# Start development
docker compose --profile dev up dev
```

## Common Commands

### Build

```bash
# Production build
make build
# or
docker build -t stellarveriphy:latest .

# Development build
make build-dev
# or
docker build -f Dockerfile.dev -t stellarveriphy:dev .

# Build without cache
make build-no-cache
# or
docker build --no-cache -t stellarveriphy:latest .
```

### Run

```bash
# Run production (detached)
make run
# or
docker run -d -p 3000:3000 --name stellarveriphy-app stellarveriphy:latest

# Run production (foreground)
make run-fg
# or
docker run --rm -p 3000:3000 stellarveriphy:latest

# Run development
make dev
# or
docker compose --profile dev up dev
```

### Stop/Start

```bash
# Stop
make stop
# or
docker stop stellarveriphy-app

# Start
make start
# or
docker start stellarveriphy-app

# Restart
make restart
# or
docker restart stellarveriphy-app
```

### Logs

```bash
# View logs
make logs
# or
docker logs -f stellarveriphy-app

# View development logs
make logs-dev
# or
docker compose logs -f dev
```

### Shell Access

```bash
# Open shell in production container
make shell
# or
docker exec -it stellarveriphy-app sh

# Open shell in development container
make shell-dev
# or
docker compose exec dev sh
```

### Clean Up

```bash
# Remove container
make rm

# Remove container and image
make clean

# Remove all unused Docker resources
make prune
```

## Development Workflow

### Start Development Environment

```bash
# Option 1: Using Make
make dev

# Option 2: Using Docker Compose
docker compose --profile dev up dev

# Option 3: Build and start
make dev-build
```

### Run Tests

```bash
# Frontend tests
make test
# or
docker compose exec dev pnpm --filter frontend test

# Contract tests
make test-contracts
# or
docker compose exec dev sh -c "cd contracts/oracle && cargo test"
```

### Build Contracts

```bash
# Build all contracts
make build-contracts
# or
docker compose exec dev pnpm build:contracts

# Build specific contract
docker compose exec dev sh -c "cd contracts/oracle && cargo build --target wasm32-unknown-unknown --release"
```

### Lint Code

```bash
# Lint frontend
make lint
# or
docker compose exec dev pnpm --filter frontend lint
```

## Docker Compose Commands

### Start Services

```bash
# Start all services
docker compose up

# Start in background
docker compose up -d

# Start specific service
docker compose up app

# Start with rebuild
docker compose up --build
```

### Stop Services

```bash
# Stop all services
docker compose down

# Stop and remove volumes
docker compose down -v

# Stop specific service
docker compose stop app
```

### View Status

```bash
# List running services
docker compose ps

# View logs
docker compose logs -f

# View logs for specific service
docker compose logs -f app
```

### Execute Commands

```bash
# Run command in service
docker compose exec app sh

# Run one-off command
docker compose run --rm app pnpm --version
```

## Environment Variables

### Set via Command Line

```bash
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_NETWORK=testnet \
  -e NEXT_PUBLIC_ORACLE_CONTRACT_ID=CXXXXXXX \
  stellarveriphy:latest
```

### Set via .env File

```bash
# Create .env file
cat > .env << EOF
NEXT_PUBLIC_NETWORK=testnet
NEXT_PUBLIC_ORACLE_CONTRACT_ID=
NEXT_PUBLIC_PROVENANCE_CONTRACT_ID=
NEXT_PUBLIC_REGISTRY_CONTRACT_ID=
EOF

# Use with Docker Compose
docker compose up
```

### Set via --env-file

```bash
docker run -p 3000:3000 --env-file .env.docker stellarveriphy:latest
```

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker logs stellarveriphy-app

# Check if port is in use
lsof -i :3000

# Use different port
docker run -p 3001:3000 stellarveriphy:latest
```

### Build Fails

```bash
# Clear build cache
docker builder prune -a

# Rebuild without cache
docker build --no-cache -t stellarveriphy:latest .
```

### Changes Not Reflected (Dev)

```bash
# Restart development container
docker compose restart dev

# Rebuild development container
docker compose up --build dev
```

### Check Container Health

```bash
# View health status
make health
# or
docker inspect stellarveriphy-app --format='{{.State.Health.Status}}'

# View health check logs
docker inspect stellarveriphy-app --format='{{json .State.Health}}' | jq
```

## Advanced Commands

### Multi-platform Build

```bash
# Create builder
docker buildx create --name multiplatform --use

# Build for multiple platforms
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t stellarveriphy:latest \
  .
```

### Push to Registry

```bash
# Tag for registry
docker tag stellarveriphy:latest ghcr.io/your-org/stellarveriphy:latest

# Login
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin

# Push
docker push ghcr.io/your-org/stellarveriphy:latest
```

### Export/Import Image

```bash
# Save to tar
make save
# or
docker save stellarveriphy:latest -o stellarveriphy.tar

# Load from tar
make load
# or
docker load -i stellarveriphy.tar
```

### Resource Limits

```bash
# Limit CPU and memory
docker run -p 3000:3000 \
  --cpus=2 \
  --memory=2g \
  stellarveriphy:latest
```

## Useful Aliases

Add to your `~/.bashrc` or `~/.zshrc`:

```bash
# Stellar-Veriphy Docker aliases
alias sv-build='make build'
alias sv-run='make run'
alias sv-dev='make dev'
alias sv-logs='make logs'
alias sv-shell='make shell'
alias sv-stop='make stop'
alias sv-clean='make clean'
alias sv-test='make test'
```

## Makefile Targets

View all available Make targets:

```bash
make help
```

Common targets:
- `make build` - Build production image
- `make run` - Run production container
- `make dev` - Run development container
- `make test` - Run tests
- `make logs` - View logs
- `make shell` - Open shell
- `make clean` - Clean up
- `make help` - Show all targets

## CI/CD Integration

### GitHub Actions Example

```yaml
- name: Build Docker image
  run: make ci-build

- name: Run tests
  run: make ci-test

- name: Push to registry
  run: make push
```

## Performance Tips

1. **Use BuildKit**: `DOCKER_BUILDKIT=1 docker build ...`
2. **Layer Caching**: Order Dockerfile commands from least to most frequently changed
3. **Multi-stage Builds**: Separate build and runtime stages
4. **Prune Regularly**: `docker system prune -af`
5. **Increase Resources**: Docker Desktop → Settings → Resources

## Related Documentation

- [DOCKER.md](../DOCKER.md) - Comprehensive Docker guide
- [CONTRIBUTING.md](../CONTRIBUTING.md) - Development setup
- [Makefile](../Makefile) - All available Make targets

---

**Quick Help**: Run `make help` to see all available commands!
