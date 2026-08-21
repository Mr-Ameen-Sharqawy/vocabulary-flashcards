import json
import shutil
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path('/home/ubuntu/vocabulary-flashcards')
DATA_PATH = ROOT / 'grade5_new_batch_broad_suggestions.json'
INVENTORY_PATH = ROOT / 'grade5_new_batch_analysis.json'
OUT_DIR = Path('/home/ubuntu/webdev-static-assets/grade5-broad-review-sheets')

CELL_W, CELL_H = 420, 380
COLUMNS, ROWS = 3, 3
HEADER_H = 78
PADDING = 18


def font(size: int, bold: bool = False):
    candidates = [
        '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf' if bold else '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
        '/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf' if bold else '/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf',
    ]
    for candidate in candidates:
        if Path(candidate).exists():
            return ImageFont.truetype(candidate, size)
    return ImageFont.load_default()


data = json.loads(DATA_PATH.read_text(encoding='utf-8'))
inventory = json.loads(INVENTORY_PATH.read_text(encoding='utf-8'))['inventory']
paths = {item['image_name']: Path(item['image_path']) for item in inventory}
items = [
    item for item in data['selected_unique_candidates']
    if item['fit'] in {'exact', 'close'} and item['confidence'] in {'high', 'medium'} and item['image_name'] in paths
]

if OUT_DIR.exists():
    shutil.rmtree(OUT_DIR)
OUT_DIR.mkdir(parents=True)
manifest = []
per_page = COLUMNS * ROWS
for page_index, start in enumerate(range(0, len(items), per_page), start=1):
    batch = items[start:start + per_page]
    canvas = Image.new('RGB', (COLUMNS * CELL_W, ROWS * CELL_H), '#f9f6ee')
    draw = ImageDraw.Draw(canvas)
    for index, item in enumerate(batch):
        row, column = divmod(index, COLUMNS)
        x, y = column * CELL_W, row * CELL_H
        draw.rectangle((x + 6, y + 6, x + CELL_W - 6, y + CELL_H - 6), fill='#ffffff', outline='#d4cab3', width=2)
        source = paths[item['image_name']]
        image = Image.open(source).convert('RGB')
        image = ImageOps.contain(image, (CELL_W - 2 * PADDING, CELL_H - HEADER_H - 2 * PADDING))
        image_x = x + (CELL_W - image.width) // 2
        image_y = y + HEADER_H + (CELL_H - HEADER_H - image.height) // 2
        canvas.paste(image, (image_x, image_y))
        label = f"{start + index + 1}. {item['term']}  [{item['fit']}/{item['confidence']}]"
        draw.rectangle((x + 7, y + 7, x + CELL_W - 7, y + HEADER_H), fill='#173a63')
        draw.text((x + 16, y + 15), label, font=font(19, True), fill='#ffffff')
        draw.text((x + 16, y + 44), item['image_name'][:48], font=font(12), fill='#deecff')
    filename = f'grade5-broad-review-{page_index}.jpg'
    canvas.save(OUT_DIR / filename, quality=92)
    manifest.append({'page': page_index, 'file': filename, 'items': batch})

(OUT_DIR / 'manifest.json').write_text(json.dumps({'count': len(items), 'pages': manifest}, ensure_ascii=False, indent=2), encoding='utf-8')
print(f'Created {len(manifest)} review sheets for {len(items)} candidates in {OUT_DIR}.')
