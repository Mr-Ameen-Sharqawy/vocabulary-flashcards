#!/usr/bin/env python3
"""Inventory RAR-extracted vocabulary images and create labelled contact sheets."""

from __future__ import annotations

import csv
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps


SOURCE = Path("/home/ubuntu/webdev-static-assets/primary4-remaining-uploaded")
REVIEW_DIR = Path("/home/ubuntu/image-review/primary4-remaining-uploaded")
INVENTORY = Path("/home/ubuntu/vocabulary-flashcards/remaining_image_inventory.csv")
IMAGE_SUFFIXES = {".jpg", ".jpeg", ".png", ".webp"}

THUMB_W = 250
THUMB_H = 250
LABEL_H = 48
COLS = 4
ROWS = 5
PER_SHEET = COLS * ROWS


def get_font(size: int):
    for candidate in [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf",
    ]:
        if Path(candidate).exists():
            return ImageFont.truetype(candidate, size)
    return ImageFont.load_default()


def main():
    REVIEW_DIR.mkdir(parents=True, exist_ok=True)
    images = sorted(path for path in SOURCE.rglob("*") if path.suffix.lower() in IMAGE_SUFFIXES)
    records = []
    for index, path in enumerate(images, start=1):
        with Image.open(path) as image:
            records.append(
                {
                    "index": index,
                    "archive_folder": path.parent.name,
                    "source_filename": path.name,
                    "source_path": str(path),
                    "width": image.width,
                    "height": image.height,
                    "format": image.format or path.suffix.lstrip(".").upper(),
                    "contact_sheet": "",
                }
            )

    label_font = get_font(14)
    for start in range(0, len(records), PER_SHEET):
        chunk = records[start : start + PER_SHEET]
        sheet = Image.new("RGB", (COLS * THUMB_W, ROWS * (THUMB_H + LABEL_H)), "#F5F1E8")
        draw = ImageDraw.Draw(sheet)
        sheet_index = start // PER_SHEET + 1
        sheet_name = f"sheet-{sheet_index:02d}-{chunk[0]['index']:03d}-{chunk[-1]['index']:03d}.jpg"
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
            label = f"{record['index']:03d} · {record['source_filename'][:27]}"
            draw.text((x + 7, y + THUMB_H + 7), label, font=label_font, fill="#FFFFFF")
            record["contact_sheet"] = sheet_name
        sheet.save(REVIEW_DIR / sheet_name, quality=90, optimize=True)

    with INVENTORY.open("w", encoding="utf-8-sig", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=list(records[0]) if records else [])
        if records:
            writer.writeheader()
            writer.writerows(records)

    print(f"Images: {len(records)}")
    print(f"Sheets: {(len(records) + PER_SHEET - 1) // PER_SHEET}")
    print(f"Inventory: {INVENTORY}")


if __name__ == "__main__":
    main()
