import os
import shutil
import tempfile
import stat
from git import Repo
from pathlib import Path

# Common file extensions we want to analyze (excluding binaries, lockfiles, etc.)
ALLOWED_EXTENSIONS = {
    ".py", ".js", ".jsx", ".ts", ".tsx", ".java", ".c", ".cpp", ".cs", 
    ".go", ".rs", ".rb", ".php", ".html", ".css", ".md", ".json", ".yml", ".yaml"
}

def remove_readonly(func, path, excinfo):
    """Wait and remove read-only files during shutil.rmtree on Windows/Mac."""
    os.chmod(path, stat.S_IWRITE)
    func(path)

def clone_repository(repo_url: str) -> str:
    """Clones a repository into a temporary directory and returns the path."""
    temp_dir = tempfile.mkdtemp(prefix="ai_code_analyzer_")
    try:
        print(f"Cloning {repo_url} into {temp_dir}...")
        Repo.clone_from(repo_url, temp_dir, depth=1) # Shallow clone for speed
        return temp_dir
    except Exception as e:
        cleanup_repository(temp_dir)
        raise RuntimeError(f"Failed to clone repository: {str(e)}")

def cleanup_repository(repo_dir: str):
    """Deletes the cloned repository."""
    if os.path.exists(repo_dir):
        shutil.rmtree(repo_dir, onerror=remove_readonly)

def parse_codebase(repo_dir: str) -> list[dict]:
    """
    Walks through the repository, reading allowed files.
    Returns a list of dicts: [{"path": "...", "content": "..."}]
    """
    documents = []
    repo_path = Path(repo_dir)

    for root, dirs, files in os.walk(repo_path):
        # Skip hidden directories like .git
        dirs[:] = [d for d in dirs if not d.startswith('.') and d not in ('node_modules', 'venv', 'dist', 'build', '__pycache__')]

        for file in files:
            file_ext = Path(file).suffix
            if file_ext in ALLOWED_EXTENSIONS:
                file_path = Path(root) / file
                try:
                    # Ignore overly large files (e.g > 1MB)
                    if os.path.getsize(file_path) > 1024 * 1024:
                        continue

                    with open(file_path, "r", encoding="utf-8") as f:
                        content = f.read()
                        
                    # Store path relative to repo root
                    rel_path = file_path.relative_to(repo_path)
                    documents.append({
                        "path": str(rel_path),
                        "content": content
                    })
                except Exception as e:
                    print(f"Skipping file {file_path} due to error: {e}")
                    pass

    return documents
