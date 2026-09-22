"""
ExploreGhana — Boundary Processing Script
Downloads and processes official geoBoundaries ADM1 (16 Regions) and ADM2 (Districts)
for multi-scale spatial hierarchy navigation.
"""
import json
import urllib.request
import re
from shapely.geometry import shape, mapping

ADM1_URL = "https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbOpen/GHA/ADM1/geoBoundaries-GHA-ADM1_simplified.geojson"
ADM2_URL = "https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbOpen/GHA/ADM2/geoBoundaries-GHA-ADM2_simplified.geojson"

REGION_METADATA = {
    "Central Region": {
        "id": "central",
        "short_name": "Central",
        "capital": "Cape Coast",
        "capital_coords": [-1.2464, 5.1053],
        "tourism_status": "active_pilot",
        "attraction_count": 20,
        "tagline": "The Cradle of Historic Heritage and Tropical Coastal Wonder",
        "highlights": ["Cape Coast Castle", "Kakum Canopy Walkway", "Elmina Castle", "Brenu Beach"]
    },
    "Ashanti Region": {
        "id": "ashanti",
        "short_name": "Ashanti",
        "capital": "Kumasi",
        "capital_coords": [-1.6244, 6.6885],
        "tourism_status": "planned_v1_2",
        "attraction_count": 0,
        "tagline": "The Golden Kingdom of Asante Craftsmanship and Royal Heritage",
        "highlights": ["Manhyia Palace", "Lake Bosomtwe", "Bonwire Kente Weaving"]
    },
    "Greater Accra Region": {
        "id": "greater-accra",
        "short_name": "Greater Accra",
        "capital": "Accra",
        "capital_coords": [-0.1870, 5.6037],
        "tourism_status": "roadmap",
        "attraction_count": 0,
        "tagline": "Vibrant Atlantic Gateway, Arts, and Cosmopolitan Beats",
        "highlights": ["Black Star Square", "Kwame Nkrumah Memorial", "Jamestown"]
    },
    "Eastern Region": {
        "id": "eastern",
        "short_name": "Eastern",
        "capital": "Koforidua",
        "capital_coords": [-0.2591, 6.0784],
        "tourism_status": "roadmap",
        "attraction_count": 0,
        "tagline": "Breathtaking Waterfalls, Botanical Sanctuaries and Mountain Mist",
        "highlights": ["Aburi Botanical Gardens", "Boti Falls", "Umbrella Rock"]
    },
    "Volta Region": {
        "id": "volta",
        "short_name": "Volta",
        "capital": "Ho",
        "capital_coords": [0.4713, 6.6111],
        "tourism_status": "roadmap",
        "attraction_count": 0,
        "tagline": "Verdant Peaks, Cascading Falls, and Serene Riverine Trails",
        "highlights": ["Mount Afadja", "Wli Waterfalls", "Tafi Atome Monkey Sanctuary"]
    },
    "Western Region": {
        "id": "western",
        "short_name": "Western",
        "capital": "Sekondi-Takoradi",
        "capital_coords": [-1.7554, 4.9340],
        "tourism_status": "roadmap",
        "attraction_count": 0,
        "tagline": "Pristine Golden Beaches, Stilt Villages, and Rain Forests",
        "highlights": ["Nzulezo Stilt Village", "Ankasa Conservation Area", "Busua Beach"]
    },
    "Northern Region": {
        "id": "northern",
        "short_name": "Northern",
        "capital": "Tamale",
        "capital_coords": [-0.8393, 9.4008],
        "tourism_status": "roadmap",
        "attraction_count": 0,
        "tagline": "Ancient Sudanic Earth Mosques and Savanna Safari Corridors",
        "highlights": ["Larabanga Ancient Mosque", "Mole National Park Gateway"]
    },
    "Savannah Region": {
        "id": "savannah",
        "short_name": "Savannah",
        "capital": "Damongo",
        "capital_coords": [-1.8219, 9.0833],
        "tourism_status": "roadmap",
        "attraction_count": 0,
        "tagline": "Ghana's Premier Wildlife Safari and Elephant Sanctuary",
        "highlights": ["Mole National Park", "Mystic Stone", "Salaga Slave Market"]
    },
    "Upper East Region": {
        "id": "upper-east",
        "short_name": "Upper East",
        "capital": "Bolgatanga",
        "capital_coords": [-0.8514, 10.7856],
        "tourism_status": "roadmap",
        "attraction_count": 0,
        "tagline": "Paga Sacred Crocodiles, Traditional Basketry, and Savanna Rocks",
        "highlights": ["Paga Crocodile Pond", "Tongo Hills & Whispering Rocks"]
    },
    "Upper West Region": {
        "id": "upper-west",
        "short_name": "Upper West",
        "capital": "Wa",
        "capital_coords": [-2.5019, 10.0607],
        "tourism_status": "roadmap",
        "attraction_count": 0,
        "tagline": "Sudanic Palaces, Hippo Sanctuaries, and Trans-Saharan Trade Lore",
        "highlights": ["Wa Naa Palace", "Wechiau Hippo Sanctuary"]
    },
    "Bono Region": {
        "id": "bono",
        "short_name": "Bono",
        "capital": "Sunyani",
        "capital_coords": [-2.3268, 7.3399],
        "tourism_status": "roadmap",
        "attraction_count": 0,
        "tagline": "The Breadbasket of Ghana and Sacred Monkey Groves",
        "highlights": ["Buabeng-Fiema Monkey Sanctuary", "Sunyani Cocoa Landscapes"]
    },
    "Bono East Region": {
        "id": "bono-east",
        "short_name": "Bono East",
        "capital": "Techiman",
        "capital_coords": [-1.9400, 7.5833],
        "tourism_status": "roadmap",
        "attraction_count": 0,
        "tagline": "Historic Commercial Crossroads and Sacred Waterfalls",
        "highlights": ["Kintampo Waterfalls", "Fuller Falls", "Techiman Market"]
    },
    "Ahafo Region": {
        "id": "ahafo",
        "short_name": "Ahafo",
        "capital": "Goaso",
        "capital_coords": [-2.5167, 6.8000],
        "tourism_status": "roadmap",
        "attraction_count": 0,
        "tagline": "Lush Forest Reserves, Timberlands, and Quiet Agro-tourism",
        "highlights": ["Mim Rock", "Goaso Forest Reserves"]
    },
    "Oti Region": {
        "id": "oti",
        "short_name": "Oti",
        "capital": "Dambai",
        "capital_coords": [0.1833, 8.0667],
        "tourism_status": "roadmap",
        "attraction_count": 0,
        "tagline": "Lake Volta Riverine Landscapes, Hills, and Cultural Crossroads",
        "highlights": ["Lake Volta Crossings", "Kyabobo National Park"]
    },
    "North East Region": {
        "id": "north-east",
        "short_name": "North East",
        "capital": "Nalerigu",
        "capital_coords": [-0.3667, 10.5333],
        "tourism_status": "roadmap",
        "attraction_count": 0,
        "tagline": "The Gambaga Scarp Escarpment and Pre-colonial Defense Architecture",
        "highlights": ["Gambaga Scarp", "Naa Jeringa Defence Wall"]
    },
    "Western North Region": {
        "id": "western-north",
        "short_name": "Western North",
        "capital": "Sefwi Wiawso",
        "capital_coords": [-2.4833, 6.2000],
        "tourism_status": "roadmap",
        "attraction_count": 0,
        "tagline": "Tropical Rainforest Heartlands and Giant Trees",
        "highlights": ["Sefwi Wiawso Tree of God", "Bia National Park"]
    }
}

def slugify(text):
    text = text.lower()
    text = re.sub(r'[^a-z0-9]+', '-', text)
    return text.strip('-')

def main():
    print("1. Downloading geoBoundaries ADM1 simplified...")
    req1 = urllib.request.Request(ADM1_URL, headers={"User-Agent": "ExploreGhana/1.1"})
    with urllib.request.urlopen(req1) as resp:
        adm1_raw = json.loads(resp.read().decode('utf-8'))
    
    print(f"   Downloaded {len(adm1_raw['features'])} ADM1 region polygons.")

    # Process ADM1
    enriched_regions = []
    central_polygon = None

    for feat in adm1_raw['features']:
        raw_name = feat['properties']['shapeName']
        geom = shape(feat['geometry'])
        bounds = geom.bounds # (minx, miny, maxx, maxy) -> (min_lon, min_lat, max_lon, max_lat)

        meta = REGION_METADATA.get(raw_name, {
            "id": slugify(raw_name.replace(" Region", "")),
            "short_name": raw_name.replace(" Region", ""),
            "capital": "Unknown",
            "capital_coords": [(bounds[0] + bounds[2])/2, (bounds[1] + bounds[3])/2],
            "tourism_status": "roadmap",
            "attraction_count": 0,
            "tagline": f"Discover the natural and cultural wonders of {raw_name}.",
            "highlights": []
        })

        if meta["id"] == "central":
            central_polygon = geom

        properties = {
            "region_id": meta["id"],
            "name": raw_name,
            "short_name": meta["short_name"],
            "capital": meta["capital"],
            "capital_coords": meta["capital_coords"],
            "tourism_status": meta["tourism_status"],
            "attraction_count": meta["attraction_count"],
            "tagline": meta["tagline"],
            "highlights": meta["highlights"],
            "bbox": [round(b, 5) for b in bounds]
        }

        enriched_regions.append({
            "type": "Feature",
            "id": meta["id"],
            "properties": properties,
            "geometry": mapping(geom)
        })

    # Sort so Central Region is first, then alphabetical
    enriched_regions.sort(key=lambda r: (0 if r["properties"]["region_id"] == "central" else 1, r["properties"]["name"]))

    adm1_fc = {
        "type": "FeatureCollection",
        "metadata": {
            "source": "geoBoundaries (geoboundaries.org)",
            "license": "CC BY 4.0",
            "coverage": "Ghana (All 16 Administrative Regions)",
            "total_regions": len(enriched_regions)
        },
        "features": enriched_regions
    }

    with open("data/ghana_regions_adm1.json", "w", encoding="utf-8") as f:
        json.dump(adm1_fc, f, indent=2)
    print(f"   Saved data/ghana_regions_adm1.json ({len(enriched_regions)} regions).")

    # Also keep regions_geojson.json updated with the same 16 regions for backwards compatibility
    with open("data/regions_geojson.json", "w", encoding="utf-8") as f:
        json.dump(adm1_fc, f, indent=2)
    print("   Updated data/regions_geojson.json.")

    # Process ADM2 (Districts)
    print("2. Downloading geoBoundaries ADM2 simplified...")
    req2 = urllib.request.Request(ADM2_URL, headers={"User-Agent": "ExploreGhana/1.1"})
    with urllib.request.urlopen(req2) as resp:
        adm2_raw = json.loads(resp.read().decode('utf-8'))
    print(f"   Downloaded {len(adm2_raw['features'])} ADM2 district polygons.")

    # Load attractions to count attractions per district
    with open("data/central_region_attractions.json", "r", encoding="utf-8") as f:
        attractions = json.load(f)

    # Count attractions by district string match
    attraction_counts = {}
    for a in attractions:
        d_name = a["district"]
        attraction_counts[d_name] = attraction_counts.get(d_name, 0) + 1

    central_districts = []
    # Using spatial intersection with Central Region's polygon to isolate Central districts
    for feat in adm2_raw['features']:
        geom = shape(feat['geometry'])
        # If district centroid or substantial intersection is inside central_polygon
        centroid = geom.centroid
        if central_polygon.contains(centroid) or central_polygon.intersects(geom):
            # Check intersection area vs district area to avoid boundary slivers of neighbors
            inter = central_polygon.intersection(geom)
            if inter.area / geom.area > 0.4:
                d_name = feat['properties']['shapeName']
                d_slug = slugify(d_name)
                bounds = geom.bounds

                # Calculate matching attractions
                match_count = 0
                for a in attractions:
                    # Match by substring or proximity
                    ad = a["district"].lower()
                    dn = d_name.lower()
                    if (dn.startswith("cape coast") and "cape coast" in ad) or \
                       (dn.startswith("komenda") and "komenda" in ad) or \
                       (dn.startswith("twifo hemang") and "twifo hemang" in ad) or \
                       (dn.startswith("mfantseman") and "mfantseman" in ad) or \
                       (dn.startswith("effutu") and "effutu" in ad) or \
                       (dn.startswith("assin south") and "assin south" in ad) or \
                       (dn.startswith("gomoa west") and "gomoa west" in ad) or \
                       (dn.startswith("gomoa east") and "gomoa east" in ad):
                        match_count += 1

                central_districts.append({
                    "type": "Feature",
                    "id": d_slug,
                    "properties": {
                        "district_id": d_slug,
                        "name": d_name,
                        "region_id": "central",
                        "region_name": "Central Region",
                        "attraction_count": match_count,
                        "bbox": [round(b, 5) for b in bounds]
                    },
                    "geometry": mapping(geom)
                })

    central_districts.sort(key=lambda d: (-d["properties"]["attraction_count"], d["properties"]["name"]))

    adm2_fc = {
        "type": "FeatureCollection",
        "metadata": {
            "source": "geoBoundaries (geoboundaries.org)",
            "license": "CC BY 4.0",
            "region": "Central Region",
            "total_districts": len(central_districts)
        },
        "features": central_districts
    }

    with open("data/central_districts_adm2.json", "w", encoding="utf-8") as f:
        json.dump(adm2_fc, f, indent=2)
    print(f"   Saved data/central_districts_adm2.json ({len(central_districts)} districts in Central Region).")

if __name__ == "__main__":
    main()
