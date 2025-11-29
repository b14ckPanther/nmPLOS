"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useCommandState } from "cmdk";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import {
  LayoutDashboard,
  Calendar,
  CheckSquare,
  BookOpen,
  FolderKanban,
  GraduationCap,
  Wallet,
  Mail,
  Bot,
  Settings,
} from "lucide-react";

const commands = [
  {
    group: "Navigation",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/schedule", label: "Schedule", icon: Calendar },
      { href: "/tasks", label: "Tasks", icon: CheckSquare },
      { href: "/courses", label: "Courses", icon: BookOpen },
      { href: "/projects", label: "Projects", icon: FolderKanban },
      { href: "/exams", label: "Exams", icon: GraduationCap },
      { href: "/finance", label: "Finance", icon: Wallet },
      { href: "/gmail", label: "Gmail", icon: Mail },
      { href: "/assistant", label: "AI Assistant", icon: Bot },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

export function CommandPalette() {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const runCommand = React.useCallback((command: () => void) => {
    setOpen(false);
    command();
  }, []);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        {commands.map((group) => (
          <CommandGroup key={group.group} heading={group.group}>
            {group.items.map((item) => {
              const Icon = item.icon;
              return (
                <CommandItem
                  key={item.href}
                  onSelect={() => {
                    runCommand(() => router.push(item.href));
                  }}
                >
                  <Icon className="mr-2 h-4 w-4" />
                  <span>{item.label}</span>
                  <CommandShortcut>⌘K</CommandShortcut>
                </CommandItem>
              );
            })}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
}

