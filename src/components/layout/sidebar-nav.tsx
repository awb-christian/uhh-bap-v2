"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import { ScrollText, Fingerprint, Clock, Shield, Link2 as LinkIcon, Network } from 'lucide-react'; // Changed Link to Link2 for clarity
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const navItems: NavItem[] = [
  { href: '/logs', label: 'Logs', icon: ScrollText },
  { href: '/zkteco-biotime', label: 'ZKTeco Biotime', icon: Fingerprint },
  { href: '/zkteco-time', label: 'ZKTeco Time', icon: Clock },
  { href: '/sentry', label: 'Sentry', icon: Shield },
  { href: '/securelink', label: 'SecureLink', icon: LinkIcon },
  { href: '/uhh-connectivity', label: 'UHH Connectivity', icon: Network },
];

export default function SidebarNav() {
  const pathname = usePathname();

  return (
    <SidebarMenu className="p-2"> {/* Added padding to the menu container itself */}
      {navItems.map((item) => {
        const isActive = item.href === '/' ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <SidebarMenuItem key={item.label}>
            <SidebarMenuButton
              asChild
              isActive={isActive}
              className={cn(
                "justify-start w-full", // Ensure button takes full width
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground text-sidebar-foreground"
              )}
              tooltip={{ children: item.label, side: 'right', align: 'center' }}
            >
              <Link href={item.href} className="flex items-center gap-3"> {/* Increased gap for icon and text */}
                <item.icon className="h-5 w-5 shrink-0" />
                <span className="truncate group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:w-0 transition-opacity duration-200">
                  {item.label}
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}
