import urllib.request
import os

os.makedirs('static/js/vendor', exist_ok=True)
url = 'https://unpkg.com/scrollama@2.2.1/build/scrollama.min.js'
target = 'static/js/vendor/scrollama.min.js'

try:
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=15) as resp:
        content = resp.read().decode('utf-8')
        with open(target, 'w', encoding='utf-8') as f:
            f.write(content)
    print(f"Downloaded scrollama.min.js ({len(content)} bytes)")
except Exception as e:
    print(f"Error downloading scrollama: {e}")
