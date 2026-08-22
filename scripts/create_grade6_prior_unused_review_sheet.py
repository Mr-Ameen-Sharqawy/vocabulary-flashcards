"""Create a labeled contact sheet for visual review of Grade 6 image suggestions."""

from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps


ROOT = Path('/home/ubuntu/vocabulary-flashcards')
SUGGESTIONS = ROOT / 'grade6_prior_unused_semantic_suggestions.json'
INVENTORY = ROOT / 'grade6_prior_unused_image_inventory.json'
OUTPUT = Path('/home/ubuntu/webdev-static-assets/grade6-prior-unused-review.jpg')

suggestions = json.loads(SUGGESTIONS.read_text(encoding='utf-8'))['suggestions']
inventory = {item['filename']: item['path'] for item in json.loads(INVENTORY.read_text(encoding='utf-8'))['unused_images']}

font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 26)
small_font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 20)
cols, width, image_height, label_height, gap = 3, 540, 310, 104, 18
rows = (len(suggestions) + cols - 1) // cols
canvas = Image.new('RGB', (cols * width + (cols + 1) * gap, rows * (image_height + label_height) + (rows + 1) * gap), '#f6f1e8')
draw = ImageDraw.Draw(canvas)

for index, suggestion in enumerate(suggestions):
    source = Path(inventory[suggestion['filename']])
    image = Image.open(source).convert('RGB')
    image = ImageOps.fit(image, (width, image_height), method=Image.Resampling.LANCZOS)
    row, col = divmod(index, cols)
    x = gap + col * (width + gap)
    y = gap + row * (image_height + label_height + gap)
    canvas.paste(image, (x, y))
    draw.rectangle((x, y + image_height, x + width, y + image_height + label_height), fill='#173a63')
    draw.text((x + 12, y + image_height + 10), f'{index + 1}. {suggestion["term"]}  [{suggestion["confidence"]}]', font=font, fill='white')
    draw.text((x + 12, y + image_height + 48), suggestion['filename'][:50], font=small_font, fill='#d8eaff')

OUTPUT.parent.mkdir(parents=True, exist_ok=True)
canvas.save(OUTPUT, quality=92)
print(OUTPUT)
