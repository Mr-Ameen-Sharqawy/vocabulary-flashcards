"""Inventory direct, reproducible image matches for the approved Grade 6 vocabulary."""

from __future__ import annotations

import json
import re
from pathlib import Path


ROOT = Path('/home/ubuntu/vocabulary-flashcards')
GRADE6_PATH = ROOT / 'grade6_selected_vocabulary_raw.json'
OUTPUT_PATH = ROOT / 'grade6_existing_image_direct_matches.json'
REPORT_PATH = ROOT / 'Grade_6_Existing_Image_Matches.md'

GRADE4_MAPS = [
    ROOT / 'client/src/lib/cartoon-images.ts',
    ROOT / 'client/src/lib/uploaded-cartoon-images.ts',
    ROOT / 'client/src/lib/final-uploaded-cartoon-images.ts',
]
GRADE5_MAPS = [
    ROOT / 'client/src/lib/grade5-cartoon-images.ts',
    ROOT / 'client/src/lib/grade5-new-batch-images.ts',
    ROOT / 'client/src/lib/grade5-broad-images.ts',
    ROOT / 'client/src/lib/grade5-aug22-images.ts',
    ROOT / 'client/src/lib/grade5-final-images.ts',
]


def normalize(value: str) -> str:
    value = re.sub(r'<[^>]+>', ' ', value.lower())
    value = re.sub(r'\([^)]*\)', ' ', value)
    value = re.sub(r'[^a-z0-9]+', ' ', value)
    return re.sub(r'\s+', ' ', value).strip()


ENTRY = re.compile(r'^\s*"([^"]+)"\s*:\s*"([^"]+)"', re.MULTILINE)


def load_maps(paths: list[Path]) -> dict[str, list[dict[str, str]]]:
    combined: dict[str, list[dict[str, str]]] = {}
    for path in paths:
        for term, url in ENTRY.findall(path.read_text(encoding='utf-8')):
            key = normalize(term)
            if key and url.startswith('/manus-storage/'):
                combined.setdefault(key, []).append({'term': term, 'url': url, 'map_file': path.name})
    return combined


grade4 = load_maps(GRADE4_MAPS)
grade5 = load_maps(GRADE5_MAPS)
records = json.loads(GRADE6_PATH.read_text(encoding='utf-8'))['records']

matches = []
for record in records:
    term_key = normalize(record['english'])
    grade4_sources = grade4.get(term_key, [])
    grade5_sources = grade5.get(term_key, [])
    if grade4_sources or grade5_sources:
        matches.append({
            'unit': record['unit'],
            'lesson': record['lesson'],
            'section': record['section'],
            'english': record['english'],
            'arabic': record['arabic'],
            'grade4_sources': grade4_sources,
            'grade5_sources': grade5_sources,
        })

seen = set()
deduplicated = []
for item in matches:
    key = (normalize(item['english']), item['unit'], item['lesson'], item['section'])
    if key not in seen:
        seen.add(key)
        deduplicated.append(item)

OUTPUT_PATH.write_text(json.dumps({
    'direct_matches': deduplicated,
    'grade6_records': len(records),
    'grade6_distinct_terms': len({normalize(item['english']) for item in records}),
    'grade4_distinct_image_terms': len(grade4),
    'grade5_distinct_image_terms': len(grade5),
}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

report = [
    '# Grade 6 — direct image matches already available',
    '',
    '> This inventory checks **exact normalized term matches only**. It does not approve close semantic matches yet; those require visual review before reuse.',
    '',
    f'- Approved Grade 6 vocabulary records checked: **{len(records)}**',
    f'- Distinct Grade 6 terms and expressions checked: **{len({normalize(item["english"]) for item in records})}**',
    f'- Grade 4 image terms indexed: **{len(grade4)}**',
    f'- Grade 5 image terms indexed: **{len(grade5)}**',
    f'- Direct Grade 6 lesson-term matches found: **{len(deduplicated)}**',
    '',
    '| Unit | Lesson | Section | Grade 6 term | Grade 4 sources | Grade 5 sources |',
    '| ---: | --- | --- | --- | ---: | ---: |',
]
for item in deduplicated:
    report.append(
        f'| {item["unit"]} | {item["lesson"]} | {item["section"]} | {item["english"]} | '
        f'{len(item["grade4_sources"])} | {len(item["grade5_sources"])} |'
    )
REPORT_PATH.write_text('\n'.join(report) + '\n', encoding='utf-8')

print(f'Direct Grade 6 matches: {len(deduplicated)} from {len(records)} approved lesson records.')
