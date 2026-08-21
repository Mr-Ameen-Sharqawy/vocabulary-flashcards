import json
import re
from pathlib import Path

ROOT = Path('/home/ubuntu/grade5_source/Prim 5')
OUT = Path('/home/ubuntu/vocabulary-flashcards/grade5_course_raw.json')
SUMMARY = Path('/home/ubuntu/vocabulary-flashcards/grade5_course_summary.md')


def lesson_sort_key(path: Path):
    match = re.search(r'U(\d+)\s+(?:L(\d+))?', path.stem)
    unit = int(match.group(1)) if match else 99
    lesson = int(match.group(2)) if match and match.group(2) else 99
    return unit, lesson, path.name


def array_body(source: str, key: str):
    match = re.search(rf'\b{re.escape(key)}\s*:\s*\[', source)
    if not match:
        return ''
    start = source.find('[', match.start())
    depth = 0
    quote = None
    escaped = False
    for index in range(start, len(source)):
        char = source[index]
        if quote:
            if escaped:
                escaped = False
            elif char == '\\':
                escaped = True
            elif char == quote:
                quote = None
            continue
        if char in ('"', "'"):
            quote = char
        elif char == '[':
            depth += 1
        elif char == ']':
            depth -= 1
            if depth == 0:
                return source[start + 1:index]
    return ''


def string_value(object_text: str, names):
    for name in names:
        match = re.search(rf'\b{name}\s*:\s*(["\'])(.*?)\1', object_text, re.DOTALL)
        if match:
            return match.group(2).replace('\\"', '"').replace("\\'", "'").replace('\\n', ' ')
    return ''


def objects(body: str, english_names=('en',), arabic_names=('ar',)):
    results = []
    for match in re.finditer(r'\{(.*?)\}', body, re.DOTALL):
        object_text = match.group(1)
        english = string_value(object_text, english_names)
        arabic = string_value(object_text, arabic_names)
        if english:
            results.append({'term': english.strip(), 'arabic': arabic.strip()})
    return results


def meta_value(source: str, key: str):
    match = re.search(rf'\b{key}\s*:\s*"(.*?)"', source, re.DOTALL)
    return match.group(1).strip() if match else ''


lessons = []
for file in sorted(ROOT.glob('*.html'), key=lesson_sort_key):
    source = file.read_text(encoding='utf-8')
    unit_match = re.search(r'U(\d+)', file.stem)
    lesson_match = re.search(r'L(\d+)', file.stem)
    unit = int(unit_match.group(1)) if unit_match else 6
    lesson_label = lesson_match.group(1) if lesson_match else 'Story'
    cards = []
    for key, kind in (('vocabMain', 'main'), ('vocabExtra', 'extra'), ('expressions', 'expression')):
        cards.extend([{**card, 'kind': kind, 'pairedWith': None} for card in objects(array_body(source, key))])
    for match in re.finditer(r'\{(.*?)\}', array_body(source, 'verbs'), re.DOTALL):
        object_text = match.group(1)
        present = string_value(object_text, ('p', 'present', 'en'))
        past = string_value(object_text, ('s', 'past'))
        arabic = string_value(object_text, ('ar',))
        if present:
            cards.append({'term': present.strip(), 'arabic': arabic.strip(), 'kind': 'verb', 'pairedWith': past.strip() or None})
        if past:
            cards.append({'term': past.strip(), 'arabic': arabic.strip(), 'kind': 'verb', 'pairedWith': present.strip() or None})
    sentence_candidates = objects(array_body(source, 'keySentences')) + objects(array_body(source, 'story'))
    for card in cards:
        normalized = re.sub(r'\s*\([^)]*\)', '', card['term']).strip().lower()
        matching = next((candidate['term'] for candidate in sentence_candidates if normalized and normalized in candidate['term'].lower()), '')
        card['sentence'] = matching or f'This lesson helps us learn about {card["term"]}.'
        card['sentenceSource'] = 'book-context' if matching else 'curriculum-fallback'
    seen = set()
    unique_cards = []
    for card in cards:
        identity = card['term'].lower()
        if identity and identity not in seen:
            seen.add(identity)
            unique_cards.append(card)
    lessons.append({
        'source_file': file.name,
        'unit': unit,
        'lesson': lesson_label,
        'title': meta_value(source, 'subTitle') or file.stem,
        'unit_title': meta_value(source, 'mainTitle') or f'Grade 5 Unit {unit}',
        'cards': unique_cards,
    })

OUT.write_text(json.dumps({'grade': 5, 'lessons': lessons}, ensure_ascii=False, indent=2), encoding='utf-8')
units = {}
for lesson in lessons:
    units.setdefault(lesson['unit'], []).append(lesson)
lines = ['# Grade 5 Course Extraction', '', f'- Lessons found: **{len(lessons)}**', f'- Vocabulary and phrase cards found: **{sum(len(lesson["cards"]) for lesson in lessons)}**', '']
for unit, unit_lessons in units.items():
    lines.append(f'## Unit {unit}')
    lines.append('')
    lines.append('| Lesson | Title | Cards | Source |')
    lines.append('|---|---|---:|---|')
    for lesson in unit_lessons:
        lines.append(f'| {lesson["lesson"]} | {lesson["title"]} | {len(lesson["cards"])} | `{lesson["source_file"]}` |')
    lines.append('')
SUMMARY.write_text('\n'.join(lines), encoding='utf-8')
manifest_lines = []
for lesson in lessons:
    for card in lesson['cards']:
        manifest_lines.append(f'U{lesson["unit"]} · L{lesson["lesson"]}\t{card["term"]}\t{card["arabic"]}')
Path('/home/ubuntu/vocabulary-flashcards/grade5_card_manifest.txt').write_text('\n'.join(manifest_lines) + '\n', encoding='utf-8')
print(f'Extracted {len(lessons)} lessons and {sum(len(lesson["cards"]) for lesson in lessons)} cards.')
