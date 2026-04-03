# Clearline Repository Context

## Overview
`clearline` is a sophisticated Next.js 15 / React 19 application built for an emergency response and urban planning hackathon. The platform contains two major modules:
1. **ClearPath:** An advanced map-based emergency routing, traffic prediction, and urban simulation system used to guide emergency vehicles and plan infrastructure.
2. **Clearline Asset Generator (Editor):** A 3D CAD-like building and floorplan editor for modeling environments.

## Core Technologies
- **Framework:** Next.js 15 (App Router)
- **UI & Styling:** Tailwind CSS v4, Lucide React, Framer Motion
- **Map & Geospatial:** Mapbox GL JS, Turf.js (`@turf/turf`, `@turf/along`, `@turf/length`)
- **3D Visualization:** Three.js, React Three Fiber (`@react-three/drei`)
- **AI Integrations:** Gemini and ChatGPT APIs (for smart triage)
- **Database:** MongoDB

---

## Architecture & Directory Structure

### `app/`
Contains the Next.js App Router endpoints and pages.
- `app/api/`: Holds the backend API routes connecting to MongoDB and AI services.
  - `clearpath/`: Routes for fetching congestion, hospital data, generating routes, and running patient distribution models.
  - `editor/`: Routes specific to the 3D building editor.
  - `speak/` & `transcribe/`: Endpoints catering to natural language voice-to-text processing.
- `app/map/`: The primary `ClearPathMap` application view.
- `app/editor/`: The application view wrapping the WebGL Three.js building editor.

### `components/`
The UI presentation layer for the respective modules.
- `components/clearpath/`: Contains all Mapbox GL rendering scripts (e.g., `ClearPathMap.tsx`, `FlowArcs.tsx`, `CongestionLayer.tsx`). Organizes the map UI overlays, timelines, and layers.
- `components/editor/`: Houses the 3D Building Editor interface. Features tools for manipulating viewport matrices (`Viewport`), creating floor plans (`FloorPlan`), and exporting (`ExportBar`).

### `lib/`
Contains the heavy logic, data abstraction, mathematical models, and service wrappers.
- `lib/clearpath/`:
  - **`routingService.ts`**: The core routing brain. Ranks hospitals based on drive time, wait time penalties (adjusted by current time and hospital occupancy via `temporalPatterns.ts`), and matches severity and specialty requirements.
  - **`trafficPrediction.ts`**: Estimates congestion multipliers on a timeline. Features an intelligent smart-alerts algorithm for detecting diversion factors, capacity surges, and road incidents.
  - **`voronoiService.ts`**: A deterministic urban simulation script. Calculates distance decay curves (using custom Haversine math) to model how dynamically placing new hospitals on the map diverts patient flow from existing surrounding infrastructure.
  - **`geminiService.ts` / `chatgptService.ts`**: Used for unstructured text and symptom triage, parsing complex emergencies into strongly bounded JSON schemas.
  - **`mapboxDirections.ts`**: Wrapper for interacting with Mapbox's navigation APIs.
- `lib/editor/`: State contexts (`BuildingsContext`) and utility wrappers fueling the Three.js building generator application.

---

## Key AI & Algorithm Highlights
- **Smart Triage Pipeline:** Synthesizes symptoms and vitals string data through Gemini/OpenAI, safely extracting forced JSON schemas determining critical, urgent, or non-urgent status.
- **Dynamic Scoring Routing:** Unlike standard navigation, routes are ranked by minimizing holistic patient friction. A custom algorithm blends driving time with ER occupancy probabilities out of 100, adjusting based on live or historical datasets.
- **Spatial Patient Diversion Simulation:** Models what happens to a city's healthcare network if a new emergency center is built on a plot of land, dispersing patients using inverse-square distance decays over a defined 15km threshold. 

## Maintenance & Gotchas
- **WebGL Frame Limits:** React-Three-Fiber hooks must remain lightweight. Contexts in `lib/editor` shouldn't re-render entire components on fast UI inputs.
- **Mapbox DOM Updates:** The Next.js components rendering on top of the Map (`ClearPathMap.tsx`) utilize custom geometry building (`buildTrafficSegments`) layered over `GeoJSONSource` lines. Watch for performance bottlenecks around deep iteration on large geometry arrays.
- **Tailwind v4 PostCSS:** Relies heavily on the new `@tailwindcss/postcss` compiler. Advanced utility configurations exist in `tailwind.config.ts`.
