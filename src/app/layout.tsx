import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { WalletProvider } from "@/lib/wallet/wallet-context";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SHIELD - Secure Identity & Asset Platform",
  description:
    "Blockchain-based identity, access control and digital asset management for enterprises.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-[#0a0a0f] text-gray-100">
        <WalletProvider>
          {children}
          <Toaster
            position="top-right"
            theme="dark"
            toastOptions={{
              style: {
                background: "#1a1a24",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "#f1f1f3",
              },
            }}
          />
        </WalletProvider>
      </body>
    </html>
  );
}
