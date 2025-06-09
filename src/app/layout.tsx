
import type {Metadata} from 'next';
import './globals.css';
import AppLayout from '@/components/layout/app-layout';
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from '@/components/theme-provider';


export const metadata: Metadata = {
  title: 'UHH BAP V2',
  description: 'Desktop app for UHH BAP V2.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <ThemeProvider defaultTheme="light" storageKey="ui-theme">
          <AppLayout>
            {children}
          </AppLayout>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
