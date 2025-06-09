
"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Network, Loader2, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { addLog } from "@/lib/app-logger"; // Import the logger

interface UhhAuthResponseResult {
  uid: number;
  is_admin?: boolean;
  name?: string;
  username?: string;
  partner_id?: number;
  company_id?: number;
  db?: string;
  session_id?: string; 
  user_context?: Record<string, any>;
  user_companies?: {
    current_company?: [number, string];
    allowed_companies?: Array<[number, string]>;
  };
}

interface UhhAuthResponseErrorData {
  name?: string;
  debug?: string;
  message?: string;
  arguments?: string[];
  exception_type?: string; 
}
interface UhhAuthResponseError {
    code: number;
    message: string;
    data?: UhhAuthResponseErrorData;
    http_status?: number;
}

interface UhhAuthResponse {
  jsonrpc: string;
  id?: number | null;
  result?: UhhAuthResponseResult;
  error?: UhhAuthResponseError;
  debug_headers?: Record<string, string>; 
}

interface ProxyErrorResponse {
    error: string;
    details?: string;
    debug_headers?: Record<string, string>;
}

interface TestConnectionResult {
  success: boolean;
  message: string;
  data?: UhhAuthResponseResult; 
  debugHeaders?: Record<string, string> | null;
  sessionIdFromHeader?: string | null;
}


async function testUhhConnection(
  uhhBaseUrl: string,
  username: string,
  password: string,
  dbName: string
): Promise<TestConnectionResult> {
  const authPath = "/web/session/authenticate";
  const odooFullAuthUrl = `${uhhBaseUrl.replace(/\/$/, "")}${authPath}`;

  // Primary payload structure for /web/session/authenticate
  const odooPayload = {
    jsonrpc: "2.0",
    params: {
      db: dbName,
      login: username,
      password: password,
    },
  };
  
  // Alternative payload structure (often used with /jsonrpc endpoint or specific Odoo configurations)
  /*
  const odooPayload = {
    jsonrpc: "2.0",
    method: "call",
    params: {
      service: "common", 
      method: "login",   
      args: [dbName, username, password, {}], 
    },
  };
  */

  addLog("UHH Connectivity", `Attempting authentication to ${odooFullAuthUrl} for user ${username}, DB: ${dbName}. Payload: ${JSON.stringify(odooPayload)}`, "Info");

  let receivedDebugHeaders: Record<string, string> | null = null;

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

    const responseBody = await proxyResponse.json().catch(() => ({})); 
    receivedDebugHeaders = responseBody.debug_headers || null;

    if (!proxyResponse.ok) {
      const errorData: ProxyErrorResponse = responseBody;
      const errorMessage = `Proxy or Server error: ${proxyResponse.status} ${proxyResponse.statusText}. ${errorData.error || errorData.details || "An unexpected error occurred with the proxy."}`.trim();
      addLog("UHH Connectivity", `Proxy/Server Error: ${errorMessage}. Status: ${proxyResponse.status}. Response Body: ${JSON.stringify(responseBody)}. Headers: ${JSON.stringify(receivedDebugHeaders)}`, "Error");
      return {
        success: false,
        message: errorMessage,
        debugHeaders: receivedDebugHeaders,
      };
    }

    const responseData: UhhAuthResponse = responseBody;

    let sessionIdFromHeader: string | null = null;
    const setCookieHeader = receivedDebugHeaders?.['set-cookie'] || receivedDebugHeaders?.['Set-Cookie'];


    if (setCookieHeader) {
      const cookies = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
      for (const cookieStr of cookies) {
        const match = cookieStr.match(/session_id=([^;]+)/);
        if (match && match[1]) {
          sessionIdFromHeader = match[1];
          break; 
        }
      }
    }
    
    if (responseData.error) {
      const errorDetails = responseData.error.data;
      let odooErrorMessage = responseData.error.message;
      if (errorDetails?.message) {
        odooErrorMessage = errorDetails.message;
      } else if (errorDetails?.arguments && Array.isArray(errorDetails.arguments) && errorDetails.arguments.length > 0) {
        odooErrorMessage = errorDetails.arguments.join('; '); 
      }
      const fullOdooError = `Code: ${responseData.error.code}, Message: ${odooErrorMessage}, Details: ${JSON.stringify(errorDetails)}`;
      addLog("UHH Connectivity", `Odoo Authentication Error: ${fullOdooError}`, "Error");
      return {
        success: false,
        message: `Authentication failed: ${odooErrorMessage || "Invalid credentials, database name, or server configuration issue."}`,
        debugHeaders: receivedDebugHeaders,
      };
    }

    if (sessionIdFromHeader) {
      localStorage.setItem("uhh_session_id", sessionIdFromHeader);
      const userDetailsToStore = {
        uid: responseData.result?.uid,
        name: responseData.result?.name,
        username: responseData.result?.username || username,
        db: responseData.result?.db || dbName, // Odoo might return the DB name in result.db
        url: uhhBaseUrl,
        isAdmin: responseData.result?.is_admin,
        companyId: responseData.result?.company_id || responseData.result?.user_companies?.current_company?.[0],
        partnerId: responseData.result?.partner_id,
        userContext: responseData.result?.user_context,
      };
      localStorage.setItem("uhh_user_details", JSON.stringify(userDetailsToStore));
      addLog("UHH Connectivity", `Authentication successful via header. Session ID obtained (last 5 chars): ...${sessionIdFromHeader.slice(-5)}. User: ${userDetailsToStore.name || userDetailsToStore.username}`, "Success");
      return {
        success: true,
        message: "Authentication successful! Session established via header.",
        data: responseData.result,
        debugHeaders: receivedDebugHeaders,
        sessionIdFromHeader: sessionIdFromHeader,
      };
    }

    // Fallback: Check if session_id is in the body (less common for /web/session/authenticate with header method but good for completeness)
    if (responseData.result?.session_id) {
      localStorage.setItem("uhh_session_id", responseData.result.session_id);
      const userDetailsToStore = {
        uid: responseData.result.uid,
        name: responseData.result.name,
        username: responseData.result.username,
        db: responseData.result.db || dbName,
        url: uhhBaseUrl,
        isAdmin: responseData.result.is_admin,
        companyId: responseData.result.company_id || responseData.result.user_companies?.current_company?.[0],
        partnerId: responseData.result.partner_id,
        userContext: responseData.result.user_context,
      };
      localStorage.setItem("uhh_user_details", JSON.stringify(userDetailsToStore));
      addLog("UHH Connectivity", `Authentication successful via response body. Session ID (last 5 chars): ...${responseData.result.session_id.slice(-5)}. User: ${userDetailsToStore.name || userDetailsToStore.username}`, "Success");
       return {
        success: true,
        message: "Authentication successful! Session established via response body.",
        data: responseData.result,
        debugHeaders: receivedDebugHeaders,
        sessionIdFromHeader: responseData.result.session_id, 
      };
    }
    
    addLog("UHH Connectivity", `Authentication response did not contain an error, but no session_id found in 'Set-Cookie' header or response body. Response: ${JSON.stringify(responseData)}. Headers: ${JSON.stringify(receivedDebugHeaders)}`, "Error");
    return {
      success: false,
      message: "Authentication Succeeded (no error from Odoo), but Session ID not found in response header or body. Check Odoo logs or configuration.",
      debugHeaders: receivedDebugHeaders,
    };

  } catch (error) {
    let errorMessage = "Connection failed due to an unexpected client-side error. Please check your network or the UHH URL.";
    if (error instanceof Error) {
        errorMessage = `Client-side connection error: ${error.message}`;
    }
    addLog("UHH Connectivity", `Critical client-side error during connection test: ${errorMessage}. Error object: ${String(error)}`, "Error");
    return { success: false, message: errorMessage, debugHeaders: receivedDebugHeaders };
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
    addLog("UHH Connectivity", "Page loaded. Checking for existing session and user details.", "Debug");
    const storedSessionId = localStorage.getItem("uhh_session_id");
    const storedUserDetailsRaw = localStorage.getItem("uhh_user_details");

    if (storedUserDetailsRaw) {
      try {
        const userDetails = JSON.parse(storedUserDetailsRaw);
        setUhhUrl(userDetails.url || "");
        setUsername(userDetails.username || "");
        setDbName(userDetails.db || "");

        if (storedSessionId && userDetails.url && (userDetails.username || userDetails.name) && userDetails.db) {
          setActiveSession({
            sessionId: storedSessionId,
            user: userDetails.name || userDetails.username || "Unknown User",
            db: userDetails.db,
            url: userDetails.url,
          });
           addLog("UHH Connectivity", `Active session found for user ${userDetails.name || userDetails.username}. Session ID (last 5): ...${storedSessionId.slice(-5)}`, "Info");
        } else {
            if(storedSessionId) { // User details exist, but session ID was stale or incomplete
                localStorage.removeItem("uhh_session_id"); 
                addLog("UHH Connectivity", "Stored user details found, but session ID was stale/incomplete. Cleared stale session.", "Debug");
            }
            setActiveSession(null);
        }
      } catch (e) {
        console.error("Failed to parse stored user details", e);
        addLog("UHH Connectivity", `Error parsing stored user details: ${e instanceof Error ? e.message : String(e)}`, "Error");
        localStorage.removeItem("uhh_session_id");
        localStorage.removeItem("uhh_user_details");
        setActiveSession(null);
      }
    } else {
      // No user details stored, ensure no session ID lingers
      if(localStorage.getItem("uhh_session_id")) {
        localStorage.removeItem("uhh_session_id"); 
        addLog("UHH Connectivity", "No stored user details, but a session_id was found. Cleared stale session_id.", "Debug");
      }
      setActiveSession(null);
      addLog("UHH Connectivity", "No stored user details or session found.", "Debug");
    }
  }, []);

  const canTestConnection = Boolean(uhhUrl && username && password && dbName);

  const handleTestConnection = async () => {
    if (!canTestConnection || isLoading) return;
    setIsLoading(true);

    const result = await testUhhConnection(uhhUrl, username, password, dbName);
    setIsLoading(false);

    toast({
      title: result.success ? "Success" : "Error",
      description: result.message,
      variant: result.success ? "default" : "destructive",
      duration: result.success ? 5000 : 9000, 
    });

    if (result.success && result.sessionIdFromHeader) {
        setActiveSession({
            sessionId: result.sessionIdFromHeader,
            user: result.data?.name || result.data?.username || username,
            db: result.data?.db || dbName,
            url: uhhUrl,
        });
        setPassword(""); 
    } else if (!result.success) {
        setActiveSession(null); 
    }
  };

  const handleLogout = () => {
    addLog("UHH Connectivity", `User ${activeSession?.user || 'unknown'} logged out. Session cleared. Session ID (last 5): ...${activeSession?.sessionId.slice(-5)}`, "Info");
    localStorage.removeItem("uhh_session_id");
    // User details (URL, username, DB name) are kept in localStorage for convenience for next login.
    // Consider if userDetails should be cleared if privacy is a higher concern or if they become invalid.
    // localStorage.removeItem("uhh_user_details"); // Uncomment if you want to clear everything on logout
    setActiveSession(null);
    setPassword(""); 
    toast({
      title: "Logged Out",
      description: "UHH session has been cleared. Your connection details (URL, username, DB name) are remembered for next time.",
    });
  };


  return (
    <Card className="shadow-lg rounded-lg">
      <CardHeader className="border-b">
        <div className="flex items-center gap-3">
          <Network className="h-8 w-8 text-primary" />
          <CardTitle className="font-headline text-2xl">UHH Connectivity</CardTitle>
        </div>
        <CardDescription>Configure and test connectivity to the UHH (Odoo) server. Session details are stored securely.</CardDescription>
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
            <p className="text-xs text-green-600 mt-1 truncate">Session ID: ...{activeSession.sessionId.slice(-10)} (Last 10 chars)</p>
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
            <p className="text-xs text-muted-foreground mt-1">The base URL of your Odoo instance (e.g., http://localhost:8069 or https://mycompany.odoo.com).</p>
          </div>
          <div>
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              placeholder="Enter your UHH username (e.g., email)"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isLoading || !!activeSession}
              autoComplete="username"
            />
            <p className="text-xs text-muted-foreground mt-1">Your Odoo login username.</p>
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
             <p className="text-xs text-muted-foreground mt-1">Your Odoo login password. This is not stored after successful login.</p>
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
            <p className="text-xs text-muted-foreground mt-1">The name of the Odoo database you want to connect to.</p>
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

