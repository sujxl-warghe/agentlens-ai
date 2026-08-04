import NextAuth, { type DefaultSession } from "next-auth";
import GitHub from "next-auth/providers/github";
import Credentials from "next-auth/providers/credentials";
import { randomUUID } from "crypto";
import { GUEST_SCAN_LIMIT } from "@/lib/constants";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "github" | "guest";
      scanLimit: number | null;
    } & DefaultSession["user"];
    /** The user's own GitHub OAuth token, with 'repo' write scope.
     * Only present for GitHub sign-ins. Sent directly to our backend
     * for the Pull Request creation call — never stored server-side
     * beyond this session, and never used for anything else. */
    githubAccessToken?: string;
  }

  interface User {
    role?: "github" | "guest";
  }
}

type AppToken = {
  role?: "github" | "guest";
  scanLimit?: number | null;
  uid?: string;
  githubAccessToken?: string;
  [key: string]: unknown;
};

/**
 * Two identity paths, both first-class:
 *  - GitHub OAuth: full account, unlimited scans, and — with 'repo' scope —
 *    the ability to open a real Pull Request with Paritok optimizations.
 *    The 'repo' scope is requested upfront at sign-in rather than via a
 *    second step-up consent flow (simpler, and disclosed clearly on the
 *    sign-in screen) — it's only ever used for the explicit "Create Pull
 *    Request" action the user triggers themselves.
 *  - Guest: a signed, server-issued session with an enforced scanLimit claim.
 *    Enforcement happens server-side (Phase 2 scan route reads this claim),
 *    not just hidden client-side, so it can't be bypassed by disabling a button.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    GitHub({
      clientId: process.env.GITHUB_ID,
      clientSecret: process.env.GITHUB_SECRET,
      authorization: { params: { scope: "read:user user:email repo" } },
    }),
    Credentials({
      id: "guest",
      name: "Guest",
      credentials: {},
      async authorize() {
        // No real credential check — a guest session is intentionally
        // anonymous, but still gets a stable id for rate-limiting.
        return {
          id: `guest_${randomUUID()}`,
          name: "Guest",
          email: null,
          role: "guest" as const,
        };
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/sign-in",
  },
  callbacks: {
    async jwt({ token, user, account }) {
      const t = token as AppToken;
      if (user) {
        t.role = (user as { role?: "github" | "guest" }).role ?? "github";
        t.scanLimit = t.role === "guest" ? GUEST_SCAN_LIMIT : null;
        t.uid = user.id;
      }
      // account is only present on the initial sign-in request, not on
      // subsequent token refreshes — this is the one moment we see the
      // real GitHub access_token.
      if (account?.provider === "github" && account.access_token) {
        t.githubAccessToken = account.access_token;
      }
      return t;
    },
    async session({ session, token }) {
      const t = token as AppToken;
      session.user.role = t.role ?? "github";
      session.user.scanLimit = t.scanLimit ?? null;
      session.user.id = t.uid ?? (t.sub as string | undefined) ?? "anonymous";
      if (t.githubAccessToken) {
        session.githubAccessToken = t.githubAccessToken;
      }
      return session;
    },
  },
});
