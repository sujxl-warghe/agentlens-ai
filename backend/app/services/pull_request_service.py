import re
from dataclasses import dataclass

from app.core.logging import get_logger
from app.services.github_service import GitHubService, GitHubServiceError

logger = get_logger(__name__)


@dataclass
class PullRequestPlanItem:
    file: str
    variable_name: str
    original_text: str
    compressed_text: str
    original_tokens: int
    compressed_tokens: int


@dataclass
class PullRequestOutcome:
    pr_url: str
    pr_number: int
    branch: str
    files_changed: list[str]
    skipped_files: list[str]  # files where original_text no longer matched live content


class PullRequestService:
    """
    Performs the real GitHub workflow: create branch -> update each
    accepted file (mechanical replacement of the exact original prompt
    text with Paritok's already-computed compressed text) -> open PR.

    Only ever applies the literal original_text -> compressed_text swap
    that Paritok already computed during the scan — never generates new
    code. If a file has changed on GitHub since the scan ran (the fetched
    live content no longer contains original_text verbatim), that file is
    skipped rather than risking a corrupted commit, and reported back to
    the user as skipped.
    """

    def __init__(self, access_token: str):
        self.github = GitHubService(access_token)

    async def create_optimization_pr(
        self,
        owner: str,
        repo: str,
        base_branch: str,
        items: list[PullRequestPlanItem],
        health_score: int | None,
        framework: str | None,
        overall_compression_pct: float,
        total_savings_tokens: int,
        scan_id: str,
    ) -> PullRequestOutcome:
        if not items:
            raise GitHubServiceError("No accepted optimizations to apply.")

        branch_name = f"agentlens/paritok-optimization-{scan_id[:8]}"

        base_sha = await self.github.get_branch_sha(owner, repo, base_branch)
        await self.github.create_branch(owner, repo, branch_name, base_sha)

        files_changed: list[str] = []
        skipped_files: list[str] = []

        by_file: dict[str, list[PullRequestPlanItem]] = {}
        for item in items:
            by_file.setdefault(item.file, []).append(item)

        for file_path, file_items in by_file.items():
            try:
                live_content, sha = await self.github.get_file(owner, repo, file_path, branch_name)
            except GitHubServiceError as exc:
                logger.warning("Skipping %s: %s", file_path, exc)
                skipped_files.append(file_path)
                continue

            new_content = live_content
            applied_any = False
            for item in file_items:
                if item.original_text in new_content:
                    new_content = new_content.replace(item.original_text, item.compressed_text, 1)
                    applied_any = True
                else:
                    logger.warning(
                        "Skipping %s (%s): original text no longer matches live file",
                        file_path, item.variable_name,
                    )

            if not applied_any:
                skipped_files.append(file_path)
                continue

            savings = sum(i.original_tokens - i.compressed_tokens for i in file_items)
            var_names = ", ".join(i.variable_name for i in file_items)
            commit_message = f"perf: compress {var_names} via Paritok (-{savings} tokens)"

            await self.github.update_file(
                owner, repo, file_path, new_content, commit_message, branch_name, sha
            )
            files_changed.append(file_path)

        if not files_changed:
            raise GitHubServiceError(
                "None of the accepted changes could be applied — the files may have "
                "changed on GitHub since this scan ran. Try re-analyzing the repository."
            )

        title = f"Reduce token usage by {overall_compression_pct:.0f}% using AgentLens + Paritok"
        body = self._build_pr_body(
            framework, health_score, files_changed, skipped_files,
            overall_compression_pct, total_savings_tokens,
        )

        pr = await self.github.create_pull_request(owner, repo, title, body, branch_name, base_branch)

        await self.github.add_labels(
            owner, repo, pr["number"], ["performance", "optimization", "token-efficiency", "paritok"]
        )

        return PullRequestOutcome(
            pr_url=pr["html_url"],
            pr_number=pr["number"],
            branch=branch_name,
            files_changed=files_changed,
            skipped_files=skipped_files,
        )

    @staticmethod
    def _build_pr_body(
        framework: str | None,
        health_score: int | None,
        files_changed: list[str],
        skipped_files: list[str],
        overall_compression_pct: float,
        total_savings_tokens: int,
    ) -> str:
        lines = [
            "## Overview",
            "",
            "This pull request was generated by **AgentLens AI** using the **Paritok** "
            "compression engine. It replaces the exact prompt text flagged by the AI Doctor "
            "with Paritok's compressed version — no other code was changed.",
            "",
            "## Repository Analysis",
            "",
            f"- Detected framework: {framework or 'Not detected'}",
            f"- Health score at time of scan: {health_score if health_score is not None else 'N/A'}/100",
            "",
            "## Optimization Summary",
            "",
            f"- Overall compression: **{overall_compression_pct:.1f}%**",
            f"- Estimated token savings: **{total_savings_tokens:,} tokens**",
            "",
            "## Files Modified",
            "",
        ]
        lines += [f"- `{f}`" for f in files_changed]

        if skipped_files:
            lines += [
                "",
                "## Skipped",
                "",
                "These files changed on GitHub since the scan ran, so they were left untouched:",
                "",
            ]
            lines += [f"- `{f}`" for f in skipped_files]

        lines += [
            "",
            "## Testing Notes",
            "",
            "This change only replaces prompt string content — no control flow, imports, "
            "or function signatures were modified. Review the diff and run your existing "
            "test suite before merging.",
            "",
            "---",
            "_Generated by AgentLens AI — Paritok Token Efficiency Hackathon_",
        ]
        return "\n".join(lines)


def parse_github_url(repo_url: str) -> tuple[str, str]:
    match = re.match(r"^https?://github\.com/([^/\s]+)/([^/\s]+?)(?:\.git)?/?$", repo_url.strip())
    if not match:
        raise GitHubServiceError(f"'{repo_url}' is not a GitHub repository URL.")
    return match.group(1), match.group(2)
