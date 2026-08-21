import csv
import hashlib
import json
import re
from collections import Counter
from pathlib import Path

from PIL import Image

ROOT = Path('/home/ubuntu/vocabulary-flashcards')
IMAGE_ROOT = Path('/home/ubuntu/webdev-static-assets/grade5-new-20260821')
COURSE_PATH = ROOT / 'grade5_course_raw.json'
IMAGE_MAP_PATH = ROOT / 'client/src/lib/grade5-cartoon-images.ts'
JSON_OUT = ROOT / 'grade5_new_batch_analysis.json'
CSV_OUT = ROOT / 'grade5_new_batch_inventory.csv'
REPORT_OUT = ROOT / 'Grade_5_New_Batch_Review.md'

IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.webp'}
TIMESTAMP = re.compile(r'[_\s-]?20\d{10,}')
NON_ALNUM = re.compile(r'[^a-z0-9]+')
MAP_ENTRY = re.compile(r'^\s*"([^"]+)":\s*"([^"]+)"', re.MULTILINE)
STOPWORDS = {'a', 'an', 'the', 'and', 'or', 'of', 'on', 'in', 'at', 'with', 'for', 'to', 'from', 'by'}


def normalize(value: str) -> str:
    value = TIMESTAMP.sub('', value.lower())
    value = re.sub(r'\([^)]*\)', '', value)
    value = NON_ALNUM.sub(' ', value)
    return re.sub(r'\s+', ' ', value).strip()


def tokens(value: str) -> set[str]:
    return {token for token in normalize(value).split() if token not in STOPWORDS}


def sha1(path: Path) -> str:
    digest = hashlib.sha1()
    with path.open('rb') as file:
        for block in iter(lambda: file.read(1024 * 1024), b''):
            digest.update(block)
    return digest.hexdigest()


def phrase_present(phrase: str, filename: str) -> bool:
    return bool(re.search(rf'\b{re.escape(phrase)}\b', filename))


course = json.loads(COURSE_PATH.read_text(encoding='utf-8'))
terms_by_key = {}
for lesson in course['lessons']:
    for card in lesson['cards']:
        terms_by_key.setdefault(normalize(card['term']), {
            'term': card['term'],
            'arabic': card['arabic'],
            'unit': lesson['unit'],
            'lesson': lesson['lesson'],
        })

mapped_terms = {normalize(term) for term, _ in MAP_ENTRY.findall(IMAGE_MAP_PATH.read_text(encoding='utf-8'))}
remaining = {key: value for key, value in terms_by_key.items() if key not in mapped_terms}

inventory = []
exact_matches = []
candidate_matches = []
for image in sorted(path for path in IMAGE_ROOT.rglob('*') if path.suffix.lower() in IMAGE_EXTENSIONS):
    relative = image.relative_to(IMAGE_ROOT).as_posix()
    filename_key = normalize(image.stem)
    try:
        with Image.open(image) as opened:
            width, height = opened.size
            image_format = opened.format or image.suffix.lstrip('.').upper()
    except Exception as exc:  # Keep broken images visible in the report.
        width, height, image_format = None, None, f'Unreadable: {exc}'

    item = {
        'image_path': str(image),
        'relative_path': relative,
        'image_name': image.name,
        'normalized_filename': filename_key,
        'sha1': sha1(image),
        'width': width,
        'height': height,
        'format': image_format,
    }
    inventory.append(item)

    direct = []
    for term_key, term in remaining.items():
        term_tokens = tokens(term_key)
        if not term_tokens:
            continue
        if phrase_present(term_key, filename_key):
            direct.append((len(term_tokens), len(term_key), term_key, term))
            continue
        overlap = len(term_tokens & tokens(filename_key))
        if len(term_tokens) >= 2 and overlap == len(term_tokens):
            direct.append((len(term_tokens), len(term_key), term_key, term))
        elif overlap >= 2:
            candidate_matches.append({
                'image_name': image.name,
                'image_path': str(image),
                'term': term['term'],
                'arabic': term['arabic'],
                'shared_tokens': sorted(term_tokens & tokens(filename_key)),
                'score': round(overlap / len(term_tokens), 2),
            })
    if direct:
        _, _, _, term = max(direct)
        exact_matches.append({
            **term,
            'image_name': image.name,
            'image_path': str(image),
            'match_type': 'conservative_filename',
        })

duplicates = Counter(item['sha1'] for item in inventory)
for item in inventory:
    item['duplicate_in_new_batch'] = duplicates[item['sha1']] > 1

with CSV_OUT.open('w', encoding='utf-8', newline='') as output:
    writer = csv.DictWriter(output, fieldnames=[
        'image_path', 'relative_path', 'image_name', 'normalized_filename', 'width', 'height',
        'format', 'sha1', 'duplicate_in_new_batch'
    ])
    writer.writeheader()
    writer.writerows(inventory)

JSON_OUT.write_text(json.dumps({
    'inventory': inventory,
    'remaining_terms': list(remaining.values()),
    'exact_matches': exact_matches,
    'candidate_matches': candidate_matches,
}, ensure_ascii=False, indent=2), encoding='utf-8')

report = [
    '# Grade 5 — new image batch review',
    '',
    f'- New extracted images: **{len(inventory)}**',
    f'- Grade 5 terms already mapped: **{len(mapped_terms)}**',
    f'- Grade 5 terms still unmatched before this batch: **{len(remaining)}**',
    f'- Conservative filename matches in this batch: **{len(exact_matches)}**',
    f'- Duplicate image files inside this batch: **{sum(count - 1 for count in duplicates.values() if count > 1)}**',
    '',
    '## Conservative filename matches awaiting visual review',
    '',
]
report.extend(f'- {item["term"]} — `{item["image_name"]}`' for item in exact_matches)
REPORT_OUT.write_text('\n'.join(report) + '\n', encoding='utf-8')

print(
    f'Inventory: {len(inventory)} new images; '
    f'{len(exact_matches)} conservative matches; '
    f'{len(remaining)} terms were unmatched before this batch.'
)
