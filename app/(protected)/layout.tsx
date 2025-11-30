"use client";

import { SidebarV2 as Sidebar } from "@/components/sidebar-v2";
import { CommandPalette } from "@/components/command-palette";
import { AuthGuard } from "@/components/auth-guard";
import { ThemeToggle } from "@/components/theme-toggle";
import { QuranFloatingPlayer } from "@/components/quran-floating-player";
import { motion } from "framer-motion";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <div className="relative flex min-h-screen overflow-hidden">
        {/* Animated Background */}
        <div className="fixed inset-0 bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 dark:from-slate-950 dark:via-blue-950 dark:to-purple-950 animate-gradient-shift -z-10" />
        <div className="fixed inset-0 bg-[url('/grid.svg')] opacity-[0.02] dark:opacity-[0.05] -z-10" />
        
        {/* Floating Orbs */}
        <div className="fixed top-20 left-20 w-96 h-96 bg-blue-400/20 dark:bg-blue-500/10 rounded-full mix-blend-multiply filter blur-3xl opacity-40 dark:opacity-20 animate-blob -z-10" />
        <div className="fixed top-40 right-20 w-96 h-96 bg-purple-400/20 dark:bg-purple-500/10 rounded-full mix-blend-multiply filter blur-3xl opacity-40 dark:opacity-20 animate-blob animation-delay-2000 -z-10" />
        <div className="fixed -bottom-20 left-1/2 w-96 h-96 bg-cyan-400/20 dark:bg-cyan-500/10 rounded-full mix-blend-multiply filter blur-3xl opacity-40 dark:opacity-20 animate-blob animation-delay-4000 -z-10" />

        <Sidebar />
        <main className="flex-1 lg:ml-0 relative z-0">
          <div className="sticky top-0 z-40 flex h-16 items-center justify-end gap-4 border-b border-white/10 dark:border-white/5 bg-white/80 dark:bg-black/80 backdrop-blur-xl supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-black/60 px-4 lg:px-6">
            <ThemeToggle />
          </div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="p-4 lg:p-6"
          >
            {children}
          </motion.div>
        </main>
      </div>
      <CommandPalette />
      <QuranFloatingPlayer />
    </AuthGuard>
  );
}

