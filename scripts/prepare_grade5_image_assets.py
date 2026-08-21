import hashlib
import json
import shutil
from pathlib import Path

ROOT = Path('/home/ubuntu/vocabulary-flashcards')
ASSET_DIR = Path('/home/ubuntu/webdev-static-assets/grade5-ready-upload')
ASSET_DIR.mkdir(parents=True, exist_ok=True)

data = json.loads((ROOT / 'grade5_final_image_matches.json').read_text(encoding='utf-8'))
prepared = []
for index, item in enumerate(data['matches'], start=1):
    source = Path(item['image_path'])
    suffix = source.suffix.lower() if source.suffix else '.jpeg'
    fingerprint = hashlib.sha1(str(source).encode('utf-8')).hexdigest()[:10]
    destination = ASSET_DIR / f'grade5-{index:03d}-{fingerprint}{suffix}'
    if not destination.exists():
        shutil.copy2(source, destination)
    prepared.append({
        'term': item['term'],
        'source': item['source'],
        'local_upload_path': str(destination),
        'image_name': item['image_name'],
    })

(ROOT / 'grade5_upload_manifest.json').write_text(
    json.dumps({'assets': prepared}, ensure_ascii=False, indent=2), encoding='utf-8'
)
print(f'Prepared {len(prepared)} ASCII-safe image files in {ASSET_DIR}.')
