import re
from dataclasses import dataclass
from pathlib import Path

SCANNABLE_EXTENSIONS = {".py", ".ts", ".tsx", ".js", ".jsx"}
MAX_FILE_BYTES_TO_READ = 400_000


@dataclass
class ExtractedPrompt:
    file: str
    variable_name: str
    text: str
    line: int


def extract_prompts(root: Path) -> list[ExtractedPrompt]:
    """Finds triple-quoted string assignments to *_PROMPT / *_INSTRUCTIONS
    variables across the repo. Deliberately simple (regex, not AST) so it
    works uniformly across Python/TS without per-language grammars."""
    prompts: list[ExtractedPrompt] = []

    for file_path in root.rglob("*"):
        if not file_path.is_file() or file_path.suffix not in SCANNABLE_EXTENSIONS:
            continue
        if any(part in {".git", "node_modules", "__pycache__", ".venv"} for part in file_path.parts):
            continue
        try:
            if file_path.stat().st_size > MAX_FILE_BYTES_TO_READ:
                continue
            content = file_path.read_text(encoding="utf-8", errors="ignore")
        except OSError:
            continue

        rel_path = str(file_path.relative_to(root))
        for match in re.finditer(r'([A-Z_]*(?:PROMPT|INSTRUCTIONS)[A-Z_]*)\s*[:=]\s*(?:f?""")', content):
            start = match.end()
            end = content.find('"""', start)
            if end == -1:
                continue
            text = content[start:end].strip()
            if len(text) < 20:
                continue
            line_no = content[: match.start()].count("\n") + 1
            prompts.append(
                ExtractedPrompt(file=rel_path, variable_name=match.group(1), text=text, line=line_no)
            )

    return prompts
