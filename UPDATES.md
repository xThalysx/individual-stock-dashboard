# Updating the app

## 2026-08-09 — AI Agent integration

- Added an **AI Agent** button to the top application navigation.
- Added a native social-arbitrage research page that reuses the dashboard's community-trend, public Reddit, and market-data connections.
- Manual scans rank research leads using social attention, scan-over-scan acceleration, source diversity, novelty, a potential-impact proxy, and manipulation/already-priced risk.
- The first scan is explicitly treated as a baseline; the agent does not place trades or present scores as return forecasts.
- Clicking a candidate ticker opens it in the normal stock dashboard.
- Deployed renderer files were backed up under `outputs/Individual Stock Dashboard/backups/before-ai-agent-2026-08-09/`.

This first release is built as an installer. Future patches are produced by increasing the version in `package.json` and rebuilding the installer.

To enable in-app automatic updates, publish signed releases to a release channel you control (for example, a private GitHub repository or hosted update storage) and add that channel to the desktop app configuration. This keeps the app's research data separate from software updates.

