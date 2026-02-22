import type { ButtonHTMLAttributes, Ref } from "react";
import { cn } from "@/lib/utils";

const variants = {
  default: "bg-blue-500 text-white hover:bg-blue-600",
  success: "bg-green-500 text-white hover:bg-green-600",
  danger: "bg-red-500 text-white hover:bg-red-600",
  ghost: "bg-surface-elevated border border-border text-neutral-300 hover:bg-white/10",
  accent: "bg-sky-300/10 border border-sky-300/40 text-sky-300 hover:bg-sky-300/20",
} as const;

const sizes = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-5 py-2.5 text-sm",
  lg: "px-6 py-3 text-base",
} as const;

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  ref?: Ref<HTMLButtonElement>;
}

export const Button = ({
  className,
  variant = "default",
  size = "md",
  ref,
  ...props
}: ButtonProps) => {
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center border-none cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-default",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
};
