"use client";

import { diffWordsWithSpace } from "diff";

export function DiffViewer({ before, after }: { before: string; after: string }) {
  const parts = diffWordsWithSpace(before, after);

  return (
    <div className="overflow-hidden rounded-md border border-border">
      <div className="border-b border-border bg-red-muted px-3 py-1.5">
        <span className="mono-tag text-[10px] text-red">− ORIGINAL</span>
      </div>
      <pre className="whitespace-pre-wrap bg-surface-raised p-3 text-[11px] leading-relaxed">
        {parts.map((part, i) =>
          part.added ? null : (
            <span key={i} className={part.removed ? "bg-red/20 text-red line-through" : "text-muted-foreground"}>
              {part.value}
            </span>
          ),
        )}
      </pre>

      <div className="border-y border-border bg-teal-muted px-3 py-1.5">
        <span className="mono-tag text-[10px] text-teal">+ COMPRESSED (PARITOK)</span>
      </div>
      <pre className="whitespace-pre-wrap bg-surface-raised p-3 text-[11px] leading-relaxed">
        {parts.map((part, i) =>
          part.removed ? null : (
            <span key={i} className={part.added ? "bg-teal/20 text-teal" : "text-foreground"}>
              {part.value}
            </span>
          ),
        )}
      </pre>
    </div>
  );
}
