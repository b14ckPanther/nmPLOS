"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { signOut, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth";
import { auth } from "@/firebase/client";
import { getSidebarPreferences, saveSidebarPreferences } from "@/lib/sidebar-helpers";
import type { SidebarCategory } from "@/firebase/types";
import { onAuthStateChanged } from "firebase/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LogOut, Mail, User, Loader2, FolderTree, Plus, Trash2, Edit2, GripVertical } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/page-header";
import { motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export default function SettingsPage() {
  const [user, setUser] = useState(auth?.currentUser ?? null);
  const [loading, setLoading] = useState(true);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [categories, setCategories] = useState<SidebarCategory[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [draggedCategory, setDraggedCategory] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const loadCategories = useCallback(async (userId: string) => {
    try {
      setLoadingCategories(true);
      const prefs = await getSidebarPreferences(userId);
      if (prefs && prefs.categories.length > 0) {
        // Filter out Gmail and ensure root category exists
        const cleanedCategories = prefs.categories
          .map(category => ({
            ...category,
            items: category.items.filter(item => item.href !== "/gmail")
          }))
          .filter(category => category.items.length > 0 || category.id === "root");
        
        // Ensure root category exists for orphaned pages
        if (!cleanedCategories.find(cat => cat.id === "root")) {
          cleanedCategories.push({
            id: "root",
            name: "Uncategorized",
            items: [],
            order: 999,
            collapsed: false,
          });
        }
        
        setCategories(cleanedCategories);
      } else {
        // Create default with root category
        const defaultCats = [
          { id: "general", name: "General", items: [{ href: "/dashboard", label: "Dashboard", iconName: "LayoutDashboard" }, { href: "/schedule", label: "Schedule", iconName: "Calendar" }, { href: "/tasks", label: "Tasks", iconName: "CheckSquare" }], order: 0, collapsed: false },
          { id: "education", name: "Education", items: [{ href: "/courses", label: "Courses", iconName: "BookOpen" }, { href: "/grades", label: "Grades", iconName: "Award" }, { href: "/projects", label: "Projects", iconName: "FolderKanban" }, { href: "/exams", label: "Exams", iconName: "GraduationCap" }], order: 1, collapsed: false },
          { id: "work", name: "Work", items: [{ href: "/work", label: "Work & Shifts", iconName: "Briefcase" }], order: 2, collapsed: false },
          { id: "finance", name: "Finance", items: [{ href: "/finance", label: "Finance", iconName: "Wallet" }], order: 3, collapsed: false },
          { id: "routine", name: "Routine", items: [{ href: "/prayer", label: "Prayer", iconName: "Moon" }, { href: "/gym", label: "Gym", iconName: "Dumbbell" }], order: 4, collapsed: false },
          { id: "communication", name: "Communication", items: [{ href: "/assistant", label: "AI Assistant", iconName: "Bot" }], order: 5, collapsed: false },
          { id: "settings", name: "Settings", items: [{ href: "/settings", label: "Settings", iconName: "Settings" }], order: 6, collapsed: false },
          { id: "root", name: "Uncategorized", items: [], order: 999, collapsed: false },
        ];
        setCategories(defaultCats);
      }
    } catch (error) {
      console.error("Error loading categories:", error);
      toast({
        title: "Error",
        description: "Failed to load sidebar categories",
        variant: "destructive",
      });
    } finally {
      setLoadingCategories(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      if (currentUser) {
        loadCategories(currentUser.uid);
      }
    });

    return () => unsubscribe();
  }, [loadCategories]);

  const saveCategories = async (newCategories: SidebarCategory[]) => {
    if (!user) return;
    try {
      // Filter out root category when saving (it's just for UI)
      const categoriesToSave = newCategories.filter(cat => cat.id !== "root");
      await saveSidebarPreferences(user.uid, categoriesToSave);
      setCategories(newCategories);
      toast({
        title: "Success",
        description: "Sidebar categories updated",
      });
    } catch (error) {
      console.error("Error saving categories:", error);
      toast({
        title: "Error",
        description: "Failed to save sidebar categories",
        variant: "destructive",
      });
    }
  };

  const handleRenameCategory = (categoryId: string, newName: string) => {
    if (!newName.trim()) {
      toast({
        title: "Error",
        description: "Category name cannot be empty",
        variant: "destructive",
      });
      return;
    }
    const updated = categories.map(cat =>
      cat.id === categoryId ? { ...cat, name: newName.trim() } : cat
    );
    saveCategories(updated);
    setEditingCategory(null);
  };

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) {
      toast({
        title: "Error",
        description: "Category name cannot be empty",
        variant: "destructive",
      });
      return;
    }
    const maxOrder = Math.max(...categories.map(c => c.order), -1);
    const newCategory: SidebarCategory = {
      id: `category-${Date.now()}`,
      name: newCategoryName.trim(),
      items: [],
      order: maxOrder + 1,
      collapsed: false,
    };
    const updated = [...categories, newCategory];
    saveCategories(updated);
    setNewCategoryName("");
    setShowAddCategory(false);
  };

  const handleDeleteCategory = (categoryId: string) => {
    if (categoryId === "root") {
      toast({
        title: "Error",
        description: "Cannot delete the root category",
        variant: "destructive",
      });
      return;
    }
    
    const category = categories.find(c => c.id === categoryId);
    if (!category) return;

    // Move all pages to root category
    const rootCategory = categories.find(c => c.id === "root");
    const updated = categories
      .filter(c => c.id !== categoryId)
      .map(c => {
        if (c.id === "root" && rootCategory) {
          return {
            ...c,
            items: [...c.items, ...category.items],
          };
        }
        return c;
      });

    // Ensure root exists
    if (!rootCategory) {
      updated.push({
        id: "root",
        name: "Uncategorized",
        items: category.items,
        order: 999,
        collapsed: false,
      });
    }

    saveCategories(updated);
    toast({
      title: "Category deleted",
      description: `Pages moved to "Uncategorized"`,
    });
  };

  const handleDragStart = (categoryId: string) => {
    setDraggedCategory(categoryId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (targetCategoryId: string) => {
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

    saveCategories(reordered);
    setDraggedCategory(null);
  };

  const handleSignOut = async () => {
    if (!auth) return;
    try {
      await signOut(auth);
      toast({
        title: "Signed out successfully",
        description: "You have been signed out.",
      });
      router.push("/auth/login");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to sign out",
        variant: "destructive",
      });
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth || !user || !user.email) return;

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords do not match",
        variant: "destructive",
      });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters long",
        variant: "destructive",
      });
      return;
    }

    setIsChangingPassword(true);
    try {
      // Re-authenticate user
      const credential = EmailAuthProvider.credential(
        user.email,
        passwordData.currentPassword
      );
      await reauthenticateWithCredential(user, credential);

      // Update password
      await updatePassword(user, passwordData.newPassword);

      toast({
        title: "Password changed",
        description: "Your password has been successfully updated.",
      });

      setShowPasswordDialog(false);
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error: any) {
      let errorMessage = "Failed to change password";
      if (error.code === "auth/wrong-password") {
        errorMessage = "Current password is incorrect";
      } else if (error.code === "auth/weak-password") {
        errorMessage = "New password is too weak";
      } else if (error.code === "auth/requires-recent-login") {
        errorMessage = "Please sign out and sign in again before changing your password";
      }
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsChangingPassword(false);
    }
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <PageHeader
        title="Settings"
        description="Manage your account and preferences"
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Account
            </CardTitle>
            <CardDescription>Manage your account settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium flex items-center gap-2 mb-1">
                <Mail className="h-4 w-4" />
                Email
              </label>
              <p className="text-sm text-muted-foreground font-mono bg-muted p-2 rounded">
                {user?.email || "Not available"}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium mb-1">Display Name</label>
              <p className="text-sm text-muted-foreground">
                {user?.displayName || "Not set"}
              </p>
            </div>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => setShowPasswordDialog(true)}
            >
              Change Password
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Preferences</CardTitle>
            <CardDescription>Customize your experience</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Theme</label>
              <p className="text-sm text-muted-foreground">Use the theme toggle in the header</p>
            </div>
            <div>
              <label className="text-sm font-medium">Currency</label>
              <p className="text-sm text-muted-foreground">₪ New Israeli Shekels (NIS)</p>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderTree className="h-5 w-5" />
              Sidebar Categories
            </CardTitle>
            <CardDescription>
              Organize your sidebar by renaming, adding, sorting, or deleting categories. Pages cannot be deleted.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingCategories ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <div className="space-y-3">
                {categories
                  .filter(cat => cat.id !== "root" || cat.items.length > 0)
                  .sort((a, b) => a.order - b.order)
                  .map((category) => (
                    <div
                      key={category.id}
                      draggable
                      onDragStart={() => handleDragStart(category.id)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => {
                        e.preventDefault();
                        handleDrop(category.id);
                      }}
                      className="flex items-center gap-3 p-3 border rounded-lg hover:bg-accent/50 transition-colors cursor-move group"
                    >
                      <GripVertical className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="flex-1">
                        {editingCategory === category.id ? (
                          <Input
                            defaultValue={category.name}
                            onBlur={(e) => {
                              if (e.target.value !== category.name) {
                                handleRenameCategory(category.id, e.target.value);
                              } else {
                                setEditingCategory(null);
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                handleRenameCategory(category.id, e.currentTarget.value);
                              } else if (e.key === "Escape") {
                                setEditingCategory(null);
                              }
                            }}
                            autoFocus
                            className="h-8"
                          />
                        ) : (
                          <div className="font-medium">{category.name}</div>
                        )}
                        <div className="text-xs text-muted-foreground">
                          {category.items.length} page{category.items.length !== 1 ? "s" : ""}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingCategory(category.id)}
                          className="h-8 w-8"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        {category.id !== "root" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteCategory(category.id)}
                            className="h-8 w-8 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                
                {showAddCategory ? (
                  <div className="flex items-center gap-2 p-3 border rounded-lg">
                    <Input
                      placeholder="Category name"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleAddCategory();
                        } else if (e.key === "Escape") {
                          setShowAddCategory(false);
                          setNewCategoryName("");
                        }
                      }}
                      autoFocus
                      className="flex-1"
                    />
                    <Button onClick={handleAddCategory} size="sm">
                      Add
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowAddCategory(false);
                        setNewCategoryName("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => setShowAddCategory(true)}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add New Category
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>


        <Card>
          <CardHeader>
            <CardTitle>Danger Zone</CardTitle>
            <CardDescription>Irreversible actions</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Change Password Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>
              Enter your current password and choose a new password.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleChangePassword}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password *</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) =>
                    setPasswordData({ ...passwordData, currentPassword: e.target.value })
                  }
                  required
                  placeholder="Enter current password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password *</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) =>
                    setPasswordData({ ...passwordData, newPassword: e.target.value })
                  }
                  required
                  placeholder="Enter new password (min 6 characters)"
                  minLength={6}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password *</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) =>
                    setPasswordData({ ...passwordData, confirmPassword: e.target.value })
                  }
                  required
                  placeholder="Confirm new password"
                  minLength={6}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowPasswordDialog(false);
                  setPasswordData({
                    currentPassword: "",
                    newPassword: "",
                    confirmPassword: "",
                  });
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isChangingPassword}>
                {isChangingPassword ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Changing...
                  </>
                ) : (
                  "Change Password"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

    </motion.div>
  );
}
