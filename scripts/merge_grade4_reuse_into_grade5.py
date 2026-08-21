import json
import re
from pathlib import Path

ROOT = Path('/home/ubuntu/vocabulary-flashcards')


def key(value: str) -> str:
    return re.sub(r'[^a-z0-9]+', ' ', re.sub(r'\([^)]*\)', '', value.lower())).strip()


base = json.loads((ROOT / 'grade5_final_image_matches.json').read_text(encoding='utf-8'))
reuse = json.loads((ROOT / 'grade5_from_grade4_image_candidates.json').read_text(encoding='utf-8'))
semantic = json.loads((ROOT / 'grade5_from_grade4_semantic_review.json').read_text(encoding='utf-8'))['reviewed_mappings']

# Exact labels are safe except "wild", whose Grade 4 animal image does not teach Grade 5's severe-weather sense.
accepted_exact = [item for item in reuse['exact_matches'] if key(item['term']) != 'wild']

# These were accepted only after semantic and visual review. Broad associations and different word senses remain excluded.
accepted_semantic_terms = {
    'regularly', 'exercising', 'exercised', 'healthier', 'powerful', 'kindness',
    'with a little bit of kindness', 'stay active', 'provide', 'provided', 'close to',
    'movement', 'community', 'peaceful', 'the busiest place', 'shop', 'gather', 'fed',
    'form', 'formed', 'cost', 'admire', 'admired', 'rushed', 'bathe', 'tasty',
}
accepted_semantic = [
    item for item in semantic
    if item['confidence'] == 'high' and key(item['term']) in {key(term) for term in accepted_semantic_terms} and item['image']
]

used_terms = {key(item['term']) for item in base['matches']}
reused = []
for item in accepted_exact:
    if key(item['term']) not in used_terms:
        reused.append({
            'term': item['term'], 'arabic': item['arabic'], 'unit': item['unit'], 'lesson': item['lesson'],
            'image_path': item['image'], 'image_name': f"Grade 4 reuse: {item['grade4_term']}", 'source': 'grade4_reuse_exact',
        })
        used_terms.add(key(item['term']))
for item in accepted_semantic:
    if key(item['term']) not in used_terms:
        reused.append({
            'term': item['term'], 'arabic': item['arabic'], 'unit': item['unit'], 'lesson': item['lesson'],
            'image_path': item['image'], 'image_name': f"Grade 4 reuse: {item['grade4_term']}", 'source': 'grade4_reuse_semantic',
        })
        used_terms.add(key(item['term']))

combined_matches = [*base['matches'], *reused]
unmatched = [item for item in base['unmatched_terms'] if key(item['term']) not in used_terms]
sources = {}
for item in combined_matches:
    sources[item['source']] = sources.get(item['source'], 0) + 1

(ROOT / 'grade5_combined_image_matches.json').write_text(json.dumps({
    'matches': combined_matches, 'sources': sources, 'unmatched_terms': unmatched,
}, ensure_ascii=False, indent=2), encoding='utf-8')

report = [
    '# Grade 5 images still needed', '',
    f'- Distinct Grade 5 terms: **{len(base["unmatched_terms"]) + len(base["matches"])}**',
    f'- Linked images after reviewing Grade 4: **{len(combined_matches)}**',
    f'- Reused Grade 4 images accepted after review: **{len(reused)}**',
    f'- Terms still needing a dedicated picture: **{len(unmatched)}**', '',
    '## Reused Grade 4 image sources', '',
    '| Source | Linked terms |', '| --- | ---: |',
]
report.extend(f'| {name} | {count} |' for name, count in sorted(sources.items()))
report.extend(['', '## Terms still needing a dedicated picture', ''])
report.extend(f'- {item["term"]} — {item["arabic"]}' for item in unmatched)
(ROOT / 'Grade_5_Images_Still_Needed.md').write_text('\n'.join(report) + '\n', encoding='utf-8')
print(f'Accepted {len(reused)} Grade 4 reuses. Total Grade 5 matches: {len(combined_matches)}. Remaining: {len(unmatched)}.')
