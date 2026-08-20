#!/usr/bin/env python3
"""Classify uploaded vocabulary images against the remaining Primary 4 terms."""

from __future__ import annotations

import base64
import concurrent.futures as futures
import csv
import io
import json
import os
import re
import time
from pathlib import Path

from openai import OpenAI
from PIL import Image, ImageOps


ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "cartoon_image_manifest.txt"
INVENTORY = ROOT / "uploaded_image_inventory.csv"
OUT = ROOT / "uploaded_image_ai_classification.jsonl"
MODEL = "gemini-3-flash-preview"
MAX_WORKERS = 5


def load_terms() -> list[str]:
    terms = []
    pattern = re.compile(r"^\s*(\d+)\.\s*(.*?)\s*\|")
    for line in MANIFEST.read_text(encoding="utf-8").splitlines():
        match = pattern.match(line)
        if match and int(match.group(1)) > 10:
            terms.append(match.group(2))
    return terms


def load_items() -> list[dict[str, str]]:
    with INVENTORY.open(encoding="utf-8-sig", newline="") as file:
        return list(csv.DictReader(file))


def data_url(path: str) -> str:
    with Image.open(path) as source:
        image = ImageOps.exif_transpose(source).convert("RGB")
        image.thumbnail((640, 640), Image.Resampling.LANCZOS)
        buffer = io.BytesIO()
        image.save(buffer, format="JPEG", quality=84, optimize=True)
    encoded = base64.b64encode(buffer.getvalue()).decode("ascii")
    return f"data:image/jpeg;base64,{encoded}"


def classify(item: dict[str, str], terms_text: str) -> dict[str, object]:
    client = OpenAI()
    prompt = (
        "You are matching one uploaded cartoon image to one term from a Primary 4 English vocabulary list. "
        "Choose the single best exact term from the candidate list, or null only if none fits. "
        "Infer the intended word from the picture; generated text in the image can help identify the term, but do not invent a term outside the list. "
        "Set accept_for_flashcard true only when the scene clearly depicts that term and there is no watermark or service logo. "
        "Visible teaching text is allowed for this classification, but accurately flag it. "
        "Return exactly one JSON object with these keys only: candidate_term (string or null), confidence (high, medium, or low), caption (string), has_visible_text (boolean), has_watermark_or_logo (boolean), accept_for_flashcard (boolean). Do not use markdown.\n\n"
        f"Candidate terms:\n{terms_text}"
    )
    for attempt in range(3):
        try:
            response = client.chat.completions.create(
                model=MODEL,
                messages=[
                    {"role": "system", "content": "You are a careful visual classifier. Follow the JSON schema exactly."},
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": prompt},
                            {"type": "image_url", "image_url": {"url": data_url(item["source_path"]), "detail": "low"}},
                        ],
                    },
                ],
                max_tokens=1000,
            )
            content = response.choices[0].message.content or ""
            content = re.sub(r"^```(?:json)?\s*|\s*```$", "", content.strip(), flags=re.IGNORECASE)
            object_start = content.find("{")
            if object_start < 0:
                raise ValueError("No JSON object in model response")
            result, _ = json.JSONDecoder().raw_decode(content[object_start:])
            result.update({"source_number": int(item["source_number"]), "source_path": item["source_path"]})
            return result
        except Exception as error:  # pragma: no cover - network safety
            if attempt == 2:
                return {
                    "source_number": int(item["source_number"]),
                    "source_path": item["source_path"],
                    "candidate_term": None,
                    "confidence": "low",
                    "caption": f"classification error ({type(error).__name__}): {error}",
                    "has_visible_text": False,
                    "has_watermark_or_logo": False,
                    "accept_for_flashcard": False,
                }
            time.sleep(2 ** attempt)
    raise RuntimeError("unreachable")


def main() -> None:
    terms = load_terms()
    items = load_items()
    terms_text = ", ".join(terms)
    existing = {}
    if OUT.exists():
        for line in OUT.read_text(encoding="utf-8").splitlines():
            if line.strip():
                record = json.loads(line)
                if not str(record.get("caption", "")).startswith("classification error"):
                    existing[int(record["source_number"])] = record
    todo = [item for item in items if int(item["source_number"]) not in existing]
    limit = int(os.getenv("CLASSIFY_LIMIT", "0"))
    if limit:
        todo = todo[:limit]
    print(f"Classifying {len(todo)} images; {len(existing)} already present.")
    with OUT.open("a", encoding="utf-8") as file:
        with futures.ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
            task_map = {executor.submit(classify, item, terms_text): item for item in todo}
            for completed, task in enumerate(futures.as_completed(task_map), start=1):
                record = task.result()
                file.write(json.dumps(record, ensure_ascii=False) + "\n")
                file.flush()
                print(f"{completed}/{len(todo)} {record['source_number']} -> {record['candidate_term']} ({record['confidence']})")
    print(f"Saved {OUT}")


if __name__ == "__main__":
    main()
