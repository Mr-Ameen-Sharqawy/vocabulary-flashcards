import json
from pathlib import Path

ROOT = Path('/home/ubuntu/vocabulary-flashcards')
data = json.loads((ROOT / 'grade5_combined_image_matches.json').read_text(encoding='utf-8'))
terms = [item['term'] for item in data['unmatched_terms']]

lines = [
    '# Grade 5 — Remaining Image Words',
    '',
    f'**{len(terms)}** English words and phrases still need a dedicated cartoon image after reviewing Grade 5 uploads and the Grade 4 image library.',
    '',
    'Copy one code block at a time when preparing a new image batch.',
    '',
]
for start in range(0, len(terms), 50):
    batch = terms[start:start + 50]
    lines.extend([f'## Batch {start // 50 + 1} ({start + 1}–{start + len(batch)})', '', '```text', *batch, '```', ''])

output = ROOT / 'Grade_5_Remaining_Words_To_Copy.txt'
output.write_text('\n'.join(lines), encoding='utf-8')
print(f'Wrote {len(terms)} remaining Grade 5 words in {((len(terms) - 1) // 50) + 1} batches to {output}.')
