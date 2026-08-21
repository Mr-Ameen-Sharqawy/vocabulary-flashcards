import json
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path('/home/ubuntu/vocabulary-flashcards')
ANALYSIS_PATH = ROOT / 'grade5_new_batch_analysis.json'
SUGGESTIONS_PATH = ROOT / 'grade5_new_batch_llm_suggestions.json'
OUT_DIR = Path('/home/ubuntu/webdev-static-assets/grade5-new-semantic-review-sheets')
CANDIDATES_OUT = ROOT / 'grade5_new_batch_semantic_high_candidates.json'

SHEET_COLUMNS = 3
SHEET_ROWS = 4
TILE_WIDTH = 360
TILE_HEIGHT = 300
PADDING = 12
HEADER_HEIGHT = 50


def fit_image(image: Image.Image, width: int, height: int) -> Image.Image:
    clone = image.convert('RGB')
    clone.thumbnail((width, height), Image.Resampling.LANCZOS)
    canvas = Image.new('RGB', (width, height), '#f5f0e3')
    canvas.paste(clone, ((width - clone.width) // 2, (height - clone.height) // 2))
    return canvas


analysis = json.loads(ANALYSIS_PATH.read_text(encoding='utf-8'))
suggestions = json.loads(SUGGESTIONS_PATH.read_text(encoding='utf-8'))['suggestions']
by_name = {item['image_name']: item for item in analysis['inventory']}
existing_exact = {item['image_name'] for item in analysis['exact_matches']}

candidates = []
for item in suggestions:
    if item['confidence'] != 'high' or not item['term'] or item['image_name'] in existing_exact:
        continue
    source = by_name.get(item['image_name'])
    if source:
        candidates.append({**item, **source})

candidates.sort(key=lambda item: (item['term'].lower(), item['image_name'].lower()))
CANDIDATES_OUT.write_text(json.dumps({'candidates': candidates}, ensure_ascii=False, indent=2), encoding='utf-8')

OUT_DIR.mkdir(parents=True, exist_ok=True)
for stale in OUT_DIR.glob('*.jpg'):
    stale.unlink()

font = ImageFont.load_default()
per_sheet = SHEET_COLUMNS * SHEET_ROWS
sheet_count = math.ceil(len(candidates) / per_sheet)
for sheet_index in range(sheet_count):
    start = sheet_index * per_sheet
    group = candidates[start:start + per_sheet]
    sheet = Image.new('RGB', (SHEET_COLUMNS * TILE_WIDTH, SHEET_ROWS * TILE_HEIGHT), '#fffdf8')
    draw = ImageDraw.Draw(sheet)
    for item_index, item in enumerate(group):
        column = item_index % SHEET_COLUMNS
        row = item_index // SHEET_COLUMNS
        x = column * TILE_WIDTH
        y = row * TILE_HEIGHT
        image = Image.open(item['image_path'])
        thumbnail = fit_image(image, TILE_WIDTH - 2 * PADDING, TILE_HEIGHT - HEADER_HEIGHT - 2 * PADDING)
        sheet.paste(thumbnail, (x + PADDING, y + HEADER_HEIGHT + PADDING))
        draw.rectangle((x, y, x + TILE_WIDTH - 1, y + HEADER_HEIGHT), fill='#173a63')
        draw.text((x + PADDING, y + 10), f"{start + item_index + 1:02d}. {item['term']}"[:45], fill='white', font=font)
        draw.text((x + PADDING, y + TILE_HEIGHT - 15), item['image_name'][:44], fill='#173a63', font=font)
    path = OUT_DIR / f'new-grade5-semantic-review-{sheet_index + 1}.jpg'
    sheet.save(path, quality=90)
    print(path)

print(f'Created {sheet_count} semantic review sheets for {len(candidates)} high-confidence candidates.')
