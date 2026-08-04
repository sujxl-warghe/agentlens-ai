import Link from "next/link";
import { Activity } from "lucide-react";
import { GithubMark } from "@/components/shared/icons";
import { Button } from "@/components/ui/button";
import { GITHUB_REPO_URL, NAV_LINKS, SITE_NAME } from "@/lib/constants";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary-muted text-primary">
            <Activity className="h-4 w-4" strokeWidth={2.5} />
          </span>
          <span className="font-display text-[15px] font-semibold tracking-tight">
            {SITE_NAME}
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
            <a href={GITHUB_REPO_URL} target="_blank" rel="noreferrer">
              <GithubMark />
              GitHub
            </a>
          </Button>
          <Button size="sm" asChild>
            <Link href="/sign-in">Analyze repository</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
