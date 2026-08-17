# Security Policy

## Reporting a vulnerability

Please report suspected security issues privately to the repository owner rather than opening a public issue containing exploit details, credentials, or personal financial information.

## Sensitive data

This repository must not contain API keys, access tokens, brokerage credentials, account identifiers, holdings, balances, local research records, diagnostic logs, or personal screenshots.

If sensitive data is accidentally committed, revoke or rotate the affected credential first, then remove it from the repository and its Git history.

## Local data

The application stores settings and personal data under Electron's local `userData` directory. That directory is not part of this repository. Back up and protect it according to the sensitivity of the configured integrations.


