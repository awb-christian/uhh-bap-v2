
"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Network, Loader2, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface UhhAuthResponseResult {
  uid: number;
  is_admin?: boolean;
  name?: string;
  username?: string;
  partner_id?: number;
  company_id?: number;
  db?: string;
  // session_id might not be in the body, will be extracted from headers
  session_id?: string; 
}

interface UhhAuthResponseErrorData {
  name?: string;
  debug?: string;
  message?: string;
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
  data?: UhhAuthResponseResult; // Odoo's JSON 'result' part
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

  const odooPayload = {
    jsonrpc: "2.0",
    params: {
      login: username,
      password: password,
      db: dbName,
    },
  };

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
      return {
        success: false,
        message: `Proxy or Server error: ${proxyResponse.status} ${proxyResponse.statusText}. ${errorData.message || errorData.details || "An unexpected error occurred with the proxy."}`.trim(),
        debugHeaders: receivedDebugHeaders,
      };
    }

    const responseData: UhhAuthResponse = responseBody;

    if (responseData.error) {
      return {
        success: false,
        message: `Authentication failed: ${responseData.error.data?.message || responseData.error.message || "Invalid credentials, database name, or server error."}`,
        debugHeaders: receivedDebugHeaders,
      };
    }

    // Attempt to extract session_id from Set-Cookie header
    let sessionIdFromHeader: string | null = null;
    const setCookieHeader = receivedDebugHeaders?.['set-cookie'];
    if (setCookieHeader) {
      const REX = /session_id=([^;]+)/;
      const match = (typeof setCookieHeader === 'string' ? setCookieHeader : setCookieHeader[0] || '').match(REX); // Handle if set-cookie is an array
      if (match && match[1]) {
        sessionIdFromHeader = match[1];
      }
    }

    if (sessionIdFromHeader) {
      localStorage.setItem("uhh_session_id", sessionIdFromHeader);
      localStorage.setItem("uhh_user_details", JSON.stringify({
        uid: responseData.result?.uid,
        name: responseData.result?.name,
        username: responseData.result?.username || username, // Fallback to input username
        db: responseData.result?.db || dbName, // Fallback to input dbName
        url: uhhBaseUrl,
        isAdmin: responseData.result?.is_admin,
        companyId: responseData.result?.company_id,
        partnerId: responseData.result?.partner_id,
      }));
      return {
        success: true,
        message: "Authentication successful! Session established via header.",
        data: responseData.result, // Odoo might still send other useful details in result
        debugHeaders: receivedDebugHeaders,
        sessionIdFromHeader: sessionIdFromHeader,
      };
    }

    // Fallback to check body if header parsing fails, though primary target is header
    if (responseData.result && responseData.result.session_id) {
      localStorage.setItem("uhh_session_id", responseData.result.session_id);
      localStorage.setItem("uhh_user_details", JSON.stringify({
        uid: responseData.result.uid,
        name: responseData.result.name,
        username: responseData.result.username,
        db: responseData.result.db || dbName,
        url: uhhBaseUrl,
        isAdmin: responseData.result.is_admin,
        companyId: responseData.result.company_id,
        partnerId: responseData.result.partner_id,
      }));
       return {
        success: true,
        message: "Authentication successful! Session established via body.",
        data: responseData.result,
        debugHeaders: receivedDebugHeaders,
        sessionIdFromHeader: responseData.result.session_id, 
      };
    }
    

    return {
      success: false,
      message: "Authentication failed: Session ID not found in response headers or body. Check Odoo logs.",
      debugHeaders: receivedDebugHeaders,
    };

  } catch (error) {
    console.error("UHH Connection test error (via proxy):", error);
    let errorMessage = "Connection failed. Please check your network or the UHH URL.";
    if (error instanceof Error) {
        errorMessage = `Connection error: ${error.message}`;
    }
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
  // const [debugHeaders, setDebugHeaders] = React.useState<Record<string, string> | null>(null); // Removing debug display

  React.useEffect(() => {
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
        } else {
            localStorage.removeItem("uhh_session_id"); 
            setActiveSession(null);
        }
      } catch (e) {
        console.error("Failed to parse stored user details", e);
        localStorage.removeItem("uhh_session_id");
        localStorage.removeItem("uhh_user_details");
        setActiveSession(null);
      }
    } else {
      localStorage.removeItem("uhh_session_id"); 
      setActiveSession(null);
    }
  }, []);

  const canTestConnection = Boolean(uhhUrl && username && password && dbName);

  const handleTestConnection = async () => {
    if (!canTestConnection) return;
    setIsLoading(true);
    // setDebugHeaders(null); // No longer needed for display

    const result = await testUhhConnection(uhhUrl, username, password, dbName);
    setIsLoading(false);
    // setDebugHeaders(result.debugHeaders || null); // No longer needed for display

    toast({
      title: result.success ? "Success" : "Error",
      description: result.message,
      variant: result.success ? "default" : "destructive",
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
        setPassword(""); 
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("uhh_session_id");
    // Keep uhh_user_details so form fields are pre-filled next time.
    setActiveSession(null);
    setPassword(""); 
    // setDebugHeaders(null); // No longer needed for display
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

        {/* Removed debugHeaders display section */}
      </CardContent>
    </Card>
  );
}

