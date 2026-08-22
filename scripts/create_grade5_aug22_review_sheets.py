import json
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path('/home/ubuntu/vocabulary-flashcards')
SUGGESTIONS_PATH = ROOT / 'grade5_aug22_filename_suggestions.json'
OUT_DIR = Path('/home/ubuntu/webdev-static-assets/grade5-aug22-review-sheets')
REVIEW_PATH = ROOT / 'grade5_aug22_review_candidates.json'

COLUMNS = 3
ROWS = 3
TILE_WIDTH = 440
TILE_HEIGHT = 350
PADDING = 12
HEADER_HEIGHT = 64
FOOTER_HEIGHT = 42


def font(size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', size)


def fit(image: Image.Image, width: int, height: int) -> Image.Image:
    clone = image.convert('RGB')
    clone.thumbnail((width, height), Image.Resampling.LANCZOS)
    canvas = Image.new('RGB', (width, height), '#f7f2e8')
    canvas.paste(clone, ((width - clone.width) // 2, (height - clone.height) // 2))
    return canvas


data = json.loads(SUGGESTIONS_PATH.read_text(encoding='utf-8'))
candidates = sorted(data['suggestions'], key=lambda item: item['image_filename'].lower())
for index, candidate in enumerate(candidates, start=1):
    candidate['review_index'] = index
REVIEW_PATH.write_text(json.dumps({'candidates': candidates}, ensure_ascii=False, indent=2), encoding='utf-8')

OUT_DIR.mkdir(parents=True, exist_ok=True)
for stale in OUT_DIR.glob('*.jpg'):
    stale.unlink()

confidence_colors = {
    'high': '#175f3d',
    'medium': '#97610c',
    'low': '#95372c',
    'reject': '#5b2333',
}
per_sheet = COLUMNS * ROWS
sheet_count = math.ceil(len(candidates) / per_sheet)

for sheet_number in range(sheet_count):
    start = sheet_number * per_sheet
    group = candidates[start:start + per_sheet]
    sheet = Image.new('RGB', (COLUMNS * TILE_WIDTH, ROWS * TILE_HEIGHT), '#fffdf8')
    draw = ImageDraw.Draw(sheet)
    for tile_index, item in enumerate(group):
        column = tile_index % COLUMNS
        row = tile_index // COLUMNS
        x = column * TILE_WIDTH
        y = row * TILE_HEIGHT
        header_color = confidence_colors[item['confidence']]
        draw.rectangle((x, y, x + TILE_WIDTH - 1, y + HEADER_HEIGHT), fill=header_color)
        header = f"{item['review_index']:02d}. {item['term']}  [{item['confidence']}]"
        draw.text((x + PADDING, y + 9), header[:53], fill='white', font=font(17))
        draw.text((x + PADDING, y + 34), item['reason'][:54], fill='#f5f4ef', font=font(11))
        with Image.open(item['image_path']) as image:
            thumbnail = fit(image, TILE_WIDTH - 2 * PADDING, TILE_HEIGHT - HEADER_HEIGHT - FOOTER_HEIGHT - 2 * PADDING)
        sheet.paste(thumbnail, (x + PADDING, y + HEADER_HEIGHT + PADDING))
        label = item['image_filename'].replace('_202608220238.jpeg', '').replace('_202608220239.jpeg', '')
        draw.text((x + PADDING, y + TILE_HEIGHT - FOOTER_HEIGHT + 11), label[:57], fill='#173a63', font=font(10))
    target = OUT_DIR / f'grade5-aug22-review-{sheet_number + 1}.jpg'
    sheet.save(target, quality=90)
    print(target)

print(f'Created {sheet_count} review sheets for {len(candidates)} images.')
