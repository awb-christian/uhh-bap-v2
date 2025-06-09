import { SidebarProvider, Sidebar, SidebarInset, SidebarTrigger, SidebarHeader, SidebarContent, SidebarFooter } from '@/components/ui/sidebar';
import SidebarNav from './sidebar-nav';
import Image from 'next/image';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider defaultOpen={true}>
      <Sidebar collapsible="icon" className="border-r border-sidebar-border">
        <SidebarHeader className="p-4 flex items-center gap-2">
          <Image 
            src="https://placehold.co/40x40.png" 
            alt="UHH BAP V2 Logo" 
            width={32} 
            height={32} 
            className="rounded-md"
            data-ai-hint="logo uhh abstract"
          />
          <h1 className="text-xl font-semibold font-headline text-sidebar-foreground">UHH BAP V2</h1>
        </SidebarHeader>
        <SidebarContent className="p-0"> {/* Remove padding from content to allow menu items to control their own */}
          <SidebarNav />
        </SidebarContent>
        {/* Optional Footer
        <SidebarFooter className="p-4">
          <p className="text-xs text-sidebar-foreground/70">&copy; {new Date().getFullYear()}</p>
        </SidebarFooter>
        */}
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-10 flex items-center h-14 px-4 border-b bg-background sm:px-8">
          <SidebarTrigger className="md:hidden" />
          {/* Page-specific titles will be rendered within the page content */}
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto bg-background">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
