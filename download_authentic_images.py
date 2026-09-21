"""
Script to download authentic, visitor-contributed photographs for ExploreGhana
from Wikimedia Commons (Creative Commons Attribution) and store them locally.
"""
import os
import json
import time
import urllib.request
import urllib.parse
from pathlib import Path

BASE_DIR = Path(__file__).parent
DATA_FILE = BASE_DIR / "data" / "central_region_attractions.json"
IMG_DIR = BASE_DIR / "static" / "img" / "attractions"
IMG_DIR.mkdir(parents=True, exist_ok=True)

USER_AGENT = "ExploreGhanaTourismApp/1.0 (contact: emmanuelyerbo@gmail.com; Ghana Ministry of Tourism educational project)"

SEARCH_QUERIES = {
    "cape-coast-castle": ["Cape Coast Castle Ghana", "Cape Coast Castle courtyard"],
    "elmina-castle": ["Elmina Castle Ghana", "St George Castle Elmina"],
    "fort-st-jago": ["Fort Coenraadsburg Elmina", "Fort St Jago Elmina Ghana"],
    "kakum-national-park": ["Kakum National Park canopy walkway", "Kakum National Park Ghana"],
    "assin-manso-slave-river": ["Assin Manso Slave River Ghana", "Donkor Nsuo Assin Manso"],
    "hans-cottage-botel": ["Hans Cottage Botel Ghana", "Hans Cottage crocodile Cape Coast"],
    "brenu-beach": ["Brenu Beach Ghana", "Brenu Akyinim Central Region"],
    "fort-amsterdam": ["Fort Amsterdam Abandze Ghana", "Fort Cormantin Abandze"],
    "fort-patience": ["Fort Patience Apam Ghana", "Fort Lijdzaamheid Apam"],
    "anomabo-beach-fort-william": ["Fort William Anomabo Ghana", "Anomabo Central Region Ghana"],
    "posuban-shrines-mankessim": ["Posuban Shrine Ghana", "Asafo Posuban Elmina Mankessim"],
    "fetu-afahye-festival-grounds": ["Fetu Afahye Cape Coast Ghana", "Cape Coast durbar festival"],
    "cape-coast-centre-national-culture": ["Centre for National Culture Cape Coast", "Panafest Cape Coast Ghana"],
    "university-of-cape-coast-campus": ["University of Cape Coast Ghana campus", "UCC Cape Coast"],
    "coconut-grove-beach-resort": ["Coconut Grove Beach Resort Elmina", "Coconut Grove Elmina Ghana"],
    "biriwa-beach-artisanal-harbour": ["Biriwa Beach Ghana", "Biriwa fishing Central Region"],
    "winneba-coastal-lagoon": ["Winneba Aboakyer festival Ghana", "Muni-Pomadze Ramsar Winneba"],
    "saltpond-beach-historic-town": ["Saltpond Ghana historical town", "Saltpond Central Region"],
    "gomoa-fetteh-white-sands": ["Gomoa Fetteh Ghana", "White Sands Beach Club Ghana"],
    "assin-attandanso-reserve": ["Pra River Central Region Ghana", "Kakum Forest Reserve trees Ghana"]
}

def search_commons_images(query, limit=3):
    """Searches Wikimedia Commons for authentic images."""
    url = (
        f"https://commons.wikimedia.org/w/api.php?action=query&generator=search"
        f"&gsrnamespace=6&gsrsearch={urllib.parse.quote(query)}&gsrlimit={limit}"
        f"&prop=imageinfo&iiprop=url|mime&iiurlwidth=1000&format=json"
    )
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            pages = data.get("query", {}).get("pages", {})
            urls = []
            for _, page in pages.items():
                if "imageinfo" in page and page["imageinfo"]:
                    info = page["imageinfo"][0]
                    mime = info.get("mime", "")
                    if "image" in mime and "svg" not in mime:
                        # Prefer resized thumbnail for fast download and clean resolution
                        best_url = info.get("thumburl") or info.get("url")
                        if best_url:
                            urls.append(best_url)
            return urls
    except Exception as e:
        print(f"  [Search Error] {query}: {e}")
        return []

def download_file(url, target_path):
    """Downloads an image file with proper headers."""
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(req, timeout=15) as resp, open(target_path, "wb") as out:
            out.write(resp.read())
        return True
    except Exception as e:
        print(f"  [Download Error] {url}: {e}")
        return False

def main():
    print("================================================================")
    print("  DOWNLOADING AUTHENTIC VISITOR PHOTOGRAPHS FOR EXPLOREGHANA")
    print("================================================================")
    
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        attractions = json.load(f)

    updated_count = 0

    for item in attractions:
        attraction_id = item["id"]
        queries = SEARCH_QUERIES.get(attraction_id, [item["name"] + " Ghana"])
        
        target_dir = IMG_DIR / attraction_id
        target_dir.mkdir(parents=True, exist_ok=True)
        
        print(f"\nProcessing: {item['name']} ({attraction_id})")
        
        candidate_urls = []
        for q in queries:
            urls = search_commons_images(q, limit=3)
            candidate_urls.extend(urls)
            time.sleep(0.5)  # Respect API rate limits
            if len(candidate_urls) >= 2:
                break

        downloaded_local_paths = []
        for idx, u in enumerate(candidate_urls[:3]):
            filename = "hero.jpg" if idx == 0 else f"gallery_{idx}.jpg"
            dest_file = target_dir / filename
            
            # Skip if already downloaded and has valid size
            if dest_file.exists() and dest_file.stat().st_size > 5000:
                print(f"  Already exists: {filename} ({dest_file.stat().st_size // 1024} KB)")
                downloaded_local_paths.append(f"/static/img/attractions/{attraction_id}/{filename}")
                continue

            print(f"  Downloading image {idx + 1} from Wikimedia...")
            if download_file(u, dest_file):
                print(f"  Saved -> {dest_file.name} ({dest_file.stat().st_size // 1024} KB)")
                downloaded_local_paths.append(f"/static/img/attractions/{attraction_id}/{filename}")
            time.sleep(0.5)

        if downloaded_local_paths:
            item["image_url"] = downloaded_local_paths[0]
            item["gallery"] = downloaded_local_paths
            updated_count += 1
            print(f"  Updated JSON with {len(downloaded_local_paths)} local authentic photos!")

    # Save updated JSON
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(attractions, f, indent=2)

    print("\n================================================================")
    print(f"  DONE! Updated {updated_count} attractions with authentic photos.")
    print("================================================================")

if __name__ == "__main__":
    main()
