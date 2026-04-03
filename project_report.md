# Clearline Engineering State & Technical Reference
**Scope:** Core Architecture, Mathematical Models, and Forward Development Roadmap

This document serves as a strict technical scaffolding reference, mapping the exact internal logic, algorithms, and architectural boundaries of the `clearline` system. It is intended for forward engineering reference.

---

## 1. System Architecture & Rendering Pipelines
`clearline` operates on Next.js 15 (App Router) with React 19. The application demands dual heavy-rendering contexts—a Mapbox GL WebGL instance and a Three.js WebGL canvas—living in parallel.

### Client vs Server Rendering Integrity
- **Mapbox Context (`ClearPathMap.tsx`)**: Re-renders here are extremely expensive. Currently, state operations (layer toggling via `layerVisibility`, timeline sliders updating `trafficPrediction`) forcefully trigger `useEffect` hooks manipulating raw Mapbox APIs directly (`map.addLayer`, `map.setPaintProperty`).
  - *Current State:* When the timeline changes, you loop over paths injecting multiple DOM modifications (using custom DOM fragments for `mapboxgl.Marker` and dashed GeoJSON updates). 
  - *Next Step to Fix:* To move ahead, consider migrating dynamic GeoJSON data into a centralized state bucket and pushing binary vector tile updates, or utilizing `useMemo` strictly so Mapbox doesn't constantly diff and re-paint 200 dashed lines per slider tick.

### 2. The Core Modeling Engine (`lib/clearpath`)

#### A. Multi-Factor Routing Scoring (`routingService.ts`)
The true differentiator of `clearline` isn't A-to-B routing, it's the **Penalty Weights Algorithm**.
*   **Formula:** `driveTime * driveWeight + waitTime * waitWeight + occupancyPenalty * occWeight + specialtyScore * specWeight`.
*   **Mechanics:** 
    *   It pulls raw Matrix times (from Mapbox) and intersects them with AI-predicted triage `severity`. 
    *   **Occupancy Penalty:** Mathematically caps safely until a hospital hits 70% capacity: `Math.max(0, ((occupancyPct - 70) / 30) * 100)`.
    *   **Specialty Mismatch Penalty:** Applies a 50-point weight penalty if the requested AI symptom string (e.g. `chestPain`) requires `cardiac` facilities and the hospital inherently lacks that boolean.
*   *Next Step to Fix:* The function `getBatchDirections` fires overlapping HTTP hits to Mapbox. If you add 15 hospitals to the grid, `Promise.all` rate limits immediately. Implement a caching or throttling queue here.

#### B. The Diversion Simulation Model (`voronoiService.ts`)
This answers the question: *If the government drops a new 50-bed ER here, how much traffic does it siphon from surrounding hospitals?*
*   **The Decay Algorithm:** It is NOT a standard Voronoi partition diagram. It relies on a deterministic Inverse-Square Distance Decay bounded by a hard `MAX_EFFECT_RADIUS_KM` (15km).
*   **Math:** `decay = (1 - (distKm / 15)) ^ 2`. If a hospital is 15km away or more, decay hits zero.
*   **Patient Siphoning (`div1` array):** Calculated by multiplying the `BASE_DIVERSION_RATE (0.30)` by the decay strength, and weighting it by the proposed beds vs existing beds `(proposalErBeds / (proposalErBeds + h.erBeds))`.
*   *Next Step:* The simulation re-calculates loops every time a marker drag ends. The `haversine` formula iterates $O(H \times P)$ times (Hospitals × Proposals). Memoize the initial static hospital distances so dragging a single proposal only calculates the delta of that specific proposal coordinate.

#### C. Smart Rerouting & Traffic Prediction (`trafficPrediction.ts`)
*   **Temporal Shifting:** Uses hard-coded 24-hour array indexes (`TRAFFIC_MULTIPLIERS.weekday` / `weekend`) to scale baseline congestion to future minutes. It calculates minute-weighted interpolation (e.g. 50% between the 2:00PM modifier and 3:00PM modifier).
*   **Alert Generation (`generateRerouteAlerts`)**: Triggers real-time warnings. It features bounded logic switches: Route length > 5km AND Congestion Level >= 3 generates a "Road Incident" probability check. 
*   *Next Step:* The `seededRandom` function mapping probability is slightly primitive (just a bitwise bit-shift hash). Transition this to standard pseudo-random number generator or pull real API incident events to substitute the hardcoded logic.

### 3. The Triage AI Pipeline (`geminiService.ts` / `chatgptService.ts`)
*   **Extraction Architecture:** The LLM receives `VitalsPayload` and returns a forced JSON schema representing urgency (`critical`, `urgent`, `non-urgent`) and specific booleans (`chestPain`, `fever`).
*   **The Regex Fallback Trap (`extractJSONString`)**: LLMs hallucinate Markdown ticks (e.g., \`\`\`json). The custom parsing fallback strips this accurately via looping over string ranges for bracket depth `depth++`.
*   *Next Step:* Ensure edge functions running this LLM script aren't capped by Vercel's 10-second timeout. Triage calls are blocking operations before Mapbox even starts fetching data. Implement optimistic UI loading states in the frontend components while `classifyTriage` hangs.

### 4. Direct Actionable Next Steps to Build
If you are moving ahead with coding immediately:
1.  **Refactor Mapbox Marker DOM:** Move `proposed-hospital-pin` out of vanilla `document.createElement` loops in `ClearPathMap` directly into synchronized React state with WebGL GLB model representations if possible. Dragging Native DOM over WebGL causes desync jitter.
2.  **Modularize Three.js Editor:** `BuildingEditorApp.tsx` has raw Viewport configurations and Export UI smashed together. Decouple `Scene.tsx` mesh parsing from the `BuildingsContext` mutation events to prevent whole screen re-renders during small layout adjustments.
3.  **Upgrade `routes` Cache:** The Mapbox Matrix API needs an LRU cache. Store route combinations using a composite key `originLng|originLat|destId` so the system stops recompiling `getDrivingDirections` when the timeline slider is pulled back and forth.
