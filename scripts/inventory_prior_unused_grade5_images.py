"""Find prior Grade 5 source images not present in the approved-upload folders."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path('/home/ubuntu/vocabulary-flashcards')
ASSETS = Path('/home/ubuntu/webdev-static-assets')
OUTPUT = ROOT / 'grade6_prior_unused_image_inventory.json'
REPORT = ROOT / 'Grade_6_Prior_Unused_Image_Inventory.md'
EXTENSIONS = {'.jpg', '.jpeg', '.png', '.webp'}

SOURCE_GROUPS = {
    'August 21 Grade 5 archives': [ASSETS / 'grade5-new-20260821'],
    'August 22 Grade 5 archives': [ASSETS / 'grade5-new-20260822'],
}
USED_FOLDERS = [
    ASSETS / 'grade5-new-ready-upload',
    ASSETS / 'grade5-broad-ready-upload',
    ASSETS / 'grade5-aug22-approved-upload',
    ASSETS / 'grade5-final-approved-upload',
]


def image_files(paths: list[Path]) -> list[Path]:
    files = []
    for path in paths:
        if path.exists():
            files.extend(file for file in path.rglob('*') if file.is_file() and file.suffix.lower() in EXTENSIONS)
    return sorted(files)


def digest(path: Path) -> str:
    hasher = hashlib.sha256()
    with path.open('rb') as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b''):
            hasher.update(chunk)
    return hasher.hexdigest()


used_hashes = {digest(path) for path in image_files(USED_FOLDERS)}
inventory = []
for source_name, source_paths in SOURCE_GROUPS.items():
    for path in image_files(source_paths):
        file_hash = digest(path)
        if file_hash not in used_hashes:
            inventory.append({
                'source_group': source_name,
                'path': str(path),
                'filename': path.name,
                'sha256': file_hash,
                'bytes': path.stat().st_size,
            })

inventory.sort(key=lambda item: (item['source_group'], item['filename'].lower()))
OUTPUT.write_text(json.dumps({'unused_images': inventory}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

by_group: dict[str, int] = {}
for item in inventory:
    by_group[item['source_group']] = by_group.get(item['source_group'], 0) + 1

report = [
    '# Grade 6 — prior user-provided images not used in Grade 5',
    '',
    '> These images were found in earlier Grade 5 source archives but do not match the file fingerprints of the approved upload folders. They are candidates for Grade 6 review, not accepted matches.',
    '',
    f'- Unused source images found: **{len(inventory)}**',
]
report.extend(f'- {group}: **{count}**' for group, count in by_group.items())
report.extend(['', '| Source group | Filename | Local source path |', '| --- | --- | --- |'])
report.extend(f'| {item["source_group"]} | {item["filename"]} | `{item["path"]}` |' for item in inventory)
REPORT.write_text('\n'.join(report) + '\n', encoding='utf-8')

print(f'Unused prior Grade 5 source images: {len(inventory)}')
for group, count in by_group.items():
    print(f'{group}: {count}')
