import urllib.request
import json
from pathlib import Path

overpass_url = 'https://overpass-api.de/api/interpreter'
query = """
[out:json][timeout:35];
(
  relation["boundary"="national_park"]["name"~"Kakum",i];
  relation["boundary"="protected_area"]["name"~"Kakum",i];
  way["boundary"="national_park"]["name"~"Kakum",i];
);
out geom;
"""

req = urllib.request.Request(
    overpass_url, 
    data=query.encode('utf-8'), 
    headers={'User-Agent': 'ExploreGhana-Verification/1.0 (emmanuelyerbo@gmail.com)'}
)

try:
    with urllib.request.urlopen(req, timeout=35) as resp:
        data = json.loads(resp.read().decode('utf-8'))
        elements = data.get('elements', [])
        print(f"Found {len(elements)} elements")
        for el in elements:
            print(f"Type: {el.get('type')}, ID: {el.get('id')}, Name: {el.get('tags', {}).get('name')}")
            
        with open('scripts/kakum_boundary_raw.json', 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2)
except Exception as e:
    print("Overpass query error:", e)
