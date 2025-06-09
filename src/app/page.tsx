import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-theme(spacing.24))] p-6 text-center">
      <Card className="w-full max-w-2xl shadow-xl">
        <CardHeader className="pb-4">
          <Image 
            src="https://placehold.co/120x120.png" 
            alt="Odoo Attendance Pusher Logo" 
            width={100} 
            height={100} 
            className="mx-auto mb-6 rounded-lg shadow-md"
            data-ai-hint="logo abstract" 
          />
          <CardTitle className="font-headline text-3xl md:text-4xl">Welcome to Odoo Attendance Pusher</CardTitle>
          <CardDescription className="text-lg pt-2">
            Streamline your attendance management process with seamless integration.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-muted-foreground">
            This application facilitates pushing attendance data from various ZKTeco devices and other sources directly to your Odoo server. Navigate using the sidebar to access different modules and logs.
          </p>
          <div className="flex justify-center gap-4">
            <Button asChild size="lg">
              <Link href="/logs">View Activity Logs</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/zkteco-biotime">ZKTeco Biotime</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
