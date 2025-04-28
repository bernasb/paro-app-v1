# Paro App Backend (Firebase Functions)

This directory contains all backend logic for the Paro App, implemented as Firebase Cloud Functions using TypeScript.

## Structure

- `src/`
  - `index.ts` — Main entry point, exports all callable functions.
  - `proxies/` — All callable function implementations (e.g., dailyReadingsProxy, readingSummaryProxy, magisteriumProxy).
  - `shared/` — Shared utilities and TypeScript types (e.g., utils.ts, types.ts).

## Endpoints

All backend endpoints are Firebase Callable Functions:

- `magisteriumProxy` — Handles Magisterium AI chat requests.
- `dailyReadingsProxy` — Returns daily Mass readings for a given date.
- `readingSummaryProxy` — Returns a summary for a specific reading.

## Development

- **Install dependencies:**
  ```bash
  npm install
  ```
- **Lint:**
  ```bash
  npm run lint
  ```
- **Format:**
  ```bash
  npm run format
  ```
- **Test:**
  ```bash
  npm test
  ```

## Environment Variables

- `GOOGLE_API_KEY` — Required for Gemini API calls.
- `MAGISTERIUM_API_URL`, `MAGISTERIUM_API_KEY` — Required for Magisterium AI calls.

## Deployment

Deploy using Firebase CLI:

```bash
firebase deploy --only functions
```

---

For more details, see the main project README and `/docs/api` for API documentation.
