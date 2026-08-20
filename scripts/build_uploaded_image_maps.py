#!/usr/bin/env python3
"""Generate application and standalone image maps from uploaded asset URLs."""

from __future__ import annotations

import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
ASSET_MANIFEST = ROOT / "uploaded_image_asset_manifest.json"
UPLOAD_RESULTS = ROOT / "uploaded_image_upload_results.txt"
OUT_TS = ROOT / "client/src/lib/uploaded-cartoon-images.ts"
OUT_JSON = ROOT / "uploaded_cartoon_images.json"
MISSING_UPLOADS = ROOT / "uploaded_image_assets_pending_upload.txt"


def normalize(term: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", term.lower()).strip()


def parse_upload_results() -> dict[str, str]:
    paths: dict[str, str] = {}
    pending_path: str | None = None
    for line in UPLOAD_RESULTS.read_text(encoding="utf-8").splitlines():
        upload_match = re.match(r"Uploading file \(webdev private\): (.+) \(size:", line)
        success_match = re.match(r"\[SUCCESS\] (.+) -> (/manus-storage/.+)$", line)
        storage_match = re.match(r"Storage Path: (/manus-storage/.+)$", line)
        if upload_match:
            pending_path = upload_match.group(1)
        elif success_match:
            paths[success_match.group(1)] = success_match.group(2)
            pending_path = None
        elif storage_match and pending_path:
            paths[pending_path] = storage_match.group(1)
            pending_path = None
    return paths


def main():
    assets = json.loads(ASSET_MANIFEST.read_text(encoding="utf-8"))
    urls = parse_upload_results()
    output: dict[str, str] = {}
    missing_uploads = []
    for asset in assets:
        local = asset["local_asset"]
        url = urls.get(local)
        if not url:
            missing_uploads.append(local)
            continue
        output[normalize(asset["term"])] = url
    if missing_uploads:
        MISSING_UPLOADS.write_text("\n".join(missing_uploads) + "\n", encoding="utf-8")
        raise SystemExit(f"Missing upload URLs for {len(missing_uploads)} assets; see {MISSING_UPLOADS.name}")
    if MISSING_UPLOADS.exists():
        MISSING_UPLOADS.unlink()

    ts_lines = [
        "/**",
        " * Uploaded by the user and matched to Primary 4 vocabulary. Generated from uploaded_image_asset_manifest.json.",
        " */",
        "export const uploadedCartoonImages: Record<string, string> = {",
    ]
    for term, url in sorted(output.items()):
        ts_lines.append(f'  {json.dumps(term)}: {json.dumps(url)},')
    ts_lines.extend(["};", ""])
    OUT_TS.write_text("\n".join(ts_lines), encoding="utf-8")
    OUT_JSON.write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {len(output)} URLs to {OUT_TS} and {OUT_JSON}")


if __name__ == "__main__":
    main()
