# Territory

Grow relationships. See the territory.

Territory is an experiment in spatial enterprise GTM. Instead of representing strategic accounts primarily as rows in a CRM, it models them as a living forest the seller can read at a glance.

## Concept

A strategic territory is a small number of enormous accounts — not a thousand random names. Territory asks whether organizational complexity, stakeholder penetration, relationship progression, whitespace, opportunity, timing, and account intelligence can be understood spatially, before anyone opens a spreadsheet.

## Visual language

| In the forest | In the GTM model |
| --- | --- |
| Forest | Strategic territory |
| Tree | Enterprise account |
| Trunk | Parent corporation |
| Major branch | Business unit |
| Secondary branch | Team |
| Leaf | Stakeholder / prospect |
| Leaf color | Relationship progression (green → yellow → orange → red → fall) |
| Fallen leaf | Meeting booked |
| Dormant branch | Area not worth seller attention right now |
| Bud / new leaves | External signal; reactivated prospecting surface |
| Fruit | Commercial opportunity and its maturity |
| Season | Timing and condition, often different by branch |
| Roots | Underlying account intelligence |

Every major visual element is meant to answer a seller question: where have I penetrated, where am I wasting time, where is momentum forming, where should I go next.

Forest scenery (ground, ordinary trees, undergrowth, rocks, bark, and lighting) uses locally hosted CC0 assets from Poly Haven. Strategic-account trees remain procedural data structures. Provenance is in `public/assets/CREDITS.md`.

## Current V1

A recruiter-ready local demo. Open the URL and work immediately — no login, no database, no live APIs.

- Eight hypothetical strategic accounts in a larger 3D forest, plus faint distant market silhouettes (Amazon, Microsoft, Google)
- Procedural, seeded organizational trees generated from Account → Business Unit → Team → Prospect
- Prospect detail with relationship actions; booking a meeting detaches the leaf
- Dormant branches with a local **Simulate trigger** path into spring reactivation
- Opportunity fruit that appears and matures from multithreading
- Roots, Demo Strategic Score, Penetration, Activity, and deterministic **Analyze account**
- Desktop side panel and compact bottom sheet; keyboard navigation and Escape; `prefers-reduced-motion`

This is demonstration data. People are fictional. Accounts are hypothetical. The score is a demo construct, not Cursor’s methodology. Evidence is labeled **verified**, **inference**, or **demo**.

```bash
npm install
npm run dev
```

Production: `npm run build` then `npm start`.

## Architecture

Next.js, React, TypeScript, Tailwind CSS, React Three Fiber, Three.js, Zustand, Motion.

Domain types and strategy logic live in `src/domain`. Deterministic demo data is in `src/data`. UI state is in `src/store`. Procedural geometry is in `src/three`. Overlay chrome is in `src/components`.

The strategy engine is an interface. A model could replace the deterministic analyzer later without changing the product surface.

## Product vision

Salesforce could become the system of record, Gong conversation momentum, and a research agent public-world signals. Territory would remain the spatial reasoning layer — tree state, season, and next best action. Those integrations are not in V1. V1 is local, fast, and demonstrable.

Built with Cursor.
