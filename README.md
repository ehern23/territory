# Territory

**A living map of a book of business.**

Territory turns a seller's accounts into a forest you can read at a glance. Every tree is an account. Its height is commercial potential, its canopy is engagement health, and its fruit is pipeline. Neglect an account and you watch it fade; multithread a deal and you watch fruit form and ripen.

It is a working, data-driven 3D product rather than a mock-up. Every visual state is derived from a consistent account / stakeholder / opportunity model, and every sample sales action changes that model.

> Illustrative Vercel Majors territory. Company research is public and labelled **verified** or **inference**. People, CRM activity and dollar values are fictional **demo** data.

---

## Reading the forest

| In the forest | In the territory |
| --- | --- |
| Forest | The book of business |
| Tree | Strategic account |
| Height · girth | Potential ARR · size of the enterprise |
| Scaffold limb | Business unit |
| Canopy fullness and colour | Engagement health: deep green (thriving) → olive → amber → rust (withering) |
| Bare limb | Business unit held dormant by choice |
| Fresh light-green growth | A dormant unit reactivated by a new external signal |
| Fruit | Opportunity. Cluster size follows deal value; colour and glow ripen with stage (discovery → qualified → validation → commercial) |
| Glow at the base | The account you are hovering or inside |

### How health is computed

`src/domain/health.ts`: an explainable 0–100 score, shown with its drivers in the account panel.

| Component | Weight | Notes |
| --- | --- | --- |
| Recency | 38% | Days since last seller activity; full credit within 4 days, none after ~60 |
| Stakeholder depth | 22% | Influence-weighted engaged stakeholders; meetings count extra |
| Executive access | 12% | An engaged influence-5 sponsor |
| Deal momentum | 20% | Strength of the most advanced opportunity |
| Timing signals | 8% | Public and demo signals on the account |

Neglect is modelled honestly: as days without activity grow, engagement, exec access and momentum are discounted too, so a once-healthy account fades. Bands: Thriving ≥72 · Healthy ≥55 · Cooling ≥40 · At risk ≥26 · Withering. Tree vitality is a direct function of the score.

Territory priorities rank accounts by `(1 − health) × dollars at stake` (open pipeline + a share of potential), with a boost for accounts that have gone dark.

---

## Interview demo (≈4 minutes)

Press **Guided demo**. Use **→ / Space** to advance, **←** to go back, **Esc** to exit. Every beat is reproducible: going back replays the territory from a clean state, and **Reset** restores everything.

| Act | Beat | What happens | Talk track |
| --- | --- | --- | --- |
| 1 · The territory | Grown, not listed | Establishing view of eight accounts | "CRM data turned into an ecosystem: height is potential, canopy is health, fruit is pipeline." |
| | Health is visible | Overview with mixed health | "You can see which accounts are going quiet before anyone opens a report." |
| 2 · Account intelligence | JPMorganChase | Camera flies to the tree; the intelligence panel opens | "Tier 1, $6.5M potential, health and its drivers, stakeholders, pipeline, and a recommended next action, all from the same model that grows the tree." |
| | Org as branches | Focus on Enterprise Technology | "Limbs are business units. The bare limb is dormant on purpose: not all whitespace is worth seller time." |
| 3 · Changing health | 75 quiet days | Neglect simulated; the crown yellows and thins | "Recency collapses, relationships cool, health drops from 89 to 30." |
| 4 · Opportunity creation | One executive meeting | Meeting with the VP of Engineer's Platform | "Health recovers and a $3.2M expansion buds on the limb." |
| | Multithread | Two more stakeholders engage | "The deal qualifies; the fruit grows and warms in colour. Account pipeline goes to $5.0M." |
| 5 · Territory strategy | Where to spend next week | Back to the overview, filtered to *Needs attention* | "Priorities rank health against dollars at stake. This is the plan for next week." |
| | Close | Summary | "Built with Next.js, React Three Fiber and custom GLSL, using Claude Code." |

Outside the demo, every account panel has **Simulate sales activity** (discovery call, executive meeting, multithread, skip 60 days) and a one-click **recommended next action**. Dormant business units can be reactivated with **Simulate trigger**.

---

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # Vitest: health, pipeline, store actions, demo replay, tree generation
npm run typecheck
npm run build && npm start
```

No login, database or external API. Everything runs locally and deterministically.

QA helper (development): append `?settle=1` to snap eased visuals and camera moves to their targets, which is useful for screenshots in software-rendered browsers.

---

## Architecture

```
src/
  domain/       Types and pure business logic — health, pipeline, opportunity maturity, strategy engine
  data/         Deterministic demo territory (accounts, people, signals) + commercial overlay
  store/        Zustand store (actions: sample activities, neglect, triggers, undo, reset, demo)
                and selectors that build live account views
  three/
    flora/      Procedural tree generator, mesh builders, leaf atlas, wind/health shaders, fruit
    world/      Sky, light, terrain, grass, wildflowers, backdrop forest, ridgelines, post-processing
    Forest.tsx  Account state → visual targets (one-way), tree and limb labels
    CameraDirector.tsx  Establishing shot, state-driven shots, idle drift
  components/   Territory panel, account intelligence panel, top bar, legend, demo narrator
```

Business logic never touches Three.js. The scene reads account views from selectors and eases toward them, so the same model drives the panels and the trees.

### Rendering notes

- **Procedural broadleaf trees.** A recursive generator grows trunk → scaffold limbs (one per business unit) → secondary → tertiary branches, ending in leaf-cluster cards. It is deterministic per account seed. The same generator, at lower detail, grows four species for the instanced backdrop forest.
- **Foliage shader** (MeshStandardMaterial + `onBeforeCompile`): crown-volume normals for soft, volumetric shading; baked crown occlusion; sun translucency; wind sway and leaf flutter; and health-driven thinning and colour per card. Per-limb uniforms handle dormant, spring and focus states. A matching depth material keeps shadows consistent with wind and thinning.
- **Alpha-to-coverage** with mip-aware alpha preservation on desktop, and a plain alpha cut on touch devices (no MSAA).
- **Lighting:** a low warm sun with 4K PCF shadows, hemisphere fill, HDRI image-based light, exponential haze, and a procedural sky with drifting fbm clouds and layered ridgelines.
- **Post-processing:** N8AO (desktop), soft bloom, ACES tone mapping, a gentle grade and vignette.
- **Performance:** about 1.9M triangles in the scene. Backdrop bark is reduced, only trees near the meadow cast shadows, and touch devices get less grass and forest and no AO.

## Assets

The trees, leaves, grass, flowers, sky and fruit are all generated at runtime. Bark and ground detail textures and the fill-light HDRI are CC0 from Poly Haven. See [`public/assets/CREDITS.md`](public/assets/CREDITS.md).

## Product vision

Salesforce or HubSpot would become the system of record, Gong would supply conversation momentum, and a research agent would supply public-world signals. Territory stays the spatial reasoning layer: tree state, health and next best action. The strategy engine is a narrow interface (`src/domain/strategy.ts`), so an LLM-backed engine can replace the deterministic one without touching the UI or the scene.
