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

### Exploring the territory

The accounts are spread across a valley and up into the mountains, the way a real patch is spread across a region. Each is a giant that rises over the surrounding forest.

- **Territory map** (bottom right): click an account to fly to it, or click anywhere else to glide there. The cone shows where you are looking.
- **Immerse:** the territory overview and the map each fold into a small liquid-glass bubble (the − in their corner), and the frame icon in the top bar, or **H**, folds everything away for the forest alone. **M** toggles the map. Tap a bubble to bring its panel back; the choice is remembered.
- **Overview:** drag to orbit, scroll to zoom, **Q / E** to turn.
- **Explore on foot:** press **W A S D** (or the *Explore on foot* button) to step into the world, game-style. The mouse looks around (click to capture the pointer, **Esc** to release, **Esc** again to leave). **Space** jumps and jumps again in mid-air; a **double tap of Space** takes off or lands; **Shift** sprints; in flight **Space** climbs and **C** descends, and forward follows your gaze. You walk over the ground and around trunks, and a soft boundary keeps you in the valley. Aim at an account giant and click to open it.
- **Account rail:** jump straight to any account.
- **Where do you sell?** On a first visit, after the establishing shot, a small card asks for your company and role (AE, SDR or AM) and regrows the forest around that seller's ICP. Stripe, Ramp, Anthropic, OpenAI, Cursor, Cognition, Datadog and Snowflake have hand-written territories; any other company gets an archetype territory instantly (payments, spend, AI platform, data, observability, developer tools, security, HR or general B2B) and, when the server has an `ANTHROPIC_API_KEY`, a Claude-researched one shortly after. The "Selling for …" chip in the top bar reopens it. Target companies are real; people, activity and dollars are always fictional.

The world is meant to feel alive. Rivers run through the valley. The forest floor has grass, ferns, wildflowers, pebbles, boulders and fallen logs. Rabbits and squirrels work the clearings, flocks of birds pass overhead, small birds perch in the largest crowns, and now and then a wolf crosses.

### Sky, weather and forests

The territory keeps the seller's own clock. The sun rises in the east as their morning starts and sets in the west, the moon follows with its real phase, and at night the sky fills with stars and the Milky Way while fireflies drift over the clearings. The intro greets them for the time of day: open it at dawn and the territory is waking up with you.

Weather comes from a deterministic forecast in three-hour blocks: clear, fair, cloudy, overcast, rain, thunderstorms with lightning and storm wind, and morning mist. Everyone opening the territory at the same hour shares the same sky.

The sky pill at the top opens a panel to:
- scrub to any hour, or run the day as a two-minute time-lapse;
- pin the weather;
- switch forests: **Mountain forest** (mixed woodland, two rivers that fall off the ranges and meet in a lake, a river that comes and goes under the canopy) or **Redwood grove** (foggy coast redwoods, Douglas fir, deep ferns). Mangrove and kelp forest are listed as coming soon.

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

No login or database. Everything runs locally and deterministically. The one optional external call is `POST /api/territory`, which researches an unknown seller's ICP with Claude (`claude-opus-5-5`) when `ANTHROPIC_API_KEY` is set and otherwise answers 501; the app never waits on it. The static preview build (`PREVIEW_EXPORT=1`) leaves the route out.

QA URL flags (development):

| Flag | Effect |
| --- | --- |
| `?settle=1` | Snap eased visuals and camera moves to their targets (for screenshots in software-rendered browsers) |
| `?lite` | Touch-device budget on desktop: less ground cover and forest, no alpha-to-coverage |
| `?perf` | Frame-pacing overlay: fps, 1% low, dropped frames, CPU and GPU time per frame, draw calls, and a "Copy report" button |
| `?off=terrain,stream,cover,rocks,forest,accounts,wildlife,weather,fx` | Drop layers to isolate rendering or performance issues |
| `?time=6.5` / `?time=lapse` | Start at a given hour, or in time-lapse |
| `?weather=storm` | Pin the weather (`clear`, `fair`, `cloudy`, `overcast`, `rain`, `storm`, `mist`) |
| `?biome=redwood` | Start in a given forest |
| `?noao` / `?noa2c` | Turn off ambient occlusion / alpha-to-coverage to isolate artifacts |

---

## Architecture

```
src/
  domain/       Types and pure business logic — health, pipeline, opportunity maturity, strategy engine
  data/         Deterministic demo territory (accounts, people, signals) + commercial overlay
    profiles/   Seller profiles: curated presets, the seed builder, the seller classifier and
                archetypes, and validation for researched territories
  store/        Zustand store (actions: sample activities, neglect, triggers, undo, reset, demo)
                and selectors that build live account views
  three/
    flora/      Procedural tree and conifer generators, mesh builders, leaf atlas, wind/health shaders, fruit
    sky/        Sun and moon on the local clock, weather forecast, sky dome, rain, lightning, fireflies
    biomes/     Forest types as data: species and where they grow, floor cover, haze, account habit
    world/      GPU world maps, terrain, stream, ground cover, rocks and logs, wild forest
                (instanced trees + impostors), sky, light, post-processing
    wildlife/   Procedural creatures: rabbits, squirrels, a wolf, perched birds, flocks
    layout.ts   The map: account sites, terrain and mountain noise, rivers, lake and falls, ground cover
    Forest.tsx  Account state → visual targets (one-way), tree and limb labels
    CameraDirector.tsx  Intro, state-driven shots, free travel, terrain collision, idle drift
  components/   Territory panel, account intelligence panel, top bar, account rail, territory map,
                legend, demo narrator, liquid glass (glass/)
```

Business logic never touches Three.js. The scene reads account views from selectors and eases toward them, so the same model drives the panels and the trees.

### Rendering notes

- **Procedural broadleaf trees.** A recursive generator grows a continuous trunk and leader, then scaffold limbs (one per business unit), then secondary and tertiary branches, ending in leaf-cluster cards. Each child branch leaves its parent along the parent's tangent, so the wood reads as one grown piece. Generation is deterministic per account seed. Fruit hangs on stems from real outer-crown branch tips.
- **Wild forest.** Each biome brings its own species. The mountain forest has nine: maple, columnar poplar, broad oak at clearing edges, birch groves with pale bark, weeping willows along the river (a `droop` parameter hangs the finest shoots as whips), and spruce, fir and pine up the slopes. Instanced detailed trees near the camera crossfade, through a dither, into 8-view impostors captured at load. That keeps tens of thousands of trees on screen.
- **Water.** Three rivers, all in `layout.ts`. The main river leaves a hanging valley in the north over a 150 m falls. The east river comes off a high shelf on the north-east range over the great falls (about 280 m, twice the width), cascades again lower down, and the two meet in a lake mid-valley. A small creek steps down the western range in a staircase of falls and plunge pools. Below the lake the river widens, leaves through a gap in the southern range and runs on toward the coast. Water levels only ever fall downstream; any run steeper than it is long becomes a waterfall, with falling streaks, foam in the pool below, wet rock and mist scaled to its height and width. The mist glows toward a low sun and shows a rainbow at 42° when the sun is behind you. In the open reaches the river widens and the canopy pulls back; elsewhere crowns close over it.
- **Sky.** A low-precision solar and lunar model places the sun and moon from the local time and date. A keyframed palette by sun elevation drives sky, fog, hemisphere and key light, and weather greys and dims it. One shadow-casting light hands over from sun to moon. Unlit shaders (impostors, water, mist, rain) read a shared `uShade` so they darken with the scene.
- **World.** The terrain is a warped grid out to 5 km, coloured in-shader by meadow, forest floor, bank, rock and snow. Ridged-noise mountains are forested up to the treeline. Each river is a spline-carved channel with a flowing Fresnel water surface; the lake is a basin with a wandering shore. Ground cover (about 150k grass blades, plus ferns, flowers and pebbles) is placed entirely on the GPU from height and cover maps, in a field that wraps toroidally around the camera.
- **Liquid glass UI.** In Chromium, panels and the hover lens refract the scene through SVG displacement filters (a rounded-rect bevel plus lens magnification), with a cursor-following glare. A spring lens glides between options. Other browsers get frosted glass.
- **Foliage shader** (MeshStandardMaterial + `onBeforeCompile`): crown-volume normals for soft, volumetric shading; baked crown occlusion; sun translucency; wind sway and leaf flutter; and health-driven thinning and colour per card. Per-limb uniforms handle dormant, spring and focus states. A matching depth material keeps shadows consistent with wind and thinning.
- **Alpha-to-coverage** on the account trees, with the alpha ramp sharpened to one pixel around the cut (three's stock ramp halves coverage next to every gap, which turned distant crowns into a shimmering stipple). The wild forest uses a plain alpha cut so its dithered LOD hand-off lines up.
- **Lighting:** the sun (or moon) with 4K PCF shadows, hemisphere fill, HDRI image-based light scaled by daylight, exponential haze, and a procedural sky with two cloud layers.
- **Post-processing:** N8AO (desktop), soft bloom, ACES tone mapping, a gentle grade and vignette.
- **Performance:** the shadow frustum follows the camera target, and distant trees are impostors. An adaptive governor lowers the pixel ratio, then halves ground cover, if frame rate drops. Touch devices get a lighter budget and no AO.

## Assets

The trees, conifers, leaves, grass, ferns, flowers, rocks, wildlife, sky and fruit are all generated at runtime. Bark and ground detail textures and the fill-light HDRI are CC0 from Poly Haven. See [`public/assets/CREDITS.md`](public/assets/CREDITS.md).

## Product vision

Salesforce or HubSpot would become the system of record, Gong would supply conversation momentum, and a research agent would supply public-world signals. Territory stays the spatial reasoning layer: tree state, health and next best action. The strategy engine is a narrow interface (`src/domain/strategy.ts`), so an LLM-backed engine can replace the deterministic one without touching the UI or the scene.
