# FrictionMeal: Friction for Better Choices

FrictionMeal is a friction-first nutrition app built around a simple stance: not every decision should be instant.
When the day is trending off-track, the app intentionally slows the logging flow with a 10-second Smart Pause,
reflection prompt, and healthier swap suggestions so users make conscious decisions instead of impulsive ones.

Stack: Next.js 16 + React 19 + MongoDB.

## Prerequisites

- Node.js 20 or newer (LTS recommended)
- pnpm (recommended) or npm
- MongoDB instance (local or cloud)

## 1) Clone and enter the project

```bash
git clone <your-repo-url>
cd b_IydkuDasBYW
```

## 2) Install dependencies

### Using pnpm (recommended)

```bash
pnpm install
```

### Using npm

```bash
npm install
```

## 3) Configure environment variables

Create a file named `.env` in the project root:

```env
# Required
MONGODB_URI=mongodb://localhost:27017/nutrition-app
JWT_SECRET=replace-with-a-long-random-secret

# Optional (nutrition providers)
USDA_API_KEY=
ROBOFLOW_API_KEY=
ROBOFLOW_WORKSPACE=
ROBOFLOW_WORKFLOW_ID=
```

Notes:

- `MONGODB_URI` is required. The app throws an error at startup if missing.
- `JWT_SECRET` is required. Auth token signing/verification fails if missing.
- `USDA_API_KEY` is optional. USDA lookup is skipped when empty.
- Roboflow variables are optional. The photo endpoint falls back to mock results when missing.

## 4) Run in development

### With pnpm

```bash
pnpm dev
```

### With npm

```bash
npm run dev
```

Open <http://localhost:3000>

## 5) Build and run production

### Build

```bash
pnpm build
```

(or `npm run build`)

### Start

```bash
pnpm start
```

(or `npm run start`)

## Available scripts

- `dev` - starts Next.js development server
- `build` - builds the production bundle
- `start` - runs the production server
- `lint` - runs ESLint

## Troubleshooting

### Error: Please define the MONGODB_URI environment variable

Set `MONGODB_URI` in `.env` and restart the dev server.

### Error: Please define the JWT_SECRET environment variable

Set `JWT_SECRET` in `.env` and restart the dev server.

### Env changes not picked up

After editing `.env`, stop and restart the server.

## Security

- Do not commit real secrets to Git.
- Keep `.env` local and use different values for development and production.
