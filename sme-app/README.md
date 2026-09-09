 # DukaBooks SME App

Nuxt 3 frontend for the DukaBooks SME invoice assistant demo.

## Requirements

- Node.js 18 or newer
- npm

## Install

From the repository root:

```bash
cd sme-app
npx -y npm@11 install
```

The repository may already include `node_modules`. Run the install command if dependencies are missing.

## Run Locally

Start the development server:

```bash
cd sme-app
npx -y npm@11 run dev
```

Open [http://localhost:3000](http://localhost:3000).

To use another port:

```bash
npx -y npm@11 run dev -- --port 3001
```

## Other Commands

Build for production:

```bash
npx -y npm@11 run build
```

Generate a static site:

```bash
npx -y npm@11 run generate
```

Preview the production build:

```bash
npx -y npm@11 run preview
```

## Available Screens

- `/` - Dashboard
- `/invoices` - Server-side invoice filtering demo
- `/upload` - Invoice upload and extraction lifecycle demo
- `/ask` - Streaming invoice assistant
- `/inventory` - Product catalog
- `/customers` - Contacts and follow-ups
- `/deals` - Sales pipeline board
- `/reminders` - AI-composed email reminders
- `/appointments` - Scheduling day view and bookings

## Data and Backend Status

The app currently runs entirely on the stateful mock client in
`composables/useSmeApi.js`. It does not require an API key or live GPT Platform
credentials. Changes made in the UI persist only for the current browser/server
process and are not stored in a database.

The production integration is not wired yet. The planned architecture is to
keep the GPT Platform API key in Nuxt Nitro server routes and have the browser
call those routes. See the repository-level `BACKEND-NEEDS.md` for the backend
contract and cutover plan.

## Project Structure

- `app.vue` - Global layout and navigation
- `pages/` - Nuxt pages for each screen
- `composables/useSmeApi.js` - Mock SDK seam used by the pages
- `assets/css/main.css` - Shared styles
- `nuxt.config.ts` - Nuxt configuration
