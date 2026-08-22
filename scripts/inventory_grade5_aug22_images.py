import hashlib
import json
from collections import Counter
from pathlib import Path

from PIL import Image


ASSET_ROOT = Path('/home/ubuntu/webdev-static-assets/grade5-new-20260822')
OUTPUT_PATH = Path('/home/ubuntu/vocabulary-flashcards/grade5_aug22_image_inventory.json')
IMAGE_SUFFIXES = {'.jpg', '.jpeg', '.png', '.webp'}


def digest(path: Path) -> str:
    hasher = hashlib.sha256()
    with path.open('rb') as file:
        for chunk in iter(lambda: file.read(1024 * 1024), b''):
            hasher.update(chunk)
    return hasher.hexdigest()


records = []
for image_path in sorted(path for path in ASSET_ROOT.rglob('*') if path.suffix.lower() in IMAGE_SUFFIXES):
    with Image.open(image_path) as image:
        width, height = image.size
        records.append({
            'path': str(image_path),
            'archive': image_path.relative_to(ASSET_ROOT).parts[0],
            'filename': image_path.name,
            'stem': image_path.stem,
            'format': image.format,
            'width': width,
            'height': height,
            'bytes': image_path.stat().st_size,
            'sha256': digest(image_path),
        })

hash_counts = Counter(record['sha256'] for record in records)
for record in records:
    record['duplicate_in_new_archives'] = hash_counts[record['sha256']] > 1

summary = {
    'total_images': len(records),
    'by_archive': dict(Counter(record['archive'] for record in records)),
    'duplicate_files': sum(1 for record in records if record['duplicate_in_new_archives']),
}
OUTPUT_PATH.write_text(json.dumps({'summary': summary, 'images': records}, indent=2), encoding='utf-8')
print(json.dumps(summary, indent=2))
