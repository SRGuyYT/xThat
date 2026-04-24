"use client";

import { Laptop, MoonStar, SunMedium } from "lucide-react";
import { useTheme } from "next-themes";

const options = [
  { value: "dark", label: "Dark", icon: MoonStar },
  { value: "light", label: "Light", icon: SunMedium },
  { value: "system", label: "System", icon: Laptop },
] as const;

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 p-1">
      {options.map((option) => {
        const Icon = option.icon;
        const active = theme === option.value;

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => setTheme(option.value)}
            className={`rounded-full px-3 py-2 text-xs transition ${
              active ? "bg-white/15 text-white" : "text-slate-300 hover:bg-white/10"
            }`}
          >
            <span className="flex items-center gap-2">
              <Icon className="size-3.5" />
              {option.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
