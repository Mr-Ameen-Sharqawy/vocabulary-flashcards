#!/usr/bin/env python3
"""Inventory current uploaded vocabulary images and create labelled contact sheets."""

from __future__ import annotations

import csv
import re
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps


SOURCE = Path("/home/ubuntu/upload")
REVIEW_DIR = Path("/home/ubuntu/image-review/primary4-uploaded")
INVENTORY = Path("/home/ubuntu/vocabulary-flashcards/uploaded_image_inventory.csv")
CURRENT_MIN_ID = 1000212209
IMAGE_RE = re.compile(r"^(\d+)\.(?:jpg|jpeg|png|webp)$", re.IGNORECASE)

THUMB_W = 250
THUMB_H = 250
LABEL_H = 34
COLS = 4
ROWS = 5
PER_SHEET = COLS * ROWS


def font(size: int):
    for candidate in [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf",
    ]:
        if Path(candidate).exists():
            return ImageFont.truetype(candidate, size)
    return ImageFont.load_default()


def collect_images():
    files = []
    for path in SOURCE.iterdir():
        match = IMAGE_RE.match(path.name)
        if match and int(match.group(1)) >= CURRENT_MIN_ID:
            files.append((int(match.group(1)), path))
    return sorted(files)


def main():
    REVIEW_DIR.mkdir(parents=True, exist_ok=True)
    images = collect_images()
    records = []
    for number, path in images:
        with Image.open(path) as image:
            records.append(
                {
                    "source_number": number,
                    "source_filename": path.name,
                    "source_path": str(path),
                    "width": image.width,
                    "height": image.height,
                    "format": image.format or path.suffix.lstrip(".").upper(),
                    "contact_sheet": "",
                }
            )

    title_font = font(17)
    for start in range(0, len(records), PER_SHEET):
        chunk = records[start : start + PER_SHEET]
        sheet = Image.new(
            "RGB",
            (COLS * THUMB_W, ROWS * (THUMB_H + LABEL_H)),
            "#F5F1E8",
        )
        draw = ImageDraw.Draw(sheet)
        sheet_index = start // PER_SHEET + 1
        sheet_name = f"sheet-{sheet_index:02d}-{chunk[0]['source_number']}-{chunk[-1]['source_number']}.jpg"
        for local_index, record in enumerate(chunk):
            x = (local_index % COLS) * THUMB_W
            y = (local_index // COLS) * (THUMB_H + LABEL_H)
            with Image.open(record["source_path"]) as image:
                image = ImageOps.exif_transpose(image).convert("RGB")
                thumb = ImageOps.contain(image, (THUMB_W - 10, THUMB_H - 10), method=Image.Resampling.LANCZOS)
                tile = Image.new("RGB", (THUMB_W, THUMB_H), "#FFFFFF")
                tile.paste(thumb, ((THUMB_W - thumb.width) // 2, (THUMB_H - thumb.height) // 2))
                sheet.paste(tile, (x, y))
            draw.rectangle((x, y + THUMB_H, x + THUMB_W, y + THUMB_H + LABEL_H), fill="#183B58")
            draw.text((x + 8, y + THUMB_H + 8), str(record["source_number"]), font=title_font, fill="#FFFFFF")
            record["contact_sheet"] = sheet_name
        sheet.save(REVIEW_DIR / sheet_name, quality=90, optimize=True)

    with INVENTORY.open("w", encoding="utf-8-sig", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=list(records[0]) if records else [])
        if records:
            writer.writeheader()
            writer.writerows(records)

    print(f"Current images: {len(records)}")
    print(f"Contact sheets: {(len(records) + PER_SHEET - 1) // PER_SHEET}")
    print(f"Review directory: {REVIEW_DIR}")
    print(f"Inventory: {INVENTORY}")


if __name__ == "__main__":
    main()
