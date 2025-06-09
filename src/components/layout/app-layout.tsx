
"use client"; 
import { SidebarProvider, Sidebar, SidebarInset, SidebarTrigger, SidebarHeader, SidebarContent } from '@/components/ui/sidebar';
import SidebarNav from './sidebar-nav';
import Image from 'next/image';
import { Button } from "@/components/ui/button";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme-provider"; 
import * as React from "react";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  return (
    <SidebarProvider defaultOpen={true}>
      <Sidebar collapsible="icon" className="border-r border-sidebar-border">
        <SidebarHeader className="p-4 flex items-center gap-2">
          <Image 
            src="https://placehold.co/32x32.png" 
            alt="UHH BAP V2 Logo" 
            width={32} 
            height={32} 
            className="rounded-md"
            data-ai-hint="uhh official logo"
          />
          <h1 className="text-xl font-semibold font-headline text-sidebar-foreground">UHH BAP V2</h1>
        </SidebarHeader>
        <SidebarContent className="p-0">
          <SidebarNav />
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-10 flex items-center h-14 px-4 border-b bg-background sm:px-8">
          <SidebarTrigger className="md:hidden mr-auto" />
          <div className="ml-auto flex items-center gap-2">
            {mounted && (
                <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
                >
                {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                </Button>
            )}
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto bg-background">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
