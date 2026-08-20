from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

SOURCE = Path('/home/ubuntu/webdev-static-assets/primary4-final-uploaded')
OUTPUT = Path('/home/ubuntu/vocabulary-flashcards/new_upload_contact_sheet.jpg')
files = sorted([p for p in SOURCE.iterdir() if p.suffix.lower() in {'.jpg', '.jpeg', '.png', '.webp'}])

try:
    title_font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 15)
    label_font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 12)
except OSError:
    title_font = label_font = ImageFont.load_default()

columns, cell_w, cell_h = 4, 270, 235
rows = (len(files) + columns - 1) // columns
sheet = Image.new('RGB', (columns * cell_w, rows * cell_h + 42), '#fbf8ef')
draw = ImageDraw.Draw(sheet)
draw.text((16, 12), 'New uploaded images — visual matching audit', fill='#173a63', font=title_font)

for i, path in enumerate(files):
    x = (i % columns) * cell_w
    y = 42 + (i // columns) * cell_h
    draw.rectangle((x + 8, y + 8, x + cell_w - 8, y + cell_h - 8), outline='#f4c84a', width=2)
    image = Image.open(path).convert('RGB')
    image.thumbnail((244, 170))
    panel = Image.new('RGB', (244, 170), '#ffffff')
    panel.paste(image, ((244 - image.width) // 2, (170 - image.height) // 2))
    sheet.paste(panel, (x + 13, y + 14))
    label = path.stem.replace('_202608202022', '').replace('_', ' ')
    words = label.split()
    lines = []
    current = ''
    for word in words:
        candidate = f'{current} {word}'.strip()
        if len(candidate) > 33:
            lines.append(current)
            current = word
        else:
            current = candidate
    if current:
        lines.append(current)
    for offset, line in enumerate(lines[:3]):
        draw.text((x + 13, y + 190 + offset * 14), line, fill='#173a63', font=label_font)

sheet.save(OUTPUT, quality=92)
