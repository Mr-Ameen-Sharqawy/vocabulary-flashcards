#!/usr/bin/env python3
"""Build candidate image mappings from the vision classification results."""

from __future__ import annotations

import csv
import json
import re
from collections import defaultdict
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "cartoon_image_manifest.txt"
COURSE = ROOT / "prim4_course_cards.json"
CLASSIFICATIONS = ROOT / "uploaded_image_ai_classification.jsonl"
OVERRIDES = ROOT / "manual_uploaded_image_overrides.json"
OUT_REPORT = ROOT / "uploaded_image_match_report.csv"
OUT_MAPPING = ROOT / "uploaded_image_mapping_candidates.json"
OUT_MISSING = ROOT / "uploaded_missing_terms.md"
OUT_UNMATCHED = ROOT / "uploaded_unmatched_images.md"
OUT_SNIPPET = ROOT / "uploaded_cartoon_mapping_snippet.ts"


def normalize(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", value.lower()).strip()


def load_manifest():
    records = []
    pattern = re.compile(r"^\s*(\d+)\.\s*(.*?)\s*\|\s*(.*?)\s*\|\s*(.*?)\s*$")
    for line in MANIFEST.read_text(encoding="utf-8").splitlines():
        match = pattern.match(line)
        if match:
            image_id, term, arabic, unit_lesson = match.groups()
            records.append({
                "id": int(image_id),
                "term": term,
                "arabic": arabic,
                "unit_lesson": unit_lesson,
                "normalized": normalize(term),
            })
    return records


def confidence_score(value: str) -> int:
    return {"high": 300, "medium": 200, "low": 100}.get(value, 0)


def load_original_unit_one_terms() -> set[str]:
    course = json.loads(COURSE.read_text(encoding="utf-8"))
    terms = set()
    for lesson in course["lessons"]:
        if int(lesson["unit"]) == 1 and str(lesson["lesson"]) == "1":
            for card in lesson["cards"]:
                terms.add(normalize(card["term"]))
    return terms


def main() -> None:
    manifest = load_manifest()
    by_normalized = {item["normalized"]: item for item in manifest}
    existing_without_upload = {item["normalized"] for item in manifest if item["id"] <= 10}
    existing_without_upload.update(load_original_unit_one_terms())
    classifications = [json.loads(line) for line in CLASSIFICATIONS.read_text(encoding="utf-8").splitlines() if line.strip()]

    rows = []
    grouped = defaultdict(list)
    classifications_by_source = {}
    for record in classifications:
        classifications_by_source[int(record["source_number"])] = record
        raw_candidate = record.get("candidate_term")
        candidate = normalize(raw_candidate) if raw_candidate else ""
        term_record = by_normalized.get(candidate)
        valid_candidate = term_record is not None and term_record["id"] > 10
        score = confidence_score(record.get("confidence", ""))
        if record.get("accept_for_flashcard"):
            score += 20
        if not record.get("has_watermark_or_logo"):
            score += 10
        if not record.get("has_visible_text"):
            score += 5
        row = {
            "source_number": record["source_number"],
            "source_path": record["source_path"],
            "candidate_term": raw_candidate or "",
            "normalized_candidate": candidate,
            "candidate_is_manifest_term": valid_candidate,
            "confidence": record.get("confidence", "low"),
            "caption": record.get("caption", ""),
            "has_visible_text": record.get("has_visible_text", False),
            "has_watermark_or_logo": record.get("has_watermark_or_logo", False),
            "accept_for_flashcard": record.get("accept_for_flashcard", False),
            "selection_score": score if valid_candidate and not record.get("has_watermark_or_logo") else 0,
        }
        rows.append(row)
        if row["selection_score"]:
            grouped[candidate].append(row)

    selected = {}
    for candidate, options in grouped.items():
        # Prefer the highest-confidence no-watermark image. For an exact score tie,
        # choose the image without visible teaching text, then lowest source number.
        best = sorted(
            options,
            key=lambda item: (-item["selection_score"], item["has_visible_text"], item["source_number"]),
        )[0]
        selected[candidate] = best

    if OVERRIDES.exists():
        for override in json.loads(OVERRIDES.read_text(encoding="utf-8")):
            key = normalize(override["term"])
            source_number = int(override["source_number"])
            item = by_normalized.get(key)
            source = classifications_by_source.get(source_number)
            if not item or item["id"] <= 10 or not source:
                continue
            selected[key] = {
                "source_number": source_number,
                "source_path": source["source_path"],
                "candidate_term": item["term"],
                "normalized_candidate": key,
                "candidate_is_manifest_term": True,
                "confidence": "manual",
                "caption": "Manual visual match from uploaded-image contact sheets.",
                "has_visible_text": source.get("has_visible_text", False),
                "has_watermark_or_logo": False,
                "accept_for_flashcard": True,
                "selection_score": 400,
            }

    with OUT_REPORT.open("w", encoding="utf-8-sig", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(sorted(rows, key=lambda item: item["source_number"]))

    selected_output = []
    for item in manifest:
        key = item["normalized"]
        if key in selected:
            selection = selected[key]
            selected_output.append({
                "id": item["id"],
                "term": item["term"],
                "arabic": item["arabic"],
                "unit_lesson": item["unit_lesson"],
                "source_number": selection["source_number"],
                "source_path": selection["source_path"],
                "confidence": selection["confidence"],
                "has_visible_text": selection["has_visible_text"],
                "caption": selection["caption"],
            })
    OUT_MAPPING.write_text(json.dumps(selected_output, ensure_ascii=False, indent=2), encoding="utf-8")

    missing = [item for item in manifest if item["normalized"] not in selected and item["normalized"] not in existing_without_upload]
    missing_lines = [
        "# الكلمات التي لا تملك صورة مرفوعة قابلة للمطابقة",
        "",
        f"الصور المرفوعة الحالية: **{len(classifications)}** صورة. الكلمات التي اختارت لها المطابقة الآلية صورة مرشحة: **{len(selected_output)}** كلمة. الكلمات المتبقية بعد احتساب أول 10 صور وصور الدرس الأول الأصلية: **{len(missing)}** كلمة.",
        "",
        "```text",
        ", ".join(item["term"] for item in missing),
        "```",
        "",
        "## القائمة المرقمة",
        "",
    ]
    for item in missing:
        missing_lines.append(f"- `{item['id']:03d}` — **{item['term']}** — {item['arabic']} ({item['unit_lesson']})")
    OUT_MISSING.write_text("\n".join(missing_lines) + "\n", encoding="utf-8")

    unmatched = [item for item in rows if not item["selection_score"]]
    unmatched_lines = [
        "# صور لم تُقبل للمطابقة التلقائية",
        "",
        "هذه الصور إما بلا كلمة مرشحة مؤكدة، أو ظهر فيها شعار/علامة مائية، أو كانت مطابقتها غير موثوقة. لا تُربط تلقائيًا.",
        "",
        "| ملف الصورة | الكلمة المقترحة | الثقة | نص ظاهر | علامة مائية/شعار | وصف مختصر |",
        "|---|---|---|---:|---:|---|",
    ]
    for item in sorted(unmatched, key=lambda value: value["source_number"]):
        unmatched_lines.append(
            f"| {item['source_number']} | {item['candidate_term'] or '—'} | {item['confidence']} | {'نعم' if item['has_visible_text'] else 'لا'} | {'نعم' if item['has_watermark_or_logo'] else 'لا'} | {item['caption']} |"
        )
    OUT_UNMATCHED.write_text("\n".join(unmatched_lines) + "\n", encoding="utf-8")

    snippet_lines = [
        "// Candidate map generated from uploaded images. Upload files first, then replace __STORAGE_URL__ values.",
        "const uploadedCartoonImages: Record<string, string> = {",
    ]
    for item in selected_output:
        slug = Path(item["source_path"]).stem
        snippet_lines.append(f'  "{item["term"]}": "__STORAGE_URL__/{slug}.jpg",')
    snippet_lines.append("};")
    OUT_SNIPPET.write_text("\n".join(snippet_lines) + "\n", encoding="utf-8")

    print(f"Classifications: {len(classifications)}")
    print(f"Selected term mappings: {len(selected_output)}")
    print(f"Missing terms: {len(missing)}")
    print(f"Unmatched/rejected images: {len(unmatched)}")
    print(f"Outputs: {OUT_REPORT.name}, {OUT_MAPPING.name}, {OUT_MISSING.name}, {OUT_UNMATCHED.name}")


if __name__ == "__main__":
    main()
