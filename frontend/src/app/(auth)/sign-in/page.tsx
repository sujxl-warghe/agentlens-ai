"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Activity, User } from "lucide-react";
import { GithubMark } from "@/components/shared/icons";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { SITE_NAME } from "@/lib/constants";

function SignInContent() {
  const params = useSearchParams();
  const isGuestIntent = params.get("guest") === "1";
  const demoId = params.get("demo");

  const callbackUrl = demoId ? `/dashboard?demo=${demoId}` : "/dashboard";

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-muted text-primary">
            <Activity className="h-5 w-5" strokeWidth={2.5} />
          </span>
          <CardTitle className="mt-4">Sign in to {SITE_NAME}</CardTitle>
          <CardDescription>
            {isGuestIntent
              ? "Continue as a guest to run a limited demo scan, or connect GitHub for full access."
              : "Connect GitHub to analyze your own repositories."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Button
            size="lg"
            className="w-full"
            onClick={() => signIn("github", { callbackUrl })}
          >
            <GithubMark />
            Continue with GitHub
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="w-full"
            onClick={() => signIn("guest", { callbackUrl, redirect: true })}
          >
            <User className="h-4 w-4" />
            Continue as guest
          </Button>
          <p className="mono-tag mt-2 text-center text-[11px] text-subtle-foreground">
            GUEST MODE · 3 SCANS · DEMO REPOSITORIES ONLY
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <SignInContent />
    </Suspense>
  );
}
