"use client";

import { useEffect, useState } from "react";
import { Copy, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";

export function TemporaryCredentials({ username }: { username: string }) {
  const [password, setPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const stored = sessionStorage.getItem("jsc-temporary-password");
      if (stored) {
        setPassword(stored);
        sessionStorage.removeItem("jsc-temporary-password");
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  if (!password) return null;
  async function copyCredentials() {
    await navigator.clipboard.writeText(`Username: ${username}\nPassword sementara: ${password}`);
    setCopied(true);
  }

  return <div className="mt-6 rounded-2xl border border-warning/30 bg-warning/5 p-5 text-left">
    <div className="flex items-start gap-3"><KeyRound className="mt-0.5 size-5 shrink-0 text-warning" /><div><h2 className="font-bold">Simpan akses akunmu sekarang</h2><p className="mt-1 text-xs leading-5 text-muted">Password sementara ini hanya ditampilkan sekali. Segera masuk ke Profil &amp; keamanan untuk menggantinya.</p></div></div>
    <dl className="mt-4 grid gap-3 rounded-xl bg-white p-4 text-sm sm:grid-cols-2"><div><dt className="text-xs text-muted">Username</dt><dd className="mt-1 break-all font-mono font-bold">{username}</dd></div><div><dt className="text-xs text-muted">Password sementara</dt><dd className="mt-1 break-all font-mono font-bold">{password}</dd></div></dl>
    <Button type="button" variant="secondary" size="sm" className="mt-3 w-full sm:w-auto" onClick={copyCredentials}><Copy className="mr-2 size-4" />{copied ? "Sudah disalin" : "Salin username & password"}</Button>
  </div>;
}
