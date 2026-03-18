import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Github } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Coffee Freshness Tracker",
  description: "Know exactly how fresh the office coffee is and track daily consumption.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ThemeToggle />
        {children}
        <a
          href="https://github.com/FrederikRothe/fresh_brew"
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-4 right-4 text-gray-400 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-400 opacity-50 hover:opacity-100"
          aria-label="GitHub Repository"
        >
          <Github size={16} />
        </a>
      </body>
    </html>
  );
}
