import type React from "react";
import { cn } from "@/lib/utils";

interface GlowCardProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: string;
}

export function GlowCard({ children, className }: GlowCardProps) {
  return (
    <div className={cn("relative overflow-hidden rounded-xl border border-[#282e38] bg-[#12161d] p-6 shadow-[0_16px_44px_-34px_rgba(0,0,0,.95)]", className)}>
      {children}
    </div>
  );
}
