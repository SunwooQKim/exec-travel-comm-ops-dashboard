# Comm Ops Dashboard

A **full-stack operations command surface** for tracking travel cohorts, deployed sub-teams, personnel locations on a live map, equipment readiness, and a structured **field issue knowledge log**. The repository is a **TypeScript monorepo** with a shared domain package, a React dashboard, and an optional authenticated API backed by PostgreSQL.

This project demonstrates production-minded patterns: **Zod-validated schemas**, **local and remote dataset sync**, **audit logging**, and UI suited to high-tempo coordination workflows (demo data only).

---

## Workspaces (two dashboards)

On launch you pick a workspace:

| Workspace | Who it's for | Capabilities |
|-----------|----------------|--------------|
| **Command post** | Admin / ops staff | Full CRUD, command post panel, map pick, import/export, push to API (admin login). |
| **Leadership brief** | Senior leaders | Read-only: larger map-first layout, KPI strip, mission digest, timeline replay. No edits or API writes. |

Demo API accounts (after `npm run db:push`):

- Admin: `admin@local.test` / `changeme` — can **GET** and **PUT** `/api/ops`
- Leader: `leader@local.test` / `viewonly` — can **GET** only

Use **Switch workspace** in the header to return to the picker.

---

## Summary

| Area | What it does |
|------|----------------|
| **Map** | Google Maps layer for sites, aggregated personnel by location, equipment markers with clustering, map-pick for manual location updates. |
| **Roster & boards** | Filterable roster by travel team and sub-team; equipment tied to **deployed cells** (`subTeamId`) and accountable members (`personId`); CSV export. |
| **Home station** | Rear pool plotted at a fixed **Pentagon (Arlington, VA)** anchor; forward-deployed groups shown separately. |
| **Equipment** | Catalog-style placeholder lines (SATCOM, COMSEC, EUDs, power, physical security) plus demo assets; categories and descriptions for knowledge workflows. |
| **Knowledge log** | `equipmentIssueLog` stores symptoms, context, resolutions, and tags—intended as ground truth for search and future assistant-style tooling. |
| **Timeline** | Event log tied to map/panel state (movement, status, equipment condition). |
| **API** | JWT auth, JSON snapshot persistence (Prisma), audit trail—optional; the web app runs fully client-side with local storage when the API is not used. |

---

## Tech stack

| Layer | Technologies |
|-------|----------------|
| **UI** | React 19, Vite 5, TypeScript, Framer Motion, Lucide |
| **Maps** | Google Maps JavaScript API, MarkerClusterer |
| **Domain** | Zod schemas, shared `@comm-ops/core` package |
| **API** | Fastify 5, JWT, Prisma 5, PostgreSQL, bcrypt |
| **Tooling** | npm workspaces |

---

## Monorepo layout

```
comm-ops-dashboard/
├── apps/
│   ├── web/          # Vite + React dashboard
│   └── api/          # Fastify API + Prisma
├── packages/
│   └── core/         # Schemas, seed data, persistence helpers, catalog
├── package.json      # Workspace scripts
└── README.md
```

---

## Getting started

### Prerequisites

- Node.js 20+ (recommended)
- npm 10+
- For the API: PostgreSQL 14+ and a created database

### Install

```bash
git clone <your-fork-or-repo-url>.git
cd comm-ops-dashboard
npm install
```

### Run the dashboard (local-only mode)

1. Copy `apps/web/.env.example` to `apps/web/.env`.
2. Add a **Google Maps JavaScript API** key as `VITE_GOOGLE_MAPS_API_KEY` (the map stays degraded without it; the rest of the UI works).
3. From the repo root:

```bash
npm run dev
```

The app is served at **http://localhost:5173** (default Vite port).

### Run with the API (multi-user snapshot)

1. Copy `apps/api/.env.example` to `apps/api/.env` and set `DATABASE_URL`, `JWT_SECRET`, and admin credentials.
2. Generate the Prisma client and apply schema:

```bash
npm run db:generate
npm run db:push
```

3. In one terminal:

```bash
npm run dev:api
```

4. In another:

```bash
npm run dev
```

5. In the dashboard header, use **API login** then **Push to API** as needed. With `VITE_API_URL` unset, Vite proxies `/api` to `http://localhost:3001`.

### Build

```bash
npm run build          # core + web
npm run build:api      # API TypeScript compile
```

---

## Configuration

| File | Purpose |
|------|---------|
| `apps/web/.env` | `VITE_GOOGLE_MAPS_API_KEY`, optional `VITE_GOOGLE_MAP_ID`, optional `VITE_API_URL` |
| `apps/api/.env` | `DATABASE_URL`, `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `PORT` |

Never commit real `.env` files or API keys. See [SECURITY.md](./SECURITY.md).

---

## Domain model (high level)

- **`OpsDataset` (v2)** — sites, sub-teams, people, equipment, events, `equipmentIssueLog`, `updatedAt`.
- **People** — travel cohort (`secaf` / `csaf` / `cso`), `subTeamId`, status, coordinates, optional home baseline for replay.
- **Equipment** — condition, location, optional `category`, `description`, `subTeamId`, `personId`, `isPlaceholder` for catalog rows.
- **Events** — movement patches, status changes, equipment condition notes.

Seed data is **synthetic** and for demonstration only.

---

## API overview

| Method | Path | Notes |
|--------|------|--------|
| `POST` | `/api/auth/login` | Returns JWT |
| `GET` | `/api/ops` | Auth required — returns current dataset snapshot |
| `PUT` | `/api/ops` | Auth required — replaces snapshot; writes audit entry |
| `GET` | `/api/audit` | Recent audit rows |
| `GET` | `/health` | Liveness |

---

## Roadmap (ideas)

- Full-text or semantic search over `equipmentIssueLog` and equipment descriptions.
- Guided troubleshooting flow or assistant grounded strictly on the knowledge log and approved docs.
- Richer RBAC and org-boundary support on the API.

---

## Related documentation

- [CONTRIBUTING.md](./CONTRIBUTING.md) — branch workflow and expectations  
- [SECURITY.md](./SECURITY.md) — secrets and responsible disclosure  

## Disclaimer

This repository is a **portfolio / demonstration** project. Names, units, locations, and equipment listings are **fictional** and do not represent real operations, classifications, or official systems.

## License

[MIT](./LICENSE)

---

## Author

Prepared as a **professional sample** of full-stack TypeScript, UI, and API design. Replace this section with your name, link, or contact if you publish the repo publicly.
