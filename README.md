# Clearline

**Clearline** is a spatial platform for emergency triage and hospital routing: voice and multimodal triage, live maps, dispatch coordination, and hospital intake flows. The goal is to get patients to the right ER faster by combining severity assessment, congestion signals, and routing.

Built with **Next.js 16**, **React 19**, **Mapbox**, **Tailwind CSS**, and optional **MongoDB** persistence. AI features use **Google Gemini** (and optional **OpenAI** for specific tools); voice can use **ElevenLabs**.

---

## Features

- **Civilian flow** (`/map`) — Location (postal / GPS), optional scene photo classification, voice triage, and ranked hospital recommendations with alternatives on the map.
- **Dispatch dashboard** (`/dispatch`) — Live case tracking, scenarios, and coordination APIs.
- **Per-case view** (`/case/[caseId]`) — Case detail and map context.
- **Hospital views** (`/hospital/incoming`, `/hospital/simulation`) — Incoming cases, ack/reject, intake-style workflows.
- **Demo / simulation** (`/demo`) — Trigger scripted scenarios (closures, reroutes, ICU, police/traffic alerts) against dispatch APIs.
- **Landing & editor** (`/`, `/editor`) — Marketing-style landing and blueprint / design tooling.

Optional **WhatsApp bot** (`npm run bot`) can bridge field reports to the same APIs (see `lib/whatsappBot.ts` and `scripts/runWhatsappBot.ts`).

---

## Prerequisites

- **Node.js** 20+ recommended  
- **npm** (or compatible package manager)  
- Accounts / keys as needed: **Mapbox**, **Google AI (Gemini)**, optional **MongoDB Atlas**, **ElevenLabs**, **OpenAI**, **WhatsApp Web.js** session storage

---

## Environment variables

Create a `.env.local` in the project root (never commit secrets). Common variables:

| Variable | Required for | Description |
|----------|----------------|-------------|
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Map UI | Mapbox public token (browser). |
| `MAPBOX_SECRET_TOKEN` | Server routing | Optional; server-side directions if you keep the public token out of server-only calls. |
| `GEMINI_API_KEY` | Triage, converse, scene classify | Google AI API key. |
| `GEMINI_MODEL` | AI routes | Optional override (e.g. `gemini-2.0-flash`). |
| `MONGODB_URI` | Persistence | MongoDB connection string; seed scripts and case store. |
| `BASE_URL` | Webhooks / bots | Public app URL (e.g. `https://your-domain.com`). Falls back to `VERCEL_URL` or localhost. |
| `OPENAI_API_KEY` | `/api/design` | OpenAI for design-related endpoints. |
| `ELEVENLABS_API_KEY` | Voice | Speech / transcribe routes. |
| `ELEVENLABS_VOICE_ID` | Voice | Optional voice id for TTS. |
| `WA_CLIENT_ID` | WhatsApp bot | Optional client id for multi-session auth dir. |

---

## Getting started

```bash
git clone https://github.com/KrishnaprasadVyas/clearline.git
cd clearline
npm install
# Create .env.local with the variables in the table below
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The map experience is at [http://localhost:3000/map](http://localhost:3000/map).

### Build

```bash
npm run build
npm start
```

### Data seeding

Hospital / ODHF-style data can be loaded with the seed script (requires `MONGODB_URI`):

```bash
npx ts-node --esm scripts/seedHospitals.ts
```

Other utilities: `npm run backfill:level1` for trauma-flag backfill.

### WhatsApp bot (optional)

```bash
npm run bot
```

Uses `whatsapp-web.js`; scan the QR in the terminal. Ensure `BASE_URL` points at a reachable instance of the app for API callbacks.

---

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Next.js dev server on port 3000 (all interfaces). |
| `npm run build` / `npm start` | Production build and server. |
| `npm run lint` | ESLint. |
| `npm run bot` | WhatsApp bot process. |
| `npm run bot:dev` | Bot with watch mode. |
| `npm run backfill:level1` | Backfill Level 1 trauma flags in MongoDB. |

---

## Project layout (high level)

| Path | Role |
|------|------|
| `app/` | Next.js App Router pages and API routes (`app/api/...`). |
| `components/clearpath/` | Map, civilian panel, dispatch UI, routing results. |
| `lib/clearpath/` | Routing, triage, case store, Gemini/OpenAI helpers, Mongo client. |
| `scripts/` | Seeds, WhatsApp runner, maintenance scripts. |

---

## License

This project is **private** in `package.json`. Add a `LICENSE` file if you intend to open-source it.

---

## Contributing

Issues and pull requests are welcome on [GitHub](https://github.com/KrishnaprasadVyas/clearline). For local work, use feature branches and keep `.env.local` out of version control.
