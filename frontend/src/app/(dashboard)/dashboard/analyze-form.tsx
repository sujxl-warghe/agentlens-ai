"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { GitBranch, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api, ApiError } from "@/lib/api";
import { DEMO_REPOSITORIES } from "@/lib/constants";

export function AnalyzeForm({ ownerId, role }: { ownerId: string; role: "github" | "guest" }) {
  const router = useRouter();
  const [repoUrl, setRepoUrl] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleUrlSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!repoUrl.trim()) return;
    setError(null);
    setLoading("url");
    try {
      const scan = await api.createScanFromUrl(repoUrl.trim(), ownerId);
      router.push(`/scan/${scan.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to start scan. Is the backend running?");
      setLoading(null);
    }
  }

  async function handleDemoClick(demoId: string) {
    setError(null);
    setLoading(demoId);
    try {
      const scan = await api.createScanFromDemo(demoId, ownerId);
      router.push(`/scan/${scan.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to start demo scan.");
      setLoading(null);
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setLoading("upload");
    try {
      const scan = await api.createScanFromUpload(file, ownerId);
      router.push(`/scan/${scan.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to upload archive.");
      setLoading(null);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl">
      <Card>
        <CardHeader>
          <span className="mono-tag text-xs text-primary">[ANALYZE]</span>
          <CardTitle className="mt-2 text-2xl">Point AgentLens at a repository</CardTitle>
          <CardDescription>
            Public GitHub URL, a ZIP upload, or one of the demo repositories below.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <form onSubmit={handleUrlSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <GitBranch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle-foreground" />
              <input
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="https://github.com/owner/repo"
                suppressHydrationWarning
                className="h-11 w-full rounded-md border border-border-strong bg-surface-raised pl-9 pr-3 text-sm text-foreground placeholder:text-subtle-foreground focus:border-primary/50 focus:outline-none"
              />
            </div>
            <Button type="submit" disabled={loading !== null || !repoUrl.trim()}>
              {loading === "url" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Analyze"}
            </Button>
          </form>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="mono-tag text-[10px] text-subtle-foreground">OR</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".zip"
            onChange={handleFileChange}
            className="hidden"
          />
          <Button
            variant="outline"
            className="w-full"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading !== null}
          >
            {loading === "upload" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            Upload a .zip archive
          </Button>

          {error && (
            <p className="rounded-md border border-red/30 bg-red-muted px-3 py-2 text-sm text-red">
              {error}
            </p>
          )}

          {role === "guest" && (
            <p className="mono-tag text-center text-[11px] text-subtle-foreground">
              GUEST MODE · SCANS ARE LIMITED · SIGN IN WITH GITHUB FOR UNLIMITED ACCESS
            </p>
          )}
        </CardContent>
      </Card>

      <div className="mt-8">
        <p className="mono-tag mb-3 text-xs text-muted-foreground">[NO REPOSITORY? RUN A DEMO]</p>
        <div className="grid gap-3 sm:grid-cols-3">
          {DEMO_REPOSITORIES.map((repo) => (
            <button
              key={repo.id}
              onClick={() => handleDemoClick(repo.id)}
              disabled={loading !== null}
              className="group flex flex-col items-start gap-2 rounded-xl border border-border bg-surface p-4 text-left transition-colors hover:border-primary/40 disabled:opacity-50"
            >
              <div className="flex w-full items-center justify-between">
                <Badge>{repo.framework}</Badge>
                {loading === repo.id && <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />}
              </div>
              <p className="font-display text-sm font-semibold">{repo.name}</p>
              <p className="line-clamp-2 text-xs text-muted-foreground">{repo.description}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
