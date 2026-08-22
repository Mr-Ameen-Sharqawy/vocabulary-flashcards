"""Collect one traceable Wikimedia Commons candidate per concrete Grade 6 term.

Collected candidates are reviewed before any use. License and attribution metadata are kept.
"""

from __future__ import annotations

import json
import time
from pathlib import Path

import requests


ROOT = Path('/home/ubuntu/vocabulary-flashcards')
OUT_DIR = Path('/home/ubuntu/webdev-static-assets/grade6-wikimedia-candidates-batch01')
MANIFEST = ROOT / 'grade6_wikimedia_candidates_batch01.json'
API = 'https://commons.wikimedia.org/w/api.php'
HEADERS = {'User-Agent': 'VocabularyFlashcards/1.0 (educational asset review; contact project owner)'}
REQUEST_DELAY_SECONDS = 3.0

TERMS = [
    'cactus', 'mountains', 'sea turtle', 'coral reef', 'mangrove tree',
    'carpet', 'crops', 'factory', 'oasis', 'rug', 'wool', 'loom',
    'camera', 'fossil', 'skeleton', 'waterfall', 'vehicle', 'garbage bag',
    'solar panel', 'wind turbine', 'fridge', 'fuel', 'notebook', 'newspaper',
    'ticket', 'passport', 'suitcase', 'cable car',
]


def extension(content_type: str) -> str:
    if 'png' in content_type:
        return '.png'
    if 'webp' in content_type:
        return '.webp'
    return '.jpg'


OUT_DIR.mkdir(parents=True, exist_ok=True)
results = []
for term in TERMS:
    params = {
        'action': 'query',
        'generator': 'search',
        'gsrsearch': f'{term} filetype:bitmap',
        'gsrnamespace': 6,
        'gsrlimit': 8,
        'prop': 'imageinfo',
        'iiprop': 'url|extmetadata|mime',
        'iiurlwidth': 800,
        'format': 'json',
        'formatversion': 2,
    }
    try:
        response = requests.get(API, params=params, headers=HEADERS, timeout=30)
        response.raise_for_status()
        pages = response.json().get('query', {}).get('pages', [])
    except requests.RequestException as exc:
        results.append({'term': term, 'status': 'query-error', 'error': str(exc)})
        time.sleep(REQUEST_DELAY_SECONDS)
        continue

    selected = None
    for page in pages:
        imageinfo = (page.get('imageinfo') or [{}])[0]
        metadata = imageinfo.get('extmetadata') or {}
        license_name = (metadata.get('LicenseShortName') or {}).get('value', '')
        thumbnail = imageinfo.get('thumburl')
        if thumbnail:
            selected = {
                'title': page.get('title'),
                'description_url': imageinfo.get('descriptionurl'),
                'original_url': imageinfo.get('url'),
                'thumbnail_url': thumbnail,
                'mime': imageinfo.get('mime', ''),
                'license': license_name,
                'artist': (metadata.get('Artist') or {}).get('value', ''),
                'credit': (metadata.get('Credit') or {}).get('value', ''),
            }
            break
    if not selected:
        results.append({'term': term, 'status': 'no-candidate'})
        time.sleep(REQUEST_DELAY_SECONDS)
        continue

    try:
        image = requests.get(selected['thumbnail_url'], headers=HEADERS, timeout=30)
        image.raise_for_status()
        path = OUT_DIR / f'{term.replace(" ", "-")}{extension(image.headers.get("Content-Type", ""))}'
        path.write_bytes(image.content)
        selected.update({'term': term, 'status': 'downloaded-candidate', 'local_path': str(path)})
        results.append(selected)
    except requests.RequestException as exc:
        selected.update({'term': term, 'status': 'download-error', 'error': str(exc)})
        results.append(selected)
    time.sleep(REQUEST_DELAY_SECONDS)

MANIFEST.write_text(json.dumps({'source': 'Wikimedia Commons', 'candidates': results}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(f'Collected {sum(item["status"] == "downloaded-candidate" for item in results)} Wikimedia candidates from {len(TERMS)} terms.')
