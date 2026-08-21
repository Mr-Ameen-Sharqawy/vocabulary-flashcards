import json
import os
import re
import time
from pathlib import Path

import requests

ROOT = Path('/home/ubuntu/vocabulary-flashcards')
INPUT = ROOT / 'grade5_from_grade4_image_candidates.json'
OUT = ROOT / 'grade5_from_grade4_semantic_review.json'
GRADE4_MAP_FILES = [
    ROOT / 'client/src/lib/cartoon-images.ts',
    ROOT / 'client/src/lib/uploaded-cartoon-images.ts',
    ROOT / 'client/src/lib/final-uploaded-cartoon-images.ts',
]


def normalize(value: str) -> str:
    return re.sub(r'[^a-z0-9]+', ' ', re.sub(r'\([^)]*\)', '', value.lower())).strip()


entry_pattern = re.compile(r'^\s*["\']([^"\']+)["\']:\s*["\']([^"\']+)["\'],?\s*$')
grade4_terms = {}
for source in GRADE4_MAP_FILES:
    for line in source.read_text(encoding='utf-8').splitlines():
        found = entry_pattern.match(line)
        if found:
            term, image = found.groups()
            grade4_terms.setdefault(normalize(term), {'term': term, 'image': image})

data = json.loads(INPUT.read_text(encoding='utf-8'))
pending = data['still_unmatched_after_exact']
allowed_terms = [item['term'] for item in grade4_terms.values()]
schema = {
    'type': 'object',
    'properties': {
        'mappings': {
            'type': 'array',
            'items': {
                'type': 'object',
                'properties': {
                    'grade5_term': {'type': 'string'},
                    'grade4_term': {'type': 'string'},
                    'confidence': {'type': 'string', 'enum': ['high', 'medium', 'low']},
                },
                'required': ['grade5_term', 'grade4_term', 'confidence'],
                'additionalProperties': False,
            },
        },
    },
    'required': ['mappings'],
    'additionalProperties': False,
}
headers = {'Authorization': f"Bearer {os.environ['OPENAI_API_KEY']}", 'Content-Type': 'application/json'}
endpoint = os.environ['OPENAI_API_BASE'].rstrip('/') + '/chat/completions'
system = (
    'You are validating reuse of existing educational cartoon images between two English vocabulary courses. '
    'For each Grade 5 term, select one Grade 4 term only when its existing picture would teach the same classroom meaning without misleading a child. '
    'Exact tense/form variants and clear paraphrases are allowed, for example taking care of -> care for take care of. '
    'Do not accept broad category overlap, a single word from a phrase, grammar-only overlap, or a different sense. '
    'If no safe reusable image exists, return an empty grade4_term and low confidence. Return every Grade 5 term exactly once.'
)

results = []
for start in range(0, len(pending), 36):
    batch = pending[start:start + 36]
    prompt = (
        'Grade 4 image labels you may use:\n' + json.dumps(allowed_terms, ensure_ascii=False) +
        '\n\nGrade 5 terms to evaluate:\n' + json.dumps([item['term'] for item in batch], ensure_ascii=False)
    )
    response = requests.post(endpoint, headers=headers, json={
        'model': 'gpt-5-mini',
        'messages': [{'role': 'system', 'content': system}, {'role': 'user', 'content': prompt}],
        'max_completion_tokens': 3500,
        'response_format': {'type': 'json_schema', 'json_schema': {'name': 'grade4_reuse_review', 'strict': True, 'schema': schema}},
    }, timeout=120)
    if not response.ok:
        raise RuntimeError(f'LLM request failed ({response.status_code}): {response.text}')
    body = response.json()
    if 'choices' not in body:
        raise RuntimeError(f'LLM response did not include choices: {json.dumps(body, ensure_ascii=False)}')
    results.extend(json.loads(body['choices'][0]['message']['content'])['mappings'])
    print(f'Reviewed {min(start + len(batch), len(pending))}/{len(pending)} Grade 5 terms.')
    time.sleep(0.3)

by_key = {normalize(item['term']): item for item in pending}
reviewed = []
for result in results:
    original = by_key.get(normalize(result['grade5_term']))
    grade4 = grade4_terms.get(normalize(result['grade4_term']))
    if original and grade4:
        reviewed.append({**original, 'grade4_term': grade4['term'], 'image': grade4['image'], 'confidence': result['confidence']})
    elif original:
        reviewed.append({**original, 'grade4_term': '', 'image': '', 'confidence': 'low'})

OUT.write_text(json.dumps({'reviewed_mappings': reviewed}, ensure_ascii=False, indent=2), encoding='utf-8')
print(f'Wrote {len(reviewed)} reviewed Grade 4 reuse candidates to {OUT}.')
