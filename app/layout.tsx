import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = { title: { default: "Rumah Jahit Siju", template: "%s | Rumah Jahit Siju" }, description: "Belajar menjahit dari nol dalam kelompok kecil di Pamulang." };
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="id" className={inter.variable}><body><a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-white focus:p-3">Lewati ke konten</a>{children}<Toaster richColors position="top-center"/></body></html>}
