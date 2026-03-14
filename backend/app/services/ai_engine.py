import hashlib
import json
import os
import warnings
from concurrent.futures import ThreadPoolExecutor, as_completed

# Suppress noisy-but-harmless warnings
os.environ.setdefault("HF_HUB_DISABLE_PROGRESS_BARS", "1")
warnings.filterwarnings("ignore", message=".*unauthenticated.*", category=UserWarning)
warnings.filterwarnings("ignore", message=".*HuggingFaceEmbeddings.*", category=Warning)

from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_community.embeddings import HuggingFaceEmbeddings  # noqa: deprecated
from langchain_core.documents import Document
from groq import Groq

from app.core.config import settings

# ── Module-level singleton — loaded once per process, shared across all jobs ──
# On Render free tier (1 worker, preload_app=True) this means the model is
# loaded exactly once at startup and reused for every analysis request.
_EMBEDDINGS: HuggingFaceEmbeddings | None = None

def get_embeddings() -> HuggingFaceEmbeddings:
    global _EMBEDDINGS
    if _EMBEDDINGS is None:
        print("[ai_engine] Loading embedding model...")
        _EMBEDDINGS = HuggingFaceEmbeddings(
            model_name=settings.EMBEDDING_MODEL_NAME,
            model_kwargs={"device": "cpu"},
            encode_kwargs={"batch_size": settings.EMBEDDING_BATCH_SIZE, "normalize_embeddings": True},
        )
        print("[ai_engine] Embedding model ready ✓")
    return _EMBEDDINGS


# ── Retrieval queries — focused on critical issues (2 queries run in parallel) ──
RETRIEVAL_QUERIES = [
    "bugs errors security vulnerabilities exceptions error handling",
    "architecture design patterns scalability performance optimization",
]

# ── System prompt — Staff-Engineer-grade review (RSCIT framework) ─────────────
ANALYSIS_SYSTEM_PROMPT = """You are a Staff Engineer with 15+ years of experience conducting architecture and security reviews at companies like Google, Stripe, and Airbnb. You specialize in identifying production risks, security vulnerabilities, and architectural anti-patterns across any language or framework.

Your reviews are trusted by CTOs because they are:
- Concrete: every finding references a specific file or pattern from the code
- Actionable: every bug has a fix, every improvement has a clear next step
- Calibrated: severity/priority levels are accurate, not inflated
- Honest: you give real grades — a messy codebase gets a D, not a B"""

ANALYSIS_USER_TEMPLATE = """## TASK
Perform a thorough Staff Engineer code review of the codebase segments below.

## CODEBASE CONTEXT
{context}

## ANALYSIS INSTRUCTIONS

Think through these dimensions before producing output:

1. **Architecture** — Clear separation of concerns? God objects, circular deps, missing abstraction layers?
2. **Security** — Hardcoded secrets, SQL/command injection, missing auth checks, insecure defaults?
3. **Reliability** — Missing error handling, unhandled rejections, race conditions, resource leaks?
4. **Code Quality** — Dead code, duplicated logic, magic numbers, missing type hints?
5. **Performance** — N+1 queries, blocking I/O in async context, missing pagination?
6. **Tech Stack** — Identify all languages, frameworks, and key libraries.

## HEALTH SCORE RUBRIC
- **A+**: Production-ready, clean architecture, no critical issues, strong security posture
- **A**: Minor improvements needed, no critical bugs, good patterns
- **B+**: Some improvements needed, no critical security issues, reasonable structure
- **B**: Several issues, moderate tech debt, needs refactoring
- **C**: Significant problems, some security concerns, notable tech debt
- **D**: Serious bugs and security issues, poor architecture, needs major rework
- **F**: Critical vulnerabilities, broken logic, or fundamentally flawed architecture

## OUTPUT FORMAT
Return ONLY a valid JSON object. No markdown, no explanation, no ```json fences.

{{
  "health_score": "<A+|A|B+|B|C|D|F>",
  "health_reasoning": "<1-2 sentences explaining the score>",
  "tech_stack": ["<framework or library>", "..."],
  "architecture_summary": "<2-3 sentences on overall architecture and key design decisions>",
  "bugs": [
    {{
      "title": "<concise bug title>",
      "severity": "<CRITICAL|HIGH|MEDIUM|LOW>",
      "description": "<specific explanation of the issue>",
      "file_hint": "<filename or pattern, or 'multiple files'>",
      "fix": "<concrete, actionable fix in 1-2 sentences>"
    }}
  ],
  "improvements": [
    {{
      "title": "<improvement title>",
      "priority": "<HIGH|MEDIUM|LOW>",
      "description": "<specific suggestion with context>",
      "effort": "<Low|Medium|High>"
    }}
  ]
}}

RULES:
- Include 2–6 bugs (only real issues visible in the code)
- Include 3–6 improvements (real architectural or quality suggestions)
- Reference actual file names in bug file_hints
- Do NOT include markdown or any text outside the JSON object"""


class CodeAnalyzer:
    def __init__(self):
        self.groq_client = Groq(api_key=settings.GROQ_API_KEY)

    @property
    def embeddings(self) -> HuggingFaceEmbeddings:
        # Use process-level singleton — never reload the model for a 2nd job
        return get_embeddings()

    # Maximum total bytes sent to the embedder — hard-cap to keep memory bounded
    _MAX_EMBED_BYTES = settings.MAX_EMBED_BYTES

    def create_vector_store(self, code_documents: list[dict]) -> FAISS:
        """Chunks files using code-aware separators and builds a FAISS vector store.

        Optimisations:
          - SHA-1 content deduplication: skips re-embedding identical files
          - 2 MB total-content cap: prevents OOM on repos with huge generated files
          - Code-aware separators: chunks split at class/function boundaries
        """
        print("[ai_engine] Chunking documents...")
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=settings.CHUNK_SIZE,
            chunk_overlap=settings.CHUNK_OVERLAP,
            separators=["\nclass ", "\ndef ", "\nfunction ", "\nexport ", "\n\n", "\n", " ", ""],
        )

        seen_hashes: set[str] = set()
        total_bytes = 0
        docs: list[Document] = []

        for item in code_documents:
            content = item["content"]
            # Skip exact-duplicate files (same content, different paths)
            h = hashlib.sha1(content.encode("utf-8", errors="ignore"), usedforsecurity=False).hexdigest()
            if h in seen_hashes:
                continue
            seen_hashes.add(h)

            # Hard-cap total embedded bytes to avoid OOM on large repos
            content_bytes = len(content.encode("utf-8", errors="ignore"))
            if total_bytes + content_bytes > self._MAX_EMBED_BYTES:
                print(f"[ai_engine] Reached embed cap ({self._MAX_EMBED_BYTES // 1024} KB) — skipping remaining files.")
                break
            total_bytes += content_bytes

            for chunk in splitter.split_text(content):
                docs.append(Document(page_content=chunk, metadata={"source": item["path"]}))

        print(f"[ai_engine] {len(docs)} chunks from {len(seen_hashes)} unique files ({total_bytes // 1024} KB). Embedding...")
        return FAISS.from_documents(documents=docs, embedding=self.embeddings)

    def _multi_query_retrieve(self, vectorstore: FAISS, k_per_query: int | None = None) -> str:
        """
        Runs targeted retrieval queries in parallel (ThreadPoolExecutor) and
        deduplicates results by (source, content-hash) key.
        FAISS releases the GIL during L2-search so threads genuinely overlap.
        """
        all_docs: list = []
        effective_k = k_per_query or settings.RETRIEVAL_K_PER_QUERY
        retrieval_queries = RETRIEVAL_QUERIES[: max(1, settings.RETRIEVAL_QUERY_COUNT)]

        def _search(query: str):
            return vectorstore.similarity_search(query, k=effective_k)

        with ThreadPoolExecutor(max_workers=len(retrieval_queries)) as pool:
            futures = {pool.submit(_search, q): q for q in retrieval_queries}
            for fut in as_completed(futures):
                try:
                    all_docs.extend(fut.result())
                except Exception as exc:
                    print(f"[ai_engine] Retrieval error: {exc}")

        seen: set[str] = set()
        chunks: list[str] = []
        for doc in all_docs:
            key = doc.metadata["source"] + doc.page_content[:120]
            if key not in seen:
                seen.add(key)
                chunks.append(f"### FILE: {doc.metadata['source']}\n{doc.page_content}")

        print(f"[ai_engine] Retrieved {len(chunks)} unique chunks.")
        return "\n\n---\n\n".join(chunks)

    def _single_query_retrieve(self, vectorstore: FAISS, query: str, k: int = 4) -> list[str]:
        """
        Single query retrieval — used in parallel by worker via ThreadPoolExecutor.
        Returns list of chunk strings (no Document objects).
        """
        if isinstance(vectorstore, list):
            # Lite mode fallback — simple token matching
            from collections import Counter
            import re
            q_tokens = Counter(re.findall(r"\w+", query.lower()))
            scored = []
            for chunk in vectorstore:
                c_tokens = Counter(re.findall(r"\w+", chunk.lower()))
                score = sum(min(q_tokens[w], c_tokens[w]) for w in q_tokens)
                if score > 0:
                    scored.append((score, chunk))
            scored.sort(reverse=True, key=lambda x: x[0])
            return [c for _, c in scored[:k]]
        else:
            # FAISS mode
            try:
                docs = vectorstore.similarity_search(query, k=k)
                return [d.page_content if hasattr(d, "page_content") else str(d) for d in docs]
            except Exception as exc:
                print(f"[ai_engine] Retrieval error for '{query}': {exc}")
                return []

    def analyze_codebase_with_chunks(self, chunks: list[str]) -> dict:
        """
        Analyze using pre-retrieved chunks (no FAISS/embedding call inside).
        Fast path for parallel retrieval results.
        """
        # Take top 25 chunks to avoid token bloat
        context = "\n\n---\n\n".join(chunks[:25])
        user_message = ANALYSIS_USER_TEMPLATE.format(context=context)

        print("[ai_engine] Querying Groq LLM...")
        completion = self.groq_client.chat.completions.create(
            messages=[
                {"role": "system", "content": ANALYSIS_SYSTEM_PROMPT},
                {"role": "user", "content": user_message},
            ],
            model=settings.GROQ_MODEL,
            temperature=0.1,
            max_tokens=settings.LLM_MAX_TOKENS,
        )

        raw = completion.choices[0].message.content.strip()
        try:
            start, end = raw.find("{"), raw.rfind("}") + 1
            if start != -1 and end > start:
                raw = raw[start:end]
            result = json.loads(raw)
            result.setdefault("health_score", "N/A")
            result.setdefault("health_reasoning", "")
            result.setdefault("tech_stack", [])
            result.setdefault("architecture_summary", "")
            result.setdefault("bugs", [])
            result.setdefault("improvements", [])
            return result
        except json.JSONDecodeError:
            print(f"[ai_engine] JSON parse failed. Raw:\n{raw[:500]}")
            return {
                "health_score": "N/A",
                "health_reasoning": "Analysis could not be parsed.",
                "tech_stack": [],
                "architecture_summary": "The AI model returned an unparseable response. Please try again.",
                "bugs": [],
                "improvements": [],
            }

