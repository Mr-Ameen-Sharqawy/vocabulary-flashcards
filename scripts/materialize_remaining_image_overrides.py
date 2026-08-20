#!/usr/bin/env python3
"""Add manually matched RAR-extracted images to the existing asset manifest."""

from __future__ import annotations

import csv
import json
import re
import shutil
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
COURSE_MANIFEST = ROOT / "cartoon_image_manifest.txt"
INVENTORY = ROOT / "remaining_image_inventory.csv"
OVERRIDES = ROOT / "remaining_image_overrides.json"
ASSET_MANIFEST = ROOT / "uploaded_image_asset_manifest.json"
ASSET_DIR = Path("/home/ubuntu/webdev-static-assets/primary4-uploaded")
PENDING = ROOT / "remaining_image_assets_pending_upload.txt"


def normalize(term: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", term.lower()).strip()


def slug(term: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", term.lower()).strip("-")


def parse_course_manifest() -> dict[str, dict]:
    items = {}
    line_re = re.compile(r"^(\d+)\.\s+(.+?)\s+\|\s+(.+?)\s+\|\s+(.+)$")
    for raw in COURSE_MANIFEST.read_text(encoding="utf-8").splitlines():
        match = line_re.match(raw.strip())
        if not match:
            continue
        card = {"id": int(match.group(1)), "term": match.group(2).strip()}
        items[normalize(card["term"])] = card
    return items


def main():
    all_terms = parse_course_manifest()
    inventory = {int(row["index"]): row for row in csv.DictReader(INVENTORY.open(encoding="utf-8-sig"))}
    existing = json.loads(ASSET_MANIFEST.read_text(encoding="utf-8"))
    existing_terms = {normalize(item["term"]) for item in existing}
    added = []
    for override in json.loads(OVERRIDES.read_text(encoding="utf-8")):
        term_key = normalize(override["term"])
        if term_key in existing_terms:
            continue
        term = all_terms.get(term_key)
        source = inventory.get(int(override["index"]))
        if not term or not source:
            continue
        ext = Path(source["source_path"]).suffix.lower() or ".jpg"
        destination = ASSET_DIR / f"cartoon-{term['id']:03d}-{slug(term['term'])}{ext}"
        if not destination.exists():
            shutil.copy2(source["source_path"], destination)
        added.append({
            "term": term["term"],
            "normalized": term_key,
            "id": term["id"],
            "source_number": int(override["index"]),
            "source_path": source["source_path"],
            "local_asset": str(destination),
            "confidence": "manual-high",
        })
        existing_terms.add(term_key)
    if added:
        ASSET_MANIFEST.write_text(json.dumps(existing + added, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    PENDING.write_text("\n".join(item["local_asset"] for item in added) + ("\n" if added else ""), encoding="utf-8")
    print(f"Added: {len(added)}")
    print(f"Total assets: {len(existing) + len(added)}")
    print(f"Pending upload list: {PENDING}")


if __name__ == "__main__":
    main()
