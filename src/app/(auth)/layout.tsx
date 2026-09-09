import type { Metadata } from "next";

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
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
      {children}
    </div>
  );
}
