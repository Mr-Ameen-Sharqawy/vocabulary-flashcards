"""Extract only the three user-approved vocabulary sections from Grade 6 lesson HTML.

The input HTML files are treated as data only; no browser or JavaScript execution occurs.
"""

from __future__ import annotations

import json
import re
from collections import defaultdict
from pathlib import Path


ROOT = Path('/home/ubuntu/vocabulary-flashcards')
SOURCE_DIR = Path('/home/ubuntu/grade6-source-20260822/Prim 6')
RAW_PATH = ROOT / 'grade6_selected_vocabulary_raw.json'
REPORT_PATH = ROOT / 'Grade_6_Selected_Vocabulary.md'
COPY_PATH = ROOT / 'Grade_6_Selected_Vocabulary_To_Copy.txt'

SECTIONS = (
    ('Main Vocabulary', 'vocabMain'),
    ('Extra Vocabulary', 'vocabExtra'),
    ('Important Expressions and Prepositions', 'expressions'),
)


def lesson_meta(path: Path) -> tuple[int, str]:
    match = re.search(r'U(\d+)\s+(.+?)\.html$', path.name)
    if not match:
        raise ValueError(f'Unexpected lesson filename: {path.name}')
    return int(match.group(1)), match.group(2)


def clean_text(value: str) -> str:
    return re.sub(r'\s+', ' ', value.replace('\u200f', '').replace('\u202b', '').replace('\u202c', '')).strip()


def escape_controls_inside_strings(payload: str) -> str:
    """Make raw line breaks inside quoted HTML data strings JSON-safe."""
    escaped = False
    in_string = False
    output: list[str] = []
    replacements = {'\n': '\\n', '\r': '\\r', '\t': '\\t'}
    for character in payload:
        if in_string and character in replacements:
            output.append(replacements[character])
            continue
        output.append(character)
        if character == '"' and not escaped:
            in_string = not in_string
        escaped = character == '\\' and not escaped
        if character != '\\':
            escaped = False
    return ''.join(output)


def fallback_sections(text: str, filename: str) -> dict:
    """Extract just approved arrays when an otherwise unrelated field is malformed."""
    extracted: dict[str, list[dict[str, str]]] = {}
    for _, field in SECTIONS:
        array_text = extract_array_literal(text, field, filename)
        safe_array_text = escape_controls_inside_strings(array_text)
        try:
            extracted[field] = json.loads(safe_array_text)
            continue
        except json.JSONDecodeError:
            pass

        items: list[dict[str, str]] = []
        for object_match in re.finditer(r'\{(.*?)\}', array_text, flags=re.DOTALL):
            object_text = escape_controls_inside_strings(object_match.group(1))
            english_match = re.search(r'(?:"en"|en)\s*:\s*"((?:\\.|[^"\\])*)"', object_text, flags=re.DOTALL)
            arabic_match = re.search(r'(?:"ar"|ar)\s*:\s*"((?:\\.|[^"\\])*)"', object_text, flags=re.DOTALL)
            if not english_match:
                continue
            english = json.loads(f'"{english_match.group(1)}"')
            arabic = json.loads(f'"{arabic_match.group(1)}"') if arabic_match else ''
            items.append({'en': english, 'ar': arabic})
        extracted[field] = items
    return extracted


def extract_array_literal(text: str, field: str, filename: str) -> str:
    """Return the exact bracket-matched array value for a data field."""
    field_match = re.search(rf'(?:"{re.escape(field)}"|{re.escape(field)})\s*:', text)
    if not field_match:
        raise ValueError(f'Could not locate approved section {field} in {filename}')
    start = text.find('[', field_match.end())
    if start < 0:
        raise ValueError(f'Could not locate array for approved section {field} in {filename}')

    depth = 0
    in_string = False
    escaped = False
    for index in range(start, len(text)):
        character = text[index]
        if in_string:
            if character == '"' and not escaped:
                in_string = False
            escaped = character == '\\' and not escaped
            if character != '\\':
                escaped = False
            continue
        if character == '"':
            in_string = True
        elif character == '[':
            depth += 1
        elif character == ']':
            depth -= 1
            if depth == 0:
                return text[start:index + 1]
    raise ValueError(f'Could not close array for approved section {field} in {filename}')


def load_lesson_data(path: Path) -> dict:
    text = path.read_text(encoding='utf-8')
    match = re.search(r'const\s+lessonData\s*=\s*(\{.*?\})\s*;\s*//', text, flags=re.DOTALL)
    if not match:
        raise ValueError(f'Could not locate lessonData in {path.name}')
    try:
        return json.loads(escape_controls_inside_strings(match.group(1)))
    except json.JSONDecodeError:
        return fallback_sections(match.group(1), path.name)


records: list[dict[str, str | int]] = []
failures: list[str] = []

for path in sorted(SOURCE_DIR.glob('*.html')):
    try:
        unit, lesson = lesson_meta(path)
        data = load_lesson_data(path)
        for section_name, field in SECTIONS:
            for item in data.get(field, []):
                english = clean_text(str(item.get('en', '')))
                arabic = clean_text(str(item.get('ar', '')))
                if english:
                    records.append({
                        'unit': unit,
                        'lesson': lesson,
                        'section': section_name,
                        'english': english,
                        'arabic': arabic,
                        'source_file': path.name,
                    })
    except Exception as exc:  # Report malformed source data rather than guessing.
        failures.append(f'{path.name}: {exc}')

records.sort(key=lambda item: (int(item['unit']), str(item['lesson']), SECTIONS.index((str(item['section']), next(field for name, field in SECTIONS if name == item['section']))), str(item['english']).lower()))

unique_terms = {item['english'].lower() for item in records}
section_counts = defaultdict(int)
for item in records:
    section_counts[str(item['section'])] += 1

RAW_PATH.write_text(json.dumps({
    'scope': [name for name, _ in SECTIONS],
    'records': records,
    'failures': failures,
}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

report = [
    '# Grade 6 — selected vocabulary only',
    '',
    '> Scope approved by the teacher: **Main Vocabulary**, **Extra Vocabulary**, and **Important Expressions and Prepositions** only. No verb conjugations, practice sentences, readings, stories, quizzes, or other sections are included.',
    '',
    f'- Source lesson files scanned: **{len(list(SOURCE_DIR.glob("*.html")))}**',
    f'- Extracted entries: **{len(records)}**',
    f'- Distinct English terms and expressions: **{len(unique_terms)}**',
    f'- Main Vocabulary entries: **{section_counts["Main Vocabulary"]}**',
    f'- Extra Vocabulary entries: **{section_counts["Extra Vocabulary"]}**',
    f'- Important Expressions and Prepositions entries: **{section_counts["Important Expressions and Prepositions"]}**',
    '',
]

current_lesson = None
for record in records:
    label = f'Unit {record["unit"]} · {record["lesson"]}'
    if label != current_lesson:
        if current_lesson is not None:
            report.append('')
        report.extend([f'## {label}', '', '| Section | English | Arabic |', '| --- | --- | --- |'])
        current_lesson = label
    report.append(f'| {record["section"]} | {record["english"]} | {record["arabic"]} |')

if failures:
    report.extend(['', '## Files requiring review', ''])
    report.extend(f'- {failure}' for failure in failures)

REPORT_PATH.write_text('\n'.join(report) + '\n', encoding='utf-8')

copy = [
    '# Grade 6 — selected terms to copy for images',
    '',
    'Only Main Vocabulary, Extra Vocabulary, and Important Expressions and Prepositions are included.',
    '',
]
for record in records:
    copy.append(record['english'])
COPY_PATH.write_text('\n'.join(copy) + '\n', encoding='utf-8')

print(f'Extracted {len(records)} approved entries ({len(unique_terms)} distinct) from {len(list(SOURCE_DIR.glob("*.html")))} source files.')
for section_name, _ in SECTIONS:
    print(f'{section_name}: {section_counts[section_name]}')
if failures:
    print(f'Files requiring review: {len(failures)}')
