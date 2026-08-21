import json
import re
from collections import Counter
from pathlib import Path

ROOT = Path('/home/ubuntu/vocabulary-flashcards')


def key(value):
    value = re.sub(r'\([^)]*\)', '', value.lower())
    return re.sub(r'[^a-z0-9]+', ' ', value).strip()


course = json.loads((ROOT / 'grade5_course_raw.json').read_text(encoding='utf-8'))
term_records = {}
for lesson in course['lessons']:
    for card in lesson['cards']:
        term_records.setdefault(key(card['term']), {
            'term': card['term'],
            'arabic': card['arabic'],
            'unit': lesson['unit'],
            'lesson': lesson['lesson'],
        })

candidates = json.loads((ROOT / 'grade5_image_match_candidates.json').read_text(encoding='utf-8'))['candidates']
by_name = {item['image_name']: item for item in candidates}
exact = json.loads((ROOT / 'grade5_auto_image_matches.json').read_text(encoding='utf-8'))['matches']
filename_high = json.loads((ROOT / 'grade5_high_confidence_image_matches.json').read_text(encoding='utf-8'))['matches']
llm = json.loads((ROOT / 'grade5_llm_image_suggestions.json').read_text(encoding='utf-8'))['suggestions']

matches, used_terms, used_images, sources = [], set(), set(), Counter()


def add(term, image_path, image_name, source):
    normalized = key(term)
    if normalized not in term_records or normalized in used_terms or image_path in used_images:
        return False
    record = term_records[normalized]
    matches.append({
        **record,
        'image_path': image_path,
        'image_name': image_name,
        'source': source,
    })
    used_terms.add(normalized)
    used_images.add(image_path)
    sources[source] += 1
    return True


for item in exact:
    add(item['term'], item['image_path'], item['image_name'], 'exact_filename')

for item in filename_high:
    add(item['term'], item['image_path'], item['image_name'], 'high_filename')

for item in llm:
    if item['confidence'] != 'high' or not item['term']:
        continue
    source_item = by_name.get(item['image_name'])
    if source_item:
        add(item['term'], source_item['image_path'], item['image_name'], 'semantic_filename')

unmatched = [record for term_key, record in term_records.items() if term_key not in used_terms]
(ROOT / 'grade5_final_image_matches.json').write_text(
    json.dumps({'matches': matches, 'sources': dict(sources), 'unmatched_terms': unmatched}, ensure_ascii=False, indent=2),
    encoding='utf-8',
)

report = [
    '# Grade 5 image-match report',
    '',
    f'- Distinct Grade 5 terms: **{len(term_records)}**',
    f'- Safely linked images: **{len(matches)}**',
    f'- Terms still without an image: **{len(unmatched)}**',
    '',
    '## Match sources',
    '',
    '| Source | Linked images |',
    '| --- | ---: |',
]
report.extend(f'| {name} | {count} |' for name, count in sorted(sources.items()))
report.extend(['', '## Terms still needing a dedicated image', ''])
report.extend(f'- {item["term"]} — {item["arabic"]}' for item in unmatched)
(ROOT / 'Grade_5_Images_Still_Needed.md').write_text('\n'.join(report) + '\n', encoding='utf-8')
print(f'Merged {len(matches)} safe matches: ' + ', '.join(f'{name}={count}' for name, count in sorted(sources.items())))
print(f'Unmatched unique terms: {len(unmatched)}')
