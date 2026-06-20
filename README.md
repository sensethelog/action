# Logytics Pro GitHub Action

Turn CI failures into actionable intelligence.

## Quick Start

Add this to your workflow file:

```yaml
- uses: logytics-pro/action@v1
  if: failure()
  with:
    logytics-api-key: ${{ secrets.LOGYTICS_API_KEY }}
```

No `continue-on-error` required on other steps. The action automatically detects which steps failed and includes them in the analysis summary.

## Features

- **Failed Step Detection**: Automatically identifies which steps failed in your workflow
- **Instant Analysis**: Get AI-powered root cause analysis within seconds
- **Pattern Detection**: Automatically detect recurring failures
- **Job Summary**: See failed steps and analysis directly in the GitHub Actions summary
- **Dashboard Integration**: View all failures in the Logytics Pro dashboard
- **Team Insights**: Share knowledge across your organization

## Inputs

| Input | Description | Required |
|-------|-------------|----------|
| `logytics-api-key` | Your Logytics Pro API key | Yes |
| `github-token` | GitHub token for fetching failed steps (auto-provided) | No |
| `api-url` | Custom API URL | No |
| `openai-api-key` | OpenAI key for free mode | No |

## Outputs

| Output | Description |
|--------|-------------|
| `failure-id` | The ID of the recorded failure |
| `signature` | The failure signature |
| `is-recurring` | Whether this is a recurring failure |
| `root-cause` | AI-generated root cause analysis |
| `suggested-fix` | AI-suggested fix |
| `failed-steps` | JSON array of failed steps with job/step names |

## Full Example

```yaml
name: CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      
      - run: npm ci
      - run: npm test
      
      - uses: logytics/action@v1
        if: failure()
        with:
          logytics-api-key: ${{ secrets.LOGYTICS_API_KEY }}
```

## Free Mode

If you don't have a Logytics Pro account, you can use your own OpenAI key:

```yaml
- uses: logytics/action@v1
  if: failure()
  with:
    openai-api-key: ${{ secrets.OPENAI_API_KEY }}
```

Note: Free mode provides analysis but doesn't store failures for pattern detection.

## Links

- [Logytics Pro Dashboard](https://logytics.dev)
- [Documentation](https://docs.logytics.dev)
- [API Reference](https://docs.logytics.dev/api)
