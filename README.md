# Paro App

## Overview
Paro App is a modern web application focused on liturgical content, Catholic prayers, and Church history, built with a TypeScript/React frontend and a Firebase Functions backend. All backend logic is now implemented in TypeScript using Firebase Callable Functions.

---

## Technologies Used
- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- Firebase Functions (TypeScript)

---

## Project Structure
- **Frontend:** `src/` — React app, organized by domain (liturgical, saints, prayers, etc.), with shared logic in `src/services/shared/`
- **Backend:** `functions/` — Firebase Functions (TypeScript)
  - `src/proxies/`: Callable function implementations
  - `src/shared/`: Shared utilities and type definitions
  - `src/index.ts`: Entry point, exports all callable functions
- **Documentation:** `/home/linux/CascadeProjects/docs/` (see below)

---

## Backend Endpoints
See [API documentation](../CascadeProjects/docs/api/firebase-functions-paro-app.md):
- `magisteriumProxy` — Magisterium AI chat
- `dailyReadingsProxy` — Daily Mass readings
- `readingSummaryProxy` — Reading summaries

All endpoints require Firebase user authentication and return standardized responses.

---

## Documentation
Project documentation is organized in `/home/linux/CascadeProjects/docs`:
- `guides/`: General guidance
- `requirements/`: Project requirements/specs
- `architecture/`: System architecture ([backend architecture](../CascadeProjects/docs/architecture/firebase-functions-architecture.md))
- `api/`: API documentation ([backend API](../CascadeProjects/docs/api/firebase-functions-paro-app.md))
- `tutorials/`: Step-by-step tutorials

---

## Development
```sh
# Install dependencies
npm install

# Lint, format, and test
npm run lint
npm run format
npm test

# Start the frontend (Vite)
npm run dev

# Deploy backend functions
cd functions
firebase deploy --only functions
```

---

## Deployment
- **Frontend:** Deploy via Vercel/Netlify or Firebase Hosting (if configured)
- **Backend:** Deploy with Firebase CLI (`firebase deploy --only functions`)

---

## Further Reading
- [Backend README](functions/README.md)
- [API Docs](../CascadeProjects/docs/api/firebase-functions-paro-app.md)
- [Architecture](../CascadeProjects/docs/architecture/firebase-functions-architecture.md)

---

For any questions, see the docs or reach out to the maintainers.
