"""List approved Grade 6 records without an exact image-term match in Grade 4/5."""

from __future__ import annotations

import json
import re
from pathlib import Path


ROOT = Path('/home/ubuntu/vocabulary-flashcards')
GRADE6_PATH = ROOT / 'grade6_selected_vocabulary_raw.json'
DIRECT_PATH = ROOT / 'grade6_existing_image_direct_matches.json'
REPORT_PATH = ROOT / 'Grade_6_No_Direct_Image_Match.md'
COPY_PATH = ROOT / 'Grade_6_No_Direct_Image_Match_To_Copy.txt'


def normalize(value: str) -> str:
    value = re.sub(r'<[^>]+>', ' ', value.lower())
    value = re.sub(r'\([^)]*\)', ' ', value)
    value = re.sub(r'[^a-z0-9]+', ' ', value)
    return re.sub(r'\s+', ' ', value).strip()


records = json.loads(GRADE6_PATH.read_text(encoding='utf-8'))['records']
direct_matches = json.loads(DIRECT_PATH.read_text(encoding='utf-8'))['direct_matches']
direct_terms = {normalize(item['english']) for item in direct_matches}
unmatched = [item for item in records if normalize(item['english']) not in direct_terms]
unmatched.sort(key=lambda item: (item['unit'], item['lesson'], item['section'], item['english'].lower()))
distinct_unmatched = []
seen = set()
for item in unmatched:
    key = normalize(item['english'])
    if key not in seen:
        seen.add(key)
        distinct_unmatched.append(item)

report = [
    '# Grade 6 — terms with no direct image match in Grade 4 or Grade 5',
    '',
    '> This list uses exact normalized word or phrase matching only. A term here may still have a **near semantic candidate**, but no such candidate has been accepted or linked yet.',
    '',
    f'- Grade 6 approved records checked: **{len(records)}**',
    f'- Records with a direct Grade 4/5 image match: **{len(records) - len(unmatched)}**',
    f'- Records with no direct Grade 4/5 image match: **{len(unmatched)}**',
    f'- Distinct English terms or expressions with no direct match: **{len(distinct_unmatched)}**',
    '',
    '## Detailed list by lesson',
    '',
]

current_lesson = None
for item in unmatched:
    label = f'Unit {item["unit"]} · {item["lesson"]}'
    if label != current_lesson:
        if current_lesson is not None:
            report.append('')
        report.extend([f'### {label}', '', '| Section | English term or expression | Arabic meaning |', '| --- | --- | --- |'])
        current_lesson = label
    report.append(f'| {item["section"]} | {item["english"]} | {item["arabic"]} |')

report.extend(['', '## Distinct terms for a future image decision', ''])
report.extend(f'- {item["english"]}' for item in distinct_unmatched)
REPORT_PATH.write_text('\n'.join(report) + '\n', encoding='utf-8')

copy = [
    '# Grade 6 — no direct image match in Grade 4 or Grade 5',
    '',
    'These terms have no exact existing image match. Do not treat this as a request for new images until close semantic candidates are reviewed.',
    '',
]
copy.extend(item['english'] for item in distinct_unmatched)
COPY_PATH.write_text('\n'.join(copy) + '\n', encoding='utf-8')

print(f'No direct match: {len(unmatched)} lesson records, {len(distinct_unmatched)} distinct English terms or expressions.')
