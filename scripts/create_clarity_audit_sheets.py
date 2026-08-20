from pathlib import Path
import json
from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path('/home/ubuntu/vocabulary-flashcards')
OUT = ROOT / 'image_clarity_audit_sheets'
OUT.mkdir(exist_ok=True)

try:
    FONT = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 18)
    SMALL = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 14)
except OSError:
    FONT = ImageFont.load_default()
    SMALL = ImageFont.load_default()

with open(ROOT / 'uploaded_image_asset_manifest.json', encoding='utf-8-sig') as f:
    old_assets = {item['source_number']: Path(item['local_asset']) for item in json.load(f)}

new_assets = sorted(Path('/home/ubuntu/webdev-static-assets/primary4-remaining-uploaded').rglob('*'))
new_assets = [p for p in new_assets if p.suffix.lower() in {'.jpg', '.jpeg', '.png', '.webp'}]

old_cases = [
    ('equipment', 1000212466), ('local / yummy', 1000212455),
    ('sea animals / sea grass', 1000212490), ('region', 1000212504),
    ('traffic / on the road', 1000212496), ('safe / protective', 1000212445),
    ('the king of the jungle land', 1000212304),
]
new_cases = [
    ('country / culture / Upper Egypt', 10), ('take / took / take a shower', 44),
    ('trash / look dirty / organization', 60), ('problems / solutions', 74),
    ('by hand / simple / weave', 116), ('faraway / South Sinai', 122),
    ('daytime / wonderful', 99),
]

def render_sheet(name, cases, lookup):
    cell_w, cell_h = 330, 290
    canvas = Image.new('RGB', (cell_w * 2, cell_h * 4), '#fbf8ef')
    draw = ImageDraw.Draw(canvas)
    for i, (label, key) in enumerate(cases):
        x, y = (i % 2) * cell_w, (i // 2) * cell_h
        asset = lookup(key)
        try:
            im = Image.open(asset).convert('RGB')
            im.thumbnail((300, 220))
            box = Image.new('RGB', (300, 220), '#ffffff')
            box.paste(im, ((300 - im.width)//2, (220 - im.height)//2))
            canvas.paste(box, (x + 15, y + 42))
        except Exception as error:
            draw.text((x + 15, y + 48), f'Missing preview: {error}', fill='#7f1d1d', font=SMALL)
        draw.text((x + 15, y + 14), label, fill='#173a63', font=FONT)
        draw.rectangle((x + 10, y + 10, x + cell_w - 10, y + cell_h - 10), outline='#f4c84a', width=2)
    canvas.save(OUT / name, quality=92)

render_sheet('manual-candidates.jpg', old_cases, lambda number: old_assets[number])
render_sheet('remaining-candidates.jpg', new_cases, lambda index: new_assets[index - 1])
