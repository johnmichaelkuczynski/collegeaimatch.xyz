import * as React from "react"
import { Link, useLocation } from "wouter"
import {
  LayoutDashboard,
  School,
  BookOpen,
  FileText,
  UserCircle,
  LogOut,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/colleges", label: "Colleges", icon: School },
  { href: "/subjects", label: "Subjects", icon: BookOpen },
  { href: "/proposals", label: "Proposals", icon: FileText },
]

export function Shell({ children }: { children: React.ReactNode }) {
  const [location] = useLocation()

  return (
    <div className="flex min-h-[100dvh] w-full bg-background font-sans">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-20 flex w-64 flex-col border-r bg-sidebar text-sidebar-foreground">
        <div className="flex h-16 shrink-0 items-center px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
              <School className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold tracking-tight">
              Zhi Systems
            </span>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-4 py-4">
          {navItems.map((item) => {
            const isActive =
              item.href === "/"
                ? location === "/"
                : location.startsWith(item.href)

            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </div>
              </Link>
            )
          })}
        </nav>

        <div className="p-4">
          <div className="rounded-lg bg-sidebar-accent/50 p-4">
            <div className="flex items-center gap-3">
              <UserCircle className="h-8 w-8 text-sidebar-foreground/70" />
              <div className="flex flex-col">
                <span className="text-sm font-medium">Alex Morgan</span>
                <span className="text-xs text-sidebar-foreground/50">
                  Sales Director
                </span>
              </div>
            </div>
            <Button
              variant="ghost"
              className="mt-4 w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 pl-64">
        {/* Header / Topbar - if needed */}
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
