# 🇬🇭 ExploreGhana — National Tourism Geoportal (V0 Pilot)

**Author:** Emmanuel Yerbo
**Role:** Lead Geospatial Software Engineer
**Client / Beneficiary:** Ministry of Tourism, Arts & Culture, Ghana
**Technology Stack:** Python 3.12 · FastAPI · Pydantic v2 · MapLibre GL JS v4 · Docker (PostGIS schema provisioned for V1 migration)
**Live URL:** [https://exploreghana.onrender.com](https://exploreghana.onrender.com)  
**Status:** V0 Pilot Live & Deployed — 27 automated tests passing ✅  
**Build Authority:** `../DEVELOPER/TOURISM/07_GROUNDED_BUILD_PLAN.md` — verified data sources, cut list, and grounded V0.5→V1 order (all roadmap claims below follow doc 07)

---

## 🌍 Overview

**ExploreGhana** is a map-first national tourism geoportal designed to solve the critical absence of unified spatial discovery, accurate road access warnings, and official entry tariff documentation for tourist destinations in Ghana.

The **V0 Pilot** focuses on the historic and coastal **Central Region** (Cape Coast, Elmina, Kakum, Assin Manso, and the coastal lagoons), providing interactive spatial discovery across **20 verified tourist attractions** with:

- **GHS entry tariffs** — Ghanaian vs. foreigner pricing per site (compiled at build time; verification protocol applies — see *Data Verification Protocol* below)
- **Road access intelligence** — surface type, rainy-season passability, recommended vehicle (the question Google Maps cannot answer)
- **53 authentic visitor photographs** — sourced from Wikimedia Commons under Creative Commons licenses, stored locally (100% offline-ready, zero broken external links)
- **Rich practical context** — operating hours, best time to visit, guided tour availability, wheelchair accessibility, and what-to-bring lists

---

## 🏛️ System Architecture

```text
[Browser Client (Desktop / Mobile Responsive)]
        │
        ├── MapLibre GL JS v4 (OSM vector tiles + Esri satellite basemap toggle)
        ├── Custom SVG category pins (Castles, Rainforest, Beaches, Culture, Landmarks)
        ├── Dynamic Sidebar (live text search, category filter chips, distance badges)
        ├── "Near Me" GPS proximity search (HTML5 Geolocation API)
        └── Detail Drawer (GHS tariff breakdown, photo gallery carousel,
            WhatsApp sharing, Google Maps navigation)
        │
        ▼ HTTP REST / GeoJSON
[FastAPI Python 3.12 Backend (Async)]
        │
        ├── GET /api/health               (System status & telemetry)
        ├── GET /api/categories           (Category listing with counts)
        ├── GET /api/attractions          (Category, district & keyword search)
        ├── GET /api/attractions/geojson  (OGC GeoJSON FeatureCollection)
        ├── GET /api/attractions/nearby   (Haversine geodesic distance sorting)
        ├── GET /api/attractions/bbox     (Viewport spatial bounding-box clip)
        ├── GET /api/attractions/{id}     (Full attraction dossier)
        └── GET /api/regions              (Central Region administrative polygon)
        │
        ▼
[Spatial Storage Layer]
        ├── In-Memory Haversine Spatial Engine (zero-dependency local execution — V0)
        └── PostgreSQL 15 + PostGIS 3.3 (init_db.sql — schema defined, V1 migration target)
```

> **Honest scope note:** V0 runs entirely on the in-memory Haversine engine.
> The PostGIS schema (`init_db.sql`) and Docker stack are provisioned but not yet
> wired — and per the grounded build plan, PostGIS + pgRouting stay in **local
> Docker** as the production-architecture demo. The hosted V1 does not use a
> hosted database (Render free Postgres expires after 30 days); road layers and
> themed routes are precomputed offline with OSMnx and shipped as static
> GeoJSON. All spatial query semantics (proximity, bbox) are designed to migrate
> 1:1 to `ST_DWithin` / `ST_MakeEnvelope` when a persistent database is warranted.

---

## 🚀 Running Locally

### Prerequisites
- Python 3.10+

```bash
cd explore_ghana
python -m pip install -r requirements.txt
python run.py
```

| URL | Purpose |
|---|---|
| http://localhost:8000 | Interactive geoportal UI |
| http://localhost:8000/docs | Swagger / OpenAPI documentation |
| http://localhost:8000/api/health | Health telemetry |

---

## 🧪 Running the Test Suite

```bash
python -m pip install -r requirements.txt -r requirements-dev.txt
python -m pytest test_main.py -v
```

**27 automated tests, all passing**, covering:

- Every API endpoint — filtering, search, GeoJSON validity, proximity sorting, bbox clipping, 404/422 error paths
- The Haversine spatial engine — known-distance validation (Cape Coast Castle → Elmina Castle ≈ 11.5 km), symmetry, self-distance
- Data integrity — all 20 attractions verified for valid coordinates, tariffs, road access, and no global-state mutation

---

## ✅ API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Healthcheck and active spatial engine diagnostics |
| `GET` | `/api/categories` | Available categories with feature counts |
| `GET` | `/api/attractions` | Filter by `category`, `district`, or `search` |
| `GET` | `/api/attractions/geojson` | OGC GeoJSON FeatureCollection for MapLibre/Leaflet/OpenLayers |
| `GET` | `/api/attractions/nearby` | Spatial proximity: pass `lat`, `lon`, `radius_km` — sorted nearest-first |
| `GET` | `/api/attractions/bbox` | Viewport bounding-box spatial clip |
| `GET` | `/api/attractions/{id}` | Detailed attraction dossier with GHS entry tariffs |
| `GET` | `/api/regions` | Central Region administrative polygon boundary |

**Example spatial query** — attractions within 25 km of Cape Coast Castle, nearest first:

```
GET /api/attractions/nearby?lat=5.1053&lon=-1.2417&radius_km=25
```

---

## ☁️ Deploying Live to the Web (Free on Render)

Deploy ExploreGhana to a public URL (e.g. `exploreghana.onrender.com`) in under 5 minutes:

1. **Push this `explore_ghana` folder to a new GitHub repository.**
2. Log into [Render.com](https://render.com) (free account).
3. Click **New +** → **Web Service** → connect your GitHub repository.
4. Configuration (pre-defined in `render.yaml`):
   - **Environment:** `Python 3.12`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Health Check Path:** `/api/health`
5. Click **Create Web Service** — public HTTPS link in ~2 minutes.

> **Free-tier reality (verified Sept 21, 2026):** free web services spin down after 15 minutes without traffic and take ~1 minute to cold-start on the next request; the filesystem is ephemeral (all data correctly ships inside the repo, so nothing is lost); 750 free instance-hours/month. Fine for a demo — not a production uptime pitch. Do **not** attach a free Render Postgres (it expires after 30 days).

---

## 🐳 Docker Container Execution

To run the FastAPI app in an isolated container:

```bash
docker build -t exploreghana .
docker run -p 8000:8000 exploreghana
```

To run the full FastAPI + PostGIS stack (V1 development target):

```bash
docker-compose up --build
```

---

## 📁 Project Structure

```text
explore_ghana/
├── main.py                 # FastAPI app — all API endpoints
├── database.py             # SpatialRepository — Haversine engine, filters, GeoJSON
├── models.py               # Pydantic domain models (EntryFee, RoadAccess, Attraction)
├── test_main.py            # 27-test pytest suite
├── run.py                  # Local launcher
├── requirements.txt        # Production dependencies
├── requirements-dev.txt    # Test dependencies
├── Dockerfile              # Python 3.12-slim container
├── docker-compose.yml      # FastAPI + PostGIS stack
├── init_db.sql             # PostgreSQL/PostGIS schema (V1 target)
├── render.yaml             # Render.com 1-click deployment
├── Procfile                # Alternative platform deployment
├── data/
│   ├── central_region_attractions.json   # 20 curated attractions
│   └── regions_geojson.json               # Central Region boundary
└── static/
    ├── index.html          # MapLibre GL JS v4 client
    ├── css/  js/
    └── img/attractions/    # 53 local CC photographs + placeholder
```

---

## 🗺️ Roadmap

| Version | Scope |
|---|---|
| **V0 ✅** | Central Region pilot — 20 attractions, map client, proximity search, deploy configs, 27-test suite |
| **V1** | Grounded build (doc 07): geoBoundaries ADM1/ADM2 hierarchy with hash-routed drilldown (CC BY 4.0) · Ashanti Region expansion (~40-60 source-tagged sites) · Kakum Tier-4 pilot with Wildlife-Division-verified fees · OSMnx offline road extraction → static paved/unpaved overlays (surface shown only where OSM tags exist) · precomputed "Cape Coast Heritage Trail" · festival calendar · favorites board |
| **V2** | Ministry pitch layer — admin CMS with auth, offline PWA, editorial guides, analytics, multi-language, cost estimator, booking integration, "Can I Do This?" eligibility engine, destination hero badges |

---

## 📄 Data Verification Protocol

Permanent rule (doc 07): **no source, no publish.**

1. Every published fact carries `source` (URL or org) + `verified_date` in the dataset
2. Fees default to `verified: false` — the UI shows "Confirm current rate on arrival" until flipped
3. Phone numbers are never published without a test call
4. Where sources disagree (e.g., Kakum canopy walkway length: 330 m / 350 m / 370 m across sources), publish the official figure with the source named, or omit

Fee verification authorities: Ghana Wildlife Division ([ghanawildlife.org](https://ghanawildlife.org)) for parks · Ghana Museums and Monuments Board for castles and forts.

---

## 📄 Data Attribution

- Attraction photographs: Wikimedia Commons contributors under Creative Commons licenses (per-site attribution maintained in the detail drawer)
- Basemap tiles: OpenStreetMap contributors (ODbL) · Esri World Imagery · optional free vector basemap via [OpenFreeMap](https://openfreemap.org) (© OpenMapTiles, OSM data)
- V1 boundaries: © geoBoundaries (CC BY 4.0) — attribution will appear in the UI footer
- V1 road network: OpenStreetMap contributors (ODbL), extracted via OSMnx

---

## 📧 Contact

**Emmanuel Yerbo** — emmanuelyerbo@gmail.com
GIS Analyst & Geospatial Data Scientist — transitioning to Full-Stack GIS Development
