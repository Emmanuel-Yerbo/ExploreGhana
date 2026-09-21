"""
ExploreGhana V0 API Test Suite
Run with: python -m pytest test_main.py -v
"""
import math

import pytest
from fastapi.testclient import TestClient

from main import app
from database import SpatialRepository, repo

client = TestClient(app)

CAPE_COAST = {"lat": 5.1053, "lon": -1.2417}
TOTAL_ATTRACTIONS = 20


# ---------------------------------------------------------------------------
# System
# ---------------------------------------------------------------------------

class TestSystem:
    def test_health_endpoint_returns_healthy(self):
        r = client.get("/api/health")
        assert r.status_code == 200
        body = r.json()
        assert body["status"] == "healthy"
        assert body["service"] == "ExploreGhana Tourism Geoportal"
        assert body["total_attractions"] == TOTAL_ATTRACTIONS
        assert "Central Region" in body["regions_covered"][0]

    def test_root_serves_frontend(self):
        r = client.get("/")
        assert r.status_code == 200
        assert "text/html" in r.headers["content-type"]


# ---------------------------------------------------------------------------
# Attractions — listing & filtering
# ---------------------------------------------------------------------------

class TestAttractions:
    def test_returns_all_attractions(self):
        r = client.get("/api/attractions")
        assert r.status_code == 200
        assert len(r.json()) == TOTAL_ATTRACTIONS

    def test_category_filter(self):
        sample_category = repo.attractions[0].category
        r = client.get("/api/attractions", params={"category": sample_category})
        assert r.status_code == 200
        items = r.json()
        assert len(items) > 0
        assert all(a["category"] == sample_category for a in items)

    def test_district_filter_is_substring_match(self):
        r = client.get("/api/attractions", params={"district": "Cape Coast"})
        assert r.status_code == 200
        items = r.json()
        assert len(items) > 0
        assert all("cape coast" in a["district"].lower() for a in items)

    def test_search_matches_known_attraction(self):
        r = client.get("/api/attractions", params={"search": "kakum"})
        assert r.status_code == 200
        names = " ".join(a["name"].lower() for a in r.json())
        assert "kakum" in names

    def test_search_no_results_returns_empty_list(self):
        r = client.get("/api/attractions", params={"search": "zzzznotaplace"})
        assert r.status_code == 200
        assert r.json() == []

    def test_get_attraction_by_id(self):
        r = client.get("/api/attractions/cape-coast-castle")
        assert r.status_code == 200
        body = r.json()
        assert body["name"] == "Cape Coast Castle"
        assert body["entry_fee_ghs"]["foreigner_adult"] == 150
        assert body["entry_fee_ghs"]["local_adult"] == 30
        assert body["road_access"]["surface"].startswith("Paved")

    def test_get_attraction_unknown_id_returns_404(self):
        r = client.get("/api/attractions/does-not-exist")
        assert r.status_code == 404
        assert "not found" in r.json()["detail"]

    def test_categories_endpoint(self):
        r = client.get("/api/categories")
        assert r.status_code == 200
        items = r.json()
        assert len(items) > 0
        assert sum(c["count"] for c in items) == TOTAL_ATTRACTIONS
        assert all("name" in c and "count" in c for c in items)


# ---------------------------------------------------------------------------
# GeoJSON
# ---------------------------------------------------------------------------

class TestGeoJSON:
    def test_geojson_collection_structure(self):
        r = client.get("/api/attractions/geojson")
        assert r.status_code == 200
        body = r.json()
        assert body["type"] == "FeatureCollection"
        assert len(body["features"]) == TOTAL_ATTRACTIONS

    def test_geojson_feature_geometry_is_valid_point(self):
        r = client.get("/api/attractions/geojson")
        feature = r.json()["features"][0]
        assert feature["type"] == "Feature"
        assert feature["geometry"]["type"] == "Point"
        lon, lat = feature["geometry"]["coordinates"][0], feature["geometry"]["coordinates"][1]
        assert -180.0 <= lon <= 180.0
        assert -90.0 <= lat <= 90.0
        assert feature["properties"]["name"]

    def test_geojson_respects_category_filter(self):
        sample_category = repo.attractions[0].category
        r = client.get("/api/attractions/geojson", params={"category": sample_category})
        features = r.json()["features"]
        assert len(features) > 0
        assert all(f["properties"]["category"] == sample_category for f in features)


# ---------------------------------------------------------------------------
# Spatial queries
# ---------------------------------------------------------------------------

class TestNearby:
    def test_nearby_returns_sorted_results_with_distance(self):
        r = client.get(
            "/api/attractions/nearby",
            params={"lat": CAPE_COAST["lat"], "lon": CAPE_COAST["lon"], "radius_km": 50},
        )
        assert r.status_code == 200
        items = r.json()
        assert len(items) > 0
        distances = [a["distance_km"] for a in items]
        assert distances == sorted(distances), "results must be sorted nearest-first"
        assert all(a["distance_km"] <= 50 for a in items)

    def test_nearby_cape_coast_returns_castle_first(self):
        r = client.get(
            "/api/attractions/nearby",
            params={"lat": CAPE_COAST["lat"], "lon": CAPE_COAST["lon"], "radius_km": 10},
        )
        assert r.status_code == 200
        assert "Cape Coast Castle" in r.json()[0]["name"]

    def test_nearby_zero_radius_returns_empty(self):
        r = client.get(
            "/api/attractions/nearby",
            params={"lat": 0.0, "lon": 0.0, "radius_km": 1},
        )
        assert r.status_code == 200
        assert r.json() == []

    def test_nearby_rejects_out_of_range_coordinates(self):
        r = client.get("/api/attractions/nearby", params={"lat": 999, "lon": 0, "radius_km": 10})
        assert r.status_code == 422


class TestBBox:
    def test_bbox_clips_to_central_region_viewport(self):
        # Bounding box covering Cape Coast / Elmina coastal strip
        r = client.get(
            "/api/attractions/bbox",
            params={"min_lon": -1.5, "min_lat": 5.0, "max_lon": -1.1, "max_lat": 5.2},
        )
        assert r.status_code == 200
        items = r.json()
        assert 0 < len(items) < TOTAL_ATTRACTIONS
        for a in items:
            assert -1.5 <= a["longitude"] <= -1.1
            assert 5.0 <= a["latitude"] <= 5.2

    def test_bbox_world_extent_returns_all(self):
        r = client.get(
            "/api/attractions/bbox",
            params={"min_lon": -180, "min_lat": -90, "max_lon": 180, "max_lat": 90},
        )
        assert r.status_code == 200
        assert len(r.json()) == TOTAL_ATTRACTIONS


# ---------------------------------------------------------------------------
# Regions
# ---------------------------------------------------------------------------

class TestRegions:
    def test_regions_returns_feature_collection(self):
        r = client.get("/api/regions")
        assert r.status_code == 200
        body = r.json()
        assert body["type"] == "FeatureCollection"
        assert len(body["features"]) > 0
        assert body["features"][0]["geometry"]["type"] == "Polygon"


# ---------------------------------------------------------------------------
# Unit tests — spatial engine
# ---------------------------------------------------------------------------

class TestHaversine:
    def test_distance_to_self_is_zero(self):
        d = SpatialRepository.haversine_distance_km(5.1, -1.2, 5.1, -1.2)
        assert d == pytest.approx(0.0, abs=1e-9)

    def test_known_distance_cape_coast_to_elmina(self):
        # Cape Coast Castle to Elmina Castle: ~11.4 km great-circle
        d = SpatialRepository.haversine_distance_km(5.1053, -1.2417, 5.0827, -1.3482)
        assert d == pytest.approx(11.5, abs=1.0)

    def test_one_degree_latitude_is_about_111_km(self):
        d = SpatialRepository.haversine_distance_km(0.0, 0.0, 1.0, 0.0)
        assert d == pytest.approx(111.2, abs=1.0)

    def test_is_symmetric(self):
        d1 = SpatialRepository.haversine_distance_km(5.1053, -1.2417, 5.52, -1.26)
        d2 = SpatialRepository.haversine_distance_km(5.52, -1.26, 5.1053, -1.2417)
        assert d1 == pytest.approx(d2, abs=1e-9)


class TestRepository:
    def test_repository_is_preloaded(self):
        assert len(repo.attractions) == TOTAL_ATTRACTIONS
        assert repo.regions_geojson["type"] == "FeatureCollection"

    def test_every_attraction_has_required_fields(self):
        for a in repo.attractions:
            assert a.id and a.name and a.category and a.district
            assert -180.0 <= a.longitude <= 180.0
            assert -90.0 <= a.latitude <= 90.0
            assert a.entry_fee_ghs.foreigner_adult >= 0
            assert a.road_access.surface

    def test_get_nearby_does_not_mutate_global_state(self):
        before = [a.distance_km for a in repo.attractions]
        repo.get_nearby(lat=5.1053, lon=-1.2417, radius_km=50)
        after = [a.distance_km for a in repo.attractions]
        assert before == after
