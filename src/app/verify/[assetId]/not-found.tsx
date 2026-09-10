import Link from "next/link";
import { ShieldAlert, Shield } from "lucide-react";

export default function AssetNotFound() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#090a10] text-slate-900 dark:text-slate-100 flex flex-col items-center justify-center p-6 text-center transition-colors">
      <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-blue-600 shadow-md shadow-blue-500/25 mb-6">
        <Shield className="w-4 h-4 text-white" strokeWidth={2} />
      </div>
      <ShieldAlert className="w-12 h-12 text-rose-500 dark:text-rose-400 mx-auto mb-4" />
      <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Asset Not Found</h1>
      <p className="text-xs text-slate-600 dark:text-slate-400 max-w-sm leading-relaxed">
        No SHIELD asset was found with this ID. The QR code may be invalid, or the
        asset may have been removed from the registry.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex items-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
      >
        Return to SHIELD Home
      </Link>
    </div>
  );
}
