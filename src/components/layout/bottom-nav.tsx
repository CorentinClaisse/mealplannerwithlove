"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { CalendarDays, UtensilsCrossed, ShoppingCart, Warehouse, Settings } from "lucide-react"
import { cn } from "@/lib/utils/cn"

const navItems = [
  {
    href: "/planner",
    label: "Planner",
    icon: CalendarDays,
  },
  {
    href: "/recipes",
    label: "Recipes",
    icon: UtensilsCrossed,
  },
  {
    href: "/shopping",
    label: "Shop",
    icon: ShoppingCart,
  },
  {
    href: "/inventory",
    label: "Inventory",
    icon: Warehouse,
  },
  {
    href: "/settings",
    label: "Settings",
    icon: Settings,
  },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border safe-bottom">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href)
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 flex-1 py-1 rounded-xl transition-all duration-200",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div className={cn(
                "p-1.5 rounded-xl transition-all duration-200",
                isActive ? "bg-primary/10" : ""
              )}>
                <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span className={cn(
                "text-[10px] font-semibold",
                isActive ? "font-bold" : ""
              )}>
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
