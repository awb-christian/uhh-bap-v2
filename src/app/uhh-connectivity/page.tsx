
"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select";
import { Network, Loader2, CheckCircle, XCircle, UploadCloud } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { addLog } from "@/lib/app-logger"; 
import { getAttendanceTransactions, updateAttendanceTransactionStatus, type AttendanceTransaction } from "@/lib/attendance-manager";


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

const PUSH_FREQUENCY_OPTIONS = [
  { value: "5m", label: "Every 5 minutes" },
  { value: "15m", label: "Every 15 minutes" },
  { value: "30m", label: "Every 30 minutes" },
  { value: "1h", label: "Every 1 hour" },
];

const PUSH_BATCH_SIZE_OPTIONS = [
  { value: "20", label: "20 records" },
  { value: "50", label: "50 records" },
  { value: "100", label: "100 records" },
  { value: "200", label: "200 records" },
  { value: "500", label: "500 records" },
];


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
      db: dbName,
      login: username,
      password: password,
    },
  };
  
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
        db: responseData.result?.db || dbName, 
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
  const [isPushing, setIsPushing] = React.useState(false);
  const [activeSession, setActiveSession] = React.useState<{sessionId: string; user: string; db: string; url: string} | null>(null);

  const [pushFrequency, setPushFrequency] = React.useState<string>(PUSH_FREQUENCY_OPTIONS[1].value); // Default 15m
  const [pushBatchSize, setPushBatchSize] = React.useState<string>(PUSH_BATCH_SIZE_OPTIONS[1].value); // Default 50 records

  React.useEffect(() => {
    addLog("UHH Connectivity", "Page loaded. Initializing settings.", "Debug");
    const storedUserDetailsRaw = localStorage.getItem("uhh_user_details");
    const storedSessionId = localStorage.getItem("uhh_session_id");
    const storedPushFrequency = localStorage.getItem("uhh_pushFrequency");
    const storedPushBatchSize = localStorage.getItem("uhh_pushBatchSize");

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
            if(storedSessionId) { 
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
      if(localStorage.getItem("uhh_session_id")) {
        localStorage.removeItem("uhh_session_id"); 
        addLog("UHH Connectivity", "No stored user details, but a session_id was found. Cleared stale session_id.", "Debug");
      }
      setActiveSession(null);
      addLog("UHH Connectivity", "No stored user details or session found.", "Debug");
    }

    if (storedPushFrequency && PUSH_FREQUENCY_OPTIONS.find(opt => opt.value === storedPushFrequency)) {
      setPushFrequency(storedPushFrequency);
    } else {
      localStorage.setItem("uhh_pushFrequency", PUSH_FREQUENCY_OPTIONS[1].value);
    }
    if (storedPushBatchSize && PUSH_BATCH_SIZE_OPTIONS.find(opt => opt.value === storedPushBatchSize)) {
      setPushBatchSize(storedPushBatchSize);
    } else {
      localStorage.setItem("uhh_pushBatchSize", PUSH_BATCH_SIZE_OPTIONS[1].value);
    }

  }, []);


  React.useEffect(() => {
    if (activeSession) { // Only save if there's an active session, otherwise defaults are fine
        localStorage.setItem("uhh_pushFrequency", pushFrequency);
        addLog("UHH Connectivity", `Push frequency set to: ${PUSH_FREQUENCY_OPTIONS.find(o => o.value === pushFrequency)?.label || pushFrequency}.`, "Info");
    }
  }, [pushFrequency, activeSession]);

  React.useEffect(() => {
    if (activeSession) {
        localStorage.setItem("uhh_pushBatchSize", pushBatchSize);
        addLog("UHH Connectivity", `Push batch size set to: ${PUSH_BATCH_SIZE_OPTIONS.find(o => o.value === pushBatchSize)?.label || pushBatchSize}.`, "Info");
    }
  }, [pushBatchSize, activeSession]);


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
    setActiveSession(null);
    setPassword(""); 
    toast({
      title: "Logged Out",
      description: "UHH session has been cleared. Your connection details and push settings are remembered for next time.",
    });
  };

  // Placeholder function for pushing data
  const handleScheduledPushToUHH = async (isManual: boolean = false) => {
    if (!activeSession) {
      const msg = "Cannot push data: No active UHH session.";
      addLog("UHH Connectivity", msg, "Error");
      if (isManual) toast({ title: "Push Error", description: msg, variant: "destructive" });
      return;
    }
    if (isPushing) {
      const msg = "Push operation already in progress.";
       addLog("UHH Connectivity", msg, "Info");
      if (isManual) toast({ title: "In Progress", description: msg, variant: "default" });
      return;
    }

    setIsPushing(true);
    addLog("UHH Connectivity", "Starting scheduled push to UHH (Simulated).", "Info");

    const allTransactions = getAttendanceTransactions();
    const notUploadedTransactions = allTransactions.filter(t => t.status === 'not_uploaded');
    
    if (notUploadedTransactions.length === 0) {
      addLog("UHH Connectivity", "No 'not_uploaded' attendance records to push.", "Info");
      if (isManual) toast({ title: "No Data", description: "No new attendance records to push.", });
      setIsPushing(false);
      return;
    }

    const batchSize = parseInt(pushBatchSize, 10);
    const batchToPush = notUploadedTransactions.slice(0, batchSize);
    const batchIds = batchToPush.map(t => t.id);

    // Transform data for Odoo (Placeholder - actual transformation would be more complex)
    const odooFormattedBatch = batchToPush.map(t => ({
      employee_external_id: t.employee_id, // Odoo needs its own internal ID, this is a placeholder
      timestamp: t.transaction_time,
      action: t.transaction_type === 'check-in' ? 'sign_in' : 'sign_out', // Odoo's 'hr.attendance' might use 'action'
      device_id: t.device_id,
    }));

    const pushPayload = {
      jsonrpc: "2.0",
      method: "call", // Common for custom JSON-RPC endpoints or execute_kw
      params: {
        // These params depend heavily on the Odoo endpoint structure
        // For a custom endpoint:
        // attendance_data: odooFormattedBatch,
        // For execute_kw to create hr.attendance:
        service: "object",
        method: "execute_kw",
        args: [
          activeSession.db,
          JSON.parse(localStorage.getItem("uhh_user_details") || "{}").uid, // UID
          "session_id_is_in_cookie_via_proxy", // Password/API key (or session is used)
          "hr.attendance", // Model
          "create", // Method
          [odooFormattedBatch.map(d => ({ // Mapping to Odoo's hr.attendance fields
            employee_id: `(select id from hr_employee where barcode = '${d.employee_external_id}' limit 1)`, // Placeholder for lookup
            [d.action === 'sign_in' ? 'check_in' : 'check_out']: d.timestamp,
            // You might need to send 'check_in' for both, and Odoo handles pairing.
            // Or send check_in for 'sign_in' and check_out for 'sign_out'.
            // This requires careful design of the Odoo receiving end.
          }))]
        ],
      },
      id: `push_${Date.now()}`
    };

    const targetPushUrl = `${activeSession.url.replace(/\/$/, "")}/api/custom/batch_attendance_create`; // Conceptual custom endpoint
    // Or for JSON-RPC: const targetPushUrl = `${activeSession.url.replace(/\/$/, "")}/jsonrpc`;

    addLog("UHH Connectivity", `Attempting to push ${batchToPush.length} records to ${targetPushUrl}. Batch IDs: ${batchIds.join(', ')}.`, "Info");
    addLog("UHH Connectivity", `Simulated Odoo Payload: ${JSON.stringify(pushPayload, null, 2)}`, "Debug");


    // Simulate API call with retry logic (conceptual)
    let success = false;
    const MAX_RETRIES = 3;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        // In a real scenario, the session_id would be sent as a cookie.
        // The proxy must be configured to pass this cookie to Odoo.
        // Or, if Odoo endpoint expects session_id in payload, include it.
        const proxyResponse = await fetch("/api/uhh-proxy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ targetUrl: targetPushUrl, payload: pushPayload }),
        });

        const responseBody = await proxyResponse.json().catch(() => ({}));

        if (proxyResponse.ok) {
          // Assuming Odoo endpoint returns { result: true } or similar on success
          const odooResult = responseBody.result; // Adjust based on actual Odoo response
          if (odooResult && (odooResult === true || (Array.isArray(odooResult) && odooResult.length > 0) || odooResult.processed_count === batchToPush.length) ) {
             addLog("UHH Connectivity", `Successfully pushed ${batchToPush.length} records (Attempt ${attempt}). Odoo Response: ${JSON.stringify(odooResult)}`, "Success");
            updateAttendanceTransactionStatus(batchIds, "uploaded");
            toast({ title: "Push Successful", description: `${batchToPush.length} records pushed to UHH.` });
            success = true;
            break; 
          } else {
             const errorMessage = `Odoo reported an issue with pushed data (Attempt ${attempt}). Response: ${JSON.stringify(responseBody)}`;
             addLog("UHH Connectivity", errorMessage, "Error");
             if (attempt === MAX_RETRIES) {
                toast({ title: "Push Failed", description: `Odoo reported an issue after ${MAX_RETRIES} attempts. Check logs.`, variant: "destructive" });
             }
          }
        } else {
          const errorData: ProxyErrorResponse = responseBody;
          const errorMessage = `Proxy/Server error during push: ${proxyResponse.status} ${proxyResponse.statusText}. ${errorData.error || errorData.details || "Unknown error"} (Attempt ${attempt})`;
          addLog("UHH Connectivity", errorMessage, "Error");
          if (attempt === MAX_RETRIES) {
            toast({ title: "Push Failed", description: `Failed to push data after ${MAX_RETRIES} attempts due to server/proxy error. Check logs.`, variant: "destructive" });
          }
        }
      } catch (error) {
        const catchMessage = error instanceof Error ? error.message : String(error);
        addLog("UHH Connectivity", `Client-side error during push (Attempt ${attempt}): ${catchMessage}`, "Error");
        if (attempt === MAX_RETRIES) {
           toast({ title: "Push Error", description: `A client-side error occurred during push after ${MAX_RETRIES} attempts. Check logs.`, variant: "destructive" });
        }
      }
      if (!success && attempt < MAX_RETRIES) {
        addLog("UHH Connectivity", `Push attempt ${attempt} failed. Retrying in 5 seconds...`, "Info");
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5s before retry
      }
    }
    setIsPushing(false);
  };


  return (
    <div className="space-y-6">
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
            <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                <h4 className="text-lg font-semibold text-green-800 dark:text-green-300">Active Session</h4>
              </div>
              <p className="text-sm text-green-700 dark:text-green-400">
                Successfully connected as <span className="font-medium">{activeSession.user}</span> to database <span className="font-medium">{activeSession.db}</span> on <span className="font-medium">{activeSession.url}</span>.
              </p>
              <p className="text-xs text-green-600 dark:text-green-400 mt-1 truncate">Session ID: ...{activeSession.sessionId.slice(-10)} (Last 10 chars)</p>
              <Button onClick={handleLogout} variant="outline" size="sm" className="mt-3 border-green-300 text-green-700 hover:bg-green-100 dark:border-green-600 dark:text-green-300 dark:hover:bg-green-700/30">
                Logout / Clear Session
              </Button>
            </div>
          ) : (
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <XCircle className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                <h4 className="text-lg font-semibold text-yellow-800 dark:text-yellow-300">No Active Session</h4>
              </div>
              <p className="text-sm text-yellow-700 dark:text-yellow-400">
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
                disabled={isLoading || !!activeSession || isPushing}
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
                disabled={isLoading || !!activeSession || isPushing}
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
                disabled={isLoading || !!activeSession || isPushing}
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
                disabled={isLoading || !!activeSession || isPushing}
              />
              <p className="text-xs text-muted-foreground mt-1">The name of the Odoo database you want to connect to.</p>
            </div>
          </div>

          {!activeSession && (
              <div className="flex justify-end">
              <Button
                  onClick={handleTestConnection}
                  disabled={!canTestConnection || isLoading || isPushing}
              >
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Test Connection & Authenticate
              </Button>
              </div>
          )}
        </CardContent>
      </Card>

      {activeSession && (
        <Card className="shadow-lg rounded-lg">
            <CardHeader className="border-b">
                <div className="flex items-center gap-3">
                    <UploadCloud className="h-8 w-8 text-primary" />
                    <CardTitle className="font-headline text-2xl">Odoo Data Push Configuration</CardTitle>
                </div>
                <CardDescription>
                    Configure how often and how much attendance data is pushed to the UHH (Odoo) server.
                    This requires an active session.
                </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
                <div className="space-y-2">
                    <Label htmlFor="push-frequency">Push Data Frequency</Label>
                    <Select 
                        value={pushFrequency} 
                        onValueChange={setPushFrequency}
                        disabled={isPushing}
                    >
                        <SelectTrigger id="push-frequency">
                            <SelectValue placeholder="Select frequency" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectGroup>
                                <SelectLabel>Frequency</SelectLabel>
                                {PUSH_FREQUENCY_OPTIONS.map(option => (
                                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                                ))}
                            </SelectGroup>
                        </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                        How often the application should automatically attempt to push 'Not Uploaded' attendance records to Odoo.
                    </p>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="push-batch-size">Records Per Push</Label>
                     <Select 
                        value={pushBatchSize} 
                        onValueChange={setPushBatchSize}
                        disabled={isPushing}
                    >
                        <SelectTrigger id="push-batch-size">
                            <SelectValue placeholder="Select batch size" />
                        </SelectTrigger>
                        <SelectContent>
                             <SelectGroup>
                                <SelectLabel>Batch Size</SelectLabel>
                                {PUSH_BATCH_SIZE_OPTIONS.map(option => (
                                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                                ))}
                            </SelectGroup>
                        </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                        The maximum number of 'Not Uploaded' attendance records to include in a single push attempt.
                    </p>
                </div>
            </CardContent>
            <CardFooter className="border-t pt-6">
                 <Button onClick={() => handleScheduledPushToUHH(true)} disabled={isPushing || !activeSession}>
                    {isPushing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <UploadCloud className="mr-2 h-4 w-4" /> Push Attendance Data Now
                </Button>
            </CardFooter>
        </Card>
      )}
    </div>
  );
}

    