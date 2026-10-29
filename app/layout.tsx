import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./output.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "いったんビジョン",
  description: "消滅タイマー付きアイデアメモ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-100 text-slate-900 min-h-screen flex justify-center`}>
        <div className="w-full max-w-md bg-white min-h-screen flex flex-col shadow-xl relative overflow-hidden">
          {children}
        </div>
      </body>
    </html>
  );
}