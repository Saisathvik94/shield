import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "success" | "warning" | "danger" | "info" | "purple";
}

const variantStyles = {
  default: "bg-white/[0.06] text-gray-300 border-white/[0.08]",
  success: "bg-green-500/10 text-green-400 border-green-500/20",
  warning: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  danger:  "bg-red-500/10 text-red-400 border-red-500/20",
  info:    "bg-blue-500/10 text-blue-400 border-blue-500/20",
  purple:  "bg-purple-500/10 text-purple-400 border-purple-500/20",
};

export function Badge({ children, className, variant = "default" }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border",
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
