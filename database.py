import json
import math
import os
from pathlib import Path
from typing import List, Optional, Tuple, Dict, Any
from models import Attraction, EntryFee, RoadAccess, AttractionGeoJSONCollection, AttractionGeoJSONFeature

DATA_DIR = Path(__file__).parent / "data"
ATTRACTIONS_FILE = DATA_DIR / "central_region_attractions.json"
REGIONS_FILE = DATA_DIR / "regions_geojson.json"

class SpatialRepository:
    """
    Spatial Data Repository for ExploreGhana.
    Provides in-memory geodesic spatial queries (Haversine distance, bbox clipping)
    and loads verified geospatial seed data.
    """
    def __init__(self):
        self.attractions: List[Attraction] = []
        self.regions_geojson: Dict[str, Any] = {}
        self.reload_data()

    def reload_data(self):
        # Load attractions
        if ATTRACTIONS_FILE.exists():
            with open(ATTRACTIONS_FILE, "r", encoding="utf-8") as f:
                raw_data = json.load(f)
                self.attractions = [Attraction(**item) for item in raw_data]
        else:
            self.attractions = []

        # Load region boundaries
        if REGIONS_FILE.exists():
            with open(REGIONS_FILE, "r", encoding="utf-8") as f:
                self.regions_geojson = json.load(f)
        else:
            self.regions_geojson = {"type": "FeatureCollection", "features": []}

    @staticmethod
    def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """
        Calculates the great-circle distance between two points on the Earth's surface
        using the Haversine formula.
        Radius of Earth = 6371.0 km
        """
        r = 6371.0
        phi1 = math.radians(lat1)
        phi2 = math.radians(lat2)
        delta_phi = math.radians(lat2 - lat1)
        delta_lambda = math.radians(lon2 - lon1)

        a = (
            math.sin(delta_phi / 2.0) ** 2
            + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
        )
        c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
        return r * c

    def get_all(
        self,
        category: Optional[str] = None,
        district: Optional[str] = None,
        search: Optional[str] = None,
        tags: Optional[List[str]] = None,
    ) -> List[Attraction]:
        """
        Retrieve attractions with optional categorical, district, and textual filters.
        """
        results = self.attractions

        if category and category.lower() != "all":
            results = [a for a in results if a.category.lower() == category.lower()]

        if district:
            results = [a for a in results if district.lower() in a.district.lower()]

        if search:
            query = search.strip().lower()
            results = [
                a
                for a in results
                if query in a.name.lower()
                or (a.local_name and query in a.local_name.lower())
                or query in a.description.lower()
                or query in a.district.lower()
                or any(query in t.lower() for t in a.tags)
            ]

        if tags:
            tag_set = {t.lower() for t in tags}
            results = [
                a for a in results if any(t.lower() in tag_set for t in a.tags)
            ]

        return results

    def get_by_id(self, attraction_id: str) -> Optional[Attraction]:
        for a in self.attractions:
            if a.id == attraction_id:
                return a
        return None

    def get_nearby(
        self,
        lat: float,
        lon: float,
        radius_km: float = 25.0,
        category: Optional[str] = None,
        limit: int = 15,
    ) -> List[Attraction]:
        """
        Spatial Proximity Query:
        Computes geodesic distances from (lat, lon) to all candidate attractions,
        filters by maximum radius, and returns ordered by closest distance.
        """
        candidates = self.get_all(category=category)
        nearby_list: List[Tuple[float, Attraction]] = []

        for item in candidates:
            dist = self.haversine_distance_km(lat, lon, item.latitude, item.longitude)
            if dist <= radius_km:
                item_copy = item.model_copy()
                item_copy.distance_km = round(dist, 2)
                nearby_list.append((dist, item_copy))

        # Sort ascending by distance
        nearby_list.sort(key=lambda x: x[0])
        return [item for _, item in nearby_list[:limit]]

    def get_within_bbox(
        self,
        min_lon: float,
        min_lat: float,
        max_lon: float,
        max_lat: float,
        category: Optional[str] = None,
    ) -> List[Attraction]:
        """
        Spatial Bounding Box Query:
        Retrieves all features falling strictly within the specified viewport extent.
        """
        candidates = self.get_all(category=category)
        return [
            a
            for a in candidates
            if min_lon <= a.longitude <= max_lon and min_lat <= a.latitude <= max_lat
        ]

    def to_geojson(self, attractions: List[Attraction]) -> AttractionGeoJSONCollection:
        """
        Converts a list of Attraction domain models into standard OGC GeoJSON FeatureCollection.
        """
        features: List[AttractionGeoJSONFeature] = []
        for a in attractions:
            feature = AttractionGeoJSONFeature(
                id=a.id,
                geometry={
                    "type": "Point",
                    "coordinates": [a.longitude, a.latitude, a.elevation_m or 0],
                },
                properties={
                    "id": a.id,
                    "name": a.name,
                    "local_name": a.local_name,
                    "category": a.category,
                    "region": a.region,
                    "district": a.district,
                    "description": a.description,
                    "entry_fee_ghs": a.entry_fee_ghs.model_dump(),
                    "opening_hours": a.opening_hours,
                    "contact_phone": a.contact_phone,
                    "best_time_to_visit": a.best_time_to_visit,
                    "duration_hours": a.duration_hours,
                    "guided_tours": a.guided_tours,
                    "wheelchair_accessible": a.wheelchair_accessible,
                    "tags": a.tags,
                    "image_url": a.image_url,
                    "road_surface": a.road_access.surface,
                    "passable_rainy": a.road_access.passable_rainy_season,
                    "vehicle": a.road_access.vehicle_recommended,
                    "distance_km": a.distance_km,
                },
            )
            features.append(feature)

        return AttractionGeoJSONCollection(features=features)

    def get_categories(self) -> List[Dict[str, Any]]:
        """
        Returns list of categories with counts for filter UI badges.
        """
        counts: Dict[str, int] = {}
        for a in self.attractions:
            counts[a.category] = counts.get(a.category, 0) + 1

        return [
            {"name": name, "count": count}
            for name, count in sorted(counts.items(), key=lambda x: x[0])
        ]

# Global singleton repository
repo = SpatialRepository()
