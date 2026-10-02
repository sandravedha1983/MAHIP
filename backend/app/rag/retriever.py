import json
import re
from pathlib import Path
from typing import Any

from app.core.config import get_settings

try:
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.metrics.pairwise import cosine_similarity
except Exception:
    TfidfVectorizer = None
    cosine_similarity = None


class KnowledgeRetriever:
    """
    Lightweight local RAG retriever.

    Uses TF-IDF + cosine similarity and returns the original
    source metadata with every retrieved chunk.
    """

    def __init__(self):
        self.settings = get_settings()
        self.documents: list[dict[str, Any]] = []
        self.vectorizer = None
        self.matrix = None
        self._load()

    def _load(self):
        path = Path(self.settings.rag_index_path)

        if not path.exists():
            self.documents = []
            return

        try:
            self.documents = json.loads(
                path.read_text(encoding="utf-8")
            )
        except Exception:
            self.documents = []

        if self.documents and TfidfVectorizer:
            texts = [
                document.get("text", "")
                for document in self.documents
            ]

            self.vectorizer = TfidfVectorizer(
                stop_words="english",
                ngram_range=(1, 2),
                max_features=15000,
            )

            self.matrix = self.vectorizer.fit_transform(texts)

    def search(
        self,
        query: str,
        k: int = 5,
    ) -> list[dict[str, Any]]:

        if not query.strip():
            return []

        if not self.documents:
            return []

        if not self.vectorizer or self.matrix is None:
            return self.documents[:k]

        query_vector = self.vectorizer.transform([query])

        scores = cosine_similarity(
            query_vector,
            self.matrix,
        )[0]

        order = scores.argsort()[::-1][:k]

        results = []

        for index in order:
            document = dict(self.documents[index])

            score = float(scores[index])

            # Don't return completely unrelated documents.
            if score <= 0:
                continue

            document["score"] = round(score, 4)

            results.append(document)

        return results


retriever = KnowledgeRetriever()