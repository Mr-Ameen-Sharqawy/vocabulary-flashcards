import json
import os
import time
from pathlib import Path

import requests

COURSE = Path('/home/ubuntu/vocabulary-flashcards/grade5_course_raw.json')
HIGH_CONFIDENCE = Path('/home/ubuntu/vocabulary-flashcards/grade5_high_confidence_image_matches.json')
CANDIDATES = Path('/home/ubuntu/vocabulary-flashcards/grade5_image_match_candidates.json')
OUT = Path('/home/ubuntu/vocabulary-flashcards/grade5_llm_image_suggestions.json')
MODEL = 'gpt-5-mini'


def term_key(value: str):
    return value.lower().replace('(adj)', '').strip()


course = json.loads(COURSE.read_text(encoding='utf-8'))
all_terms = []
seen = set()
for lesson in course['lessons']:
    for card in lesson['cards']:
        key = term_key(card['term'])
        if key not in seen:
            seen.add(key)
            all_terms.append(card['term'])

high = json.loads(HIGH_CONFIDENCE.read_text(encoding='utf-8'))['matches']
matched_images = {item['image_name'] for item in high}
candidates = json.loads(CANDIDATES.read_text(encoding='utf-8'))['candidates']
pending = [item for item in candidates if item['image_name'] not in matched_images]

schema = {
    'type': 'object',
    'properties': {
        'mappings': {
            'type': 'array',
            'items': {
                'type': 'object',
                'properties': {
                    'image_name': {'type': 'string'},
                    'term': {'type': 'string'},
                    'confidence': {'type': 'string', 'enum': ['high', 'medium', 'low']},
                },
                'required': ['image_name', 'term', 'confidence'],
                'additionalProperties': False,
            },
        },
    },
    'required': ['mappings'],
    'additionalProperties': False,
}

headers = {
    'Authorization': f"Bearer {os.environ['OPENAI_API_KEY']}",
    'Content-Type': 'application/json',
}
endpoint = os.environ['OPENAI_API_BASE'].rstrip('/') + '/chat/completions'
system = (
    'You map educational cartoon image filenames to an allowed Grade 5 vocabulary term. '
    'Use only filenames as evidence. Return one exact allowed term only when the filename clearly illustrates that term. '
    'Do not match broad actions, tense variants, or short common words unless unmistakable. '
    'If no term is clearly represented, return an empty string and low confidence. Do not invent terms.'
)

results = []
batch_size = 28
for offset in range(0, len(pending), batch_size):
    batch = pending[offset:offset + batch_size]
    image_lines = '\n'.join(f"- {item['image_name']}" for item in batch)
    prompt = (
        'Allowed terms:\n' + json.dumps(all_terms, ensure_ascii=False) +
        '\n\nImage filenames to evaluate:\n' + image_lines +
        '\n\nReturn a mapping for every listed image filename exactly once.'
    )
    payload = {
        'model': MODEL,
        'messages': [{'role': 'system', 'content': system}, {'role': 'user', 'content': prompt}],
        'max_completion_tokens': 4000,
        'response_format': {'type': 'json_schema', 'json_schema': {'name': 'grade5_image_mappings', 'strict': True, 'schema': schema}},
    }
    response = requests.post(endpoint, headers=headers, json=payload, timeout=120)
    if not response.ok:
        raise RuntimeError(f'LLM request failed ({response.status_code}): {response.text}')
    body = response.json()
    if 'choices' not in body:
        raise RuntimeError(f'LLM response did not include choices: {json.dumps(body, ensure_ascii=False)}')
    content = body['choices'][0]['message']['content']
    parsed = json.loads(content)
    results.extend(parsed['mappings'])
    print(f'Processed {min(offset + batch_size, len(pending))}/{len(pending)} image names.')
    time.sleep(0.3)

OUT.write_text(json.dumps({'model': MODEL, 'suggestions': results}, ensure_ascii=False, indent=2), encoding='utf-8')
print(f'Wrote {len(results)} semantic suggestions to {OUT}.')
