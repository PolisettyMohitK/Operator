import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[28px] border border-[color:var(--border)] bg-[color:var(--surface)] shadow-[0_20px_60px_-45px_var(--shadow-color)] backdrop-blur",
        className,
      )}
      {...props}
    />
  );
}
