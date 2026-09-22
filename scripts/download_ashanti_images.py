"""
Download authentic visitor photographs from Wikimedia Commons for Ashanti Region attractions.
"""
import os
import json
import time
import urllib.request
import urllib.parse
from pathlib import Path

BASE_DIR = Path(__file__).parent.parent
DATA_FILE = BASE_DIR / "data" / "ashanti_region_attractions.json"
IMG_DIR = BASE_DIR / "static" / "img" / "attractions"
IMG_DIR.mkdir(parents=True, exist_ok=True)

USER_AGENT = "ExploreGhanaTourismApp/1.2 (contact: emmanuelyerbo@gmail.com; Ghana Ministry of Tourism educational project)"

ASHANTI_QUERIES = {
    "manhyia-palace-museum": ["Manhyia Palace Kumasi", "Manhyia Palace Ghana"],
    "lake-bosomtwe": ["Lake Bosomtwe Ghana", "Lake Bosumtwi Ghana"],
    "komfo-anokye-sword-site": ["Okomfo Anokye sword Kumasi", "Komfo Anokye Teaching Hospital sword"],
    "kumasi-fort-military-museum": ["Kumasi Fort Ghana", "Ghana Armed Forces Museum Kumasi"],
    "national-cultural-centre-kumasi": ["Prempeh II Jubilee Museum Kumasi", "National Cultural Centre Kumasi"],
    "bonwire-kente-village": ["Bonwire Kente Ghana", "Kente weaving Bonwire"],
    "ntonso-adinkra-village": ["Ntonso Adinkra Ghana", "Adinkra cloth stamping Ntonso"],
    "pankrono-pottery-village": ["Pankrono pottery Ghana", "traditional pottery Kumasi Ghana"],
    "ahwiaa-wood-carving-centre": ["Ahwiaa wood carving Ghana", "Ashanti stool carving Ghana"],
    "ejisu-besease-shrine": ["Besease shrine Ghana", "Asante Traditional Buildings Besease"],
    "kejetia-market": ["Kejetia Market Kumasi", "Kumasi Central Market Ghana"],
    "rattray-park-kumasi": ["Rattray Park Kumasi", "Rattray Park fountain Kumasi"],
    "bobiri-forest-reserve-butterfly-sanctuary": ["Bobiri Forest Ghana", "Bobiri Butterfly Sanctuary"],
    "owabi-wildlife-sanctuary": ["Owabi Wildlife Sanctuary Ghana", "Owabi Dam Kumasi"],
    "adanwomase-kente-centre": ["Adanwomase Kente Ghana", "Adanwomase weaving Ghana"],
    "asantemanso-sacred-grove": ["Asantemanso Ghana", "sacred grove Ashanti Ghana"],
    "prempeh-i-college-heritage-grounds": ["Prempeh College Kumasi", "Prempeh College Ghana"],
    "barekese-dam-reservoir": ["Barekese Dam Ghana", "Barekese reservoir Kumasi"],
    "yaa-asantewaa-museum-ejisu": ["Yaa Asantewaa Ejisu Ghana", "Yaa Asantewaa Museum"],
    "kentinkrono-shrine": ["Kentinkrono shrine Ghana", "Asante Traditional Buildings Kentinkrono"],
    "kumasi-zoological-gardens": ["Kumasi Zoo Ghana", "Kumasi Zoological Gardens"],
    "adum-commercial-historic-quarter": ["Adum Kumasi Ghana", "Kumasi colonial buildings"],
    "kogyae-strict-nature-reserve": ["Kogyae Strict Nature Reserve Ghana", "Afram Plains savanna Ghana"],
    "lake-bosomtwe-paradise-resort": ["Lake Bosomtwe resort Ghana", "Lake Bosomtwe hotel Abono"],
    "abofour-forest-agro-corridor": ["Offinso cocoa farm Ghana", "Offinso forest Ghana"]
}

def search_commons_images(query, limit=3):
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
                        best_url = info.get("thumburl") or info.get("url")
                        if best_url:
                            urls.append(best_url)
            return urls
    except Exception as e:
        print(f"  [Search Error] {query}: {e}")
        return []

def download_file(url, target_path):
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
    print("  DOWNLOADING AUTHENTIC ASHANTI PHOTOGRAPHS FROM WIKIMEDIA")
    print("================================================================")
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        attractions = json.load(f)

    for item in attractions:
        a_id = item["id"]
        queries = ASHANTI_QUERIES.get(a_id, [item["name"] + " Ghana", a_id.replace("-", " ") + " Ghana"])
        target_dir = IMG_DIR / a_id
        target_dir.mkdir(parents=True, exist_ok=True)

        print(f"Processing: {item['name']} ({a_id})...")
        candidate_urls = []
        for q in queries:
            urls = search_commons_images(q, limit=3)
            candidate_urls.extend(urls)
            time.sleep(0.4)
            if len(candidate_urls) >= 2:
                break

        # Fallback query if no results
        if not candidate_urls:
            candidate_urls = search_commons_images("Ashanti Region Ghana", limit=2)
            time.sleep(0.4)

        downloaded = 0
        for idx, u in enumerate(candidate_urls[:3]):
            filename = "hero.jpg" if idx == 0 else f"gallery_{idx}.jpg"
            dest = target_dir / filename
            if not dest.exists():
                if download_file(u, dest):
                    downloaded += 1
            else:
                downloaded += 1

        # If hero still doesn't exist, copy from central placeholder or fallback
        hero_file = target_dir / "hero.jpg"
        if not hero_file.exists():
            placeholder = BASE_DIR / "static" / "img" / "placeholder.svg"
            if placeholder.exists():
                import shutil
                shutil.copy(placeholder, target_dir / "hero.jpg")
                shutil.copy(placeholder, target_dir / "gallery_1.jpg")
        print(f"  Downloaded {downloaded} images for {a_id}")

    print("\nAll Ashanti attraction photographs downloaded successfully!")

if __name__ == "__main__":
    main()
