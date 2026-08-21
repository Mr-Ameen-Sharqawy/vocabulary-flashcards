import json
import re
from collections import defaultdict
from difflib import SequenceMatcher
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

IMAGE_ROOT = Path('/home/ubuntu/webdev-static-assets/grade5-uploaded')
COURSE_PATH = Path('/home/ubuntu/vocabulary-flashcards/grade5_course_raw.json')
AUDIT_ROOT = Path('/home/ubuntu/grade5_image_audit')
OUT = Path('/home/ubuntu/vocabulary-flashcards/grade5_image_match_candidates.json')

STOPWORDS = {'a', 'an', 'the', 'and', 'or', 'of', 'on', 'in', 'at', 'with', 'for', 'to', 'from', 'by', 'illustration', 'cartoon', 'image', 'photo', 'scene', 'showing', 'standing', 'sitting'}
TIMESTAMP = re.compile(r'[_\s-]?20\d{10,}')


def normalize(value: str) -> str:
    value = TIMESTAMP.sub('', value.lower())
    value = re.sub(r'\([^)]*\)', '', value)
    value = re.sub(r'[^a-z0-9]+', ' ', value)
    return re.sub(r'\s+', ' ', value).strip()


def meaningful_tokens(value: str):
    return [token for token in normalize(value).split() if token not in STOPWORDS]


def score(term: str, filename: str):
    term_norm = normalize(term)
    file_norm = normalize(filename)
    term_tokens = set(meaningful_tokens(term))
    file_tokens = set(meaningful_tokens(filename))
    if not term_tokens:
        return 0.0
    overlap = len(term_tokens & file_tokens) / len(term_tokens)
    ratio = SequenceMatcher(None, term_norm, file_norm).ratio()
    term_phrase = ' '.join(meaningful_tokens(term))
    contains = 1.0 if term_phrase and re.search(rf'\b{re.escape(term_phrase)}\b', file_norm) else 0.0
    return round(max(overlap * 0.92 + ratio * 0.08, contains), 4)


course = json.loads(COURSE_PATH.read_text(encoding='utf-8'))
terms = []
seen = set()
for lesson in course['lessons']:
    for card in lesson['cards']:
        key = normalize(card['term'])
        if key and key not in seen:
            seen.add(key)
            terms.append({'term': card['term'], 'arabic': card['arabic'], 'unit': lesson['unit'], 'lesson': lesson['lesson']})

images = sorted([path for path in IMAGE_ROOT.rglob('*') if path.suffix.lower() in {'.jpg', '.jpeg', '.png', '.webp'}])
candidates = []
for image in images:
    filename = image.stem
    ranked = sorted(((score(term['term'], filename), term) for term in terms), key=lambda item: item[0], reverse=True)
    top_score, top_term = ranked[0]
    candidates.append({
        'image_path': str(image),
        'image_name': image.name,
        'suggested_term': top_term['term'],
        'suggested_arabic': top_term['arabic'],
        'score': top_score,
        'alternatives': [{'term': term['term'], 'score': candidate_score} for candidate_score, term in ranked[1:4]],
    })

OUT.write_text(json.dumps({'image_count': len(images), 'term_count': len(terms), 'candidates': candidates}, ensure_ascii=False, indent=2), encoding='utf-8')

AUDIT_ROOT.mkdir(parents=True, exist_ok=True)
font_path = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
font = ImageFont.truetype(font_path, 17)
small_font = ImageFont.truetype(font_path, 13)
by_folder = defaultdict(list)
for item in candidates:
    by_folder[Path(item['image_path']).parents[1].name].append(item)

for folder, entries in by_folder.items():
    columns, cell_w, cell_h = 4, 260, 235
    rows = (len(entries) + columns - 1) // columns
    sheet = Image.new('RGB', (columns * cell_w, rows * cell_h), '#f7f4eb')
    draw = ImageDraw.Draw(sheet)
    for index, item in enumerate(entries):
        x = (index % columns) * cell_w
        y = (index // columns) * cell_h
        try:
            image = Image.open(item['image_path']).convert('RGB')
            image.thumbnail((cell_w - 18, 166))
            image_x = x + (cell_w - image.width) // 2
            sheet.paste(image, (image_x, y + 8))
        except Exception:
            draw.rectangle((x + 8, y + 8, x + cell_w - 8, y + 174), fill='#e8d9d1')
        label = re.sub(TIMESTAMP, '', Path(item['image_name']).stem).replace('_', ' ')[:34]
        term_label = f"→ {item['suggested_term']} ({item['score']:.2f})"[:36]
        draw.text((x + 9, y + 178), label, fill='#173a63', font=small_font)
        draw.text((x + 9, y + 202), term_label, fill='#9c5b4d' if item['score'] < .78 else '#245e52', font=font)
    sheet.save(AUDIT_ROOT / f'{folder}.jpg', quality=90)

high = sum(1 for item in candidates if item['score'] >= .78)
medium = sum(1 for item in candidates if .48 <= item['score'] < .78)
print(f'Indexed {len(images)} images. High-confidence candidates: {high}; review candidates: {medium}; low-confidence: {len(images)-high-medium}.')
