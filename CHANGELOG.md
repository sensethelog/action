# Changelog

## v1.0.0

Initial release of the Logytics GitHub Action.

### Features

- Automatically capture CI failure logs and send to Logytics Pro
- Extract error messages, stack traces, and failure context
- Support for all GitHub Actions workflow types
- Secure API key authentication
- Lightweight with minimal dependencies

### Usage

```yaml
- uses: logytics-pro/action@v1
  if: failure()
  with:
    logytics-api-key: ${{ secrets.LOGYTICS_API_KEY }}
```

### Requirements

- A Logytics Pro account and API key
- GitHub Actions workflow
