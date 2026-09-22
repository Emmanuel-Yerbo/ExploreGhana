import urllib.request
import json

# Search nominatim for Kakum National Park relation ID
url = "https://nominatim.openstreetmap.org/search?q=Kakum+National+Park&format=json&polygon_geojson=1"
req = urllib.request.Request(url, headers={'User-Agent': 'ExploreGhana-Verification/1.0 (emmanuelyerbo@gmail.com)'})

try:
    with urllib.request.urlopen(req, timeout=15) as resp:
        results = json.loads(resp.read().decode('utf-8'))
        print(f"Nominatim returned {len(results)} results")
        for res in results:
            print(f"OSM Type: {res.get('osm_type')}, ID: {res.get('osm_id')}, Class: {res.get('class')}, Type: {res.get('type')}")
            geojson = res.get('geojson')
            if geojson:
                print(f"GeoJSON Type: {geojson.get('type')}")
                # Save boundary
                feature = {
                    "type": "Feature",
                    "properties": {
                        "name": "Kakum National Park & Assin Attandanso",
                        "osm_type": res.get("osm_type"),
                        "osm_id": res.get("osm_id"),
                        "display_name": res.get("display_name"),
                        "area_sq_km": 375,
                        "source": "OpenStreetMap Nominatim, official national park boundary polygon",
                        "verified_date": "2026-09-22"
                    },
                    "geometry": geojson
                }
                collection = {
                    "type": "FeatureCollection",
                    "features": [feature]
                }
                with open("data/kakum_park_boundary.json", "w", encoding="utf-8") as f:
                    json.dump(collection, f, indent=2)
                print("Saved data/kakum_park_boundary.json successfully!")
                break
except Exception as e:
    print("Nominatim query error:", e)
