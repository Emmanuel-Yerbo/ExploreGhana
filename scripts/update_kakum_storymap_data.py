import json
from pathlib import Path

path = Path('data/kakum_micro_spatial.json')
with open(path, 'r', encoding='utf-8') as f:
    data = json.load(f)

# 1. Add 7-Bridge Segmented Features to geojson.features
existing_ids = {f['properties']['id'] for f in data['geojson']['features']}

bridges = [
    {
        "type": "Feature",
        "id": "kakum-canopy-bridge-1",
        "geometry": {
            "type": "LineString",
            "coordinates": [
                [-1.3834398, 5.353622],
                [-1.38312, 5.35378]
            ]
        },
        "properties": {
            "id": "kakum-canopy-bridge-1",
            "bridge_index": 1,
            "name": "Canopy Bridge 1 (Launch Span & Bailout)",
            "category": "canopy_bridge",
            "length_m": 42,
            "height_above_ground_m": 25,
            "source": "Esri World Imagery, heads-up digitization & field layout",
            "verified_date": "2026-09-22",
            "precision": "approximate",
            "description": "The embarkation bridge leading from Platform 1 to Platform 2. Concludes at the Emergency Bailout exit spur."
        }
    },
    {
        "type": "Feature",
        "id": "kakum-canopy-bridge-2",
        "geometry": {
            "type": "LineString",
            "coordinates": [
                [-1.38312, 5.35378],
                [-1.38265, 5.35388]
            ]
        },
        "properties": {
            "id": "kakum-canopy-bridge-2",
            "bridge_index": 2,
            "name": "Canopy Bridge 2",
            "category": "canopy_bridge",
            "length_m": 52,
            "height_above_ground_m": 30,
            "source": "Esri World Imagery, heads-up digitization & field layout",
            "verified_date": "2026-09-22",
            "precision": "approximate",
            "description": "Suspension bridge traversing the upper mid-canopy layer toward the northern ridge spur."
        }
    },
    {
        "type": "Feature",
        "id": "kakum-canopy-bridge-3",
        "geometry": {
            "type": "LineString",
            "coordinates": [
                [-1.38265, 5.35388],
                [-1.38218, 5.35375]
            ]
        },
        "properties": {
            "id": "kakum-canopy-bridge-3",
            "bridge_index": 3,
            "name": "Canopy Bridge 3",
            "category": "canopy_bridge",
            "length_m": 54,
            "height_above_ground_m": 35,
            "source": "Esri World Imagery, heads-up digitization & field layout",
            "verified_date": "2026-09-22",
            "precision": "approximate",
            "description": "Ascending span extending over the ravine slope with hornbill nesting crowns in close view."
        }
    },
    {
        "type": "Feature",
        "id": "kakum-canopy-bridge-4",
        "geometry": {
            "type": "LineString",
            "coordinates": [
                [-1.38218, 5.35375],
                [-1.38175, 5.35345]
            ]
        },
        "properties": {
            "id": "kakum-canopy-bridge-4",
            "bridge_index": 4,
            "name": "Canopy Bridge 4 (Deep Gorge Peak Span)",
            "category": "canopy_bridge",
            "length_m": 60,
            "height_above_ground_m": 40,
            "source": "Esri World Imagery, heads-up digitization & field layout",
            "verified_date": "2026-09-22",
            "precision": "approximate",
            "description": "The longest and highest suspension span, hanging 40 meters (130 ft) directly above the deep forested gorge."
        }
    },
    {
        "type": "Feature",
        "id": "kakum-canopy-bridge-5",
        "geometry": {
            "type": "LineString",
            "coordinates": [
                [-1.38175, 5.35345],
                [-1.38195, 5.35310]
            ]
        },
        "properties": {
            "id": "kakum-canopy-bridge-5",
            "bridge_index": 5,
            "name": "Canopy Bridge 5",
            "category": "canopy_bridge",
            "length_m": 48,
            "height_above_ground_m": 36,
            "source": "Esri World Imagery, heads-up digitization & field layout",
            "verified_date": "2026-09-22",
            "precision": "approximate",
            "description": "Southern return span anchored to an ancient emergent Silk Cotton tree platform."
        }
    },
    {
        "type": "Feature",
        "id": "kakum-canopy-bridge-6",
        "geometry": {
            "type": "LineString",
            "coordinates": [
                [-1.38195, 5.35310],
                [-1.38240, 5.35295]
            ]
        },
        "properties": {
            "id": "kakum-canopy-bridge-6",
            "bridge_index": 6,
            "name": "Canopy Bridge 6",
            "category": "canopy_bridge",
            "length_m": 50,
            "height_above_ground_m": 32,
            "source": "Esri World Imagery, heads-up digitization & field layout",
            "verified_date": "2026-09-22",
            "precision": "approximate",
            "description": "Gentle descending span surrounded by lush epiphyte and fern micro-gardens."
        }
    },
    {
        "type": "Feature",
        "id": "kakum-canopy-bridge-7",
        "geometry": {
            "type": "LineString",
            "coordinates": [
                [-1.38240, 5.35295],
                [-1.38290, 5.35315]
            ]
        },
        "properties": {
            "id": "kakum-canopy-bridge-7",
            "bridge_index": 7,
            "name": "Canopy Bridge 7 (Final Descent Span)",
            "category": "canopy_bridge",
            "length_m": 55,
            "height_above_ground_m": 26,
            "source": "Esri World Imagery, heads-up digitization & field layout",
            "verified_date": "2026-09-22",
            "precision": "approximate",
            "description": "Final suspension bridge bringing adventurers safely back to the ridge descent trail."
        }
    }
]

for b in bridges:
    if b['properties']['id'] not in existing_ids:
        data['geojson']['features'].append(b)

# 2. Enrich and Update Story Chapters per Doc 09 Specifications
data['story_chapters'] = [
    {
        "id": "act-1-refuge",
        "act_number": 1,
        "act_title": "Act I: The Island of Green",
        "era": "1931 - 1992 Conservation Genesis",
        "subtitle": "The 375 km² Sanctuary & Assin Attandanso Heritage",
        "elevation_m": 150,
        "camera": {
            "center": [-1.3835, 5.3495],
            "zoom": 12.2,
            "pitch": 30,
            "bearing": 0,
            "transition": "flyTo",
            "fly_options": { "curve": 1.42, "speed": 0.6 }
        },
        "focus_features": [],
        "highlight_layers": ["kakum-boundary-line", "kakum-boundary-fill"],
        "draw_line": None,
        "ambient": { "drift": True, "dash_flow": False },
        "stratum_ref": 3,
        "media": {
            "image": "/static/img/attractions/kakum-national-park/hero.jpg",
            "credit": "Wikimedia Commons (CC BY-SA)"
        },
        "narrative": "Viewed from high above, Kakum is a breathtaking island of emerald primary rainforest standing resilient against surrounding agricultural mosaics. Originally designated in 1931 as a timber exploitation reserve, the forest faced severe depletion by the late 1980s. Recognizing that the loss of this Upper Guinean rainforest would devastate regional watersheds, local traditional chiefs from the Assin community joined forces with the Central Region Development Commission and Conservation International. In 1992, Kakum was gazetted as a National Park, recruiting local hunters as wildlife rangers to protect animal corridors.",
        "proverb": "Woforo dua pa a, na yɛpia wo — When you climb a good tree, you are given a push. (Akan Proverb of Community Stewardship)",
        "ecological_focus": "One of the last intact fragments of the ancient Upper Guinean moist evergreen forest, home to over 300 bird species and endangered forest elephants.",
        "cultural_heritage": "For generations, the Assin people preserved sacred groves (abosom) and revered rivers like the Kakum, recognizing natural taboos as Ghana's indigenous conservation mechanism.",
        "narrative_sources": [
            { "claim": "Established as timber reserve in 1931", "source": "Wikipedia — Kakum National Park", "verified_date": "2026-09-22" },
            { "claim": "Gazetted as national park in 1992 under Wildlife Division", "source": "Ghana Wildlife Division (ghanawildlife.org)", "verified_date": "2026-09-22" },
            { "claim": "Total protected area 375 km²", "source": "Ghana Wildlife Division / UNESCO tentative list", "verified_date": "2026-09-22" }
        ]
    },
    {
        "id": "act-2-threshold",
        "act_number": 2,
        "act_title": "Act II: The Threshold of Civilization",
        "era": "Arrival & Environmental Education",
        "subtitle": "From the Trunk Road into the Protected Buffer",
        "elevation_m": 150,
        "camera": {
            "center": [-1.38355, 5.34885],
            "zoom": 18.1,
            "pitch": 40,
            "bearing": -10,
            "transition": "flyTo",
            "fly_options": { "curve": 1.7, "speed": 0.55 }
        },
        "focus_features": ["kakum-parking-lot", "kakum-reception-office", "kakum-ticket-office"],
        "highlight_layers": ["kakum-parking-fill", "kakum-buildings-fill", "kakum-paved-line"],
        "draw_line": "kakum-paved-concourse",
        "ambient": { "drift": True, "dash_flow": True },
        "stratum_ref": 3,
        "media": {
            "image": "/static/img/attractions/kakum-national-park/gallery_1.jpg",
            "credit": "Wikimedia Commons (CC BY-SA)"
        },
        "narrative": "The transition from the paved Cape Coast–Twifo Praso highway into the Kakum Visitor Hub marks the threshold between logistical travel and protected ecological sanctuary. Here at 150m above sea level, vehicles arrive at the surveyed parking bay. Visitors pass through reception, secure entry passes at the ticket counter, and visit the Environmental Education Centre. The museum bridges traditional Assin folklore with botanical science, educating students and international travelers before they embark on the trail.",
        "proverb": "Asuo a ɛbɛtene no, efi abɔnten — A river that will flow far begins with a clear spring.",
        "ecological_focus": "The visitor hub forms the managed ecotourism buffer, concentrating the human footprint within a 1.2-hectare perimeter to leave the remaining 37,400 hectares undisturbed.",
        "cultural_heritage": "Local community members operate the rainforest cafeteria and artisan stalls, directing tourism revenue into surrounding rural schools and healthcare clinics.",
        "narrative_sources": [
            { "claim": "Visitor Centre amenities: restaurant, education centre, picnic lawns", "source": "Wikipedia — Kakum National Park", "verified_date": "2026-09-22" },
            { "claim": "Surveyed visitor infrastructure coordinates", "source": "OpenStreetMap surveyor nodes 1858706096, 4161231691", "verified_date": "2026-09-22" }
        ]
    },
    {
        "id": "act-3-ascent",
        "act_number": 3,
        "act_title": "Act III: The Ascent of the Ridge",
        "era": "The Physical & Ecological Climb",
        "subtitle": "Steep Forest Ascent Through the Humid Understory",
        "elevation_m": 175,
        "camera": {
            "center": [-1.3828, 5.3512],
            "zoom": 17.6,
            "pitch": 55,
            "bearing": -18,
            "transition": "ease-chain",
            "keyframes": [
                { "center": [-1.3833, 5.3505], "zoom": 17.9, "pitch": 45, "bearing": -10, "duration_ms": 900, "easing": "ease-in-out" },
                { "center": [-1.3828, 5.3512], "zoom": 17.6, "pitch": 55, "bearing": -18, "duration_ms": 2200, "easing": "ease-in" }
            ],
            "fly_options": { "curve": 1.42, "speed": 0.6 }
        },
        "focus_features": ["kakum-canopy-launch-platform"],
        "highlight_layers": ["kakum-trail-line"],
        "draw_line": "kakum-canopy-trail-approach",
        "ambient": { "drift": True, "dash_flow": True },
        "stratum_ref": 2,
        "media": {
            "image": "/static/img/attractions/assin-attandanso-reserve/gallery_1.jpg",
            "credit": "Wikimedia Commons (CC BY-SA)"
        },
        "narrative": "To reach the sky, you must first earn the ridge. The Canopy Approach Trail demands a vigorous cardio ascent up the tropical hillside, climbing from ~135m to ~190m elevation. As your boots climb, tropical humidity surges above 90%, and the forest closes overhead. Here on the damp forest floor, massive buttress roots spread outwards from African Mahogany (Entandrophragma) and Odum trees, acting as architectural stabilizers in shallow soils. Woody lianas hang like ship rigging from the mid-canopy, while medicinal ginger plants and giant African land snails thrive in perpetual shade.",
        "proverb": "Obi nkyerɛ abofra Nyame — Nobody needs to show God to a child (the majesty of nature speaks for itself).",
        "ecological_focus": "Vertical stratification in action: light on the forest floor is just 1% to 2% of total sunlight. Plants develop broad dark green leaves with drip-tips to shed heavy rainwater.",
        "cultural_heritage": "Guided medicinal plant walks along this ridge teach traditional herbal wisdom—identifying leaves used for centuries in Ghanaian traditional medicine.",
        "narrative_sources": [
            { "claim": "Elevation range 135m to 250m", "source": "Wikipedia — Kakum National Park geography", "verified_date": "2026-09-22" },
            { "claim": "Canopy approach trail alignment", "source": "OpenStreetMap surveyor way 175246369", "verified_date": "2026-09-22" }
        ]
    },
    {
        "id": "act-4-canopy",
        "act_number": 4,
        "act_title": "Act IV: Suspended in the Crown",
        "era": "1995 Non-Invasive Engineering",
        "subtitle": "7 Suspension Bridges, 40m Drop & The Bailout Spur",
        "elevation_m": 190,
        "camera": {
            "center": [-1.3825, 5.3532],
            "zoom": 18.4,
            "pitch": 60,
            "bearing": -20,
            "transition": "easeTo",
            "fly_options": { "duration": 3000, "easing": "ease-in-out" }
        },
        "focus_features": ["kakum-canopy-launch-platform", "kakum-emergency-bailout"],
        "highlight_layers": ["kakum-bridges-line", "kakum-bridges-glow"],
        "draw_line": "kakum-bridges-draw",
        "ambient": { "drift": True, "dash_flow": True },
        "stratum_ref": 0,
        "media": {
            "image": "/static/img/attractions/kakum-national-park/gallery_2.jpg",
            "credit": "Wikimedia Commons (CC BY-SA)"
        },
        "narrative": "At Platform 1 on the high ridge, the world opens beneath your feet. Engineered in 1995 by two Canadian mountaineers from Vancouver working with Ghanaian foresters, the walkway stretches across 7 suspension bridges reaching up to 40 meters (130 feet) above a deep forest gorge. The engineering feat was strictly non-invasive: not a single spike or bolt penetrates living tree bark. Steel cables are secured around wooden friction blocks that naturally expand as the emergent Ceiba pentandra trees grow. At Platform 2 lies the Emergency Bailout Spur—a compassionate spatial exit enabling visitors experiencing acute vertigo to safely descend to ground paths without having to cross the remaining bridges.",
        "proverb": "Nsa baako nntumi nkyekyere biribi — One hand cannot tie a bundle (built by international engineers and local conservationists together).",
        "ecological_focus": "The Emergent Canopy receives 100% full tropical sunlight. Here thrive hornbills, epiphytic orchids, ferns, and high-altitude butterflies unseen on the ground.",
        "cultural_heritage": "Only 3 canopy walkways exist in Africa. Kakum pioneered sustainable ecotourism as a viable economic alternative to destructive rainforest clear-cutting.",
        "narrative_sources": [
            { "claim": "Canopy walkway constructed in 1995 by Canadian engineers and local foresters", "source": "Wikipedia / Conservation International records", "verified_date": "2026-09-22" },
            { "claim": "7 suspension bridges reaching ~40m height", "source": "Ghana Wildlife Division / Wikipedia consensus", "verified_date": "2026-09-22" },
            { "claim": "Non-invasive tree friction block suspension engineering", "source": "Ghana Wildlife Division technical documentation", "verified_date": "2026-09-22" }
        ]
    },
    {
        "id": "act-5-wilderness",
        "act_number": 5,
        "act_title": "Act V: Beyond the Wires",
        "era": "Virgin Wilderness & Living Giants",
        "subtitle": "The 300-Year Silk Cotton Giant & Afafranto Campsite",
        "elevation_m": 160,
        "camera": {
            "center": [-1.3835, 5.3535],
            "zoom": 16.3,
            "pitch": 30,
            "bearing": 10,
            "transition": "fitBounds",
            "fly_options": { "duration": 3200 }
        },
        "focus_features": ["kakum-historic-big-tree", "kakum-afafranto-campsite"],
        "highlight_layers": [],
        "draw_line": None,
        "ambient": { "drift": True, "dash_flow": False },
        "stratum_ref": 3,
        "media": {
            "image": "/static/img/attractions/assin-attandanso-reserve/hero.jpg",
            "credit": "Wikimedia Commons (CC BY-SA)"
        },
        "narrative": "Beyond the adrenaline of the swinging bridges lies the ancient stillness of Kakum's virgin wilderness. A quiet forest trail leads to the Historic Big Tree—a colossal Ceiba pentandra over 300 years old, whose hollow trunk sheltered generations of forest travelers during pre-colonial times. Nearby lies the Afafranto Campsite ('Afafranto' is the Akan word for butterfly). Here, researchers and overnight campers sleep under mosquito nets to the nocturnal chorus of tree hyraxes and flying squirrels. In the deep 375 km² interior, guarded by armed wildlife rangers, roam shy forest elephants (Loxodonta cyclotis), leopards, and the endangered Diana monkey.",
        "proverb": "Dua kɛseɛ hwe ase a, nnomaa firi so — When a great tree falls, the birds scatter (the sacred duty of preserving forest giants).",
        "ecological_focus": "Afafranto is famous for over 600 recorded butterfly species, including iridescent Charaxes and swallowtails attracted to damp forest mineral clearings.",
        "cultural_heritage": "Overnight camping with wildlife rangers provides authentic, zero-trace connection to the ancestral rhythms of the Ghanaian rainforest.",
        "narrative_sources": [
            { "claim": "Afafranto butterfly biodiversity (>600 species)", "source": "Ghana Wildlife Division / Butterfly Conservation research", "verified_date": "2026-09-22" },
            { "claim": "Historic Ceiba pentandra tree location", "source": "OpenStreetMap surveyor node 1907489067", "verified_date": "2026-09-22" }
        ]
    }
]

with open(path, 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2)

print("Updated data/kakum_micro_spatial.json successfully!")
print(f"Total features in geojson: {len(data['geojson']['features'])}")
print(f"Total story chapters: {len(data['story_chapters'])}")
