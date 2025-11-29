import { Sidebar } from "@/components/sidebar";
import { CommandPalette } from "@/components/command-palette";
import { AuthGuard } from "@/components/auth-guard";
import { ThemeToggle } from "@/components/theme-toggle";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 lg:ml-0">
          <div className="sticky top-0 z-40 flex h-16 items-center justify-end gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 lg:px-6">
            <ThemeToggle />
          </div>
          <div className="p-4 lg:p-6">{children}</div>
        </main>
      </div>
      <CommandPalette />
    </AuthGuard>
  );
}

