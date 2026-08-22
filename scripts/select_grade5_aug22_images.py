import json
import re
import shutil
from collections import defaultdict
from pathlib import Path


ROOT = Path('/home/ubuntu/vocabulary-flashcards')
CANDIDATES_PATH = ROOT / 'grade5_aug22_review_candidates.json'
COVERAGE_PATH = ROOT / 'grade5_image_coverage_report.json'
OUTPUT_PATH = ROOT / 'grade5_aug22_accepted_matches.json'
MANIFEST_PATH = ROOT / 'grade5_aug22_upload_manifest.json'
UPLOAD_DIR = Path('/home/ubuntu/webdev-static-assets/grade5-aug22-approved-upload')

# Each index was reviewed manually in grade5_aug22_visual_review_notes.md.
PRIMARY_SELECTIONS = {
    2: 'fall', 3: 'hurt', 4: 'struck', 5: 'burn down', 6: 'cover', 7: 'have no shape',
    8: 'brought', 9: 'found', 10: 'the Eastern Desert', 11: 'healthcare', 12: 'super strong',
    13: 'work for', 14: 'upside down', 15: 'bothered', 16: 'froze',
    19: 'It was hard to + inf.', 20: 'on the spot', 21: 'came', 22: 'rush', 23: 'mean',
    24: 'strange', 25: 'swam', 26: 'non-renewable', 27: 'wild', 28: 'dug', 30: 'give up',
    31: 'take a long time', 32: 'natural gas', 33: 'damage', 34: 'still', 35: 'stared',
    36: 'near the edge of', 37: 'become', 38: 'decided', 39: 'make a decision',
    40: "doesn't matter", 44: 'destroyed', 45: 'grateful', 46: 'lose', 49: 'get',
    50: 'easy to shape', 51: 'fell', 52: 'use .... wisely', 53: 'meant', 54: 'club',
    55: 'any longer', 56: 'seemed', 58: 'cheaper', 59: 'lived', 60: 'materials', 62: 'hid',
    63: 'bother', 64: 'modern', 65: 'precious', 66: 'find', 67: '[be] able to', 68: 'clear',
    70: 'the best way to', 71: 'absolutely', 73: 'wasted', 74: 'freeze',
    75: 'community center', 76: 'from the top', 77: 'sail', 78: 'main square',
    79: 'popular', 81: 'scary (adj)', 82: 'something went wrong', 83: 'change', 84: 'cried',
    86: 'prevent ... from', 87: 'ship', 88: 'rich soil', 89: 'appreciated', 90: 'all day',
    91: 'increased', 92: 'contained', 93: 'at the bottom of', 95: 'sailed', 96: 'prevented',
    98: 'valuable',
}

# One clean image may support closely related forms or meanings without claiming an unrelated match.
ADDITIONAL_TERMS = {
    11: ['illnesses'],
    13: ['role'],
    28: ['dig deep into the ground'],
    49: ['possible'],
    54: ['part of'],
    65: ['rare'],
    75: ['danced'],
    79: ['humans'],
    84: ['cry'],
}


def normalize(value: str) -> str:
    value = re.sub(r'\([^)]*\)', '', value.lower())
    return re.sub(r'\s+', ' ', re.sub(r'[^a-z0-9]+', ' ', value)).strip()


candidates = json.loads(CANDIDATES_PATH.read_text(encoding='utf-8'))['candidates']
candidates_by_index = {item['review_index']: item for item in candidates}
missing_terms = json.loads(COVERAGE_PATH.read_text(encoding='utf-8'))['missing_terms']
terms_by_key = {normalize(record['term']): record['term'] for record in missing_terms}

selected = []
for review_index, primary_term in PRIMARY_SELECTIONS.items():
    candidate = candidates_by_index[review_index]
    for term in [primary_term, *ADDITIONAL_TERMS.get(review_index, [])]:
        key = normalize(term)
        if key not in terms_by_key:
            raise ValueError(f'Approved term is not in the remaining coverage report: {term}')
        selected.append({
            'review_index': review_index,
            'term': terms_by_key[key],
            'image_filename': candidate['image_filename'],
            'source_path': candidate['image_path'],
            'review_confidence': candidate['confidence'],
        })

term_counts = defaultdict(int)
for item in selected:
    term_counts[normalize(item['term'])] += 1
duplicates = [term for term, count in term_counts.items() if count > 1]
if duplicates:
    raise ValueError(f'Duplicate selected term mappings: {duplicates}')

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
for stale in UPLOAD_DIR.iterdir():
    if stale.is_file():
        stale.unlink()

uploads_by_source = {}
for number, source_path in enumerate(sorted({item['source_path'] for item in selected}), start=1):
    source = Path(source_path)
    safe_stem = re.sub(r'[^a-z0-9]+', '-', source.stem.lower()).strip('-')[:70]
    target = UPLOAD_DIR / f'grade5-aug22-{number:03d}-{safe_stem}{source.suffix.lower()}'
    shutil.copy2(source, target)
    uploads_by_source[source_path] = str(target)

for item in selected:
    item['local_upload_path'] = uploads_by_source[item['source_path']]

terms_by_source = defaultdict(list)
for item in selected:
    terms_by_source[item['source_path']].append(item['term'])
manifest = {
    'uploads': [
        {
            'source_path': source_path,
            'local_upload_path': uploads_by_source[source_path],
            'terms': sorted(terms),
        }
        for source_path, terms in sorted(terms_by_source.items())
    ],
}

OUTPUT_PATH.write_text(json.dumps({'matches': selected}, ensure_ascii=False, indent=2), encoding='utf-8')
MANIFEST_PATH.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')
print(f'Accepted {len(selected)} term mappings using {len(manifest["uploads"])} unique images.')
