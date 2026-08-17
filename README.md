# Individual Stock Dashboard

An Electron desktop application that brings company research, interactive market charts, earnings, financial statements, portfolio monitoring, macroeconomic indicators, and locally assisted analysis into one workspace.

This project was designed and developed as a personal research platform with an emphasis on source transparency, configurable data integrations, and persistent local workflows.

## Highlights

- Search and maintain ticker lists, watchlists, and custom stock categories.
- Explore interactive price and volume charts with candles, moving averages, RSI, support and resistance, earnings events, custom dates, and outstanding-share history.
- Review earnings history, forecasts, filings, company financial statements, analyst ratings, price targets, short interest, and short-squeeze signals.
- Monitor live IBKR shortable-share availability and borrow fees through a locally authenticated IB Gateway session.
- Connect brokerage accounts through SnapTrade for read-only portfolio and holdings views.
- Track macroeconomic releases, commodities, and configurable Google Trends topics.
- Generate company theses and evidence analysis through a local Ollama model.
- Maintain ticker-specific notes and local research history.
- Experiment with a social-arbitrage AI Agent prototype that scores and retains research candidates. This feature is not production-ready and should not be treated as a functioning investment signal.

## Architecture

```text
Electron main process
  |-- market-data adapters and normalization
  |-- local persistence in Electron userData
  |-- SnapTrade and IB Gateway integrations
  |-- Ollama requests and scheduled refreshes
  `-- constrained IPC handlers

Preload bridge
  `-- exposes an explicit API to the renderer

Renderer
  |-- dashboard, portfolio, macro, trends, and agent views
  |-- SVG-based interactive charts
  `-- local UI state and presentation
```

The application uses Electron context isolation and a narrow preload bridge instead of exposing Node.js directly to the renderer.

## Experimental AI Agent

The **AI Agent** section is an experimental prototype included to demonstrate local research automation, evidence collection, and candidate-scoring concepts. It is incomplete, may return unavailable or unreliable results, and is not presented as a functioning production feature. Its output should not be relied upon for investment decisions.

## Data integrations

The dashboard combines optional authenticated integrations with public data sources. Availability, entitlements, rate limits, and terms remain controlled by each provider.

Optional credentials entered through the application settings include:

- Finnhub — fast quotes and selected company-market data.
- Financial Modeling Prep — earnings, estimates, and supplemental fundamentals.
- Alpha Vantage — market and economic time series.
- YouTube Data API — public video discovery for research signals.
- SnapTrade — read-only connected-account and portfolio data.
- Interactive Brokers TWS API — local live quote, shortable-share, and borrow-fee data.

Other adapters use publicly accessible endpoints or pages from sources such as Yahoo Finance, SEC EDGAR, Nasdaq, FINRA, FRED, BLS, GDELT, Reddit, Google Trends, Google News, and company investor-relations sites.

No API keys, brokerage credentials, account numbers, holdings, balances, or personal research records are included in this repository.

## Getting started

### Requirements

- Node.js 20 or newer
- pnpm
- Windows for the packaged NSIS build

Optional services:

- [Ollama](https://ollama.com/) for local AI features
- IB Gateway or Trader Workstation for Interactive Brokers data
- Provider API credentials for integrations you choose to enable

### Install and run

```bash
pnpm install
pnpm start
```

Open **Settings** in the application to configure optional data providers. The dashboard remains usable with a reduced feature set when optional integrations are not configured.

### Run tests

```bash
pnpm test
```

### Build the Windows installer

```bash
pnpm dist
```

The installer is written to the ignored `release/` directory.

## Privacy and security

- Credentials and brokerage data are written to Electron's local `userData` directory, outside the source tree.
- Generated builds, backups, diagnostics, logs, screenshots, and runtime JSON files are excluded from version control.
- Brokerage credentials are entered only in the provider's secure connection flow; they are not collected by this repository.
- The IBKR integration connects to a user-authenticated local IB Gateway or Trader Workstation session.
- This public version contains no personal portfolio records or personal screenshots.

See [SECURITY.md](SECURITY.md) for responsible disclosure guidance.

## Project status

This is an actively developed portfolio project. External data providers can change endpoints, entitlements, schemas, or rate limits, so individual integrations may require maintenance over time.

## Author

Joey Fernandez  
[LinkedIn](https://www.linkedin.com/in/fernandezjoey)

## License

Licensed under the [MIT License](LICENSE).
