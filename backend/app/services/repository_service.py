import re
import shutil
import uuid
import zipfile
from dataclasses import dataclass
from pathlib import Path

import git
import httpx

from app.analyzers.repo_structure import RepoStructureAnalyzer, StructureResult
from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger(__name__)
settings = get_settings()

DEMO_REPOS_DIR = Path(__file__).parent / "demo_repos"
VALID_DEMO_IDS = {"coding-assistant", "research-agent", "rag-assistant"}


class RepositoryServiceError(Exception):
    """Raised for any recoverable repository-acquisition failure
    (bad URL, clone timeout, oversized repo, invalid ZIP, etc)."""


@dataclass
class RepoMetadata:
    """Real metadata pulled from the GitHub API before cloning — every
    field here is either directly from GitHub's response or None if
    unavailable (never fabricated)."""

    name: str
    full_name: str
    default_branch: str | None
    language: str | None
    size_kb: int
    pushed_at: str | None
    stargazers_count: int


class RepositoryService:
    """
    Owns everything about getting a repository's source code onto local
    disk for analysis, regardless of where it came from. Downstream
    services (structure analysis, framework detection, agent scanning)
    only ever deal with a plain directory path — they don't know or care
    whether it arrived via git clone, ZIP extraction, or a demo fixture.
    """

    def __init__(self):
        self.workspace_root = Path(settings.WORKSPACE_DIR)
        self.workspace_root.mkdir(parents=True, exist_ok=True)

    def _new_workspace(self, scan_id: str) -> Path:
        """Returns a clean, guaranteed-not-existing path for this scan.
        Deliberately does NOT create the directory itself — git clone,
        zipfile.extractall, and shutil.copytree all create their own
        destination directory, and handing them a pre-existing directory
        (even an empty one) is unnecessary and, on some platforms/git
        versions, actively rejected."""
        path = self.workspace_root / scan_id
        if path.exists():
            shutil.rmtree(path)
        return path

    def clone_github_repo(
        self, scan_id: str, repo_url: str, branch: str | None = None
    ) -> tuple[Path, "RepoMetadata | None"]:
        metadata = self._precheck_github_repo(repo_url)

        target = self._new_workspace(scan_id)
        logger.info("Cloning %s (branch=%s) into %s", repo_url, branch, target)
        try:
            clone_kwargs = {"depth": 1}
            if branch:
                clone_kwargs["branch"] = branch
            # Fail fast instead of hanging on a credential prompt when a
            # repo turns out to require auth despite passing the pre-check
            # (e.g. made private between the check and the clone).
            git.Repo.clone_from(
                repo_url, target, env={"GIT_TERMINAL_PROMPT": "0"}, **clone_kwargs
            )
        except git.GitCommandError as exc:
            logger.warning("git clone failed for %s: %s", repo_url, exc.stderr)
            if branch:
                raise RepositoryServiceError(
                    f"Cloned the repo but branch '{branch}' doesn't exist. "
                    "Double-check the branch name, or leave it blank to use the default branch."
                ) from exc
            raise RepositoryServiceError(
                "Could not clone this repository. It may be private (AgentLens "
                "only supports public repos right now), or the URL may have a typo."
            ) from exc

        self._enforce_size_limit(target)
        return target, metadata

    def _precheck_github_repo(self, repo_url: str) -> "RepoMetadata | None":
        """Calls the public GitHub API before attempting a clone, so a
        typo'd URL or a 404 produces a clear message immediately instead
        of surfacing as a confusing git auth-prompt error. Also captures
        real repo metadata (default branch, language, size, last push)
        for display before cloning even starts."""
        match = re.match(
            r"^https?://github\.com/([^/\s]+)/([^/\s]+?)(?:\.git)?/?$", repo_url.strip()
        )
        if not match:
            raise RepositoryServiceError(
                "That doesn't look like a GitHub repository URL. Expected format: "
                "https://github.com/owner/repo"
            )
        owner, repo = match.groups()

        try:
            response = httpx.get(
                f"https://api.github.com/repos/{owner}/{repo}",
                headers={"Accept": "application/vnd.github+json"},
                timeout=10,
            )
        except httpx.HTTPError:
            # GitHub API unreachable (or rate-limited) — don't block the
            # clone attempt on a check that itself might be failing.
            return None

        if response.status_code == 404:
            raise RepositoryServiceError(
                f"'{owner}/{repo}' wasn't found on GitHub. It's either private "
                "(AgentLens only supports public repos right now) or the URL has a typo — "
                "double-check it and try again."
            )
        if response.status_code == 403:
            # Rate-limited by GitHub's anonymous API quota — don't block on it.
            return None
        if response.status_code == 200:
            data = response.json()
            if data.get("private"):
                raise RepositoryServiceError(
                    f"'{owner}/{repo}' is a private repository. AgentLens only "
                    "supports public repos right now."
                )
            return RepoMetadata(
                name=data.get("name", repo),
                full_name=data.get("full_name", f"{owner}/{repo}"),
                default_branch=data.get("default_branch"),
                language=data.get("language"),
                size_kb=data.get("size", 0),
                pushed_at=data.get("pushed_at"),
                stargazers_count=data.get("stargazers_count", 0),
            )
        return None

    def extract_zip_upload(self, scan_id: str, zip_bytes: bytes) -> Path:
        target = self._new_workspace(scan_id)
        tmp_zip = target.parent / f"{scan_id}.zip"
        tmp_zip.write_bytes(zip_bytes)

        try:
            with zipfile.ZipFile(tmp_zip) as zf:
                # Guard against zip-slip path traversal before extracting
                for member in zf.namelist():
                    member_path = (target / member).resolve()
                    if not str(member_path).startswith(str(target.resolve())):
                        raise RepositoryServiceError("ZIP contains unsafe file paths.")
                zf.extractall(target)
        except zipfile.BadZipFile as exc:
            raise RepositoryServiceError("Uploaded file is not a valid ZIP archive.") from exc
        finally:
            tmp_zip.unlink(missing_ok=True)

        self._enforce_size_limit(target)
        return target

    def prepare_demo_repo(self, scan_id: str, demo_id: str) -> Path:
        if demo_id not in VALID_DEMO_IDS:
            raise RepositoryServiceError(f"Unknown demo repository: {demo_id}")

        source = DEMO_REPOS_DIR / demo_id
        if not source.exists():
            raise RepositoryServiceError(f"Demo fixture missing on disk: {demo_id}")

        target = self._new_workspace(scan_id)
        shutil.copytree(source, target, dirs_exist_ok=True)
        return target

    def _enforce_size_limit(self, path: Path) -> None:
        total_bytes = sum(f.stat().st_size for f in path.rglob("*") if f.is_file())
        max_bytes = settings.MAX_REPO_SIZE_MB * 1024 * 1024
        if total_bytes > max_bytes:
            shutil.rmtree(path, ignore_errors=True)
            raise RepositoryServiceError(
                f"Repository is {total_bytes // (1024*1024)}MB, which exceeds the "
                f"{settings.MAX_REPO_SIZE_MB}MB limit for this hackathon build."
            )

    def analyze_structure(self, path: Path) -> tuple[StructureResult, list]:
        analyzer = RepoStructureAnalyzer(path, max_files=settings.MAX_FILES_SCANNED)
        result = analyzer.analyze()
        return result, analyzer.last_entries

    def cleanup(self, path: Path) -> None:
        shutil.rmtree(path, ignore_errors=True)


def new_scan_id() -> str:
    return str(uuid.uuid4())
