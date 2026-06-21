# SenseTheLog GitHub Action

AI-powered CI/CD failure analysis. Get instant root cause analysis, suggested fixes, and pattern detection for your GitHub Actions workflows.

## Quick Start

### 1. Get your API key

Sign up at [sensethelog.com](https://sensethelog.com) and create an API key in Settings.

### 2. Add the secret to your repository

Go to your GitHub repository → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

- **Name:** `SENSETHELOG_API_KEY`
- **Value:** Your API key from SenseTheLog

### 3. Add to your workflow

Add the SenseTheLog action as a separate job that runs when other jobs fail:

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

  # SenseTheLog analysis job - runs when any job fails
  analyze:
    runs-on: ubuntu-latest
    needs: [build, lint]
    if: failure()
    steps:
      - name: Analyze failures with SenseTheLog
        uses: sensethelog/action@v1
        with:
          sensethelog-api-key: ${{ secrets.SENSETHELOG_API_KEY }}
```

That's it! When any job fails, SenseTheLog will:
- Detect which steps failed
- Analyze the error logs with AI
- Provide root cause and suggested fixes
- Track patterns across your repos

## Features

- **Multi-Job Detection** - Automatically detects all failed steps across multiple jobs
- **AI Analysis** - GPT-powered root cause analysis and fix suggestions
- **Pattern Detection** - Identifies recurring failures across your repos
- **GitHub Summary** - See analysis directly in the Actions summary tab
- **Dashboard** - View all failures, trends, and insights at sensethelog.com

## Configuration Options

### Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `sensethelog-api-key` | Your SenseTheLog API key | Yes | - |
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
        uses: sensethelog/action@v1
        with:
          sensethelog-api-key: ${{ secrets.SENSETHELOG_API_KEY }}
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
      - uses: sensethelog/action@v1
        with:
          sensethelog-api-key: ${{ secrets.SENSETHELOG_API_KEY }}
```

### Using Outputs

```yaml
- name: Analyze failure
  id: sensethelog
  if: failure()
  uses: sensethelog/action@v1
  with:
    sensethelog-api-key: ${{ secrets.SENSETHELOG_API_KEY }}

- name: Comment on PR
  if: failure()
  uses: actions/github-script@v7
  with:
    script: |
      const rootCause = '${{ steps.sensethelog.outputs.root-cause }}';
      const fix = '${{ steps.sensethelog.outputs.suggested-fix }}';
      github.rest.issues.createComment({
        owner: context.repo.owner,
        repo: context.repo.repo,
        issue_number: context.issue.number,
        body: `## CI Failure Analysis\n\n**Root Cause:** ${rootCause}\n\n**Suggested Fix:** ${fix}`
      });
```

## Supported Error Types

SenseTheLog can analyze many types of CI failures:

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

- **Dashboard:** [sensethelog.com](https://sensethelog.com)
- **Issues:** [GitHub Issues](https://github.com/sensethelog/action/issues)
- **Email:** support@sensethelog.com

## License

MIT
