# Logytics GitHub Action

AI-powered CI/CD failure analysis. Get instant root cause analysis, suggested fixes, and pattern detection for your GitHub Actions workflows.

## Quick Start

### 1. Get your API key

Sign up at [logytics.pro](https://logytics.pro) and create an API key in Settings.

### 2. Add the secret to your repository

Go to your GitHub repository → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

- **Name:** `LOGYTICS_API_KEY`
- **Value:** Your API key from Logytics

### 3. Add to your workflow

Add the Logytics action as a separate job that runs when other jobs fail:

```yaml
name: CI Pipeline

on:
  push:
    branches: [main]
  pull_request:

permissions:
  actions: read
  contents: read

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install dependencies
        run: npm install
      - name: Run tests
        run: npm test
      - name: Build
        run: npm run build

  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm install
      - run: npm run lint

  # Logytics analysis job - runs when any job fails
  analyze:
    runs-on: ubuntu-latest
    needs: [build, lint]
    if: failure()
    steps:
      - name: Analyze failures with Logytics
        uses: logytics-pro/action@v1
        with:
          logytics-api-key: ${{ secrets.LOGYTICS_API_KEY }}
```

That's it! When any job fails, Logytics will:
- Detect which steps failed
- Analyze the error logs with AI
- Provide root cause and suggested fixes
- Track patterns across your repos

## Features

- **Multi-Job Detection** - Automatically detects all failed steps across multiple jobs
- **AI Analysis** - GPT-powered root cause analysis and fix suggestions
- **Pattern Detection** - Identifies recurring failures across your repos
- **GitHub Summary** - See analysis directly in the Actions summary tab
- **Dashboard** - View all failures, trends, and insights at logytics.pro

## Configuration Options

### Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `logytics-api-key` | Your Logytics API key | Yes | - |
| `workflow-run-id` | Workflow run ID to analyze | No | Current run |
| `github-token` | Token for fetching logs | No | `github.token` |

### Outputs

| Output | Description |
|--------|-------------|
| `failure-id` | Unique ID of the recorded failure |
| `signature` | Error signature for pattern matching |
| `is-recurring` | `true` if this error has occurred before |
| `root-cause` | AI-generated root cause analysis |
| `suggested-fix` | AI-suggested fix with code example |

## Examples

### Basic Usage (Single Job)

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm test
      
      # Add at the end of your job
      - name: Analyze on failure
        if: failure()
        uses: logytics-pro/action@v1
        with:
          logytics-api-key: ${{ secrets.LOGYTICS_API_KEY }}
```

### Multiple Jobs (Recommended)

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm test

  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm run build

  deploy:
    runs-on: ubuntu-latest
    needs: [test, build]
    steps:
      - run: ./deploy.sh

  # Analyze all failures in one place
  analyze:
    runs-on: ubuntu-latest
    needs: [test, build, deploy]
    if: failure()
    steps:
      - uses: logytics-pro/action@v1
        with:
          logytics-api-key: ${{ secrets.LOGYTICS_API_KEY }}
```

### Using Outputs

```yaml
- name: Analyze failure
  id: logytics
  if: failure()
  uses: logytics-pro/action@v1
  with:
    logytics-api-key: ${{ secrets.LOGYTICS_API_KEY }}

- name: Comment on PR
  if: failure()
  uses: actions/github-script@v7
  with:
    script: |
      const rootCause = '${{ steps.logytics.outputs.root-cause }}';
      const fix = '${{ steps.logytics.outputs.suggested-fix }}';
      github.rest.issues.createComment({
        owner: context.repo.owner,
        repo: context.repo.repo,
        issue_number: context.issue.number,
        body: `## CI Failure Analysis\n\n**Root Cause:** ${rootCause}\n\n**Suggested Fix:** ${fix}`
      });
```

## Supported Error Types

Logytics can analyze many types of CI failures:

| Category | Examples |
|----------|----------|
| **JavaScript/Node** | TypeError, Module not found, npm errors |
| **Python** | ImportError, SyntaxError, pip errors |
| **Build** | Webpack, TypeScript, compilation errors |
| **Test** | Jest, pytest, test timeouts |
| **Infrastructure** | Terraform, CloudFormation, Docker |
| **Database** | Connection refused, migration errors |
| **Dependency** | Version conflicts, missing packages |

## Permissions

The action needs these permissions to fetch workflow logs:

```yaml
permissions:
  actions: read
  contents: read
```

## Support

- **Dashboard:** [logytics.pro](https://logytics.pro)
- **Issues:** [GitHub Issues](https://github.com/logytics-pro/action/issues)
- **Email:** support@logytics.pro

## License

MIT
