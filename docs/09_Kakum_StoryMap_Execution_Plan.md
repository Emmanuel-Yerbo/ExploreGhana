# ExploreGhana — Kakum StoryMap: Spatial & Cartographic Execution Plan

**Author:** Emmanuel Yerbo
**Role:** Lead Geospatial Software Engineer
**Reference Code:** EG-ARCH-09
**Date:** September 22, 2026
**Status:** **EXECUTION AUTHORITY for the Tier-4 Story Journey** — replaces the Mode-A implementation described in doc 08 §3; doc 08 §2 (5-act narrative) is retained as the content model. Supersedes nothing in doc 07 (the build authority); this is a V1.3.1 polish iteration that slots in before V1.4.

---

## 0. Purpose: Why This Document Exists

The V1.3 Kakum pilot shipped the **content** of a story map (5 acts, strata, checklist) but not the **experience** of one. The user's own verdict — *"it is not well planned and executed… things sit idly and don't flow together"* — is accurate, and this document diagnoses exactly why, then specifies the fix at the level of camera choreography, layer choreography, scroll engine, and data model. Every technique below is verified against MapLibre GL JS current API (v6.x) and Scrollama 2.2.1; every new data asset carries the doc 07 verification protocol.

---

## 1. Diagnosis: Why the Current Build Feels Idle (Evidence from the Code)

| # | Defect | Evidence | Consequence |
|---|---|---|---|
| D1 | **It is a click-through slideshow, not a story map.** "Prev Act / Next Act" buttons in a 440px sidebar card (`app.js:1601–1626`). | The map is passive ~90% of the time; user attention lives in the sidebar, the map is decoration. | No narrative momentum; nothing pulls the user forward. |
| D2 | **Teleport transitions.** Every act uses the same raw `flyTo` with hardcoded `duration: 1600` (`app.js:1651–1659`). Act I→II jumps **z12.2 → z18.2** (6 zoom levels) in 1.6s. | A fixed-duration `flyTo` over that distance produces a whip-pan, not a move; no pull-out-and-dive, no sense of *descending into* the forest. | Transitions read as jump cuts; spatial continuity is destroyed. |
| D3 | **Acts with nothing to show.** Act I and Act V have `highlight_layers: []` (`kakum_micro_spatial.json:642, 718`). Act I flies to z12.2 over… nothing — the park boundary polygon is **not in the dataset at all**. | Camera moves, map stays visually identical. | The textbook definition of "sitting idly." |
| D4 | **Highlight logic is imperceptible.** Active vs inactive is `line-width 3→5` and `fill-opacity 0.35→0.65` (`app.js:1661–1678`). | A 2px width delta at z17 is invisible; there is no dimming of non-focused features. | No focus semantics; all 14 POIs shout equally at every act. |
| D5 | **No terrain.** MapLibre pinned at **v4.7.1** (`index.html:32–33`), no `raster-dem` source, no `terrain` in style, `maxPitch` default. | Pitch 58° over a **flat** canvas — the most dramatic act (40m gorge) renders as a flat image tilt. | The Z-axis story (135m→190m ascent, 40m void) is told in text only; the map cannot feel it. |
| D6 | **Dead lines.** The paved concourse and trail are static strokes; nothing draws, flows, or pulses. | No line-draw or dash-flow animation anywhere. | The "path" — the protagonist of Acts III–IV — is a dead wire. |
| D7 | **Chapters use no imagery.** 53+ CC photos exist in `static/img/attractions/`, including a Kakum gallery; `renderStoryChapter()` renders zero of them. | Text wall in a 440px card. | The rainforest is an audio-visual subject rendered as prose. |
| D8 | **Strata disconnected from acts.** `focusVerticalStratum()` (app.js:1718) flies the camera, but the strata panel is a separate list in the sidebar; Acts III/IV don't reference it. | Two narrative systems that don't interlock. | Redundant clicks, diluted story. |
| D9 | **No scroll, no keyboard, no autoplay.** Only buttons + dots. | No scrollama, no IntersectionObserver, no arrow-key nav. | Modern story-map users expect to *scroll* the story. |
| D10 | **Verification protocol violation in the story text itself.** Act III narrative publishes "350 stone and laterite steps" and a "15-minute" climb — both on the doc 07 **kill list** (doc 06 header table: ❌ UNVERIFIED). Act I history claims (CECEPA, Conservation International, "hired local hunters") have no `source` tags. | `kakum_micro_spatial.json:643, 681`. | The story mode quietly reintroduces exactly the facts doc 07 removed. Ground-truth discipline must extend to narrative copy. |

**Summary:** the map is a **listener**, not a **teller**. The fix is not more features — it is *choreography*: every scroll step triggers a camera move, a layer change, and a focus change, and between steps the map breathes with ambient motion instead of freezing.

---

## 2. Verified Toolset (Research, Sept 22 2026)

| Need | Verified Solution | Source / License | Notes |
|---|---|---|---|
| Camera choreography | `Map.flyTo({curve, speed, maxZoom, easing})` — animates along a curved path that **pulls out then dives in** (the "drone move"). `curve` default 1.42; larger = more dramatic. For zoom-only or short moves, `easeTo` with custom easing. | MapLibre GL JS API — `Map.flyTo()`, FlyToOptions (`curve: 1`, `easing(t)`) | **Do not hardcode `duration` for scale changes** — let `speed`/`curve` compute it; 1.6s fixed is the root of D2. |
| 3D terrain | `raster-dem` source + `terrain: {source, exaggeration}` in style + `TerrainControl`; `maxPitch: 85`; `sky: {}` for horizon. | MapLibre official "3D Terrain" example | Requires upgrading from v4.7.1 → **v5+ (current major: v6.x)**. Sky/atmosphere matured in v5. |
| Free global terrain tiles (no API key) | **Mapterhorn** — `https://tiles.mapterhorn.com/tilejson.json` (community terrain CDN, terrarium-encoded). Fallback: AWS Open Data terrarium tiles `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png`, `encoding: "terrarium"`. | Free, no key, no registration — same philosophy as OpenFreeMap | Add attribution line to footer. Use a **separate** raster-dem source instance for hillshade vs terrain (render-quality tip from the official example). |
| Scroll engine | **Scrollama 2.2.1** — MIT, IntersectionObserver-based, no scroll-event jank. Sticky map + scrollable steps via CSS `position: sticky`. Official patterns: "Sticky Graphic (Overlay)" = fullscreen map with text cards over it; "Mobile Pattern" = px-based offsets for stable mobile triggers. | github.com/russellgoldenberg/scrollama | The exact "fly to a location based on scroll position" interaction is an official MapLibre example — the pattern is idiomatic, not exotic. |
| Line-draw / path animation | Official examples: **"Animate a line"** (grow a GeoJSON LineString over time), **"Animate a point along a route"**, **"Customize camera animations"** (chained easing across keyframes). | MapLibre examples gallery | Use "Animate a line" for progressive trail draw; "point along route" for a walker marker; chained keyframes for Act II→III dolly. |
| Park boundary polygon | Extract Kakum NP relation from OpenStreetMap (they already have `scripts/query_kakum_osm.py`) or digitize heads-up on Esri imagery. | ODbL — attribution already in footer | Act I's missing prop (D3). Store as `data/kakum_park_boundary.json` with `source: "OpenStreetMap relation …"` + `verified_date`. |
| Reduced motion | `prefers-reduced-motion` media query → `jumpTo` instead of `flyTo`; disable drift. | WAI-ARIA / CSS spec | Non-negotiable accessibility rule. |

---

## 3. The Core Design Rules (The Grammar of the Journey)

> **Rule 1 — The map is the storyteller.** Every act must change the camera **and at least one layer or focus state**. An act that only swaps text is a bug (kills D3 by construction).
>
> **Rule 2 — One move per act, then hold.** Each act gets one choreographed camera move (2.5–4.5s, eased), then the camera holds while the user reads. Motion during reading comes only from *ambient* effects (§5), never new camera moves.
>
> **Rule 3 — Never teleport.** Scale-crossing transitions use `flyTo` with an explicit `curve` so the pull-back-and-dive is visible; same-scale transitions use `easeTo` chains. Fixed 1.6s durations are banned for anything crossing >1.5 zoom levels.
>
> **Rule 4 — Focus is subtraction.** In every act, non-focused features dim to ≤ 0.15 opacity; the focused feature glows (wider `line-case` halo, marker pulse). The eye must have exactly one thing to look at.
>
> **Rule 5 — The line is alive.** The visitor's path (concourse → steps → walkway) draws progressively as the acts advance, and carries a subtle dash-flow at rest. The route never appears fully-formed; it grows with the story.
>
> **Rule 6 — Verified facts only.** Story copy obeys the doc 07 protocol: every narrative claim gets a `source` + `verified_date` in a new `narrative_sources` field. Unverified specifics ("350 steps", "15 minutes") come out of the copy until confirmed (fixes D10).

---

## 4. Camera Choreography Table (The 5 Acts, Re-Specified)

All coordinates use the existing OSM-grounded micro-spatial features. `sidebar padding` = left offset so the focused feature lands in the visible map area, not under the card.

| Transition | Type | Parameters | Layer / focus choreography (fires *with* the move) |
|---|---|---|---|
| **Entry → Act I** *The Island of Green* | `flyTo` | `curve: 1.42, speed: 0.6` (≈4s), target `z 12.2, pitch 30, bearing 0` over park centroid | Park **boundary polygon fades in** (fill 0→0.10 emerald, outline 0→0.9) — the new Act I prop. All micro-POIs hidden (zoom < 14). Optional soft hillshade visible. |
| **Act I → II** *The Descent* | `flyTo` | `curve: 1.7, speed: 0.55` (≈5s — deliberately slow: this is the drone dive into the valley), target: hub `z 18.1, pitch 40, bearing -10` | Boundary outline thins to 0.25; hub buildings + parking fill **fade from 0.15 → 0.85** as zoom passes 16 (`setPaintProperty` interpolated on the flyTo's `move` events — or timed at ~70% of the move). Concourse line begins its **progressive draw** (Animate-a-line) from the parking bay toward reception. |
| **Act II → III** *The Ascent* | **Chained `easeTo` keyframes** (Customize-camera-animations pattern) | K1: follow concourse to trailhead, `z 17.9, pitch 45` (900ms, ease-in-out) → K2: dolly up the approach trail, `z 17.6, pitch 55, bearing -18` (2200ms, ease-in — the climb should *accelerate*) | Trail line **draws upward** along the ridge (progressive draw, bottom→top); POIs dim except trailhead + steps; **terrain exaggeration stays 1.0** — the pitch change now *shows* the 135→190m ridge because terrain is on (fixes D5). |
| **Act III → IV** *The Launch* | `easeTo` | `z 18.4, pitch 60, bearing -20`, 3000ms, ease-in-out; arrival exactly on Platform 1 | **Walkway centerline** (7 segments) **draws bridge-by-bridge** (segment 1 → 7, staggered 150ms each); Platform 1 marker pulses; all other markers dim to 0.15. Camera holds — the gorge speaks through terrain. |
| **Act IV → V** *The Pull-Back* | `fitBounds` | From canopy extent → wilderness extent (Big Tree + campsite), `pitch 30, bearing 10`, 3200ms, linear-ease-out mix, `maxZoom 16.3` | Walkway dims to 0.2; Big Tree + campsite markers **fade in and pulse**; canopy segment labels hide; wilderness trails fade in 0→0.6. This is the exhale — the widest, slowest move of the journey. |
| **Act V → Exit** | `flyTo` | `curve: 1.42, speed: 0.7` back to console home view | All layers restore neutral state (0.35/0.65 baseline); explorer mode armed. |

**Ambient hold behavior (applies to every act, kills "idly"):** once the primary move fires `moveend`, start a gentle **camera drift** — bearing oscillates ±0.8° over ~40s (`requestAnimationFrame`, sine easing) and optionally the walkway line carries a slow dash-flow. **Any user interaction** (`mousedown`, `wheel`, `touchstart`) kills drift permanently for that act. Under `prefers-reduced-motion`: no drift, no dash-flow, `jumpTo` transitions.

---

## 5. Layer Choreography Spec (Cartographic Details)

### 5.1 Focus semantics (replaces the invisible 3→5px toggle)
- Dimmed baseline: `fill-opacity 0.12`, `line-opacity 0.12`, marker elements `opacity 0.25, saturate(0.4)`.
- Focused feature: `fill-opacity 0.85` + **`line-case` halo** (`line-width 9, line-color #065f46, line-blur 3`) under a `line-width 4.5, #34d399` core — a real glow, visible at any zoom.
- Active POI marker: CSS pulse (scale 1→1.15, 1.6s loop) + `aria-current="true"`.
- All transitions on paint properties ride a **uniform 600ms CSS-style ramp** (`setPaintProperty` stepped on rAF or via `line-opacity` interpolate expressions) — no instant snaps.

### 5.2 The living line (progressive draw)
- Implement per the official "Animate a line" pattern: keep the full geometry server-side in JS memory; on act entry, `setData()` with a truncated copy (linear interpolation along vertices), animated over the act's move duration.
- Walkway = 7 **separate segment features** (`bridge_1`…`bridge_7`), enabling per-bridge staggered draw, hover inspection ("Bridge 4 — 40m over the gorge"), and honest sourcing: segment geometry digitized heads-up from Esri imagery, `source: "Esri World Imagery, heads-up digitization"`, `verified_date`, `precision: "approximate"` — no fake surveyor certainty.
- At rest: 2px dash-flow (`line-dasharray [0.5, 2.2]`, animated by stepping the dash phase every 60ms — the "signal along the wires" effect).

### 5.3 Terrain & atmosphere
- Add mapterhorn `raster-dem` (terrain) + second source instance (hillshade, `hillshade-shadow-color: #1a2e1a` warm-shadow) per the official example; `terrain: {source, exaggeration: 1.0}` — **never exaggerate above 1.0**; honesty over drama.
- `maxPitch: 85`, `sky: {}` for a soft horizon during Act IV's 60° pitch.
- Satellite (Esri) remains the story-mode basemap — vector cartography fights with vector overlays; satellite + terrain is the rainforest look.

### 5.4 Missing assets to produce (all before Phase 1)
1. `data/kakum_park_boundary.json` — OSM relation extract via existing `scripts/query_kakum_osm.py`; `source` + `verified_date`. (Act I prop.)
2. Walkway 7-segment centerline — heads-up digitize on Esri (Emmanuel's core skill), or OSM if surveyor-mapped; each segment `source`-tagged.
3. Chapter media — pair each act with an existing CC photo from `static/img/attractions/kakum-national-park/` + credit line (fixes D7).
4. Local vendor copy of `scrollama.min.js` in `static/js/vendor/` (offline-ready, same policy as tiles/photos).
5. MapLibre upgrade v4.7.1 → **v5+ (recommended: current v6.x)**; smoke-test markers/popups (API stable for the calls we use), add sky + terrain attribution lines to the footer.

---

## 6. The Scroll Engine (Killing the Slideshow)

### 6.1 Layout — immersive overlay (desktop)
- "Enter the Journey" expands story mode to a **full-viewport overlay**: map fills the screen; narrative cards float over it (Scrollama's "Sticky Graphic (Overlay)" pattern — map is the sticky graphic, steps scroll over it).
- 6 steps: `intro` + one per act. Each step is a `<section class="story-step">` at 80vh with the act card (title, era, narrative, proverb, photo, source line).
- Scrollama `.onStepEnter` → `goToStoryChapter(index, {source: 'scroll'})`; `.onStepProgress` → drives the **progress rail** and (optionally) scrubbing the trail-draw for the current act — the draw advances with your thumb on mobile. That single decision converts the whole experience from "click Next" to "walk through the forest."
- The chapter dots, Prev/Next buttons, and keyboard ← → remain as **jump navigation** (scrollama `scrollama.scrollTo`-equivalent: `element.scrollIntoView({behavior:'smooth'})`), satisfying accessibility and lazy readers. Buttons scroll the *document*, not just swap cards — one source of truth.

### 6.2 Mobile pattern
- Sticky map top 60vh; steps scroll beneath it; Scrollama offset in **px not %** (official mobile guidance — % offsets jump on direction change).
- Camera `padding` asymmetric: `{top: 0, bottom: '60vh'}` so focused features center in the visible map band, not under the sticky panel.

### 6.3 Integration contract
- `goToStoryChapter(index, opts)` becomes the **single entry point**: scroll, dots, buttons, and hash (`#/central/kakum-national-park/story/act-4` for deep-linking an act) all call it. Inside, it reads the chapter's new `camera.transition` spec and executes §4.
- Explorer mode is untouched — it remains the operational console (checklist, contacts, walkway-metrics table, free-pan inspector). Story = linear + choreographed; Explorer = free + operational. The dual-mode concept from doc 08 §3 stands; only Mode A's execution changes.

---

## 7. Data Model Changes (`kakum_micro_spatial.json`)

Extend each `story_chapters[]` element (backward-compatible additions):

```json
{
  "id": "act-3-ascent",
  "camera": {
    "center": [-1.3828, 5.3512],
    "zoom": 17.8,
    "pitch": 55,
    "bearing": -18,
    "transition": "ease-chain",
    "keyframes": [
      { "center": [-1.3833, 5.3505], "zoom": 17.9, "pitch": 45, "duration_ms": 900, "easing": "ease-in-out" },
      { "center": [-1.3828, 5.3512], "zoom": 17.6, "pitch": 55, "bearing": -18, "duration_ms": 2200, "easing": "ease-in" }
    ],
    "fly_options": { "curve": 1.7, "speed": 0.55 }
  },
  "focus_features": ["kakum-canopy-launch-platform"],
  "highlight_layers": ["kakum-trail-line"],
  "draw_line": "kakum-canopy-trail-approach",
  "ambient": { "drift": true, "dash_flow": true },
  "media": { "image": "/static/img/attractions/kakum-national-park/gallery_2.jpg", "credit": "Wikimedia Commons (CC BY-SA)" },
  "narrative_sources": [
    { "claim": "Gazetted as national park in 1992", "source": "Wikipedia — Kakum National Park", "verified_date": "2026-09-22" }
  ]
}
```

And the **copy fixes mandated by Rule 6** (D10):
- Act III: delete "350 stone and laterite steps" and "15-minute" → replace with verified framing: *"a steep forest ascent from ~135m to ~190m elevation"* (elevation band is verified; step count is not). Keep the step-count only if/when Wildlife Division confirms it.
- Act IV: walkway length already handled transparently by the Walkway Dimensions card — the story card should **link to it**, not restate a number.
- Act I: add `narrative_sources` for 1931 timber reserve, 1992 gazettement, 1995 Canadian engineers (all on the Wikipedia record); drop any claim that has none.

Vertical strata (fixes D8): Acts III and IV gain `"stratum_ref": 2` / `"stratum_ref": 0` — entering those acts auto-highlights the matching strata card; tapping a stratum card jumps to its act. Two systems become one.

---

## 8. Build Order (Est. 3–4 Working Sessions)

| Phase | Deliverable | Acceptance check |
|---|---|---|
| **P0 — Assets & deps** (½ day) | MapLibre v5+ upgrade + terrain/hillshade/sky in console; mapterhorn attribution; boundary polygon; walkway segments digitized; scrollama vendored; chapter media wired | Terrain visible at pitch > 50; boundary renders at z12; zero console errors |
| **P1 — Camera engine** (½–1 day) | `runCameraTransition(spec)` executor: fly/ease-chain/fitBounds + drift lifecycle + `prefers-reduced-motion` path | Every act uses the table in §4; no move < 2.5s or > 5s; drift dies on first user input |
| **P2 — Layer choreography** (1 day) | Focus semantics (halo + dim), progressive line draw, 7-bridge stagger, dash-flow, marker pulse | Rule 1 & 4 hold on every act; halo visible at z17 on a 1080p screen |
| **P3 — Scroll engine** (½ day) | Overlay layout, 6 steps, scrollama wiring, progress rail, hash deep-links, keyboard nav | Scrolling never double-fires `goToStoryChapter`; back-button and hash work; mobile 60vh sticky pattern passes |
| **P4 — Integration & QA** (½ day) | Strata↔act linking; copy fixes per Rule 6; `narrative_sources` on all acts; soundscape pause on `visibilitychange`; 60fps pass (Chrome + Firefox, desktop + mid-range Android) | §9 checklist fully green; pytest suite still 44/44; deploy |

No new services, no API keys, no cost. One CDN addition (mapterhorn, free) and one vendored JS file.

---

## 9. QA / Acceptance Checklist (Definition of "It Flows")

- [ ] **No idle act:** every act changes camera + ≥1 layer or focus state (Rule 1).
- [ ] **No teleport:** Act I→II visibly pulls out and dives; no fixed-duration flyTo across >1.5 zoom levels.
- [ ] **One look per act:** at rest, exactly one feature glows; everything else ≤ 0.15 opacity.
- [ ] **The line grows:** entering Act III/IV, the path draws in ≤ the camera move duration; it never appears fully-formed.
- [ ] **Terrain honesty:** exaggeration 1.0; the ridge reads as relief, not drama.
- [ ] **Ambient life:** during reading holds, drift or dash-flow is perceptible in peripheral vision but never fights the text; any user input silences it.
- [ ] **Reduced motion:** with `prefers-reduced-motion`, transitions become `jumpTo`, no drift/dash — story remains fully readable.
- [ ] **Copy protocol:** zero unverified numbers in narrative copy; every claim has a `narrative_sources` entry (spot-check against doc 07 kill list).
- [ ] **Deep links:** `…/story/act-4` opens Act IV exactly; browser back walks acts in order.
- [ ] **Performance:** no frame > 16ms during moves on mid-range Android; overlay scroll jank-free (scrollama guarantees observer, not paint).

---

## 10. What Success Looks Like

A Ministry demo opener: hand over the phone, the user scrolls, and **the camera descends from 375 km² of emerald forest into a parking bay, rides the concourse, climbs the ridge with the terrain rising under it, and arrives at Platform 1 as seven bridges light up one by one** — no clicks, no instructions, no idle map. That single 90-second scroll is the product demo for every other site in doc 06's extensibility table. Kakum is the template; this plan is the template's operating manual.
