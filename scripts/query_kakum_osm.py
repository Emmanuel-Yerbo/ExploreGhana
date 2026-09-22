import urllib.request
import urllib.parse
import json

overpass_url = "https://overpass-api.de/api/interpreter"
query = """
[out:json][timeout:25];
(
  node(5.340,-1.395,5.365,-1.370);
  way(5.340,-1.395,5.365,-1.370);
  relation(5.340,-1.395,5.365,-1.370);
);
out body;
>;
out skel qt;
"""
req = urllib.request.Request(
    overpass_url, 
    data=query.encode("utf-8"), 
    headers={"User-Agent": "ExploreGhana-Verification/1.0 (contact: emmanuelyerbo@gmail.com)"}
)

try:
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = json.loads(resp.read().decode("utf-8"))
        elements = data.get("elements", [])
        print(f"Overpass elements found: {len(elements)}")
        named_elements = []
        for el in elements:
            tags = el.get("tags", {})
            if tags:
                named_elements.append({
                    "id": el.get("id"),
                    "type": el.get("type"),
                    "lat": el.get("lat"),
                    "lon": el.get("lon"),
                    "tags": tags
                })
        print(f"Elements with tags: {len(named_elements)}")
        for ne in named_elements:
            print(ne)
except Exception as e:
    print("Error querying Overpass:", e)
