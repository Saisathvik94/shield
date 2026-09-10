import type { Metadata } from "next";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export const metadata: Metadata = {
  title: "SHIELD - Secure Identity & Access Platform",
  description:
    "Blockchain-based identity, access control and digital asset management.",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#090a10] text-slate-900 dark:text-slate-100 flex flex-col items-center justify-center p-4 relative">
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
        <ThemeToggle />
      </div>
      {children}
    </div>
  );
}
