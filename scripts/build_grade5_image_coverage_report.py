import json
import re
from pathlib import Path

ROOT = Path('/home/ubuntu/vocabulary-flashcards')
COURSE_PATH = ROOT / 'grade5_course_raw.json'
MAP_PATH = ROOT / 'client/src/lib/grade5-cartoon-images.ts'
NEW_MAP_PATH = ROOT / 'client/src/lib/grade5-new-batch-images.ts'
BROAD_MAP_PATH = ROOT / 'client/src/lib/grade5-broad-images.ts'
AUG22_MAP_PATH = ROOT / 'client/src/lib/grade5-aug22-images.ts'
FINAL_MAP_PATH = ROOT / 'client/src/lib/grade5-final-images.ts'
NEW_LINKS_PATH = ROOT / 'grade5_new_batch_uploaded_links.json'
BROAD_MANIFEST_PATH = ROOT / 'grade5_broad_upload_manifest.json'
AUG22_MATCHES_PATH = ROOT / 'grade5_aug22_accepted_matches.json'
FINAL_MATCHES_PATH = ROOT / 'grade5_final_archive_accepted_matches.json'
REPORT_PATH = ROOT / 'Grade_5_Images_Still_Needed.md'
COPY_PATH = ROOT / 'Grade_5_Remaining_Words_To_Copy.txt'
JSON_PATH = ROOT / 'grade5_image_coverage_report.json'


def normalize(value: str) -> str:
    value = re.sub(r'\([^)]*\)', '', value.lower())
    value = re.sub(r'[^a-z0-9]+', ' ', value)
    return re.sub(r'\s+', ' ', value).strip()


entry_pattern = re.compile(r'^\s*"([^"]+)":\s*"([^"]+)"', re.MULTILINE)
course = json.loads(COURSE_PATH.read_text(encoding='utf-8'))
terms = {}
for lesson in course['lessons']:
    for card in lesson['cards']:
        terms.setdefault(normalize(card['term']), {
            'term': card['term'],
            'arabic': card['arabic'],
            'unit': lesson['unit'],
            'lesson': lesson['lesson'],
        })

mapped = {normalize(term): url for term, url in entry_pattern.findall(MAP_PATH.read_text(encoding='utf-8'))}
mapped.update({normalize(term): url for term, url in entry_pattern.findall(NEW_MAP_PATH.read_text(encoding='utf-8'))})
mapped.update({normalize(term): url for term, url in entry_pattern.findall(BROAD_MAP_PATH.read_text(encoding='utf-8'))})
mapped.update({normalize(term): url for term, url in entry_pattern.findall(AUG22_MAP_PATH.read_text(encoding='utf-8'))})
mapped.update({normalize(term): url for term, url in entry_pattern.findall(FINAL_MAP_PATH.read_text(encoding='utf-8'))})
new_links = json.loads(NEW_LINKS_PATH.read_text(encoding='utf-8'))['links']
broad_links = json.loads(BROAD_MANIFEST_PATH.read_text(encoding='utf-8'))['uploads']
aug22_links = json.loads(AUG22_MATCHES_PATH.read_text(encoding='utf-8'))['matches']
final_links = json.loads(FINAL_MATCHES_PATH.read_text(encoding='utf-8'))['links']
new_terms = {normalize(item['term']) for item in new_links}
broad_terms = {normalize(item['term']) for item in broad_links}
aug22_terms = {normalize(item['term']) for item in aug22_links}
final_terms = {normalize(item['term']) for item in final_links}
missing = [record for term_key, record in terms.items() if term_key not in mapped]
missing.sort(key=lambda item: (item['unit'], item['lesson'], item['term'].lower()))

report = [
    '# Grade 5 — images still needed',
    '',
    f'- Distinct Grade 5 terms: **{len(terms)}**',
    f'- Terms with a dedicated image now: **{len(mapped)}**',
    f'- Linked from the earlier reviewed batch: **{len(new_terms)}**',
    f'- Linked from the expanded close-match review: **{len(broad_terms)}**',
    f'- Linked from the August 22 user-provided archives: **{len(aug22_terms)}**',
    f'- Linked from the final Newfolder archive: **{len(final_terms)}**',
    f'- Terms still needing a dedicated child-friendly cartoon image: **{len(missing)}**',
    '',
    '> Images with a direct or educationally close meaning were accepted after visual review, including selected photographs or simple diagrams when no nearer cartoon was available. Images that were far from the term, visually unclear, or visibly watermarked were excluded.',
    '',
    '## Remaining terms',
    '',
    '| Unit | Lesson | English term | Arabic meaning |',
    '| ---: | ---: | --- | --- |',
]
report.extend(f'| {item["unit"]} | {item["lesson"]} | {item["term"]} | {item["arabic"]} |' for item in missing)
REPORT_PATH.write_text('\n'.join(report) + '\n', encoding='utf-8')

batch_size = 50
copy = [
    '# Grade 5 — remaining words to copy for images',
    '',
    f'**Total:** {len(missing)} terms. Each block has up to {batch_size} words.',
    '',
]
for index in range(0, len(missing), batch_size):
    copy.append(f'## Batch {index // batch_size + 1}')
    copy.append('')
    copy.extend(item['term'] for item in missing[index:index + batch_size])
    copy.append('')
COPY_PATH.write_text('\n'.join(copy), encoding='utf-8')

JSON_PATH.write_text(json.dumps({
    'distinct_terms': len(terms),
    'mapped_terms': len(mapped),
    'earlier_reviewed_batch_linked_terms': len(new_terms),
    'broad_review_linked_terms': len(broad_terms),
    'aug22_archives_linked_terms': len(aug22_terms),
    'final_archive_linked_terms': len(final_terms),
    'missing_terms': missing,
}, ensure_ascii=False, indent=2), encoding='utf-8')

print(f'Grade 5 coverage: {len(mapped)}/{len(terms)} mapped; {len(missing)} terms still need images.')
