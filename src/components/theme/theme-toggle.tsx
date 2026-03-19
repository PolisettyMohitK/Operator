"use client";

import { LaptopMinimal, MoonStar, SunMedium } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import { resolveThemePreference } from "@/lib/theme/preferences";
import { cn } from "@/lib/utils";

const themeOptions = [
  { value: "light", label: "Light", icon: SunMedium },
  { value: "dark", label: "Dark", icon: MoonStar },
  { value: "system", label: "System", icon: LaptopMinimal },
] as const;

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const activeTheme = resolveThemePreference(theme);

  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-[color:var(--border-strong)] bg-[color:var(--surface-elevated)] p-1 shadow-[0_10px_30px_-24px_var(--shadow-color)]">
      {themeOptions.map((option) => {
        const Icon = option.icon;
        const isActive = activeTheme === option.value;

        return (
          <Button
            key={option.value}
            aria-pressed={isActive}
            className={cn(
              "h-9 rounded-full px-3 shadow-none",
              !isActive &&
                "bg-transparent text-[color:var(--muted-foreground)] hover:bg-[color:var(--surface-muted)] hover:text-[color:var(--foreground)]",
            )}
            onClick={() => setTheme(option.value)}
            size="sm"
            type="button"
            variant={isActive ? "primary" : "ghost"}
          >
            <Icon className="size-4" />
            <span className="hidden sm:inline">{option.label}</span>
          </Button>
        );
      })}
    </div>
  );
}
