import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Reveal } from "@/components/shared/reveal";
import { DEMO_REPOSITORIES } from "@/lib/constants";

function scoreVariant(score: number): "teal" | "amber" | "red" {
  if (score >= 75) return "teal";
  if (score >= 55) return "amber";
  return "red";
}

export function Demo() {
  return (
    <section id="demo" className="border-b border-border py-24">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div className="max-w-xl">
            <span className="mono-tag text-xs text-primary">[DEMO MODE]</span>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight md:text-4xl">
              No repository? Run a diagnosis on ours.
            </h2>
            <p className="mt-4 text-muted-foreground">
              Three pre-loaded agent repositories, each with real, seeded
              inefficiencies, so you can see the full loop in under a minute.
            </p>
          </div>
        </Reveal>

        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {DEMO_REPOSITORIES.map((repo, i) => (
            <Reveal key={repo.id} delay={i * 80}>
              <Link href={`/sign-in?guest=1&demo=${repo.id}`}>
                <Card interactive className="group h-full">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <Badge>{repo.framework}</Badge>
                      <ArrowUpRight className="h-4 w-4 text-subtle-foreground transition-all duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary" />
                    </div>
                    <CardTitle className="mt-4">{repo.name}</CardTitle>
                    <CardDescription>{repo.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex items-center justify-between border-t border-border pt-4">
                    <span className="mono-tag text-xs text-subtle-foreground">
                      {repo.agents} agents detected
                    </span>
                    <Badge variant={scoreVariant(repo.healthScore)}>
                      HEALTH {repo.healthScore}
                    </Badge>
                  </CardContent>
                </Card>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
