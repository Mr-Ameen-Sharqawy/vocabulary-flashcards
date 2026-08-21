import json
import time
from collections import defaultdict
from pathlib import Path

from openai import OpenAI

ROOT = Path('/home/ubuntu/vocabulary-flashcards')
ANALYSIS_PATH = ROOT / 'grade5_new_batch_analysis.json'
ACCEPTED_PATH = ROOT / 'grade5_new_batch_accepted_matches.json'
COVERAGE_PATH = ROOT / 'grade5_image_coverage_report.json'
OUT_PATH = ROOT / 'grade5_new_batch_broad_suggestions.json'
MODEL = 'gpt-5-mini'
BATCH_SIZE = 16

SYSTEM = '''You are matching cartoon image filenames to English Grade 5 vocabulary terms for child flashcards.
For each image, choose at most one allowed term only when the picture is either:
1. a direct depiction of the term, OR
2. a close educationally useful depiction of the same action, object, state, or context.
Close examples: a child flexing can teach "make our bodies stronger"; a character asleep can teach "rested"; a decision scene can teach "decide".
Reject far associations, vague backgrounds, unrelated scenery, or any guess that needs a long explanation. Do not assign a term just because it occurs in a similar lesson.
Do not invent terms. Return every requested image exactly once. Use fit="exact" for direct, fit="close" for a useful near match, and fit="skip" when not appropriate. Output JSON only.'''

SCHEMA = {
    'type': 'json_schema',
    'json_schema': {
        'name': 'broad_grade5_filename_matches',
        'strict': True,
        'schema': {
            'type': 'object',
            'properties': {
                'matches': {
                    'type': 'array',
                    'items': {
                        'type': 'object',
                        'properties': {
                            'image_name': {'type': 'string'},
                            'term': {'type': 'string'},
                            'fit': {'type': 'string', 'enum': ['exact', 'close', 'skip']},
                            'confidence': {'type': 'string', 'enum': ['high', 'medium', 'low']},
                            'reason': {'type': 'string'},
                        },
                        'required': ['image_name', 'term', 'fit', 'confidence', 'reason'],
                        'additionalProperties': False,
                    },
                },
            },
            'required': ['matches'],
            'additionalProperties': False,
        },
    },
}


analysis = json.loads(ANALYSIS_PATH.read_text(encoding='utf-8'))
accepted = json.loads(ACCEPTED_PATH.read_text(encoding='utf-8'))
coverage = json.loads(COVERAGE_PATH.read_text(encoding='utf-8'))
accepted_images = {item['image_name'] for item in accepted['matches']}
remaining_terms = [item['term'] for item in coverage['missing_terms']]
images = [
    {'image_name': item['image_name'], 'relative_path': item['relative_path']}
    for item in analysis['inventory']
    if item['image_name'] not in accepted_images
]

client = OpenAI()
matches = []
for batch_number, start in enumerate(range(0, len(images), BATCH_SIZE), start=1):
    batch = images[start:start + BATCH_SIZE]
    response = client.chat.completions.create(
        model=MODEL,
        messages=[
            {'role': 'system', 'content': SYSTEM},
            {'role': 'user', 'content': json.dumps({'allowed_terms': remaining_terms, 'images': batch}, ensure_ascii=False)},
        ],
        response_format=SCHEMA,
        max_completion_tokens=3600,
    )
    content = response.choices[0].message.content
    if not content:
        raise RuntimeError(f'Empty model response in batch {batch_number}.')
    parsed = json.loads(content)
    batch_names = {item['image_name'] for item in batch}
    by_image = {item['image_name']: item for item in parsed['matches'] if item['image_name'] in batch_names}
    for image in batch:
        matches.append(by_image.get(image['image_name'], {
            'image_name': image['image_name'],
            'term': '',
            'fit': 'skip',
            'confidence': 'low',
            'reason': 'No structured response for this image.',
        }))
    print(f'Processed batch {batch_number}: {len(batch)} images.')
    time.sleep(0.2)

rank = {('exact', 'high'): 6, ('exact', 'medium'): 5, ('close', 'high'): 4, ('close', 'medium'): 3, ('close', 'low'): 2, ('exact', 'low'): 2}
selected = []
used_terms = set()
for item in sorted(matches, key=lambda match: rank.get((match['fit'], match['confidence']), 0), reverse=True):
    if item['fit'] == 'skip' or not item['term'] or item['term'] in used_terms:
        continue
    selected.append(item)
    used_terms.add(item['term'])

summary = defaultdict(int)
for item in matches:
    summary[f"{item['fit']}_{item['confidence']}"] += 1

OUT_PATH.write_text(json.dumps({
    'model': MODEL,
    'allowed_terms': remaining_terms,
    'matches': matches,
    'selected_unique_candidates': selected,
    'summary': dict(sorted(summary.items())),
}, ensure_ascii=False, indent=2), encoding='utf-8')
print(f'Wrote {len(matches)} reviews and {len(selected)} unique candidates to {OUT_PATH.name}.')
