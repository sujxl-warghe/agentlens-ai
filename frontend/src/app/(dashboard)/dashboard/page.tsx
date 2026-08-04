import Link from "next/link";
import { Activity } from "lucide-react";
import { auth, signOut } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AnalyzeForm } from "./analyze-form";
import { api } from "@/lib/api";
import { SITE_NAME } from "@/lib/constants";

export default async function DashboardPage() {
  const session = await auth();
  const ownerId = session?.user?.id ?? "anonymous";
  const role = session?.user?.role ?? "github";

  const recentScans = await api.listScans(ownerId).catch(() => []);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary-muted text-primary">
              <Activity className="h-4 w-4" strokeWidth={2.5} />
            </span>
            <span className="font-display text-[15px] font-semibold tracking-tight">{SITE_NAME}</span>
          </Link>
          <div className="flex items-center gap-3">
            <Badge variant={role === "guest" ? "amber" : "teal"}>
              {role === "guest" ? "GUEST" : session?.user?.name ?? "GITHUB"}
            </Badge>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            >
              <Button type="submit" variant="ghost" size="sm">
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </header>

      <main className="px-6 py-16">
        <AnalyzeForm ownerId={ownerId} role={role} />

        {recentScans.length > 0 && (
          <div className="mx-auto mt-14 w-full max-w-3xl">
            <p className="mono-tag mb-3 text-xs text-muted-foreground">[RECENT SCANS]</p>
            <div className="flex flex-col divide-y divide-border rounded-xl border border-border bg-surface">
              {recentScans.map((scan) => (
                <Link
                  key={scan.id}
                  href={`/scan/${scan.id}`}
                  className="flex items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-surface-raised"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm text-foreground">{scan.source_ref}</p>
                    <p className="mono-tag text-[11px] text-subtle-foreground">
                      {new Date(scan.created_at).toLocaleString()}
                    </p>
                  </div>
                  <Badge
                    variant={
                      scan.status === "complete" ? "teal" : scan.status === "failed" ? "red" : "amber"
                    }
                  >
                    {scan.status}
                  </Badge>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
