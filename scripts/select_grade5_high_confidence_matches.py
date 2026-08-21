import json
import re
from pathlib import Path

CANDIDATES = Path('/home/ubuntu/vocabulary-flashcards/grade5_image_match_candidates.json')
OUT = Path('/home/ubuntu/vocabulary-flashcards/grade5_high_confidence_image_matches.json')


def normalize(value: str):
    value = re.sub(r'\([^)]*\)', '', value.lower())
    return re.sub(r'[^a-z0-9]+', ' ', value).strip()


data = json.loads(CANDIDATES.read_text(encoding='utf-8'))
ranked = sorted(data['candidates'], key=lambda item: (item['score'], len(normalize(item['suggested_term']))), reverse=True)
used_terms, used_images, matches = set(), set(), []
for item in ranked:
    if item['score'] < 0.82:
        continue
    term_key = normalize(item['suggested_term'])
    if term_key in used_terms or item['image_path'] in used_images:
        continue
    used_terms.add(term_key)
    used_images.add(item['image_path'])
    matches.append({
        'term': item['suggested_term'],
        'arabic': item['suggested_arabic'],
        'image_path': item['image_path'],
        'image_name': item['image_name'],
        'score': item['score'],
    })

OUT.write_text(json.dumps({'matches': matches}, ensure_ascii=False, indent=2), encoding='utf-8')
print(f'Selected {len(matches)} one-to-one high-confidence image matches.')
