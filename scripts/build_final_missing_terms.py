#!/usr/bin/env python3
"""Write a precise missing-vocabulary report from all linked image assets."""

from __future__ import annotations

import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "cartoon_image_manifest.txt"
COURSE = ROOT / "prim4_course_cards.json"
ASSETS = ROOT / "uploaded_image_asset_manifest.json"
OUT = ROOT / "final_missing_terms.md"


def normalize(term: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", term.lower()).strip()


def read_manifest() -> list[dict]:
    items = []
    line_re = re.compile(r"^(\d+)\.\s+(.+?)\s+\|\s+(.+?)\s+\|\s+(.+)$")
    for raw in MANIFEST.read_text(encoding="utf-8").splitlines():
        match = line_re.match(raw.strip())
        if match:
            items.append({"id": int(match.group(1)), "term": match.group(2).strip(), "arabic": match.group(3).strip(), "location": match.group(4).strip()})
    return items


def original_unit_one_terms() -> set[str]:
    course = json.loads(COURSE.read_text(encoding="utf-8"))
    terms = set()
    for lesson in course["lessons"]:
        if int(lesson["unit"]) == 1 and str(lesson["lesson"]) == "1":
            terms.update(normalize(card["term"]) for card in lesson["cards"])
    return terms


def main():
    manifest = read_manifest()
    uploaded = {normalize(item["term"]) for item in json.loads(ASSETS.read_text(encoding="utf-8"))}
    preexisting = {item["id"] <= 10 and normalize(item["term"]) or "" for item in manifest}
    preexisting.update(original_unit_one_terms())
    missing = [item for item in manifest if normalize(item["term"]) not in uploaded and normalize(item["term"]) not in preexisting]
    lines = [
        "# الكلمات التي ما زالت بلا صورة مرتبطة",
        "",
        f"إجمالي الكلمات الفريدة: **{len(manifest)}**. الصور الجديدة المرتبطة من ملفات المستخدم: **{len(uploaded)}**. الكلمات المتبقية بلا صورة: **{len(missing)}**.",
        "",
        "```text",
        ", ".join(item["term"] for item in missing),
        "```",
        "",
        "## القائمة المرقمة",
        "",
    ]
    for item in missing:
        lines.append(f"- `{item['id']:03d}` — **{item['term']}** — {item['arabic']} ({item['location']})")
    OUT.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"Missing terms: {len(missing)}")
    print(f"Report: {OUT}")


if __name__ == "__main__":
    main()
