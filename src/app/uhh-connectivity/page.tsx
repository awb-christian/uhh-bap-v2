
"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Network, Loader2, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface UhhAuthResponse {
  jsonrpc: string;
  id?: number | null;
  result?: {
    session_id: string;
    uid: number;
    is_admin?: boolean;
    name?: string;
    username?: string;
    partner_id?: number;
    company_id?: number;
    // ... other fields Odoo might return
  };
  error?: {
    code: number;
    message: string;
    data?: {
      name?: string;
      debug?: string;
      message?: string;
      // ... other error data
    };
  };
}

// Function to handle UHH connection test and authentication via proxy
async function testUhhConnection(
  uhhBaseUrl: string, // Base URL like https://your-odoo-instance.com
  username: string,
  password: string,
  dbName: string
): Promise<{ success: boolean; message: string; sessionId?: string }> {
  // The actual Odoo authentication endpoint path
  const authPath = "/web/session/authenticate";
  const odooFullAuthUrl = `${uhhBaseUrl.replace(/\/$/, "")}${authPath}`;

  const odooPayload = {
    jsonrpc: "2.0",
    params: {
      login: username,
      password: password,
      db: dbName,
    },
  };

  try {
    // Request to our Next.js proxy API route
    const proxyResponse = await fetch("/api/uhh-proxy", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        targetUrl: odooFullAuthUrl, // Send the full target URL to the proxy
        payload: odooPayload,      // Send the Odoo specific payload
      }),
    });

    if (!proxyResponse.ok) {
      // Handles HTTP errors from the proxy itself or forwarded from Odoo
      const errorData = await proxyResponse.json().catch(() => ({})); // Try to get error details
      return {
        success: false,
        message: `Proxy or Server error: ${proxyResponse.status} ${proxyResponse.statusText}. ${errorData.message || errorData.details || ""}`.trim(),
      };
    }

    const responseData: UhhAuthResponse = await proxyResponse.json();

    if (responseData.error) {
      // Odoo specific error (e.g., wrong credentials)
      return {
        success: false,
        message: `Authentication failed: ${responseData.error.data?.message || responseData.error.message || "Invalid credentials or database name."}`,
      };
    }

    if (responseData.result && responseData.result.session_id) {
      localStorage.setItem("uhh_session_id", responseData.result.session_id);
      localStorage.setItem("uhh_user_details", JSON.stringify({
        uid: responseData.result.uid,
        name: responseData.result.name,
        username: responseData.result.username,
        db: dbName,
        url: uhhBaseUrl, // Store the base URL
      }));
      return {
        success: true,
        message: "Authentication successful! Session ID stored.",
        sessionId: responseData.result.session_id,
      };
    }

    return {
      success: false,
      message: "Authentication failed: Unexpected response format from server.",
    };

  } catch (error) {
    // Network errors or other issues with the fetch call to the proxy
    console.error("UHH Connection test error (via proxy):", error);
    let errorMessage = "Connection failed. Please check your network.";
    if (error instanceof Error) {
        errorMessage = `Connection error: ${error.message}`;
    }
    return { success: false, message: errorMessage };
  }
}


export default function UhhConnectivityPage() {
  const { toast } = useToast();
  const [uhhUrl, setUhhUrl] = React.useState(""); // This will now store the base URL
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [dbName, setDbName] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [activeSession, setActiveSession] = React.useState<{sessionId: string; user: string; db: string; url: string} | null>(null);

  React.useEffect(() => {
    const storedSessionId = localStorage.getItem("uhh_session_id");
    const storedUserDetailsRaw = localStorage.getItem("uhh_user_details");
    if (storedSessionId && storedUserDetailsRaw) {
      try {
        const userDetails = JSON.parse(storedUserDetailsRaw);
        setActiveSession({
          sessionId: storedSessionId,
          user: userDetails.name || userDetails.username || "Unknown User",
          db: userDetails.db || "N/A",
          url: userDetails.url || "N/A", // This is the base URL
        });
        // Pre-fill inputs if session exists, useful if user wants to re-auth with same details
        setUhhUrl(userDetails.url || "");
        setUsername(userDetails.username || "");
        setDbName(userDetails.db || "");

      } catch (e) {
        console.error("Failed to parse stored user details", e);
        localStorage.removeItem("uhh_session_id");
        localStorage.removeItem("uhh_user_details");
      }
    } else {
      localStorage.removeItem("uhh_session_id");
      localStorage.removeItem("uhh_user_details");
    }
  }, []);

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

    if (result.success && result.sessionId) {
        setActiveSession({
            sessionId: result.sessionId,
            user: JSON.parse(localStorage.getItem("uhh_user_details") || "{}").name || username,
            db: dbName,
            url: uhhUrl,
        });
    } else if (!result.success) {
        // Do not clear localStorage here, user might want to retry with corrected password on same URL/DB
        // localStorage.removeItem("uhh_session_id");
        // localStorage.removeItem("uhh_user_details");
        setActiveSession(null); // Clear active session display on failure
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("uhh_session_id");
    localStorage.removeItem("uhh_user_details");
    setActiveSession(null);
    // Optionally clear input fields on logout
    // setUhhUrl("");
    // setUsername("");
    // setPassword("");
    // setDbName("");
    toast({
      title: "Logged Out",
      description: "UHH session has been cleared.",
    });
  };


  return (
    <Card className="shadow-lg rounded-lg">
      <CardHeader className="border-b">
        <div className="flex items-center gap-3">
          <Network className="h-8 w-8 text-primary" />
          <CardTitle className="font-headline text-2xl">UHH Connectivity</CardTitle>
        </div>
        <CardDescription>Configure and test connectivity to the UHH (Odoo) server.</CardDescription>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        {activeSession ? (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <CheckCircle className="h-6 w-6 text-green-600" />
              <h4 className="text-lg font-semibold text-green-800">Active Session</h4>
            </div>
            <p className="text-sm text-green-700">
              Successfully connected as <span className="font-medium">{activeSession.user}</span> to database <span className="font-medium">{activeSession.db}</span> on <span className="font-medium">{activeSession.url}</span>.
            </p>
            <p className="text-xs text-green-600 mt-1 truncate">Session ID: {activeSession.sessionId}</p>
            <Button onClick={handleLogout} variant="outline" size="sm" className="mt-3 border-green-300 text-green-700 hover:bg-green-100">
              Logout / Clear Session
            </Button>
          </div>
        ) : (
           <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <XCircle className="h-6 w-6 text-yellow-600" />
              <h4 className="text-lg font-semibold text-yellow-800">No Active Session</h4>
            </div>
            <p className="text-sm text-yellow-700">
              Please enter your UHH server details and test the connection.
            </p>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <Label htmlFor="uhh-url">UHH URL (Base)</Label>
            <Input
              id="uhh-url"
              placeholder="e.g., https://your-odoo-instance.com"
              value={uhhUrl}
              onChange={(e) => setUhhUrl(e.target.value)}
              disabled={isLoading || !!activeSession}
            />
          </div>
          <div>
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              placeholder="Enter your UHH username (e.g., email)"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isLoading || !!activeSession}
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
              disabled={isLoading || !!activeSession}
            />
          </div>
          <div>
            <Label htmlFor="db-name">Database Name</Label>
            <Input
              id="db-name"
              placeholder="Enter the UHH database name"
              value={dbName}
              onChange={(e) => setDbName(e.target.value)}
              disabled={isLoading || !!activeSession}
            />
          </div>
        </div>

        {!activeSession && (
            <div className="flex justify-end">
            <Button
                onClick={handleTestConnection}
                disabled={!canTestConnection || isLoading}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Test Connection & Authenticate
            </Button>
            </div>
        )}

      </CardContent>
    </Card>
  );
}

