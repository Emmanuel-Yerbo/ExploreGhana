"""
ExploreGhana V1.2 API Test Suite — Multi-Region Spatial Geoportal & Grounded Fact Standard
Run with: python -m pytest test_main.py -v
"""
import math
import pytest
from fastapi.testclient import TestClient

from main import app
from database import SpatialRepository, repo

client = TestClient(app)

CAPE_COAST = {"lat": 5.1053, "lon": -1.2417}
KUMASI = {"lat": 6.6885, "lon": -1.6244}
TOTAL_ATTRACTIONS = 45
CENTRAL_ATTRACTIONS = 20
ASHANTI_ATTRACTIONS = 25


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
        assert "Central Region" in body["regions_covered"]
        assert "Ashanti Region" in body["regions_covered"]

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

    def test_returns_central_attractions_by_region_query(self):
        r = client.get("/api/attractions", params={"region": "central"})
        assert r.status_code == 200
        items = r.json()
        assert len(items) == CENTRAL_ATTRACTIONS
        assert all("central" in a["region"].lower() for a in items)

    def test_returns_ashanti_attractions_by_region_query(self):
        r = client.get("/api/attractions", params={"region": "ashanti"})
        assert r.status_code == 200
        items = r.json()
        assert len(items) == ASHANTI_ATTRACTIONS
        assert all("ashanti" in a["region"].lower() for a in items)

    def test_category_filter(self):
        sample_category = "Heritage & Castles"
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

    def test_ashanti_district_filter(self):
        r = client.get("/api/attractions", params={"district": "Kumasi"})
        assert r.status_code == 200
        items = r.json()
        assert len(items) > 0
        assert all("kumasi" in a["district"].lower() for a in items)

    def test_search_matches_known_attraction(self):
        r = client.get("/api/attractions", params={"search": "manhyia"})
        assert r.status_code == 200
        names = " ".join(a["name"].lower() for a in r.json())
        assert "manhyia" in names

    def test_search_no_results_returns_empty_list(self):
        r = client.get("/api/attractions", params={"search": "zzzznotaplace"})
        assert r.status_code == 200
        assert r.json() == []

    def test_get_central_attraction_by_id(self):
        r = client.get("/api/attractions/cape-coast-castle")
        assert r.status_code == 200
        body = r.json()
        assert body["name"] == "Cape Coast Castle"
        assert body["entry_fee_ghs"]["foreigner_adult"] == 150
        assert body["entry_fee_ghs"]["local_adult"] == 30
        assert "Ghana Museums and Monuments Board" in body["source"]
        assert body["verified_date"] == "2026-09-22"
        assert body["entry_fee_ghs"]["fee_verified"] is False

    def test_get_ashanti_attraction_by_id(self):
        r = client.get("/api/attractions/manhyia-palace-museum")
        assert r.status_code == 200
        body = r.json()
        assert body["name"] == "Manhyia Palace Museum"
        assert body["local_name"] == "Manhyia Ahemfie"
        assert body["entry_fee_ghs"]["foreigner_adult"] == 150
        assert "Ghana Tourism Authority" in body["source"]
        assert body["verified_date"] == "2026-09-22"
        assert body["entry_fee_ghs"]["fee_verified"] is False
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

    def test_every_attraction_has_grounded_source_and_date(self):
        for a in repo.attractions:
            assert a.source and len(a.source.strip()) > 3, f"{a.id} missing verified source"
            assert a.verified_date == "2026-09-22", f"{a.id} missing verified_date"
            assert isinstance(a.entry_fee_ghs.fee_verified, bool)
            if a.entry_fee_ghs.foreigner_adult > 0:
                assert a.entry_fee_ghs.fee_verified is False, f"{a.id} paid fee must be unverified estimate"


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

    def test_geojson_respects_region_filter(self):
        r_ashanti = client.get("/api/attractions/geojson", params={"region": "ashanti"})
        assert r_ashanti.status_code == 200
        features = r_ashanti.json()["features"]
        assert len(features) == ASHANTI_ATTRACTIONS
        assert all(f["properties"]["region_id"] == "ashanti" for f in features)

    def test_geojson_feature_geometry_is_valid_point(self):
        r = client.get("/api/attractions/geojson")
        feature = r.json()["features"][0]
        assert feature["type"] == "Feature"
        assert feature["geometry"]["type"] == "Point"
        lon, lat = feature["geometry"]["coordinates"][0], feature["geometry"]["coordinates"][1]
        assert -180.0 <= lon <= 180.0
        assert -90.0 <= lat <= 90.0
        assert feature["properties"]["name"]
        assert feature["properties"]["source"]
        assert feature["properties"]["verified_date"]
        assert feature["properties"]["fee_verified"] is False

    def test_geojson_respects_category_filter(self):
        sample_category = "Nature & Wildlife"
        r = client.get("/api/attractions/geojson", params={"category": sample_category})
        features = r.json()["features"]
        assert len(features) > 0
        assert all(f["properties"]["category"] == sample_category for f in features)


# ---------------------------------------------------------------------------
# Spatial queries
# ---------------------------------------------------------------------------

class TestNearby:
    def test_nearby_cape_coast_returns_sorted_results(self):
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

    def test_nearby_kumasi_returns_ashanti_sites_first(self):
        r = client.get(
            "/api/attractions/nearby",
            params={"lat": KUMASI["lat"], "lon": KUMASI["lon"], "radius_km": 15},
        )
        assert r.status_code == 200
        items = r.json()
        assert len(items) > 0
        assert any("Kumasi" in a["name"] or "Manhyia" in a["name"] or "Sword" in a["name"] for a in items)
        assert all("ashanti" in a["region"].lower() for a in items)

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
    def test_bbox_clips_to_ashanti_region_viewport(self):
        # Bounding box around Kumasi metropolitan area
        r = client.get(
            "/api/attractions/bbox",
            params={"min_lon": -1.75, "min_lat": 6.60, "max_lon": -1.50, "max_lat": 6.80},
        )
        assert r.status_code == 200
        items = r.json()
        assert 0 < len(items) < TOTAL_ATTRACTIONS
        for a in items:
            assert -1.75 <= a["longitude"] <= -1.50
            assert 6.60 <= a["latitude"] <= 6.80

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
    def test_regions_returns_feature_collection_with_16_regions(self):
        r = client.get("/api/regions")
        assert r.status_code == 200
        body = r.json()
        assert body["type"] == "FeatureCollection"
        assert len(body["features"]) == 16
        assert all(f["geometry"]["type"] in ["Polygon", "MultiPolygon"] for f in body["features"])

    def test_get_central_region_by_id(self):
        r = client.get("/api/regions/central")
        assert r.status_code == 200
        feat = r.json()
        assert feat["properties"]["region_id"] == "central"
        assert feat["properties"]["capital"] == "Cape Coast"
        assert feat["properties"]["attraction_count"] == 20

    def test_get_ashanti_region_by_id(self):
        r = client.get("/api/regions/ashanti")
        assert r.status_code == 200
        feat = r.json()
        assert feat["properties"]["region_id"] == "ashanti"
        assert feat["properties"]["capital"] == "Kumasi"
        assert feat["properties"]["attraction_count"] == 25

    def test_unknown_region_returns_404(self):
        r = client.get("/api/regions/atlantis")
        assert r.status_code == 404

    def test_get_central_districts(self):
        r = client.get("/api/regions/central/districts")
        assert r.status_code == 200
        body = r.json()
        assert body["type"] == "FeatureCollection"
        assert len(body["features"]) == 22
        names = [f["properties"]["name"] for f in body["features"]]
        assert any("Cape Coast" in n for n in names)

    def test_get_ashanti_districts(self):
        r = client.get("/api/regions/ashanti/districts")
        assert r.status_code == 200
        body = r.json()
        assert body["type"] == "FeatureCollection"
        assert len(body["features"]) == 43
        names = [f["properties"]["name"] for f in body["features"]]
        assert any("Kumasi" in n for n in names)
        assert any("Ejisu" in n for n in names)


# ---------------------------------------------------------------------------
# Unit tests — spatial engine
# ---------------------------------------------------------------------------

class TestHaversine:
    def test_distance_to_self_is_zero(self):
        d = SpatialRepository.haversine_distance_km(5.1, -1.2, 5.1, -1.2)
        assert d == pytest.approx(0.0, abs=1e-9)

    def test_known_distance_cape_coast_to_kumasi(self):
        # Cape Coast to Kumasi: ~160-180 km great-circle
        d = SpatialRepository.haversine_distance_km(5.1053, -1.2417, 6.6885, -1.6244)
        assert d == pytest.approx(181.0, abs=10.0)

    def test_one_degree_latitude_is_about_111_km(self):
        d = SpatialRepository.haversine_distance_km(0.0, 0.0, 1.0, 0.0)
        assert d == pytest.approx(111.2, abs=1.0)

    def test_is_symmetric(self):
        d1 = SpatialRepository.haversine_distance_km(5.1053, -1.2417, 6.6885, -1.6244)
        d2 = SpatialRepository.haversine_distance_km(6.6885, -1.6244, 5.1053, -1.2417)
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
            assert a.source
            assert a.verified_date

    def test_get_nearby_does_not_mutate_global_state(self):
        before = [a.distance_km for a in repo.attractions]
        repo.get_nearby(lat=5.1053, lon=-1.2417, radius_km=50)
        after = [a.distance_km for a in repo.attractions]
        assert before == after


# ---------------------------------------------------------------------------
# Tier-4 Site Console & Micro-Spatial Pilot (Kakum National Park)
# ---------------------------------------------------------------------------

class TestMicroSpatial:
    def test_kakum_micro_spatial_endpoint_returns_200(self):
        r = client.get("/api/attractions/kakum-national-park/micro-spatial")
        assert r.status_code == 200
        body = r.json()
        assert body["attraction_id"] == "kakum-national-park"
        assert "Kakum National Park" in body["site_name"]
        assert body["region_id"] == "central"
        assert body["geojson"]["type"] == "FeatureCollection"
        assert len(body["geojson"]["features"]) >= 10
        assert "disputed_specifications" in body
        assert "operational_parameters" in body
        assert "physical_safety_protocols" in body
        assert "pre_trip_checklist" in body
        assert "official_contacts" in body

    def test_kakum_micro_spatial_geojson_contains_core_features(self):
        r = client.get("/api/attractions/kakum-national-park/micro-spatial")
        assert r.status_code == 200
        features = r.json()["geojson"]["features"]
        feature_ids = {f["properties"]["id"] for f in features}

        # Core surveyed features from OpenStreetMap
        assert "kakum-parking-lot" in feature_ids
        assert "kakum-reception-office" in feature_ids
        assert "kakum-ticket-office" in feature_ids
        assert "kakum-rainforest-cafeteria" in feature_ids
        assert "kakum-canopy-launch-platform" in feature_ids
        assert "kakum-emergency-bailout" in feature_ids
        assert "kakum-paved-concourse" in feature_ids

        # Geometry validation
        parking = next(f for f in features if f["properties"]["id"] == "kakum-parking-lot")
        assert parking["geometry"]["type"] == "Polygon"
        assert len(parking["geometry"]["coordinates"][0]) >= 4

        launch = next(f for f in features if f["properties"]["id"] == "kakum-canopy-launch-platform")
        assert launch["geometry"]["type"] == "Point"
        assert launch["properties"]["elevation_m"] == 190

    def test_kakum_micro_spatial_disputed_specs_citations(self):
        r = client.get("/api/attractions/kakum-national-park/micro-spatial")
        assert r.status_code == 200
        specs = r.json()["disputed_specifications"]
        length_spec = next(s for s in specs if "Length" in s["parameter"])
        assert length_spec is not None

        sources = {s["source_name"]: s["stated_value"] for s in length_spec["sources"]}
        assert "Ghana Wildlife Division (Official)" in sources
        assert "Wikipedia (Lead Section)" in sources
        assert "Wikipedia (Article Body)" in sources
        assert sources["Ghana Wildlife Division (Official)"] == "370 meters"
        assert sources["Wikipedia (Lead Section)"] == "350 meters"
        assert sources["Wikipedia (Article Body)"] == "330 meters"

    def test_kakum_micro_spatial_checklist_completeness(self):
        r = client.get("/api/attractions/kakum-national-park/micro-spatial")
        assert r.status_code == 200
        checklist = r.json()["pre_trip_checklist"]
        assert len(checklist) == 6

        chk_ids = {c["id"] for c in checklist}
        assert "chk-backpack" in chk_ids
        assert "chk-footwear" in chk_ids
        assert "chk-water" in chk_ids
        assert "chk-cash" in chk_ids

        # Mandatory items
        backpack = next(c for c in checklist if c["id"] == "chk-backpack")
        assert backpack["mandatory"] is True
        footwear = next(c for c in checklist if c["id"] == "chk-footwear")
        assert footwear["mandatory"] is True

    def test_kakum_micro_spatial_safety_protocols(self):
        r = client.get("/api/attractions/kakum-national-park/micro-spatial")
        assert r.status_code == 200
        protocols = r.json()["physical_safety_protocols"]
        assert "MANDATORY" in protocols["hands_free_rule"]
        assert "Closed-toe" in protocols["footwear_requirement"]
        assert "Bridge 1" in protocols["acrophobia_exit_spur"]

    def test_unknown_attraction_micro_spatial_returns_404(self):
        r = client.get("/api/attractions/cape-coast-castle/micro-spatial")
        assert r.status_code == 404
        assert "detail" in r.json()

    def test_kakum_story_chapters_and_vertical_stratification(self):
        r = client.get("/api/attractions/kakum-national-park/micro-spatial")
        assert r.status_code == 200
        data = r.json()

        # Story Chapters
        chapters = data["story_chapters"]
        assert len(chapters) == 5
        act_numbers = [c["act_number"] for c in chapters]
        assert act_numbers == [1, 2, 3, 4, 5]
        assert "Island of Green" in chapters[0]["act_title"]
        assert "Suspended in the Crown" in chapters[3]["act_title"]
        assert chapters[3]["camera"]["pitch"] >= 50

        # Vertical Stratification
        strata = data["vertical_stratification"]
        assert len(strata) == 4
        assert strata[0]["stratum"] == "Emergent Layer"
        assert strata[3]["stratum"] == "The Forest Floor"
        assert strata[0]["sunlight_pct"] == 100
        assert strata[3]["sunlight_pct"] <= 5

        # Eligibility Criteria
        elig = data["eligibility_criteria"]
        assert len(elig) == 4
        elig_ids = {e["id"] for e in elig}
        assert "acrophobia" in elig_ids
        assert "children" in elig_ids
        assert "elderly" in elig_ids
        assert "rain" in elig_ids

    def test_kakum_boundary_endpoint(self):
        r = client.get("/api/attractions/kakum-national-park/boundary")
        assert r.status_code == 200
        data = r.json()
        assert data["type"] == "FeatureCollection"
        assert len(data["features"]) >= 1
        poly = data["features"][0]
        assert poly["geometry"]["type"] in ["Polygon", "MultiPolygon"]
        assert "Kakum National Park" in poly["properties"]["name"]

    def test_kakum_7_bridges_present_in_geojson(self):
        r = client.get("/api/attractions/kakum-national-park/micro-spatial")
        assert r.status_code == 200
        features = r.json()["geojson"]["features"]
        bridge_features = [f for f in features if f["properties"].get("category") == "canopy_bridge"]
        assert len(bridge_features) == 7
        bridge_indices = {f["properties"]["bridge_index"] for f in bridge_features}
        assert bridge_indices == {1, 2, 3, 4, 5, 6, 7}

    def test_story_chapters_extended_attributes(self):
        r = client.get("/api/attractions/kakum-national-park/micro-spatial")
        assert r.status_code == 200
        chapters = r.json()["story_chapters"]
        for ch in chapters:
            assert "camera" in ch
            assert "transition" in ch["camera"]
            assert "focus_features" in ch
            assert "media" in ch
            assert "image" in ch["media"]
            assert "narrative_sources" in ch
            assert len(ch["narrative_sources"]) >= 1




