"""Build conservative, text-free cartoon image prompts for pending Grade 6 terms."""

from __future__ import annotations

import json
from pathlib import Path


ROOT = Path('/home/ubuntu/vocabulary-flashcards')
INPUT = ROOT / 'Grade_6_No_Direct_Image_Match_To_Copy.txt'
JSON_OUTPUT = ROOT / 'grade6_image_generation_manifest.json'
MARKDOWN_OUTPUT = ROOT / 'Grade_6_Image_Generation_Batches.md'
BATCH_SIZE = 25

# The only approved candidate from the previously unused image review.
REUSED_TERMS = {'environment'}


terms = [
    line.strip()
    for line in INPUT.read_text(encoding='utf-8').splitlines()
    if line.strip() and not line.startswith('#') and not line.startswith('These terms')
]
terms = [term for term in terms if term.lower() not in REUSED_TERMS]


def prompt_for(term: str) -> str:
    return (
        'Create one child-friendly educational cartoon illustration for an English vocabulary flashcard. '
        f'Target concept: "{term}". '
        'Show a single clear, concrete scene that communicates the target concept at a glance to a primary-school child. '
        'Use bright, friendly 3D storybook-cartoon style, expressive but natural characters where helpful, clear central subject, simple uncluttered background, warm daylight, and a square 1:1 composition. '
        'No words, no letters, no numbers, no captions, no speech bubbles, no logos, no watermarks, no signs with writing, no borders, no split-screen layout.'
    )


items = [
    {'id': index + 1, 'term': term, 'prompt': prompt_for(term)}
    for index, term in enumerate(terms)
]
batches = [items[index:index + BATCH_SIZE] for index in range(0, len(items), BATCH_SIZE)]

JSON_OUTPUT.write_text(json.dumps({
    'reused_terms': sorted(REUSED_TERMS),
    'batch_size': BATCH_SIZE,
    'items': items,
}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

markdown = [
    '# Grade 6 — cartoon image generation batches',
    '',
    '> Every prompt requires a single clear educational cartoon scene with no text, logo, sign-writing, caption, or watermark. The already approved `environment` image is excluded.',
    '',
    f'- Images to generate: **{len(items)}**',
    f'- Batch size: **{BATCH_SIZE}**',
    '',
]
for index, batch in enumerate(batches, start=1):
    markdown.extend([f'## Batch {index}', ''])
    for item in batch:
        markdown.extend([f'### {item["id"]}. {item["term"]}', '', item['prompt'], ''])
MARKDOWN_OUTPUT.write_text('\n'.join(markdown) + '\n', encoding='utf-8')

print(f'Prepared {len(items)} prompts in {len(batches)} batches.')
