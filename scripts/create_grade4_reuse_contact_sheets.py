import json
import math
import re
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path('/home/ubuntu/vocabulary-flashcards')
SOURCE_DIR = Path('/home/ubuntu/webdev-static-assets/primary4-uploaded')
OUT_DIR = Path('/home/ubuntu/webdev-static-assets/grade4-reuse-review')
OUT_DIR.mkdir(parents=True, exist_ok=True)

reviewed = json.loads((ROOT / 'grade5_from_grade4_semantic_review.json').read_text(encoding='utf-8'))['reviewed_mappings']
candidates = [item for item in reviewed if item['confidence'] == 'high' and item['image']]

def source_image(url: str):
    filename = Path(url).name
    stem = re.sub(r'_[0-9a-f]{8}(?=\.[a-z]+$)', '', filename)
    found = sorted(SOURCE_DIR.glob(stem))
    if found:
        return found[0]
    return None

font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 16)
bold = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 17)
columns, cell_w, cell_h = 4, 350, 275
per_sheet = 16
manifest = []
for sheet_number, start in enumerate(range(0, len(candidates), per_sheet), start=1):
    batch = candidates[start:start + per_sheet]
    rows = math.ceil(len(batch) / columns)
    canvas = Image.new('RGB', (columns * cell_w, rows * cell_h), '#fbf8ef')
    draw = ImageDraw.Draw(canvas)
    for index, candidate in enumerate(batch):
        x = (index % columns) * cell_w
        y = (index // columns) * cell_h
        source = source_image(candidate['image'])
        if source:
            image = Image.open(source).convert('RGB')
            image.thumbnail((cell_w - 24, 195), Image.Resampling.LANCZOS)
            ix = x + (cell_w - image.width) // 2
            iy = y + 9 + (195 - image.height) // 2
            canvas.paste(image, (ix, iy))
        else:
            draw.rectangle((x + 12, y + 10, x + cell_w - 12, y + 204), outline='#ef8a75', width=3)
            draw.text((x + 20, y + 90), 'Local image unavailable', fill='#173a63', font=bold)
        draw.rectangle((x + 12, y + 208, x + cell_w - 12, y + cell_h - 10), fill='#ffffff')
        draw.text((x + 20, y + 217), f"G5: {candidate['term']}", fill='#173a63', font=bold)
        draw.text((x + 20, y + 242), f"G4: {candidate['grade4_term']}", fill='#73594f', font=font)
        draw.rectangle((x + 12, y + 10, x + cell_w - 12, y + cell_h - 10), outline='#d8d0c0', width=2)
    output = OUT_DIR / f'grade4-reuse-semantic-high-{sheet_number}.jpg'
    canvas.save(output, quality=91)
    manifest.append(str(output))
    print(output)
(OUT_DIR / 'manifest.json').write_text(json.dumps({'sheets': manifest}, indent=2), encoding='utf-8')
print(f'Created {len(manifest)} contact sheet(s) for {len(candidates)} candidates.')
