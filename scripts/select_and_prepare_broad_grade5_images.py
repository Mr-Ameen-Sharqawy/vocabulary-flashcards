import hashlib
import json
import re
import shutil
from pathlib import Path

ROOT = Path('/home/ubuntu/vocabulary-flashcards')
ANALYSIS_PATH = ROOT / 'grade5_new_batch_analysis.json'
BROAD_PATH = ROOT / 'grade5_new_batch_broad_suggestions.json'
IMAGE_MAP_PATHS = [
    ROOT / 'client/src/lib/grade5-cartoon-images.ts',
    ROOT / 'client/src/lib/grade5-new-batch-images.ts',
]
ACCEPTED_PATH = ROOT / 'grade5_broad_accepted_matches.json'
MANIFEST_PATH = ROOT / 'grade5_broad_upload_manifest.json'
READY_DIR = Path('/home/ubuntu/webdev-static-assets/grade5-broad-ready-upload')

MAP_ENTRY = re.compile(r'^\s*"([^"]+)":\s*"([^"]+)"', re.MULTILINE)
EXCLUDED_IMAGE_PREFIXES = {
    # This image illustrates impact rather than an obstruction.
    'Cartoon_ball_hitting_wall',
}
FIT_SCORE = {'exact': 2, 'close': 1}
CONFIDENCE_SCORE = {'high': 2, 'medium': 1, 'low': 0}


def normalize(value: str) -> str:
    value = re.sub(r'\([^)]*\)', '', value.lower())
    value = re.sub(r'[^a-z0-9]+', ' ', value)
    return re.sub(r'\s+', ' ', value).strip()


analysis = json.loads(ANALYSIS_PATH.read_text(encoding='utf-8'))
broad_matches = json.loads(BROAD_PATH.read_text(encoding='utf-8'))['matches']
inventory_by_name = {item['image_name']: item for item in analysis['inventory']}
existing_terms = {
    normalize(term)
    for map_path in IMAGE_MAP_PATHS
    for term, _ in MAP_ENTRY.findall(map_path.read_text(encoding='utf-8'))
}


def rank(match: dict) -> tuple[int, int]:
    return (
        FIT_SCORE.get(match.get('fit', ''), 0),
        CONFIDENCE_SCORE.get(match.get('confidence', ''), 0),
    )


candidate_matches = [
    match
    for match in broad_matches
    if match.get('term')
    and match.get('fit') in FIT_SCORE
    and not any(match['image_name'].startswith(prefix) for prefix in EXCLUDED_IMAGE_PREFIXES)
]
candidate_matches.sort(key=rank, reverse=True)

approved = []
seen_terms: set[str] = set()
seen_images: set[str] = set()
for match in candidate_matches:
    term_key = normalize(match['term'])
    inventory_item = inventory_by_name.get(match['image_name'])
    if not inventory_item:
        raise ValueError(f"Missing inventory entry for {match['image_name']}")
    if term_key in existing_terms or term_key in seen_terms:
        continue
    if match['image_name'] in seen_images:
        continue
    approved.append({
        **inventory_item,
        'term': match['term'],
        'fit': match['fit'],
        'confidence': match['confidence'],
        'reason': match['reason'],
        'source': 'new_batch_broad_visual_review',
    })
    seen_terms.add(term_key)
    seen_images.add(match['image_name'])

if READY_DIR.exists():
    shutil.rmtree(READY_DIR)
READY_DIR.mkdir(parents=True)

manifest = []
for index, item in enumerate(approved, start=1):
    source = Path(item['image_path'])
    digest = hashlib.sha1(source.read_bytes()).hexdigest()[:10]
    output = READY_DIR / f'grade5-broad-{index:03d}-{digest}{source.suffix.lower()}'
    shutil.copy2(source, output)
    manifest.append({
        'term': item['term'],
        'fit': item['fit'],
        'confidence': item['confidence'],
        'source': item['source'],
        'original_image_name': source.name,
        'original_image_path': str(source),
        'local_upload_path': str(output),
    })

ACCEPTED_PATH.write_text(json.dumps({'matches': approved}, ensure_ascii=False, indent=2), encoding='utf-8')
MANIFEST_PATH.write_text(json.dumps({'uploads': manifest}, ensure_ascii=False, indent=2), encoding='utf-8')
print(f'Approved {len(approved)} additional broad matches and prepared {len(manifest)} ASCII-safe upload files.')
