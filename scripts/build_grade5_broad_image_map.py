import json
import re
from pathlib import Path

ROOT = Path('/home/ubuntu/vocabulary-flashcards')
MANIFEST_PATH = ROOT / 'grade5_broad_upload_manifest.json'
UPLOAD_RESULTS_PATH = ROOT / 'grade5_broad_upload_results.txt'
OUTPUT_PATH = ROOT / 'client/src/lib/grade5-broad-images.ts'

SUCCESS_LINE = re.compile(r'^\[SUCCESS\] (?P<local>.+) -> (?P<url>/manus-storage/\S+)$')


def normalize(value: str) -> str:
    value = re.sub(r'\([^)]*\)', '', value.lower())
    value = re.sub(r'[^a-z0-9]+', ' ', value)
    return re.sub(r'\s+', ' ', value).strip()


manifest = json.loads(MANIFEST_PATH.read_text(encoding='utf-8'))['uploads']
uploaded_urls = {}
for line in UPLOAD_RESULTS_PATH.read_text(encoding='utf-8').splitlines():
    match = SUCCESS_LINE.match(line)
    if match:
        uploaded_urls[match.group('local')] = match.group('url')

entries = []
seen_terms = set()
for item in manifest:
    term = normalize(item['term'])
    url = uploaded_urls.get(item['local_upload_path'])
    if not url:
        raise ValueError(f"No successful upload URL for {item['local_upload_path']}")
    if term in seen_terms:
        raise ValueError(f'Duplicate normalized term: {term}')
    seen_terms.add(term)
    entries.append((term, url))

lines = [
    '/** Additional Grade 5 images approved after expanded visual semantic review. */',
    'export const grade5BroadCartoonImages: Record<string, string> = {',
]
for term, url in entries:
    lines.append(f'  {json.dumps(term)}: {json.dumps(url)},')
lines.extend(['};', ''])
OUTPUT_PATH.write_text('\n'.join(lines), encoding='utf-8')
print(f'Wrote {len(entries)} image links to {OUTPUT_PATH}.')
