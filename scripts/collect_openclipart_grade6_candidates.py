"""Collect first-page Openclipart previews for a conservative Grade 6 object batch.

These are candidate downloads only. Do not link them into the app before visual review.
"""

from __future__ import annotations

import json
import re
import time
from pathlib import Path
from urllib.parse import quote_plus

import requests
from bs4 import BeautifulSoup


ROOT = Path('/home/ubuntu/vocabulary-flashcards')
OUT_DIR = Path('/home/ubuntu/webdev-static-assets/grade6-openclipart-candidates-batch01')
MANIFEST = ROOT / 'grade6_openclipart_candidates_batch01.json'

# Concrete Grade 6 concepts only. Abstract concepts and sentence-like expressions are excluded.
TERMS = [
    'cactus', 'mountains', 'sea turtles', 'coral reefs', 'mangrove trees',
    'carpet', 'crops', 'factory', 'oasis', 'rug', 'wool', 'loom',
    'computer', 'camera', 'fossils', 'skeleton', 'waterfall', 'vehicles',
    'garbage bags', 'solar panels', 'wind turbines', 'fridge', 'fuel',
    'notebook', 'newspaper', 'ticket', 'passport', 'suitcases', 'cable car',
]

HEADERS = {'User-Agent': 'VocabularyFlashcards/1.0 educational asset review'}
OUT_DIR.mkdir(parents=True, exist_ok=True)
results = []

for term in TERMS:
    search_url = f'https://openclipart.org/search/?query={quote_plus(term)}'
    response = requests.get(search_url, headers=HEADERS, timeout=30)
    response.raise_for_status()
    soup = BeautifulSoup(response.text, 'html.parser')
    detail = next((link.get('href') for link in soup.select('a[href^="/detail/"]')), None)
    if not detail:
        results.append({'term': term, 'status': 'no-result', 'search_url': search_url})
        time.sleep(1.2)
        continue

    match = re.search(r'/detail/(\d+)', detail)
    if not match:
        results.append({'term': term, 'status': 'unparsed-result', 'search_url': search_url, 'detail_url': detail})
        time.sleep(1.2)
        continue

    asset_id = match.group(1)
    preview_url = f'https://openclipart.org/image/800px/{asset_id}'
    image_response = requests.get(preview_url, headers=HEADERS, timeout=30)
    image_response.raise_for_status()
    extension = '.png' if image_response.content[:8].startswith(b'\x89PNG') else '.jpg'
    local_path = OUT_DIR / f'{term.replace(" ", "-")}-{asset_id}{extension}'
    local_path.write_bytes(image_response.content)
    results.append({
        'term': term,
        'status': 'downloaded-candidate',
        'search_url': search_url,
        'detail_url': f'https://openclipart.org{detail}',
        'preview_url': preview_url,
        'local_path': str(local_path),
        'asset_id': asset_id,
    })
    time.sleep(1.2)

MANIFEST.write_text(json.dumps({
    'source': 'Openclipart CC0/public-domain',
    'candidates': results,
}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(f'Collected {sum(item["status"] == "downloaded-candidate" for item in results)} candidates from {len(TERMS)} terms.')
