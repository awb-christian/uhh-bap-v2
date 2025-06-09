"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Network, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Placeholder for UHH connection test
async function testUhhConnection(url?: string, username?: string, password?: string, dbName?: string): Promise<{ success: boolean; message: string }> {
  return new Promise(resolve => {
    setTimeout(() => {
      if (!url || !username || !password || !dbName) {
        resolve({ success: false, message: "Missing one or more required fields." });
        return;
      }
      // Simulate API call
      const randomOutcome = Math.random();
      if (randomOutcome < 0.6) { // 60% success
        resolve({ success: true, message: "Connection Successful! Credentials are valid and the UHH server is reachable." });
      } else if (randomOutcome < 0.8) { // 20% auth error
        resolve({ success: false, message: "Connection Failed. Invalid username or password." });
      } else { // 20% network error
        resolve({ success: false, message: "Connection Failed. Unable to reach the UHH server. Check the URL and your network." });
      }
    }, 1500); // Simulate network delay
  });
}


export default function UhhConnectivityPage() {
  const { toast } = useToast();
  const [uhhUrl, setUhhUrl] = React.useState("");
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [dbName, setDbName] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);

  const canTestConnection = Boolean(uhhUrl && username && password && dbName);

  const handleTestConnection = async () => {
    if (!canTestConnection) return;
    setIsLoading(true);
    
    const result = await testUhhConnection(uhhUrl, username, password, dbName);
    
    setIsLoading(false);
    
    toast({
      title: result.success ? "Success" : "Error",
      description: result.message,
      variant: result.success ? "default" : "destructive",
    });
  };

  return (
    <Card className="shadow-lg rounded-lg">
      <CardHeader className="border-b">
        <div className="flex items-center gap-3">
          <Network className="h-8 w-8 text-primary" />
          <CardTitle className="font-headline text-2xl">UHH Connectivity</CardTitle>
        </div>
        <CardDescription>Configure and test connectivity to the UHH server.</CardDescription>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="uhh-url">UHH URL</Label>
            <Input 
              id="uhh-url" 
              placeholder="e.g., https://uhh.example.com" 
              value={uhhUrl}
              onChange={(e) => setUhhUrl(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <div>
            <Label htmlFor="username">Username</Label>
            <Input 
              id="username" 
              placeholder="Enter your UHH username" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input 
              id="password" 
              type="password" 
              placeholder="Enter your UHH password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <div>
            <Label htmlFor="db-name">Database Name</Label>
            <Input 
              id="db-name" 
              placeholder="Enter the UHH database name" 
              value={dbName}
              onChange={(e) => setDbName(e.target.value)}
              disabled={isLoading}
            />
          </div>
        </div>
        
        <div className="flex justify-end">
          <Button 
            onClick={handleTestConnection} 
            disabled={!canTestConnection || isLoading}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Test Connection
          </Button>
        </div>
        
        <div className="mt-6 p-4 bg-muted rounded-lg">
            <h4 className="font-semibold mb-2 text-sm">Current Status</h4>
            <ul className="list-disc list-inside space-y-1 text-xs text-muted-foreground">
                <li>Odoo Server: <span className="font-semibold">Status Unknown</span> (This section is for Odoo, not UHH)</li>
                <li>UHH Connection: <span className="font-semibold">Not Tested Yet</span></li>
            </ul>
        </div>
      </CardContent>
    </Card>
  );
}
