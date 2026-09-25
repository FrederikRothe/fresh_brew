import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Github } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { REPO_URL } from "@/lib/constants";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Coffee Freshness Tracker",
  description: "Know exactly how fresh the office coffee is and track daily consumption.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Extend under the notch / home indicator; pages pad with env(safe-area-inset-*).
  viewportFit: "cover",
};

const themeInitScript = `try{if(localStorage.getItem("theme")==="light"){var c=document.documentElement.classList;c.remove("dark");c.add("light")}}catch(e){}`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Dark by default; the inline script swaps to light before first paint if the user chose it.
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className={inter.className}>
        {/* The dashboard renders its own inline theme/GitHub controls, so hide the floating ones there. */}
        <ThemeToggle className="with-dashboard:hidden" />
        {children}
        <a
          href={REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="with-dashboard:hidden fixed z-40 inline-flex items-center justify-center w-11 h-11 rounded-full bottom-[max(1rem,env(safe-area-inset-bottom))] right-[max(1rem,env(safe-area-inset-right))] bg-white/90 dark:bg-slate-800/90 backdrop-blur-md shadow-lg ring-1 ring-slate-300 dark:ring-slate-600 text-slate-800 dark:text-slate-100 hover:bg-white dark:hover:bg-slate-700"
          aria-label="GitHub Repository"
        >
          <Github className="w-5 h-5" aria-hidden />
        </a>
      </body>
    </html>
  );
}
