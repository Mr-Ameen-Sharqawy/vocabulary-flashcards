import json
import re
from pathlib import Path

IMAGE_ROOT = Path('/home/ubuntu/webdev-static-assets/grade5-uploaded')
COURSE = Path('/home/ubuntu/vocabulary-flashcards/grade5_course_raw.json')
OUT = Path('/home/ubuntu/vocabulary-flashcards/grade5_auto_image_matches.json')
TIMESTAMP = re.compile(r'[_\s-]?20\d{10,}')
STOPWORDS = {'a', 'an', 'the', 'and', 'or', 'of', 'on', 'in', 'at', 'with', 'for', 'to', 'from', 'by', 'adj'}


def normalize(value: str):
    value = TIMESTAMP.sub('', value.lower())
    value = re.sub(r'\([^)]*\)', '', value)
    value = re.sub(r'[^a-z0-9]+', ' ', value)
    return re.sub(r'\s+', ' ', value).strip()


def token_phrase(value: str):
    return ' '.join(token for token in normalize(value).split() if token not in STOPWORDS)


course = json.loads(COURSE.read_text(encoding='utf-8'))
terms = []
seen = set()
for lesson in course['lessons']:
    for card in lesson['cards']:
        key = normalize(card['term'])
        if key and key not in seen:
            seen.add(key)
            terms.append({'term': card['term'], 'arabic': card['arabic'], 'unit': lesson['unit'], 'lesson': lesson['lesson']})

images = sorted(path for path in IMAGE_ROOT.rglob('*') if path.suffix.lower() in {'.jpg', '.jpeg', '.png', '.webp'})
pairs = []
for image in images:
    file_norm = normalize(image.stem)
    for term in terms:
        phrase = token_phrase(term['term'])
        # Exact whole-phrase match prevents misleading substring matches such as "came" inside "camera".
        if phrase and re.search(rf'\b{re.escape(phrase)}\b', file_norm):
            pairs.append((len(phrase.split()), len(phrase), term['term'].lower(), image.name.lower(), term, image))

# Give the longest exact phrase first, then make mappings one-to-one to avoid reusing an image where alternatives exist.
pairs.sort(reverse=True, key=lambda pair: pair[:4])
used_terms, used_images, matches = set(), set(), []
for _, _, _, _, term, image in pairs:
    term_key = normalize(term['term'])
    if term_key in used_terms or str(image) in used_images:
        continue
    used_terms.add(term_key)
    used_images.add(str(image))
    matches.append({
        'term': term['term'],
        'arabic': term['arabic'],
        'unit': term['unit'],
        'lesson': term['lesson'],
        'image_path': str(image),
        'image_name': image.name,
    })

OUT.write_text(json.dumps({
    'matches': matches,
    'unmatched_terms': [term for term in terms if normalize(term['term']) not in used_terms],
    'unused_images': [str(image) for image in images if str(image) not in used_images],
}, ensure_ascii=False, indent=2), encoding='utf-8')
print(f'Exact conservative matches: {len(matches)}; unmatched terms: {len(terms)-len(matches)}; unused images: {len(images)-len(matches)}.')
