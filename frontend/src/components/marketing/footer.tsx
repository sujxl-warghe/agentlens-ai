import Link from "next/link";
import { Activity } from "lucide-react";
import { GithubMark } from "@/components/shared/icons";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/shared/reveal";
import { GITHUB_REPO_URL, SITE_NAME } from "@/lib/constants";

export function Footer() {
  return (
    <footer>
      <div className="mx-auto max-w-6xl px-6 py-24 text-center">
        <Reveal>
          <h2 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
            Find out what your agents are actually costing you.
          </h2>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button size="lg" asChild>
              <Link href="/sign-in">Analyze your repository</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/sign-in?guest=1">Try the guest demo</Link>
            </Button>
          </div>
        </Reveal>
      </div>

      <div className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary-muted text-primary">
              <Activity className="h-3.5 w-3.5" strokeWidth={2.5} />
            </span>
            <span className="font-display text-sm font-medium">{SITE_NAME}</span>
          </div>
          <p className="mono-tag text-xs text-subtle-foreground">
            BUILT FOR THE PARITOK TOKEN EFFICIENCY HACKATHON
          </p>
          <a
            href={GITHUB_REPO_URL}
            target="_blank"
            rel="noreferrer"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            <GithubMark />
          </a>
        </div>
      </div>
    </footer>
  );
}
