"use client";

import type React from "react";
import { cn } from "@/lib/utils";

interface NeonButtonProps {
  children: React.ReactNode;
  className?: string;
  variant?: "primary" | "secondary" | "outline";
  size?: "sm" | "md" | "lg";
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
}

export function NeonButton({ children, className, variant = "primary", size = "md", onClick, disabled, type = "button" }: NeonButtonProps) {
  const variants = {
    primary: "border border-[#5d86ed] bg-[#4f73d9] text-white hover:border-[#7195ed] hover:bg-[#5a7ee0]",
    secondary: "border border-[#303744] bg-[#1a2029] text-white hover:border-[#414b5c] hover:bg-[#202732]",
    outline: "border border-[#303744] bg-transparent text-slate-200 hover:border-[#4a5568] hover:bg-white/[0.035] hover:text-white",
  };
  const sizes = {
    sm: "min-h-9 px-4 py-2 text-sm",
    md: "min-h-11 px-5 py-2.5 text-sm",
    lg: "min-h-12 px-6 py-3 text-base",
  };

  return (
    <button type={type} onClick={onClick} disabled={disabled} className={cn("inline-flex items-center justify-center rounded-lg font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5d86ed]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0e13] disabled:cursor-not-allowed disabled:opacity-50", variants[variant], sizes[size], className)}>
      {children}
    </button>
  );
}
