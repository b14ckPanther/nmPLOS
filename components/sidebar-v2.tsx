"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Calendar,
  CheckSquare,
  BookOpen,
  FolderKanban,
  GraduationCap,
  Wallet,
  Bot,
  Settings,
  Menu,
  X,
  Award,
  Briefcase,
  ChevronDown,
  ChevronRight,
  Plus,
  GripVertical,
  Moon,
  Dumbbell,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/firebase/client";
import { getSidebarPreferences, saveSidebarPreferences } from "@/lib/sidebar-helpers";
import type { SidebarCategory, NavItem } from "@/firebase/types";
import * as LucideIcons from "lucide-react";

// Icon mapping for dynamic icon rendering
const iconMap: Record<string, any> = {
  LayoutDashboard,
  Calendar,
  CheckSquare,
  BookOpen,
  FolderKanban,
  GraduationCap,
  Wallet,
  Bot,
  Settings,
  Award,
  Briefcase,
  Moon,
  Dumbbell,
};

// Default categories structure
const defaultCategories: SidebarCategory[] = [
  {
    id: "general",
    name: "General",
    items: [
      { href: "/dashboard", label: "Dashboard", iconName: "LayoutDashboard" },
      { href: "/schedule", label: "Schedule", iconName: "Calendar" },
      { href: "/tasks", label: "Tasks", iconName: "CheckSquare" },
    ],
    order: 0,
    collapsed: false,
  },
  {
    id: "education",
    name: "Education",
    items: [
      { href: "/courses", label: "Courses", iconName: "BookOpen" },
      { href: "/grades", label: "Grades", iconName: "Award" },
      { href: "/projects", label: "Projects", iconName: "FolderKanban" },
      { href: "/exams", label: "Exams", iconName: "GraduationCap" },
    ],
    order: 1,
    collapsed: false,
  },
  {
    id: "work",
    name: "Work",
    items: [
      { href: "/work", label: "Work & Shifts", iconName: "Briefcase" },
    ],
    order: 2,
    collapsed: false,
  },
  {
    id: "finance",
    name: "Finance",
    items: [
      { href: "/finance", label: "Finance", iconName: "Wallet" },
      { href: "/subscriptions", label: "Subscriptions", iconName: "Wallet" },
    ],
    order: 3,
    collapsed: false,
  },
  {
    id: "routine",
    name: "Routine",
    items: [
      { href: "/prayer", label: "Prayer", iconName: "Moon" },
      { href: "/gym", label: "Gym", iconName: "Dumbbell" },
    ],
    order: 4,
    collapsed: false,
  },
  {
    id: "communication",
    name: "Communication",
    items: [
      { href: "/assistant", label: "AI Assistant", iconName: "Bot" },
    ],
    order: 5,
    collapsed: false,
  },
  {
    id: "settings",
    name: "Settings",
    items: [
      { href: "/settings", label: "Settings", iconName: "Settings" },
    ],
    order: 6,
    collapsed: false,
  },
];

export function SidebarV2() {
  const pathname = usePathname();
  const [user, setUser] = React.useState<User | null>(null);
  const [isMobileOpen, setIsMobileOpen] = React.useState(false);
  const [categories, setCategories] = React.useState<SidebarCategory[]>(defaultCategories);
  const [draggedItem, setDraggedItem] = React.useState<{ item: NavItem; categoryId: string } | null>(null);
  const [draggedCategory, setDraggedCategory] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  // Load user
  React.useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        loadPreferences(currentUser.uid);
      }
    });
    return () => unsubscribe();
  }, []);

  // Auto-close mobile sidebar when pathname changes
  React.useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  // Load user preferences
  const loadPreferences = async (userId: string) => {
    try {
      const prefs = await getSidebarPreferences(userId);
      if (prefs && prefs.categories.length > 0) {
        // Filter out Gmail items from saved preferences
        const cleanedCategories = prefs.categories.map(category => ({
          ...category,
          items: category.items.filter(item => item.href !== "/gmail")
        })).filter(category => category.items.length > 0 || category.id === "root"); // Keep root category even if empty
        
        // If we removed Gmail, save the cleaned preferences
        const hadGmail = prefs.categories.some(cat => cat.items.some(item => item.href === "/gmail"));
        if (hadGmail && cleanedCategories.length > 0) {
          await saveSidebarPreferences(userId, cleanedCategories);
        }
        
        setCategories(cleanedCategories.length > 0 ? cleanedCategories : defaultCategories);
      } else {
        setCategories(defaultCategories);
      }
    } catch (error) {
      console.error("Error loading sidebar preferences:", error);
      setCategories(defaultCategories);
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async (newCategories: SidebarCategory[]) => {
    if (!user) return;
    try {
      // Filter out root category when saving
      const categoriesToSave = newCategories.filter(cat => cat.id !== "root");
      await saveSidebarPreferences(user.uid, categoriesToSave);
      setCategories(newCategories);
    } catch (error) {
      console.error("Error saving sidebar preferences:", error);
    }
  };

  const handleCategoryDragStart = (categoryId: string) => {
    setDraggedCategory(categoryId);
  };

  const handleCategoryDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleCategoryDrop = (targetCategoryId: string) => {
    if (!draggedCategory || draggedCategory === targetCategoryId) return;

    const draggedIndex = categories.findIndex(c => c.id === draggedCategory);
    const targetIndex = categories.findIndex(c => c.id === targetCategoryId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const updated = [...categories];
    const [removed] = updated.splice(draggedIndex, 1);
    updated.splice(targetIndex, 0, removed);

    // Update order values
    const reordered = updated.map((cat, index) => ({
      ...cat,
      order: index,
    }));

    savePreferences(reordered);
    setDraggedCategory(null);
  };

  const toggleCategory = (categoryId: string) => {
    const updated = categories.map((cat) =>
      cat.id === categoryId ? { ...cat, collapsed: !cat.collapsed } : cat
    );
    savePreferences(updated);
  };

  const handleDragStart = (item: NavItem, categoryId: string) => {
    setDraggedItem({ item, categoryId });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (targetCategoryId: string, targetIndex?: number) => {
    if (!draggedItem) return;

    const updated = [...categories];
    const sourceCategory = updated.find((c) => c.id === draggedItem.categoryId);
    const targetCategory = updated.find((c) => c.id === targetCategoryId);

    if (!sourceCategory || !targetCategory) return;

    // Remove from source
    sourceCategory.items = sourceCategory.items.filter(
      (item) => item.href !== draggedItem.item.href
    );

    // Add to target
    if (targetIndex !== undefined) {
      targetCategory.items.splice(targetIndex, 0, draggedItem.item);
    } else {
      targetCategory.items.push(draggedItem.item);
    }

    savePreferences(updated);
    setDraggedItem(null);
  };

  const renderIcon = (iconName: string) => {
    const IconComponent = iconMap[iconName] || LayoutDashboard;
    return <IconComponent className="h-5 w-5" />;
  };

  const renderCategory = (category: SidebarCategory) => {
    const isCollapsed = category.collapsed ?? false;
    const Icon = category.collapsed ? ChevronRight : ChevronDown;

    return (
      <div
        key={category.id}
        draggable
        onDragStart={() => handleCategoryDragStart(category.id)}
        onDragOver={handleCategoryDragOver}
        onDrop={(e) => {
          e.preventDefault();
          handleCategoryDrop(category.id);
        }}
        className="mb-2 group/category"
      >
        <div className="flex items-center gap-2">
          <GripVertical className="h-4 w-4 text-muted-foreground opacity-0 group-hover/category:opacity-50 transition-opacity cursor-move" />
          <button
            onClick={() => toggleCategory(category.id)}
            className="flex-1 flex items-center gap-2 px-4 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            <Icon className="h-4 w-4" />
            <span>{category.name}</span>
          </button>
        </div>
        <AnimatePresence>
          {!isCollapsed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="space-y-1 ml-6">
                {category.items.map((item, index) => {
                  const isActive = pathname === item.href;
                  return (
                    <div
                      key={item.href}
                      draggable
                      onDragStart={() => handleDragStart(item, category.id)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => {
                        e.preventDefault();
                        handleDrop(category.id, index);
                      }}
                      className="relative group"
                    >
                      <Link
                        href={item.href}
                        className={cn(
                          "flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-300 relative",
                          isActive
                            ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg shadow-blue-500/50"
                            : "hover:bg-white/50 dark:hover:bg-white/5 hover:shadow-md"
                        )}
                      >
                        <GripVertical className="h-4 w-4 opacity-0 group-hover:opacity-50 transition-opacity" />
                        {renderIcon(item.iconName)}
                        <span>{item.label}</span>
                      </Link>
                    </div>
                  );
                })}
                <div
                  onDragOver={handleDragOver}
                  onDrop={(e) => {
                    e.preventDefault();
                    handleDrop(category.id);
                  }}
                  className="h-2 rounded transition-colors hover:bg-white/10"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  if (loading) {
    return <div className="hidden lg:flex w-64" />;
  }

  return (
    <>
      {/* Mobile Menu Button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsMobileOpen(!isMobileOpen)}
        >
          {isMobileOpen ? <X /> : <Menu />}
        </Button>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-white/10 dark:border-white/5 bg-white/80 dark:bg-black/80 backdrop-blur-xl supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-black/60 h-screen sticky top-0 z-30">
        <div className="p-6 border-b border-white/10 dark:border-white/5">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
            nmPLOS
          </h1>
          <p className="text-sm text-muted-foreground">Personal Life OS</p>
        </div>
        <nav className="flex-1 p-4 overflow-y-auto">
          {categories
            .filter(cat => cat.id !== "root" || cat.items.length > 0)
            .sort((a, b) => a.order - b.order)
            .map(renderCategory)}
        </nav>
      </aside>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {isMobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
              onClick={() => setIsMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 h-full w-64 bg-white/90 dark:bg-black/90 backdrop-blur-xl border-r border-white/10 dark:border-white/5 z-50 lg:hidden overflow-y-auto"
            >
              <div className="p-6 border-b flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold">nmPLOS</h1>
                  <p className="text-sm text-muted-foreground">Personal Life OS</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsMobileOpen(false)}
                >
                  <X />
                </Button>
              </div>
              <nav className="flex-1 p-4">
                {categories
                  .filter(cat => cat.id !== "root" || cat.items.length > 0)
                  .sort((a, b) => a.order - b.order)
                  .map(renderCategory)}
              </nav>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

