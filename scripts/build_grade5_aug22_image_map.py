import json
import re
from pathlib import Path


ROOT = Path('/home/ubuntu/vocabulary-flashcards')
MATCHES_PATH = ROOT / 'grade5_aug22_accepted_matches.json'
UPLOAD_RESULTS_PATH = ROOT / 'grade5_aug22_upload_results.txt'
OUTPUT_PATH = ROOT / 'client/src/lib/grade5-aug22-images.ts'
SUCCESS_LINE = re.compile(r'^\[SUCCESS\] (?P<local>.+) -> (?P<url>/manus-storage/\S+)$')


def normalize(value: str) -> str:
    value = re.sub(r'\([^)]*\)', '', value.lower())
    value = re.sub(r'[^a-z0-9]+', ' ', value)
    return re.sub(r'\s+', ' ', value).strip()


urls_by_path = {}
for line in UPLOAD_RESULTS_PATH.read_text(encoding='utf-8').splitlines():
    match = SUCCESS_LINE.match(line)
    if match:
        urls_by_path[match.group('local')] = match.group('url')

entries = {}
for item in json.loads(MATCHES_PATH.read_text(encoding='utf-8'))['matches']:
    term = normalize(item['term'])
    url = urls_by_path.get(item['local_upload_path'])
    if not url:
        raise ValueError(f"No successful upload URL for {item['local_upload_path']}")
    if term in entries and entries[term] != url:
        raise ValueError(f'Conflicting images for {term}')
    entries[term] = url

lines = [
    '/** Grade 5 images approved from the August 22 user-provided archives. */',
    'export const grade5Aug22CartoonImages: Record<string, string> = {',
]
for term, url in sorted(entries.items()):
    lines.append(f'  {json.dumps(term)}: {json.dumps(url)},')
lines.extend(['};', ''])
OUTPUT_PATH.write_text('\n'.join(lines), encoding='utf-8')
print(f'Wrote {len(entries)} term links to {OUTPUT_PATH}.')
