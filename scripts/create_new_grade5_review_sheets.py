import json
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path('/home/ubuntu/vocabulary-flashcards')
SOURCE = ROOT / 'grade5_new_batch_analysis.json'
OUT_DIR = Path('/home/ubuntu/webdev-static-assets/grade5-new-review-sheets')

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


data = json.loads(SOURCE.read_text(encoding='utf-8'))
matches = data['exact_matches']
OUT_DIR.mkdir(parents=True, exist_ok=True)
for stale in OUT_DIR.glob('*.jpg'):
    stale.unlink()

font = ImageFont.load_default()
per_sheet = SHEET_COLUMNS * SHEET_ROWS
sheet_count = math.ceil(len(matches) / per_sheet)
for sheet_index in range(sheet_count):
    start = sheet_index * per_sheet
    group = matches[start:start + per_sheet]
    sheet = Image.new(
        'RGB',
        (SHEET_COLUMNS * TILE_WIDTH, SHEET_ROWS * TILE_HEIGHT),
        '#fffdf8'
    )
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
        title = f"{start + item_index + 1:02d}. {item['term']}"
        draw.text((x + PADDING, y + 10), title[:45], fill='white', font=font)
        filename = item['image_name'][:44]
        draw.text((x + PADDING, y + TILE_HEIGHT - 15), filename, fill='#173a63', font=font)
    path = OUT_DIR / f'new-grade5-exact-review-{sheet_index + 1}.jpg'
    sheet.save(path, quality=90)
    print(path)

print(f'Created {sheet_count} review sheets for {len(matches)} matches.')
