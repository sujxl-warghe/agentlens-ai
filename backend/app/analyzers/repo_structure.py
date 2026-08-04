import os
from dataclasses import dataclass, field
from pathlib import Path

from app.core.logging import get_logger

logger = get_logger(__name__)

# Directories we never want to scan — build artifacts, deps, vcs internals.
IGNORED_DIR_NAMES = {
    ".git", "node_modules", "__pycache__", ".venv", "venv", "env",
    "dist", "build", ".next", ".turbo", "coverage", ".pytest_cache",
    ".mypy_cache", "site-packages", ".idea", ".vscode", "target",
    "vendor", ".cache",
}

EXTENSION_LANGUAGE_MAP: dict[str, str] = {
    ".py": "Python",
    ".ts": "TypeScript",
    ".tsx": "TypeScript",
    ".js": "JavaScript",
    ".jsx": "JavaScript",
    ".mjs": "JavaScript",
    ".json": "JSON",
    ".yaml": "YAML",
    ".yml": "YAML",
    ".md": "Markdown",
    ".toml": "TOML",
    ".txt": "Text",
    ".env": "Env",
    ".sh": "Shell",
    ".sql": "SQL",
    ".html": "HTML",
    ".css": "CSS",
}

# Languages relevant to agentic-framework detection; everything else is
# still counted for the token heatmap but weighted lower in scoring.
CODE_LANGUAGES = {"Python", "TypeScript", "JavaScript"}

# Rough token estimate: ~4 characters per token is a standard approximation
# for English text and most source code (no live tokenizer call needed for
# the structural pass — this gets refined per-file in the Token Dashboard
# using a real tokenizer where it matters).
CHARS_PER_TOKEN_ESTIMATE = 4

MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024  # skip anything over 2MB (binaries, lockfiles)


@dataclass
class FileEntry:
    path: str
    language: str
    size_bytes: int
    estimated_tokens: int


@dataclass
class StructureResult:
    total_files: int
    total_size_bytes: int
    languages: list[dict] = field(default_factory=list)
    top_files_by_size: list[FileEntry] = field(default_factory=list)
    directory_tree_depth: int = 0
    ignored_file_count: int = 0


class RepoStructureAnalyzer:
    """
    Walks a cloned repository on disk and produces a StructureResult:
    per-file language classification, size, and a rough token estimate,
    plus an aggregated language breakdown for the Token Heatmap (Phase 2)
    and downstream Framework Detection (Phase 3).
    """

    def __init__(self, root: Path, max_files: int = 5000):
        self.root = root
        self.max_files = max_files
        self.last_entries: list[FileEntry] = []

    def analyze(self) -> StructureResult:
        entries: list[FileEntry] = []
        ignored_count = 0
        max_depth = 0

        for dirpath, dirnames, filenames in os.walk(self.root):
            # Prune ignored directories in-place so os.walk doesn't descend into them
            dirnames[:] = [d for d in dirnames if d not in IGNORED_DIR_NAMES and not d.startswith(".")]

            rel_dir = Path(dirpath).relative_to(self.root)
            depth = len(rel_dir.parts)
            max_depth = max(max_depth, depth)

            for filename in filenames:
                if len(entries) >= self.max_files:
                    ignored_count += 1
                    continue

                file_path = Path(dirpath) / filename
                ext = file_path.suffix.lower()
                language = EXTENSION_LANGUAGE_MAP.get(ext)

                if language is None:
                    ignored_count += 1
                    continue

                try:
                    size_bytes = file_path.stat().st_size
                except OSError:
                    ignored_count += 1
                    continue

                if size_bytes > MAX_FILE_SIZE_BYTES or size_bytes == 0:
                    ignored_count += 1
                    continue

                estimated_tokens = size_bytes // CHARS_PER_TOKEN_ESTIMATE

                entries.append(
                    FileEntry(
                        path=str(file_path.relative_to(self.root)),
                        language=language,
                        size_bytes=size_bytes,
                        estimated_tokens=estimated_tokens,
                    )
                )

        total_size = sum(e.size_bytes for e in entries)
        self.last_entries = entries
        languages = self._aggregate_languages(entries, total_size)
        top_files = sorted(entries, key=lambda e: e.size_bytes, reverse=True)[:15]

        logger.info(
            "Structure analysis complete: %d files, %d ignored, %d bytes",
            len(entries), ignored_count, total_size,
        )

        return StructureResult(
            total_files=len(entries),
            total_size_bytes=total_size,
            languages=languages,
            top_files_by_size=top_files,
            directory_tree_depth=max_depth,
            ignored_file_count=ignored_count,
        )

    @staticmethod
    def _aggregate_languages(entries: list[FileEntry], total_size: int) -> list[dict]:
        buckets: dict[str, dict] = {}
        for entry in entries:
            bucket = buckets.setdefault(
                entry.language, {"language": entry.language, "file_count": 0, "total_size_bytes": 0}
            )
            bucket["file_count"] += 1
            bucket["total_size_bytes"] += entry.size_bytes

        result = []
        for bucket in buckets.values():
            percentage = (bucket["total_size_bytes"] / total_size * 100) if total_size else 0.0
            result.append({**bucket, "percentage": round(percentage, 1)})

        return sorted(result, key=lambda b: b["total_size_bytes"], reverse=True)
