from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pathlib import Path
from typing import Optional, List, Dict, Any

from models import Attraction, AttractionGeoJSONCollection, SystemHealth, MicroSpatialResponse
from database import repo

BASE_DIR = Path(__file__).parent
STATIC_DIR = BASE_DIR / "static"

app = FastAPI(
    title="ExploreGhana Tourism Geoportal API",
    description="Official REST & Spatial API for Ghana Ministry of Tourism — Central Region V0 Pilot",
    version="0.1.0",
    contact={
        "name": "Emmanuel Yerbo",
        "email": "emmanuelyerbo@gmail.com",
    },
)

# Enable Cross-Origin Resource Sharing (CORS) for external clients/dashboards
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET"],
    allow_headers=["*"],
)

# Mount static web directory
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

@app.get("/", include_in_schema=False)
async def serve_index():
    """Serves the interactive MapLibre GL JS frontend."""
    index_file = STATIC_DIR / "index.html"
    if index_file.exists():
        return FileResponse(index_file)
    return {"message": "ExploreGhana API is online. Frontend UI under /static/index.html"}

@app.get("/api/health", response_model=SystemHealth, tags=["System"])
async def health_check():
    """Health check endpoint for container uptime and data status."""
    return SystemHealth(
        status="healthy",
        service="ExploreGhana Tourism Geoportal",
        version="0.3.0-V1.3",
        total_attractions=len(repo.attractions),
        regions_covered=["Central Region", "Ashanti Region"],
        spatial_engine="In-Memory Haversine Engine & Tier-4 Micro-Spatial Vector Engine",
    )

@app.get("/api/categories", response_model=List[Dict[str, Any]], tags=["Attractions"])
async def list_categories():
    """Returns all available attraction categories and their feature counts."""
    return repo.get_categories()

@app.get("/api/regions", tags=["Geospatial Boundaries"])
async def get_regions_geojson():
    """Returns the administrative boundary GeoJSON FeatureCollection for all 16 regions of Ghana."""
    return repo.regions_geojson

@app.get("/api/regions/{region_id}", tags=["Geospatial Boundaries"])
async def get_region_details(region_id: str):
    """Retrieve detailed boundary and metadata for a single administrative region by slug ID."""
    region = repo.get_region_by_id(region_id)
    if not region:
        raise HTTPException(status_code=404, detail=f"Region '{region_id}' not found")
    return region

@app.get("/api/regions/{region_id}/districts", tags=["Geospatial Boundaries"])
async def get_region_districts(region_id: str):
    """Retrieve district (ADM2) boundary GeoJSON FeatureCollection for a specified region."""
    region = repo.get_region_by_id(region_id)
    if not region:
        raise HTTPException(status_code=404, detail=f"Region '{region_id}' not found")
    return repo.get_districts_by_region(region_id)

@app.get("/api/attractions", response_model=List[Attraction], tags=["Attractions"])
async def get_attractions(
    region: Optional[str] = Query(None, description="Filter by region (e.g. 'central', 'ashanti')"),
    category: Optional[str] = Query(None, description="Filter by category (e.g. 'Heritage & Castles', 'Nature & Wildlife', 'Beaches & Coastal')"),
    district: Optional[str] = Query(None, description="Filter by district name"),
    search: Optional[str] = Query(None, description="Case-insensitive text search across names, descriptions, and tags"),
):
    """
    Retrieve tourist attractions with optional region, category, district, and search query filters.
    """
    return repo.get_all(region_id=region, category=category, district=district, search=search)

@app.get("/api/attractions/geojson", response_model=AttractionGeoJSONCollection, tags=["Geospatial Layers"])
async def get_attractions_geojson(
    region: Optional[str] = Query(None, description="Filter by region"),
    category: Optional[str] = Query(None, description="Filter by category"),
    search: Optional[str] = Query(None, description="Keyword search"),
):
    """
    Returns attractions formatted directly as a standard GeoJSON FeatureCollection.
    Ideal for direct consumption by MapLibre GL, Leaflet, or OpenLayers.
    """
    filtered = repo.get_all(region_id=region, category=category, search=search)
    return repo.to_geojson(filtered)

@app.get("/api/attractions/nearby", response_model=List[Attraction], tags=["Spatial Proximity"])
async def get_nearby_attractions(
    lat: float = Query(..., ge=-90.0, le=90.0, description="User or query latitude in decimal degrees"),
    lon: float = Query(..., ge=-180.0, le=180.0, description="User or query longitude in decimal degrees"),
    radius_km: float = Query(30.0, gt=0, le=250.0, description="Search radius in kilometers"),
    category: Optional[str] = Query(None, description="Optional category filter"),
    limit: int = Query(10, ge=1, le=50, description="Maximum number of nearest points to return"),
):
    """
    Spatial Proximity Query:
    Returns tourist attractions within radius_km of (lat, lon), sorted by nearest distance first.
    Includes distance_km property for each result.
    """
    return repo.get_nearby(lat=lat, lon=lon, radius_km=radius_km, category=category, limit=limit)

@app.get("/api/attractions/bbox", response_model=List[Attraction], tags=["Spatial Extent"])
async def get_attractions_in_bbox(
    min_lon: float = Query(..., description="Western boundary longitude"),
    min_lat: float = Query(..., description="Southern boundary latitude"),
    max_lon: float = Query(..., description="Eastern boundary longitude"),
    max_lat: float = Query(..., description="Northern boundary latitude"),
    category: Optional[str] = Query(None, description="Optional category filter"),
):
    """
    Spatial Bounding Box Query:
    Returns attractions located within the specified bounding box coordinates.
    """
    return repo.get_within_bbox(
        min_lon=min_lon, min_lat=min_lat, max_lon=max_lon, max_lat=max_lat, category=category
    )

@app.get("/api/attractions/{attraction_id}", response_model=Attraction, tags=["Attractions"])
async def get_attraction_by_id(attraction_id: str):
    """
    Retrieve full details for a single tourist attraction by its slug/id.
    """
    item = repo.get_by_id(attraction_id)
    if not item:
        raise HTTPException(status_code=404, detail=f"Attraction '{attraction_id}' not found")
    return item

@app.get(
    "/api/attractions/{attraction_id}/micro-spatial",
    response_model=MicroSpatialResponse,
    tags=["Tier-4 Micro-Spatial"],
)
async def get_attraction_micro_spatial(attraction_id: str):
    """
    Retrieve Tier-4 site-level micro-spatial dataset, surveyed micro-POIs,
    operational parameters, transparently attributed specifications, and pre-trip checklist.
    """
    data = repo.get_micro_spatial(attraction_id)
    if not data:
        raise HTTPException(
            status_code=404,
            detail=f"Micro-spatial dataset not available for '{attraction_id}'. Tier-4 pilot currently active for 'kakum-national-park'.",
        )
    return data

@app.get(
    "/api/attractions/{attraction_id}/boundary",
    tags=["Tier-4 Micro-Spatial"],
)
async def get_attraction_boundary(attraction_id: str):
    """
    Retrieve macro boundary polygon for supported protected areas / parks.
    """
    data = repo.get_park_boundary(attraction_id)
    if not data:
        raise HTTPException(
            status_code=404,
            detail=f"Boundary polygon not available for '{attraction_id}'.",
        )
    return data

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
