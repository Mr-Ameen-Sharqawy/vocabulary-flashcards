"""Suggest conservative Grade 6 candidates from prior unused image filenames.

Suggestions are not approvals. Every suggestion requires visual review before any reuse.
"""

from __future__ import annotations

import json
import os
import re
from pathlib import Path

from openai import OpenAI


ROOT = Path('/home/ubuntu/vocabulary-flashcards')
IMAGES_PATH = ROOT / 'grade6_prior_unused_image_inventory.json'
WORDS_PATH = ROOT / 'Grade_6_No_Direct_Image_Match_To_Copy.txt'
OUTPUT_PATH = ROOT / 'grade6_prior_unused_semantic_suggestions.json'
MODEL = 'gpt-5-mini'
BATCH_SIZE = 32


def clean_filename(value: str) -> str:
    value = re.sub(r'_20\d{10,}', '', value)
    value = Path(value).stem.replace('_', ' ')
    return re.sub(r'\s+', ' ', value).strip()


images = json.loads(IMAGES_PATH.read_text(encoding='utf-8'))['unused_images']
terms = [
    line.strip()
    for line in WORDS_PATH.read_text(encoding='utf-8').splitlines()
    if line.strip() and not line.startswith('#') and not line.startswith('These terms')
]

client = OpenAI(api_key=os.environ['OPENAI_API_KEY'], base_url=os.environ['OPENAI_API_BASE'])
results = []

schema = {
    'type': 'object',
    'properties': {
        'candidates': {
            'type': 'array',
            'items': {
                'type': 'object',
                'properties': {
                    'filename': {'type': 'string'},
                    'term': {'type': 'string'},
                    'confidence': {'type': 'string', 'enum': ['high', 'medium']},
                    'reason': {'type': 'string'},
                },
                'required': ['filename', 'term', 'confidence', 'reason'],
                'additionalProperties': False,
            },
        },
    },
    'required': ['candidates'],
    'additionalProperties': False,
}

for start in range(0, len(images), BATCH_SIZE):
    batch = images[start:start + BATCH_SIZE]
    image_descriptions = [
        {'filename': item['filename'], 'inferred_scene': clean_filename(item['filename'])}
        for item in batch
    ]
    prompt = (
        'Match only image filenames whose inferred scene provides a direct or educationally close visual for ONE of the Grade 6 terms. '
        'Be conservative: omit ambiguous, weak, or merely word-related pairs. Do not invent terms. '
        'Return at most one term per image and only the candidate rows. These are suggestions for a later visual review, not approvals.\n\n'
        f'Grade 6 terms without direct image matches:\n{json.dumps(terms, ensure_ascii=False)}\n\n'
        f'Unused image candidates:\n{json.dumps(image_descriptions, ensure_ascii=False)}'
    )
    response = client.chat.completions.create(
        model=MODEL,
        messages=[
            {'role': 'system', 'content': 'You are a precise educational image-match reviewer. Output JSON only.'},
            {'role': 'user', 'content': prompt},
        ],
        response_format={
            'type': 'json_schema',
            'json_schema': {'name': 'image_candidates', 'strict': True, 'schema': schema},
        },
        max_completion_tokens=3500,
    )
    data = json.loads(response.choices[0].message.content)
    valid_filenames = {item['filename'] for item in batch}
    valid_terms = set(terms)
    for candidate in data['candidates']:
        if candidate['filename'] in valid_filenames and candidate['term'] in valid_terms:
            results.append(candidate)

deduplicated = []
seen_images = set()
for candidate in results:
    if candidate['filename'] not in seen_images:
        seen_images.add(candidate['filename'])
        deduplicated.append(candidate)

OUTPUT_PATH.write_text(json.dumps({
    'model': MODEL,
    'suggestions': deduplicated,
    'images_reviewed_by_filename': len(images),
    'grade6_terms_considered': len(terms),
}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

print(f'Semantic suggestions created: {len(deduplicated)} from {len(images)} unused images.')
