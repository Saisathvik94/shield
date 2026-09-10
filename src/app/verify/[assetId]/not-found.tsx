import Link from "next/link";
import { ShieldAlert, Shield } from "lucide-react";

export default function AssetNotFound() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center p-6 text-center">
      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-violet-600 mb-6">
        <Shield className="w-4 h-4 text-white" strokeWidth={1.5} />
      </div>
      <ShieldAlert className="w-12 h-12 text-red-400 mx-auto mb-4" />
      <h1 className="text-xl font-semibold text-white mb-2">Asset not found</h1>
      <p className="text-sm text-gray-400 max-w-sm">
        No SHIELD asset was found with this ID. The QR code may be invalid, or the
        asset may have been removed from the registry.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex items-center gap-2 text-sm text-blue-400 hover:underline"
      >
        Go to SHIELD
      </Link>
    </div>
  );
}
