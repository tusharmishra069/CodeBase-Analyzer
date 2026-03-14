import os
import shutil
import tempfile
import stat
from pathlib import Path
from git import Repo

from app.core.config import settings

# ── Allow-list: source code only, no binaries or lock files ──────────────────
ALLOWED_EXTENSIONS = {
    ".py", ".js", ".jsx", ".ts", ".tsx",
    ".java", ".c", ".cpp", ".cs",
    ".go", ".rs", ".rb", ".php",
    ".html", ".css", ".scss",
    ".md", ".json", ".yml", ".yaml", ".toml",
    ".sh", ".env.example",
}

# ── Directories to skip entirely ──────────────────────────────────────────────
SKIP_DIRS = {
    ".git", ".github", ".svn", ".hg",
    "node_modules", "vendor", "venv", ".venv", "env",
    "dist", "build", "out", "target", ".next", ".nuxt",
    "__pycache__", ".pytest_cache", ".mypy_cache", ".ruff_cache",
    "coverage", ".coverage", "htmlcov",
    "migrations",
    "fixtures", "seeds", "mocks", "__mocks__",
    ".idea", ".vscode", ".DS_Store",
}

# ── File names to skip (lock files, OS noise) ─────────────────────────────────
SKIP_FILE_PATTERNS = {
    "package-lock.json", "yarn.lock", "pnpm-lock.yaml",
    "poetry.lock", "Pipfile.lock", "Gemfile.lock", "composer.lock",
    "bun.lockb", ".DS_Store", "Thumbs.db",
}

# ── Entry-point files are loaded first to anchor the analysis ─────────────────
ENTRY_POINT_NAMES = {
    "main.py", "app.py", "server.py", "wsgi.py", "asgi.py",
    "index.ts", "index.js", "server.ts", "server.js",
    "app.ts", "app.js", "main.ts", "main.js",
    "manage.py",
    "routes.py", "router.py",
    "models.py", "schema.py", "schemas.py",
    "config.py", "settings.py",
    "Dockerfile", "docker-compose.yml", "docker-compose.yaml",
    "README.md",
}


def _remove_readonly(func, path, excinfo):
    """Allow rmtree to delete read-only files on macOS/Windows."""
    os.chmod(path, stat.S_IWRITE)
    func(path)


def _is_test_file(path: Path) -> bool:
    name = path.name.lower()
    return (
        name.startswith("test_")
        or name.endswith("_test.py")
        or name.endswith(".test.ts")
        or name.endswith(".test.js")
        or name.endswith(".spec.ts")
        or name.endswith(".spec.js")
        or "/__tests__/" in str(path)
        or "/tests/" in str(path).lower()
    )


def clone_repository(repo_url: str) -> str:
    """Shallow-clones a repository into a temp directory and returns the path."""
    temp_dir = tempfile.mkdtemp(prefix="ai_code_analyzer_")
    try:
        print(f"[repo_parser] Cloning {repo_url} into {temp_dir}...")
        Repo.clone_from(repo_url, temp_dir, depth=1)
        return temp_dir
    except Exception as e:
        cleanup_repository(temp_dir)
        raise RuntimeError(f"Failed to clone repository: {e}")


def cleanup_repository(repo_dir: str) -> None:
    """Deletes a cloned repository directory."""
    if os.path.exists(repo_dir):
        shutil.rmtree(repo_dir, onerror=_remove_readonly)


def parse_codebase(repo_dir: str) -> list[dict]:
    """
    Walks the repository and returns a list of {"path": str, "content": str}
    dicts, entry-point files ordered first.

    Hard limits (prevents OOM on Railway free tier):
      - MAX_FILE_COUNT   — cap number of files processed
      - MAX_FILE_SIZE_BYTES — per-file cap
      - MAX_TOTAL_CONTENT_BYTES (2 MB) — total raw text cap across all files
    """
    _MAX_TOTAL_CONTENT_BYTES = 2 * 1024 * 1024  # 2 MB total raw source text
    repo_path = Path(repo_dir)
    entry_docs: list[dict] = []
    regular_docs: list[dict] = []
    total_content_bytes = 0

    for root, dirs, files in os.walk(repo_path):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS and not d.startswith(".")]

        for file in sorted(files):
            file_path = Path(root) / file

            if file in SKIP_FILE_PATTERNS:
                continue
            if file_path.suffix not in ALLOWED_EXTENSIONS:
                continue
            if _is_test_file(file_path):
                continue

            try:
                if os.path.getsize(file_path) > settings.MAX_FILE_SIZE_BYTES:
                    print(f"[repo_parser] Skipping large file: {file_path.relative_to(repo_path)}")
                    continue
            except OSError:
                continue

            try:
                content = file_path.read_text(encoding="utf-8", errors="ignore")
            except Exception as e:
                print(f"[repo_parser] Skipping unreadable file {file_path}: {e}")
                continue

            content_bytes = len(content.encode("utf-8", errors="ignore"))
            if total_content_bytes + content_bytes > _MAX_TOTAL_CONTENT_BYTES:
                print(f"[repo_parser] Reached 4 MB total content cap — stopping file scan.")
                # still return what we have instead of crashing
                all_docs = entry_docs + regular_docs
                print(f"[repo_parser] Parsed {len(all_docs)} files ({len(entry_docs)} entry points) [{total_content_bytes // 1024} KB total].")
                return all_docs
            total_content_bytes += content_bytes

            rel_path = str(file_path.relative_to(repo_path))
            doc = {"path": rel_path, "content": content}

            if file in ENTRY_POINT_NAMES:
                entry_docs.append(doc)
            else:
                regular_docs.append(doc)

    all_docs = entry_docs + regular_docs
    if len(all_docs) > settings.MAX_FILE_COUNT:
        print(f"[repo_parser] Capping at {settings.MAX_FILE_COUNT} files (found {len(all_docs)}).")
        all_docs = all_docs[: settings.MAX_FILE_COUNT]

    print(f"[repo_parser] Parsed {len(all_docs)} files ({len(entry_docs)} entry points) [{total_content_bytes // 1024} KB total].")
    return all_docs
