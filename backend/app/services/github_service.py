import base64

import httpx

from app.core.logging import get_logger

logger = get_logger(__name__)

GITHUB_API_BASE = "https://api.github.com"


class GitHubServiceError(Exception):
    """Raised when a real GitHub API call fails — always carries the
    actual GitHub response detail, never a generic message."""


class GitHubService:
    """
    Thin wrapper around the real GitHub REST API for the branch → commit →
    PR flow. Every method here performs an actual HTTP call to
    api.github.com using the caller's own OAuth token — there is no
    simulated or mocked path. If the token lacks 'repo' write scope, or
    the user doesn't have push access, GitHub itself will reject the
    request and that real error is surfaced to the user.
    """

    def __init__(self, access_token: str):
        self.access_token = access_token

    def _headers(self) -> dict:
        return {
            "Authorization": f"Bearer {self.access_token}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
        }

    async def get_branch_sha(self, owner: str, repo: str, branch: str) -> str:
        async with httpx.AsyncClient(timeout=15) as client:
            res = await client.get(
                f"{GITHUB_API_BASE}/repos/{owner}/{repo}/git/refs/heads/{branch}",
                headers=self._headers(),
            )
        if res.status_code != 200:
            raise GitHubServiceError(
                f"Could not read branch '{branch}' on {owner}/{repo}: "
                f"{res.status_code} {res.json().get('message', res.text)}"
            )
        return res.json()["object"]["sha"]

    async def create_branch(self, owner: str, repo: str, new_branch: str, base_sha: str) -> None:
        async with httpx.AsyncClient(timeout=15) as client:
            res = await client.post(
                f"{GITHUB_API_BASE}/repos/{owner}/{repo}/git/refs",
                headers=self._headers(),
                json={"ref": f"refs/heads/{new_branch}", "sha": base_sha},
            )
        if res.status_code not in (200, 201):
            raise GitHubServiceError(
                f"Could not create branch '{new_branch}': "
                f"{res.status_code} {res.json().get('message', res.text)}"
            )

    async def get_file(self, owner: str, repo: str, path: str, ref: str) -> tuple[str, str]:
        """Returns (decoded_content, sha) for a file at a given ref — real,
        live content fetched at call time, never cached from the scan."""
        async with httpx.AsyncClient(timeout=15) as client:
            res = await client.get(
                f"{GITHUB_API_BASE}/repos/{owner}/{repo}/contents/{path}",
                headers=self._headers(),
                params={"ref": ref},
            )
        if res.status_code != 200:
            raise GitHubServiceError(
                f"Could not fetch '{path}' at {ref}: "
                f"{res.status_code} {res.json().get('message', res.text)}"
            )
        data = res.json()
        content = base64.b64decode(data["content"]).decode("utf-8", errors="replace")
        return content, data["sha"]

    async def update_file(
        self, owner: str, repo: str, path: str, content: str, message: str, branch: str, sha: str
    ) -> None:
        encoded = base64.b64encode(content.encode("utf-8")).decode("ascii")
        async with httpx.AsyncClient(timeout=15) as client:
            res = await client.put(
                f"{GITHUB_API_BASE}/repos/{owner}/{repo}/contents/{path}",
                headers=self._headers(),
                json={"message": message, "content": encoded, "branch": branch, "sha": sha},
            )
        if res.status_code not in (200, 201):
            raise GitHubServiceError(
                f"Could not update '{path}': "
                f"{res.status_code} {res.json().get('message', res.text)}"
            )

    async def create_pull_request(
        self, owner: str, repo: str, title: str, body: str, head: str, base: str
    ) -> dict:
        async with httpx.AsyncClient(timeout=15) as client:
            res = await client.post(
                f"{GITHUB_API_BASE}/repos/{owner}/{repo}/pulls",
                headers=self._headers(),
                json={"title": title, "body": body, "head": head, "base": base},
            )
        if res.status_code not in (200, 201):
            raise GitHubServiceError(
                f"Could not open pull request: "
                f"{res.status_code} {res.json().get('message', res.text)}"
            )
        return res.json()

    async def add_labels(self, owner: str, repo: str, pr_number: int, labels: list[str]) -> None:
        """Best-effort — labels that don't already exist on the repo cause
        GitHub to reject the whole call, so a failure here is logged and
        swallowed rather than blocking a successful PR creation."""
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                res = await client.post(
                    f"{GITHUB_API_BASE}/repos/{owner}/{repo}/issues/{pr_number}/labels",
                    headers=self._headers(),
                    json={"labels": labels},
                )
            if res.status_code not in (200, 201):
                logger.info("Label assignment skipped (non-blocking): %s", res.text[:200])
        except httpx.HTTPError as exc:
            logger.info("Label assignment skipped (non-blocking): %s", exc)
