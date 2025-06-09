
"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Network, Loader2, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface UhhAuthResponseResult {
  session_id: string;
  uid: number;
  is_admin?: boolean;
  name?: string; // User's display name
  username?: string; // User's login name
  partner_id?: number;
  company_id?: number;
  db?: string; // Odoo returns the db name
  // ... other fields Odoo might return
}

interface UhhAuthResponseErrorData {
  name?: string;
  debug?: string;
  message?: string;
  // ... other error data
}
interface UhhAuthResponseError {
    code: number;
    message: string;
    data?: UhhAuthResponseErrorData;
    http_status?: number; // Odoo sometimes includes this
}

interface UhhAuthResponse {
  jsonrpc: string;
  id?: number | null;
  result?: UhhAuthResponseResult;
  error?: UhhAuthResponseError;
}

// Function to handle UHH connection test and authentication via proxy
async function testUhhConnection(
  uhhBaseUrl: string,
  username: string,
  password: string,
  dbName: string
): Promise<{ success: boolean; message: string; data?: UhhAuthResponseResult }> {
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
    const proxyResponse = await fetch("/api/uhh-proxy", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        targetUrl: odooFullAuthUrl,
        payload: odooPayload,
      }),
    });

    if (!proxyResponse.ok) {
      const errorData = await proxyResponse.json().catch(() => ({}));
      return {
        success: false,
        message: `Proxy or Server error: ${proxyResponse.status} ${proxyResponse.statusText}. ${errorData.message || errorData.details || "An unexpected error occurred with the proxy."}`.trim(),
      };
    }

    const responseData: UhhAuthResponse = await proxyResponse.json();

    if (responseData.error) {
      return {
        success: false,
        message: `Authentication failed: ${responseData.error.data?.message || responseData.error.message || "Invalid credentials, database name, or server error."}`,
      };
    }

    // Odoo's session_id is expected in the JSON response body (result.session_id)
    if (responseData.result && responseData.result.session_id) {
      // Store details for active session and for pre-filling inputs next time
      localStorage.setItem("uhh_session_id", responseData.result.session_id);
      localStorage.setItem("uhh_user_details", JSON.stringify({
        uid: responseData.result.uid,
        name: responseData.result.name, // Display name
        username: responseData.result.username, // Login username
        db: responseData.result.db || dbName, // Prefer DB from Odoo response, fallback to input
        url: uhhBaseUrl,
        isAdmin: responseData.result.is_admin,
        companyId: responseData.result.company_id,
        partnerId: responseData.result.partner_id,
      }));
      return {
        success: true,
        message: "Authentication successful! Session established.",
        data: responseData.result,
      };
    }

    return {
      success: false,
      message: "Authentication failed: Unexpected response format from server (missing session_id in result).",
    };

  } catch (error) {
    console.error("UHH Connection test error (via proxy):", error);
    let errorMessage = "Connection failed. Please check your network or the UHH URL.";
    if (error instanceof Error) {
        errorMessage = `Connection error: ${error.message}`;
    }
    return { success: false, message: errorMessage };
  }
}


export default function UhhConnectivityPage() {
  const { toast } = useToast();
  const [uhhUrl, setUhhUrl] = React.useState("");
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [dbName, setDbName] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [activeSession, setActiveSession] = React.useState<{sessionId: string; user: string; db: string; url: string} | null>(null);

  React.useEffect(() => {
    const storedSessionId = localStorage.getItem("uhh_session_id");
    const storedUserDetailsRaw = localStorage.getItem("uhh_user_details");

    if (storedUserDetailsRaw) { // If user details exist (even if session is logged out)
      try {
        const userDetails = JSON.parse(storedUserDetailsRaw);
        // Pre-fill inputs from last known good configuration
        setUhhUrl(userDetails.url || "");
        setUsername(userDetails.username || ""); // This is the login username
        setDbName(userDetails.db || "");
        // Password field remains empty for security

        if (storedSessionId) { // If session ID also exists, then it's an active session
          setActiveSession({
            sessionId: storedSessionId,
            user: userDetails.name || userDetails.username || "Unknown User", // Display name prefer 'name'
            db: userDetails.db || "N/A",
            url: userDetails.url || "N/A",
          });
        } else {
            // No active session ID, but user details exist. Inputs are pre-filled.
            // Ensure session ID is definitely gone if userDetails are present but sessionId is not.
            localStorage.removeItem("uhh_session_id");
            setActiveSession(null);
        }
      } catch (e) {
        console.error("Failed to parse stored user details", e);
        // Clear potentially corrupted data
        localStorage.removeItem("uhh_session_id");
        localStorage.removeItem("uhh_user_details");
        setActiveSession(null);
      }
    } else {
      // No user details stored at all, so no session either. Clear everything to be sure.
      localStorage.removeItem("uhh_session_id");
      localStorage.removeItem("uhh_user_details");
      setActiveSession(null);
      // Inputs remain empty or default.
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

    if (result.success && result.data) {
        setActiveSession({
            sessionId: result.data.session_id,
            user: result.data.name || result.data.username || username, // Prefer display name from response
            db: result.data.db || dbName, // Prefer db from response
            url: uhhUrl,
        });
        // Password field is cleared after an attempt for security
        setPassword("");
    } else if (!result.success) {
        setActiveSession(null); // Clear active session display on failure
        // Password field is cleared after an attempt for security
        setPassword("");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("uhh_session_id");
    // Do NOT remove "uhh_user_details" here, so inputs can be pre-filled next time.
    setActiveSession(null);
    setPassword(""); // Clear password field on logout
    toast({
      title: "Logged Out",
      description: "UHH session has been cleared. Your connection details are remembered for next time (excluding password).",
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
              Please enter your UHH server details and test the connection. Previously used details (if any) are pre-filled below.
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
              autoComplete="current-password"
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
