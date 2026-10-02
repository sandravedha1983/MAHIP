"""
Build the MAHIP medical knowledge index.

Input:
    MAHIP/data/knowledge/*.txt
    MAHIP/data/knowledge/*.md

Output:
    MAHIP/data/knowledge/index.json

This prototype uses TF-IDF retrieval rather than a clinical
decision-making system.
"""

from pathlib import Path
import json
import re


ROOT = Path(__file__).resolve().parents[1]

SRC = ROOT / "data" / "knowledge"
OUT = SRC / "index.json"

CHUNK_SIZE = 1200
CHUNK_OVERLAP = 200


def clean_text(text: str) -> str:
    text = text.replace("\r\n", "\n")
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = re.sub(r"[ \t]+", " ", text)
    return text.strip()


def chunk_text(text: str) -> list[str]:
    text = clean_text(text)

    if not text:
        return []

    chunks = []

    start = 0

    while start < len(text):

        end = min(
            start + CHUNK_SIZE,
            len(text),
        )

        chunk = text[start:end].strip()

        if chunk:
            chunks.append(chunk)

        if end >= len(text):
            break

        start = end - CHUNK_OVERLAP

    return chunks


SRC.mkdir(
    parents=True,
    exist_ok=True,
)

documents = []

for path in sorted(SRC.iterdir()):

    if not path.is_file():
        continue

    if path.name == "index.json":
        continue

    if path.suffix.lower() not in {
        ".txt",
        ".md",
    }:
        continue

    text = path.read_text(
        encoding="utf-8",
        errors="ignore",
    )

    chunks = chunk_text(text)

    for number, chunk in enumerate(chunks):

        documents.append({
            "id": f"{path.stem}_{number + 1}",
            "source": path.name,
            "chunk": number + 1,
            "text": chunk,
        })


OUT.write_text(
    json.dumps(
        documents,
        indent=2,
        ensure_ascii=False,
    ),
    encoding="utf-8",
)

print(
    f"Indexed {len(documents)} knowledge chunks -> {OUT}"
)