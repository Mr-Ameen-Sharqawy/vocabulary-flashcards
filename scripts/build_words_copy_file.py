#!/usr/bin/env python3
"""Create a minimal copy-and-paste list of the remaining vocabulary terms."""

from pathlib import Path
import re


ROOT = Path(__file__).resolve().parents[1]
manifest = ROOT / "cartoon_image_manifest.txt"
output = ROOT / "Primary4_words_only_copy_50.md"

terms: list[str] = []
pattern = re.compile(r"^\s*(\d+)\.\s*(.*?)\s*\|")
for line in manifest.read_text(encoding="utf-8").splitlines():
    match = pattern.match(line)
    if match and int(match.group(1)) > 10:
        terms.append(match.group(2))

if len(terms) != 459:
    raise SystemExit(f"Expected 459 terms, got {len(terms)}")

parts = ["# الكلمات فقط — انسخ كل دفعة كما هي", ""]
for start in range(0, len(terms), 50):
    batch_number = start // 50 + 1
    parts.extend([
        f"## الدفعة {batch_number}",
        "",
        "```text",
        ", ".join(terms[start:start + 50]),
        "```",
        "",
    ])

output.write_text("\n".join(parts), encoding="utf-8")
print(f"Created {output.name} with {len(terms)} terms in {((len(terms) + 49) // 50)} batches.")
