"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import { ScrollText, Fingerprint, Clock, Shield, Link2 as LinkIcon, Network } from 'lucide-react';
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface NavItemConfig {
  href: string;
  label: string;
  icon: LucideIcon;
  disabled?: boolean;
  soon?: boolean;
}

const navItems: NavItemConfig[] = [
  { href: '/logs', label: 'Logs', icon: ScrollText },
  { href: '/zkteco-biotime', label: 'ZKTeco (ZKBiotime)', icon: Fingerprint, soon: true, disabled: true },
  { href: '/zkteco-time', label: 'ZKTeco (ZKTime)', icon: Clock, soon: true, disabled: true },
  { href: '/sentry', label: 'Sentry', icon: Shield, soon: true, disabled: true },
  { href: '/securelink', label: 'SecureLink', icon: LinkIcon },
  { href: '/uhh-connectivity', label: 'UHH Connectivity', icon: Network },
];

export default function SidebarNav() {
  const pathname = usePathname();

  return (
    <SidebarMenu className="p-2">
      {navItems.map((item) => {
        const isActive = !item.disabled && (item.href === '/' ? pathname === item.href : pathname.startsWith(item.href));
        
        return (
          <SidebarMenuItem key={item.label}>
            <SidebarMenuButton
              asChild={!item.disabled}
              isActive={isActive}
              disabled={item.disabled}
              className={cn(
                "justify-start w-full relative",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground text-sidebar-foreground",
                item.disabled && "opacity-60 cursor-not-allowed hover:bg-transparent hover:text-sidebar-foreground"
              )}
              tooltip={{ children: item.label + (item.soon ? " (Soon)" : ""), side: 'right', align: 'center' }}
              onClick={item.disabled ? (e) => e.preventDefault() : undefined}
            >
              {item.disabled ? (
                <div className="flex items-center gap-3 w-full">
                  <item.icon className="h-5 w-5 shrink-0" />
                  <span className="truncate group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:w-0 transition-opacity duration-200">
                    {item.label}
                  </span>
                  {item.soon && (
                    <Badge variant="outline" className="ml-auto text-xs group-data-[collapsible=icon]:hidden px-1.5 py-0.5 leading-none bg-muted text-muted-foreground border-transparent">
                      Soon
                    </Badge>
                  )}
                </div>
              ) : (
                <Link href={item.href} className="flex items-center gap-3 w-full">
                  <item.icon className="h-5 w-5 shrink-0" />
                  <span className="truncate group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:w-0 transition-opacity duration-200">
                    {item.label}
                  </span>
                </Link>
              )}
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}
