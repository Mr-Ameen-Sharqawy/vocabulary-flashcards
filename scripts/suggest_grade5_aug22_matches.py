import json
from pathlib import Path

from openai import OpenAI


ROOT = Path('/home/ubuntu/vocabulary-flashcards')
INVENTORY_PATH = ROOT / 'grade5_aug22_image_inventory.json'
COVERAGE_PATH = ROOT / 'grade5_image_coverage_report.json'
OUTPUT_PATH = ROOT / 'grade5_aug22_filename_suggestions.json'
MODEL = 'gpt-5-mini'
BATCH_SIZE = 49


inventory = json.loads(INVENTORY_PATH.read_text(encoding='utf-8'))['images']
missing_terms = [record['term'] for record in json.loads(COVERAGE_PATH.read_text(encoding='utf-8'))['missing_terms']]
client = OpenAI()


def classify(images: list[dict]) -> list[dict]:
    image_names = [image['filename'] for image in images]
    prompt = f'''You are matching child-friendly English flashcard images to Grade 5 vocabulary.

The image file names are descriptive scene labels. For each image, choose one term only from the allowed list. Accept a direct match or an educationally close visual match. Mark confidence "high" for direct/very clear, "medium" for close but acceptable, "low" when unsure, and "reject" when no allowed term is represented. Never invent a term and never reuse a term in this batch.

Allowed terms:\n{json.dumps(missing_terms, ensure_ascii=False)}

Images to classify:\n{json.dumps(image_names, ensure_ascii=False)}'''
    schema = {
        'type': 'object',
        'properties': {
            'matches': {
                'type': 'array',
                'items': {
                    'type': 'object',
                    'properties': {
                        'image_filename': {'type': 'string'},
                        'term': {'type': 'string'},
                        'confidence': {'type': 'string', 'enum': ['high', 'medium', 'low', 'reject']},
                        'reason': {'type': 'string'},
                    },
                    'required': ['image_filename', 'term', 'confidence', 'reason'],
                    'additionalProperties': False,
                },
            },
        },
        'required': ['matches'],
        'additionalProperties': False,
    }
    response = client.chat.completions.create(
        model=MODEL,
        messages=[
            {'role': 'system', 'content': 'Return only JSON that conforms exactly to the supplied schema.'},
            {'role': 'user', 'content': prompt},
        ],
        response_format={
            'type': 'json_schema',
            'json_schema': {'name': 'grade5_image_matches', 'strict': True, 'schema': schema},
        },
        max_completion_tokens=6000,
    )
    result = json.loads(response.choices[0].message.content)
    matches = result['matches']
    if {item['image_filename'] for item in matches} != set(image_names):
        raise ValueError('Model did not return one match for every image in the batch.')
    return matches


all_matches = []
for start in range(0, len(inventory), BATCH_SIZE):
    batch = inventory[start:start + BATCH_SIZE]
    all_matches.extend(classify(batch))
    print(f'Classified {min(start + BATCH_SIZE, len(inventory))}/{len(inventory)} images.')

by_filename = {record['filename']: record for record in inventory}
for match in all_matches:
    match['image_path'] = by_filename[match['image_filename']]['path']

OUTPUT_PATH.write_text(
    json.dumps({'model': MODEL, 'terms': missing_terms, 'suggestions': all_matches}, ensure_ascii=False, indent=2),
    encoding='utf-8',
)
print(f'Wrote {len(all_matches)} suggestions to {OUTPUT_PATH}.')
