"""
Sync src/frameworks/mitre-atlas-controls.js from MITRE's official ATLAS data feed.

MITRE ATLAS is a living framework -- unlike NIST 800-53/ISO 27001/etc, it gets
real content updates several times a year (new tactics, dozens of new
techniques). Re-run this script periodically (a quarterly calendar reminder is
plenty) to keep the app's data current instead of hand-editing the JS file.

Usage:
    pip install pyyaml requests --break-system-packages
    python3 scripts/sync_atlas.py

Requires network access to raw.githubusercontent.com.
"""

import json
import re
import urllib.request
from pathlib import Path

SOURCE_URL = "https://raw.githubusercontent.com/mitre-atlas/atlas-data/main/dist/ATLAS.yaml"
OUTPUT_PATH = Path(__file__).parent.parent / "src" / "frameworks" / "mitre-atlas-controls.js"


def clean(text: str) -> str:
    if not text:
        return ""
    text = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", text)  # strip markdown links
    text = re.sub(r"\s+", " ", text).strip()
    return text[:400]


def esc(s: str) -> str:
    return s.replace("\\", "\\\\").replace("'", "\\'").replace("\n", " ")


def main():
    import yaml  # deferred import so the script fails with a clear message if pyyaml is missing

    print(f"Fetching {SOURCE_URL} ...")
    with urllib.request.urlopen(SOURCE_URL) as resp:
        raw = resp.read()

    data = yaml.safe_load(raw)
    matrix = data["matrices"][0]
    version = data.get("version")
    print(f"ATLAS version: {version}  |  tactics: {len(matrix['tactics'])}  |  techniques: {len(matrix['techniques'])}")

    tactics = [
        {"id": t["id"], "name": t["name"], "description": clean(t.get("description", ""))}
        for t in matrix["tactics"]
    ]

    techniques = [
        {
            "id": t["id"],
            "name": t["name"],
            "tactics": t.get("tactics", []),
            "description": clean(t.get("description", "")),
        }
        for t in matrix["techniques"]
        if "specializes" not in t  # top-level techniques only; skip sub-techniques
    ]

    lines = [
        "// MITRE ATLAS (Adversarial Threat Landscape for Artificial-Intelligence Systems)",
        "// Source: https://github.com/mitre-atlas/atlas-data (official machine-readable feed)",
        f"// ATLAS version at last sync: {version}",
        "// This framework is a LIVING knowledge base updated by MITRE multiple times a year.",
        "// Re-run scripts/sync_atlas.py periodically (e.g. quarterly) to refresh this file.",
        "",
        f"export const ATLAS_VERSION = '{version}';",
        "",
        "export const ATLAS_TACTICS = [",
    ]
    for t in tactics:
        lines.append(f"  {{ id: '{t['id']}', name: '{esc(t['name'])}', description: '{esc(t['description'])}' }},")
    lines += [
        "];",
        "",
        "// Top-level techniques only (sub-techniques omitted to keep this maintainable;",
        "// pull sub-techniques from the full ATLAS.yaml if you need that granularity).",
        "export const ATLAS_TECHNIQUES = [",
    ]
    for t in techniques:
        tactics_js = "[" + ", ".join(f"'{tid}'" for tid in t["tactics"]) + "]"
        lines.append(
            f"  {{ id: '{t['id']}', name: '{esc(t['name'])}', tactics: {tactics_js}, "
            f"description: '{esc(t['description'])}' }},"
        )
    lines += [
        "];",
        "",
        "// Convenience: controls-style flat list matching the shape of other framework files",
        "// (id, name, category, priority) so it plugs into existing control-mapping UI/logic.",
        "export const MITRE_ATLAS_CONTROLS = ATLAS_TACTICS.map(t => ({",
        "  id: t.id,",
        "  name: t.name,",
        "  category: 'Tactic',",
        "  priority: 'High',",
        "  description: t.description,",
        "}));",
        "",
    ]

    OUTPUT_PATH.write_text("\n".join(lines))
    print(f"Wrote {OUTPUT_PATH} ({len(tactics)} tactics, {len(techniques)} techniques)")


if __name__ == "__main__":
    main()
