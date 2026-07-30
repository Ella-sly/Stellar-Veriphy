# CI Status Badge

Add this badge to your README.md to display the CI status:

## Markdown Badge

```markdown
[![CI](https://github.com/your-org/Stellar-Veriphy/actions/workflows/ci.yml/badge.svg)](https://github.com/your-org/Stellar-Veriphy/actions/workflows/ci.yml)
```

## HTML Badge (for more control)

```html
<a href="https://github.com/your-org/Stellar-Veriphy/actions/workflows/ci.yml">
  <img src="https://github.com/your-org/Stellar-Veriphy/actions/workflows/ci.yml/badge.svg" alt="CI Status">
</a>
```

## Badge with Branch Specification

To show status for a specific branch (e.g., main):

```markdown
[![CI](https://github.com/your-org/Stellar-Veriphy/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/your-org/Stellar-Veriphy/actions/workflows/ci.yml)
```

## Suggested Placement in README

Add the badge near the top of your README.md, typically after the title:

```markdown
# ⭐ StellarVeriphy — The Truth Engine for the Stellar Ecosystem

[![CI](https://github.com/your-org/Stellar-Veriphy/actions/workflows/ci.yml/badge.svg)](https://github.com/your-org/Stellar-Veriphy/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **Note:** This README is intentionally long and comprehensive...
```

## Multiple Badges Example

```markdown
# ⭐ StellarVeriphy

[![CI](https://github.com/your-org/Stellar-Veriphy/actions/workflows/ci.yml/badge.svg)](https://github.com/your-org/Stellar-Veriphy/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org/)
[![Rust Version](https://img.shields.io/badge/rust-stable-orange)](https://www.rust-lang.org/)
[![pnpm](https://img.shields.io/badge/pnpm-10.18.2-blue)](https://pnpm.io/)
```

## Badge States

The badge will automatically show different states:

- 🟢 **Passing**: All CI checks passed
- 🔴 **Failing**: One or more CI checks failed
- 🟡 **In Progress**: CI is currently running
- ⚪ **No Status**: No workflow runs yet

## Customization

Replace `your-org` with your GitHub organization or username:

```
https://github.com/YOUR_ORG_OR_USERNAME/Stellar-Veriphy/actions/workflows/ci.yml/badge.svg
```

## Additional Badges

You might also want to add:

### Code Coverage (if implemented)
```markdown
[![codecov](https://codecov.io/gh/your-org/Stellar-Veriphy/branch/main/graph/badge.svg)](https://codecov.io/gh/your-org/Stellar-Veriphy)
```

### Dependencies Status
```markdown
[![Dependencies](https://img.shields.io/librariesio/github/your-org/Stellar-Veriphy)](https://libraries.io/github/your-org/Stellar-Veriphy)
```

### Last Commit
```markdown
[![Last Commit](https://img.shields.io/github/last-commit/your-org/Stellar-Veriphy)](https://github.com/your-org/Stellar-Veriphy/commits/main)
```

### Contributors
```markdown
[![Contributors](https://img.shields.io/github/contributors/your-org/Stellar-Veriphy)](https://github.com/your-org/Stellar-Veriphy/graphs/contributors)
```

---

**Note**: Remember to replace `your-org` with your actual GitHub organization or username in all badge URLs!
