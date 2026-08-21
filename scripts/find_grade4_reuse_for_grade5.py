import json
import re
from pathlib import Path

ROOT = Path('/home/ubuntu/vocabulary-flashcards')
GRADE4_MAP_FILES = [
    ROOT / 'client/src/lib/cartoon-images.ts',
    ROOT / 'client/src/lib/uploaded-cartoon-images.ts',
    ROOT / 'client/src/lib/final-uploaded-cartoon-images.ts',
]


def normalize(value: str) -> str:
    value = re.sub(r'\([^)]*\)', '', value.lower())
    return re.sub(r'[^a-z0-9]+', ' ', value).strip()


grade4_images = {}
entry_pattern = re.compile(r'^\s*["\']([^"\']+)["\']:\s*["\']([^"\']+)["\'],?\s*$')
for source in GRADE4_MAP_FILES:
    for line in source.read_text(encoding='utf-8').splitlines():
        matched = entry_pattern.match(line)
        if matched:
            term, url = matched.groups()
            grade4_images.setdefault(normalize(term), {'term': term, 'image': url, 'source_file': source.name})

grade5 = json.loads((ROOT / 'grade5_final_image_matches.json').read_text(encoding='utf-8'))
unmatched = grade5['unmatched_terms']
accepted, phrase_candidates, still_unmatched = [], [], []

for record in unmatched:
    term_key = normalize(record['term'])
    exact = grade4_images.get(term_key)
    if exact:
        accepted.append({**record, 'grade4_term': exact['term'], 'image': exact['image'], 'source_file': exact['source_file'], 'match_type': 'exact_term'})
        continue

    tokens = term_key.split()
    potential = []
    if len(tokens) >= 2:
        for image_key, image_record in grade4_images.items():
            image_tokens = image_key.split()
            if term_key in image_key or image_key in term_key:
                potential.append({**record, 'grade4_term': image_record['term'], 'image': image_record['image'], 'source_file': image_record['source_file'], 'match_type': 'phrase_overlap'})
    if potential:
        phrase_candidates.extend(potential)
    else:
        still_unmatched.append(record)

output = {
    'grade4_image_terms': len(grade4_images),
    'exact_matches': accepted,
    'phrase_candidates_for_review': phrase_candidates,
    'still_unmatched_after_exact': still_unmatched,
}
(ROOT / 'grade5_from_grade4_image_candidates.json').write_text(json.dumps(output, ensure_ascii=False, indent=2), encoding='utf-8')
print(f'Grade 4 image terms: {len(grade4_images)}')
print(f'Exact Grade 5 reuses: {len(accepted)}')
print(f'Phrase candidates requiring review: {len(phrase_candidates)}')
print(f'Still unmatched after exact reuses: {len(still_unmatched)}')
