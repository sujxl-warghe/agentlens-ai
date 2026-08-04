import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "mono-tag inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-medium uppercase",
  {
    variants: {
      variant: {
        default: "border-border-strong bg-surface-raised text-muted-foreground",
        primary: "border-primary/30 bg-primary-muted text-primary",
        teal: "border-teal/30 bg-teal-muted text-teal",
        amber: "border-amber/30 bg-amber-muted text-amber",
        red: "border-red/30 bg-red-muted text-red",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
