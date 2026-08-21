import json
import time
from pathlib import Path

from openai import OpenAI

ROOT = Path('/home/ubuntu/vocabulary-flashcards')
ANALYSIS_PATH = ROOT / 'grade5_new_batch_analysis.json'
OUT_PATH = ROOT / 'grade5_new_batch_llm_suggestions.json'
MODEL = 'gpt-5-mini'
BATCH_SIZE = 20

SYSTEM = '''You map image filenames to English Grade 5 vocabulary terms.
The filenames describe an image's visible content. Choose an allowed term only when the depicted subject or action teaches that exact term directly and unambiguously.
Do not choose a broad association, an antonym, a related setting, or a grammatical form that is not in the allowed list.
If a filename could support more than one meaning or no term clearly fits, return an empty term with low confidence.
Never invent a term outside the allowed list. Output only the requested JSON.'''

SCHEMA = {
    'type': 'json_schema',
    'json_schema': {
        'name': 'grade5_filename_matches',
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
                            'confidence': {'type': 'string', 'enum': ['high', 'medium', 'low']},
                            'reason': {'type': 'string'},
                        },
                        'required': ['image_name', 'term', 'confidence', 'reason'],
                        'additionalProperties': False,
                    },
                },
            },
            'required': ['matches'],
            'additionalProperties': False,
        },
    },
}


data = json.loads(ANALYSIS_PATH.read_text(encoding='utf-8'))
allowed_terms = [item['term'] for item in data['remaining_terms']]
exact_names = {item['image_name'] for item in data['exact_matches']}
images = [
    {'image_name': item['image_name'], 'relative_path': item['relative_path']}
    for item in data['inventory']
    if item['image_name'] not in exact_names
]

client = OpenAI()
all_matches = []
for batch_number, start in enumerate(range(0, len(images), BATCH_SIZE), start=1):
    batch = images[start:start + BATCH_SIZE]
    prompt = json.dumps({
        'allowed_terms': allowed_terms,
        'images': batch,
    }, ensure_ascii=False)
    response = client.chat.completions.create(
        model=MODEL,
        messages=[
            {'role': 'system', 'content': SYSTEM},
            {'role': 'user', 'content': prompt},
        ],
        response_format=SCHEMA,
        max_completion_tokens=3200,
    )
    content = response.choices[0].message.content
    if not content:
        raise RuntimeError(f'Empty model response in batch {batch_number}.')
    parsed = json.loads(content)
    known = {item['image_name'] for item in batch}
    for item in parsed['matches']:
        if item['image_name'] in known:
            all_matches.append(item)
    print(f'Processed batch {batch_number}: {len(batch)} images.')
    time.sleep(0.2)

OUT_PATH.write_text(json.dumps({
    'model': MODEL,
    'allowed_terms': allowed_terms,
    'suggestions': all_matches,
}, ensure_ascii=False, indent=2), encoding='utf-8')
print(f'Wrote {len(all_matches)} semantic review results to {OUT_PATH.name}.')
