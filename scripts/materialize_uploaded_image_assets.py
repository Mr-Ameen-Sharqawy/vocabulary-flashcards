#!/usr/bin/env python3
"""Copy selected uploaded images into webdev static assets with semantic names."""

from __future__ import annotations

import json
import re
import shutil
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
MAPPING = ROOT / "uploaded_image_mapping_candidates.json"
ASSET_DIR = Path("/home/ubuntu/webdev-static-assets/primary4-uploaded")
OUT = ROOT / "uploaded_image_asset_manifest.json"


def slugify(term: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", term.lower()).strip("-")


def main():
    selections = json.loads(MAPPING.read_text(encoding="utf-8"))
    ASSET_DIR.mkdir(parents=True, exist_ok=True)
    assets = []
    for item in selections:
        source = Path(item["source_path"])
        destination = ASSET_DIR / f"cartoon-{item['id']:03d}-{slugify(item['term'])}.jpg"
        shutil.copy2(source, destination)
        assets.append({
            "id": item["id"],
            "term": item["term"],
            "local_asset": str(destination),
            "source_number": item["source_number"],
            "confidence": item["confidence"],
            "has_visible_text": item["has_visible_text"],
        })
    OUT.write_text(json.dumps(assets, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Materialized {len(assets)} images in {ASSET_DIR}")
    print(f"Manifest: {OUT}")


if __name__ == "__main__":
    main()
