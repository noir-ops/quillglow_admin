"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  CreditCard,
  Settings,
  LogOut,
  Moon,
  Sun,
  Menu,
  BookOpen,
  Lightbulb,
  Flag,
  Mail,
  Building2,
  Award,
  Cpu
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTheme } from "next-themes"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { useState } from "react"

const navigation = [
  { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { name: "Users", href: "/admin/users", icon: Users },
  { name: "User Emails", href: "/admin/user-emails", icon: Mail }, // Added User Emails navigation item
  { name: "Contacts", href: "/admin/contacts", icon: MessageSquare },
  { name: "Subscriptions", href: "/admin/subscriptions", icon: CreditCard },
  { name: "Blogs", href: "/admin/blogs", icon: BookOpen },
  { name: "Partnerships", href: "/admin/partnerships", icon: Building2 },
  { name: "Feature Feedback", href: "/admin/feedback", icon: Lightbulb },
  { name: "Reports", href: "/admin/reports", icon: Flag },
  { name: "Ambassadors", href: "/admin/ambassadors", icon: Award },
  { name: "APIs", href: "/admin/apis", icon: Cpu },
  { name: "Settings", href: "/admin/settings", icon: Settings },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const router = useRouter()
  const [open, setOpen] = useState(false)

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/admin/login")
    router.refresh()
  }

  const SidebarContent = () => (
    <>
      <div className="flex h-16 items-center border-b px-6">
        <h1 className="text-xl font-bold text-sidebar-foreground">QuilGlow Admin</h1>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          )
        })}
      </nav>
      <div className="border-t p-4 space-y-2">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          {theme === "dark" ? (
            <>
              <Sun className="mr-2 h-4 w-4" />
              Light Mode
            </>
          ) : (
            <>
              <Moon className="mr-2 h-4 w-4" />
              Dark Mode
            </>
          )}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-destructive hover:text-destructive"
          onClick={handleLogout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile Header with Hamburger */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 flex h-16 items-center justify-between border-b bg-background px-4">
        <h1 className="text-lg font-bold">QuilGlow Admin</h1>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <div className="flex h-full flex-col">
              <SidebarContent />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden lg:flex h-full w-64 flex-col border-r bg-sidebar">
        <SidebarContent />
      </div>
    </>
  )
}
