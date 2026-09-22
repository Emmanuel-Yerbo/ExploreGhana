import json
from pathlib import Path

BASE_DIR = Path(__file__).parent.parent
SCRIPTS_DIR = BASE_DIR / "scripts"
DATA_DIR = BASE_DIR / "data"

with open(SCRIPTS_DIR / "kakum_osm_with_geom.json", "r", encoding="utf-8") as f:
    raw = json.load(f)

lookup = {f"{el.get('type')}_{el.get('id')}": el for el in raw}

# 1. Parking Surface Area (Way 1195989992)
parking_el = lookup.get("way_1195989992", {})
parking_coords = [[pt["lon"], pt["lat"]] for pt in parking_el.get("geometry", [])]
if parking_coords and parking_coords[0] != parking_coords[-1]:
    parking_coords.append(parking_coords[0])

# 2. Visitor Exhibition Hall / Museum Building (Way 1195989990)
museum_el = lookup.get("way_1195989990", {})
museum_coords = [[pt["lon"], pt["lat"]] for pt in museum_el.get("geometry", [])]
if museum_coords and museum_coords[0] != museum_coords[-1]:
    museum_coords.append(museum_coords[0])

# 3. Main Restrooms Building (Way 1195989993)
toilets_el = lookup.get("way_1195989993", {})
toilets_coords = [[pt["lon"], pt["lat"]] for pt in toilets_el.get("geometry", [])]
if toilets_coords and toilets_coords[0] != toilets_coords[-1]:
    toilets_coords.append(toilets_coords[0])

# 4. Paved Visitor Center Footway (Way 175246358)
paved_el = lookup.get("way_175246358", {})
paved_coords = [[pt["lon"], pt["lat"]] for pt in paved_el.get("geometry", [])]

# 5. Forest Canopy Approach Trail (Way 175246369)
canopy_path_el = lookup.get("way_175246369", {})
canopy_path_coords = [[pt["lon"], pt["lat"]] for pt in canopy_path_el.get("geometry", [])]

# 6. Sunbird Nature Trail (Ground forest loop connecting visitor hub towards canopy base)
# Surveyed way 175246356 / ground track
track_el = lookup.get("way_175246356", {})
track_coords = [[pt["lon"], pt["lat"]] for pt in track_el.get("geometry", [])] if track_el else []

features = [
    # PARKING POLYGON
    {
        "type": "Feature",
        "id": "kakum-parking-lot",
        "geometry": {
            "type": "Polygon",
            "coordinates": [parking_coords]
        },
        "properties": {
            "id": "kakum-parking-lot",
            "name": "Kakum National Park Surface Parking",
            "category": "parking",
            "icon": "🅿️",
            "osm_id": "way/1195989992",
            "surface": "compacted gravel & asphalt",
            "description": "Designated parking area for private vehicles, chartered tour buses, and trotro drop-offs.",
            "operational_notes": "Nominal parking token administered at checkpoint."
        }
    },
    # VISITOR EXHIBITION & NATURE MUSEUM POLYGON
    {
        "type": "Feature",
        "id": "kakum-museum-building",
        "geometry": {
            "type": "Polygon",
            "coordinates": [museum_coords]
        },
        "properties": {
            "id": "kakum-museum-building",
            "name": "Kakum Ecological Exhibition Hall & Museum",
            "category": "reception",
            "icon": "🏛️",
            "osm_id": "way/1195989990",
            "description": "Educational exhibition pavilion with displays on rainforest flora, fauna, and conservation history."
        }
    },
    # TOILETS BUILDING POLYGON
    {
        "type": "Feature",
        "id": "kakum-toilets-building",
        "geometry": {
            "type": "Polygon",
            "coordinates": [toilets_coords]
        },
        "properties": {
            "id": "kakum-toilets-building",
            "name": "Restrooms & Sanitation Block",
            "category": "amenity",
            "icon": "🚻",
            "osm_id": "way/1195989993",
            "description": "Clean modern restrooms and handwashing stations located beside the main reception plaza."
        }
    },
    # PAVED FOOTWAY LINESTRING
    {
        "type": "Feature",
        "id": "kakum-paved-concourse",
        "geometry": {
            "type": "LineString",
            "coordinates": paved_coords
        },
        "properties": {
            "id": "kakum-paved-concourse",
            "name": "Visitor Centre Paved Concourse",
            "category": "trail",
            "surface": "paving_stones",
            "osm_id": "way/175246358",
            "description": "Paved pedestrian walkway connecting parking bay, ticket booth, museum, and trail entrance."
        }
    },
    # CANOPY APPROACH FOREST TRAIL LINESTRING
    {
        "type": "Feature",
        "id": "kakum-canopy-trail-approach",
        "geometry": {
            "type": "LineString",
            "coordinates": canopy_path_coords
        },
        "properties": {
            "id": "kakum-canopy-trail-approach",
            "name": "Canopy Walkway Forest Approach Path",
            "category": "trail",
            "surface": "forest soil & stone steps",
            "osm_id": "way/175246369",
            "description": "Climbing footpath ascending from the forest floor up to the Platform 1 suspension bridge launch tower."
        }
    },
    # POI: MAIN RECEPTION / INFORMATION OFFICE
    {
        "type": "Feature",
        "id": "kakum-reception-office",
        "geometry": {
            "type": "Point",
            "coordinates": [-1.3835309, 5.3487294]
        },
        "properties": {
            "id": "kakum-reception-office",
            "name": "Kakum National Park Information Office",
            "category": "reception",
            "icon": "ℹ️",
            "osm_id": "node/1858706096",
            "survey_source": "GPS track 2009 on foot",
            "description": "Visitor check-in, official Wildlife Division guide assignment, and general orientation desk."
        }
    },
    # POI: TICKET BOOTH
    {
        "type": "Feature",
        "id": "kakum-ticket-office",
        "geometry": {
            "type": "Point",
            "coordinates": [-1.3838509, 5.3489138]
        },
        "properties": {
            "id": "kakum-ticket-office",
            "name": "Kakum Main Ticket Office",
            "category": "reception",
            "icon": "🎟️",
            "osm_id": "node/4161231691",
            "payment_methods": "Cash accepted (MoMo availability subject to cellular network)",
            "fee_token": "5.00 GHS nominal entry/maintenance token",
            "description": "Official ticket counter where entry wristbands and canopy walk passes are issued."
        }
    },
    # POI: RAINFOREST CAFETERIA
    {
        "type": "Feature",
        "id": "kakum-rainforest-cafeteria",
        "geometry": {
            "type": "Point",
            "coordinates": [-1.3835801, 5.3488532]
        },
        "properties": {
            "id": "kakum-rainforest-cafeteria",
            "name": "Kakum Rainforest Cafeteria & Restaurant",
            "category": "amenity",
            "icon": "🍽️",
            "osm_id": "node/1907494957",
            "cuisine": "Ghanaian & continental meals, fresh coconut, chilled beverages",
            "description": "Open-air pavilion dining area offering hot meals and refreshing drinks before or after the canopy hike."
        }
    },
    # POI: RESTROOMS POINT
    {
        "type": "Feature",
        "id": "kakum-restrooms-poi",
        "geometry": {
            "type": "Point",
            "coordinates": [-1.383696, 5.3490945]
        },
        "properties": {
            "id": "kakum-restrooms-poi",
            "name": "Restrooms & Washrooms",
            "category": "amenity",
            "icon": "🚻",
            "osm_id": "node/1907494955",
            "description": "Public sanitation facilities located adjacent to the cafeteria."
        }
    },
    # POI: OBSERVATION TOWER
    {
        "type": "Feature",
        "id": "kakum-observation-tower",
        "geometry": {
            "type": "Point",
            "coordinates": [-1.3824917, 5.349317]
        },
        "properties": {
            "id": "kakum-observation-tower",
            "name": "Forest Observation Tower",
            "category": "trailhead",
            "icon": "🔭",
            "osm_id": "node/11098796677",
            "description": "Elevated wooden observation platform offering vantage views of the lower canopy and bird activity."
        }
    },
    # POI: CANOPY WALKWAY LAUNCH POINT (PLATFORM 1)
    {
        "type": "Feature",
        "id": "kakum-canopy-launch-platform",
        "geometry": {
            "type": "Point",
            "coordinates": [-1.3834398, 5.353622]
        },
        "properties": {
            "id": "kakum-canopy-launch-platform",
            "name": "Canopy Walkway Launch Platform (Bridge 1 Start)",
            "category": "trailhead",
            "icon": "🌉",
            "osm_id": "node/558549732",
            "elevation_m": 190,
            "height_above_ground_m": 27,
            "survey_source": "GPS track 2009 on foot",
            "description": "The starting wooden tree platform where tourists embark onto the suspension bridge series."
        }
    },
    # POI: BRIDGE 1 EMERGENCY BAILOUT EXIT ROUTE
    {
        "type": "Feature",
        "id": "kakum-emergency-bailout",
        "geometry": {
            "type": "Point",
            "coordinates": [-1.38375, 5.35380]
        },
        "properties": {
            "id": "kakum-emergency-bailout",
            "name": "Bridge 1 Emergency Bailout Exit Route",
            "category": "safety_exit",
            "icon": "🚨",
            "description": "Critical spatial safety feature: after completing Bridge 1, visitors experiencing acrophobia (vertigo) can safely exit down a designated ground staircase without being compelled to cross the remaining 6 bridges."
        }
    },
    # POI: AFAFRANTO CAMPSITE
    {
        "type": "Feature",
        "id": "kakum-afafranto-campsite",
        "geometry": {
            "type": "Point",
            "coordinates": [-1.3815, 5.3520]
        },
        "properties": {
            "id": "kakum-afafranto-campsite",
            "name": "Afafranto Rainforest Campsite",
            "category": "camping",
            "icon": "⛺",
            "description": "Secluded overnight camping ground within the secondary rainforest clearing. Requires prior booking and Wildlife Division ranger escort."
        }
    },
    # POI: HISTORIC BIG TREE
    {
        "type": "Feature",
        "id": "kakum-historic-big-tree",
        "geometry": {
            "type": "Point",
            "coordinates": [-1.3862389, 5.3561982]
        },
        "properties": {
            "id": "kakum-historic-big-tree",
            "name": "Historic Giant Silk Cotton Tree (Ceiba pentandra)",
            "category": "nature",
            "icon": "🌳",
            "osm_id": "node/1907489067",
            "description": "A colossal centuries-old emergent rainforest giant anchoring the local canopy ecosystem."
        }
    }
]

dataset = {
    "attraction_id": "kakum-national-park",
    "site_name": "Kakum National Park & Canopy Walkway",
    "region_id": "central",
    "district": "Twifo Hemang Lower Denkyira",
    "center_coordinates": {
        "latitude": 5.3495,
        "longitude": -1.3835,
        "elevation_base_m": 150,
        "elevation_canopy_m": 190
    },
    "geojson": {
        "type": "FeatureCollection",
        "features": features
    },
    "disputed_specifications": [
        {
            "parameter": "Total Canopy Walkway Length",
            "consensus_summary": "Documented between 330 m and 370 m across authoritative sources; universally verified as 7 suspension bridges reaching up to 40 m (130 ft) above the forest floor.",
            "sources": [
                {
                    "source_name": "Ghana Wildlife Division (Official)",
                    "url": "https://ghanawildlife.org",
                    "stated_value": "370 meters",
                    "note": "Official state agency governing wildlife protected areas in Ghana"
                },
                {
                    "source_name": "Wikipedia (Lead Section)",
                    "url": "https://en.wikipedia.org/wiki/Kakum_National_Park",
                    "stated_value": "350 meters",
                    "note": "Commonly cited travel press metric"
                },
                {
                    "source_name": "Wikipedia (Article Body)",
                    "url": "https://en.wikipedia.org/wiki/Kakum_National_Park#Canopy_walkway",
                    "stated_value": "330 meters",
                    "note": "Alternate citation within academic references"
                }
            ]
        },
        {
            "parameter": "Number of Suspension Bridges",
            "consensus_summary": "7 contiguous rope bridges suspended from emergent Silk Cotton (Ceiba pentandra) trees.",
            "sources": [
                {
                    "source_name": "Ghana Wildlife Division & UNESCO",
                    "url": "https://ghanawildlife.org",
                    "stated_value": "7 bridges",
                    "note": "Unanimous consensus across all governing records"
                }
            ]
        },
        {
            "parameter": "Maximum Walkway Height",
            "consensus_summary": "Approximately 40 meters (130 feet) at the highest forest ravine span.",
            "sources": [
                {
                    "source_name": "Ghana Wildlife Division & Conservation International",
                    "url": "https://ghanawildlife.org",
                    "stated_value": "Up to 40 meters (130 ft)",
                    "note": "Constructed in 1995 by Canadian engineers and local forest rangers"
                }
            ]
        }
    ],
    "operational_parameters": {
        "recommended_arrival_window": "07:30 - 09:30 GMT (Early morning avoids mid-day tropical heat, catches maximum bird and primate vocalizations, and precedes peak school/tour bus arrivals)",
        "estimated_duration_hours": 3.5,
        "canopy_crossing_duration_mins": 45,
        "physical_effort_grade": "Moderate to Strenuous — involves an uphill stone stair climb (~15-20 mins) before reaching Platform 1",
        "cellular_coverage": "Moderate 3G/4G coverage around the Visitor Reception plaza; signal rapidly drops to 0 bars inside deep canopy forest trails",
        "payment_advice": "Carry Ghana Cedis (cash) as backup. Mobile Money (MTN MoMo / Telecel Cash) is accepted at the reception desk but can be disrupted by intermittent network lag."
    },
    "physical_safety_protocols": {
        "hands_free_rule": "MANDATORY. Visitors must maintain both hands free to hold the safety side-guide ropes. Handheld shoulder bags, unsecured mobile phones, or loose objects are strictly prohibited while crossing the bridges.",
        "footwear_requirement": "Closed-toe walking shoes, trainers, or hiking boots with rubber traction. High heels, flip-flops, and slick-soled dress shoes are strictly disallowed on the canopy walkway.",
        "acrophobia_exit_spur": "An emergency bailout staircase is situated directly after Bridge 1. Visitors feeling overwhelmed by vertigo may exit safely back to the ground path without completing bridges 2 through 7.",
        "weather_safety_rule": "The canopy walkway is immediately closed during active thunderstorms, high wind gusts, or torrential downpours for visitor safety."
    },
    "pre_trip_checklist": [
        {
            "id": "chk-backpack",
            "title": "Small Hands-Free Daypack",
            "category": "gear",
            "icon": "🎒",
            "mandatory": True,
            "rationale": "Mandatory for keeping both hands free to grip suspension ropes at all times."
        },
        {
            "id": "chk-footwear",
            "title": "Closed-Toe Shoes with Rubber Grip",
            "category": "gear",
            "icon": "👟",
            "mandatory": True,
            "rationale": "Wooden planks and uphill stone steps can be slick from tropical forest humidity and morning dew."
        },
        {
            "id": "chk-water",
            "title": "1 Litre Refillable Water Bottle",
            "category": "hydration",
            "icon": "💧",
            "mandatory": True,
            "rationale": "High humidity causes rapid dehydration during the uphill forest climb."
        },
        {
            "id": "chk-poncho",
            "title": "Compact Rain Poncho / Light Jacket",
            "category": "apparel",
            "icon": "🌧️",
            "mandatory": False,
            "rationale": "Tropical rainforest showers can occur with little warning even during dry periods."
        },
        {
            "id": "chk-repellent",
            "title": "Insect Repellent / Anti-Mosquito Spray",
            "category": "health",
            "icon": "🦟",
            "mandatory": False,
            "rationale": "Recommended for the ground-level trails (Sunbird and Medicinal Tree walks)."
        },
        {
            "id": "chk-cash",
            "title": "Cash Backup (Ghana Cedis - GHS)",
            "category": "logistics",
            "icon": "💵",
            "mandatory": True,
            "rationale": "For gate maintenance token (5 GHS) and in case mobile network delays MoMo transactions."
        }
    ],
    "official_contacts": [
        {
            "entity": "Ghana Wildlife Division (Forestry Commission)",
            "channel": "Official Website",
            "value": "https://ghanawildlife.org",
            "note": "Governing statutory agency for Kakum National Park and protected wildlife areas"
        },
        {
            "entity": "Kakum National Park Visitor Information",
            "channel": "Forestry Commission Regional Directorate",
            "value": "Cape Coast, Central Region, Ghana",
            "note": "Enquiries for group bookings, student delegations, and Afafranto campsite reservations"
        },
        {
            "entity": "Ghana Tourism Authority (GTA)",
            "channel": "Official Portal",
            "value": "https://visitghana.com",
            "note": "National tourism promotion and certified destination register"
        }
    ]
}

output_path = DATA_DIR / "kakum_micro_spatial.json"
with open(output_path, "w", encoding="utf-8") as f:
    json.dump(dataset, f, indent=2, ensure_ascii=False)

print(f"Successfully generated {output_path} with {len(features)} micro-spatial features!")
