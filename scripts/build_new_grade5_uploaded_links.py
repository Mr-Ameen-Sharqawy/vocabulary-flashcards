import json
import re
from pathlib import Path

ROOT = Path('/home/ubuntu/vocabulary-flashcards')
MANIFEST_PATH = ROOT / 'grade5_new_batch_upload_manifest.json'
UPLOAD_OUTPUT_PATH = ROOT / 'grade5_new_batch_upload_output.txt'
OUT_PATH = ROOT / 'grade5_new_batch_uploaded_links.json'

line_pattern = re.compile(r'^\[SUCCESS\]\s+(.+?)\s+->\s+(/manus-storage/\S+)$')
uploaded = {}
for line in UPLOAD_OUTPUT_PATH.read_text(encoding='utf-8').splitlines():
    match = line_pattern.match(line.strip())
    if match:
        uploaded[match.group(1)] = match.group(2)

manifest = json.loads(MANIFEST_PATH.read_text(encoding='utf-8'))['uploads']
links = []
missing = []
for item in manifest:
    url = uploaded.get(item['local_upload_path'])
    if not url:
        missing.append(item)
        continue
    links.append({
        'term': item['term'],
        'url': url,
        'source': item['source'],
        'image_name': item['original_image_name'],
    })

if missing:
    names = ', '.join(item['local_upload_path'] for item in missing)
    raise RuntimeError(f'Missing upload URLs for: {names}')

OUT_PATH.write_text(json.dumps({'links': links}, ensure_ascii=False, indent=2), encoding='utf-8')
print(f'Built {len(links)} vocabulary-to-storage links.')
