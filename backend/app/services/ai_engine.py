import json
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_core.documents import Document
from groq import Groq

from app.core.config import settings

# ── Retrieval queries — each probes a different code quality dimension ────────
RETRIEVAL_QUERIES = [
    "entry point main application server setup startup routing middleware",
    "database models schema ORM queries migrations data layer",
    "authentication authorization security validation error handling",
    "external API integrations third-party services environment configuration secrets",
    "business logic core algorithms data processing patterns design",
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
        # Delay loading HuggingFaceEmbeddings until first use.
        # Loading it here costs ~300 MB at startup and OOMs Render's free tier.
        self._embeddings = None
        self.groq_client = Groq(api_key=settings.GROQ_API_KEY)

    @property
    def embeddings(self):
        if self._embeddings is None:
            print("[ai_engine] Loading embedding model (first request)...")
            self._embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
            print("[ai_engine] Embedding model ready")
        return self._embeddings

    def create_vector_store(self, code_documents: list[dict]) -> FAISS:
        """Chunks files using code-aware separators and builds a FAISS vector store."""
        print("[ai_engine] Chunking documents...")
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=1200,
            chunk_overlap=150,
            separators=["\nclass ", "\ndef ", "\nfunction ", "\nexport ", "\n\n", "\n", " ", ""],
        )

        docs: list[Document] = []
        for item in code_documents:
            for chunk in splitter.split_text(item["content"]):
                docs.append(Document(page_content=chunk, metadata={"source": item["path"]}))

        print(f"[ai_engine] {len(docs)} chunks created. Embedding into FAISS...")
        return FAISS.from_documents(documents=docs, embedding=self.embeddings)

    def _multi_query_retrieve(self, vectorstore: FAISS, k_per_query: int = 8) -> str:
        """
        Runs 5 targeted retrieval queries and deduplicates results to maximise
        context coverage across architecture, security, data layer, and logic.
        """
        seen: set[str] = set()
        chunks: list[str] = []

        for query in RETRIEVAL_QUERIES:
            for doc in vectorstore.similarity_search(query, k=k_per_query):
                key = doc.metadata["source"] + doc.page_content[:120]
                if key not in seen:
                    seen.add(key)
                    chunks.append(f"### FILE: {doc.metadata['source']}\n{doc.page_content}")

        print(f"[ai_engine] Multi-query retrieval: {len(chunks)} unique chunks assembled.")
        return "\n\n---\n\n".join(chunks)

    def analyze_codebase(self, vectorstore: FAISS) -> dict:
        """Runs multi-query RAG then calls Groq for a structured code review."""
        context = self._multi_query_retrieve(vectorstore)
        user_message = ANALYSIS_USER_TEMPLATE.format(context=context)

        print("[ai_engine] Querying Groq LLM...")
        completion = self.groq_client.chat.completions.create(
            messages=[
                {"role": "system", "content": ANALYSIS_SYSTEM_PROMPT},
                {"role": "user", "content": user_message},
            ],
            model=settings.GROQ_MODEL,
            temperature=0.1,
            max_tokens=2048,
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
