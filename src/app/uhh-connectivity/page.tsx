
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

// This page simulates interaction with an Odoo server via a proxy.
// For a production Electron app:
// - Direct Odoo calls can be made from Electron's main process if CORS allows or if using Odoo's RPC libraries.
// - Storing user credentials (even derived session IDs) requires care. Electron's 'safeStorage' can be used.
// - Background data push scheduling MUST be done in Electron's main process.

interface UhhAuthResponseResult {
  uid: number;
  is_admin?: boolean;
  name?: string;
  username?: string;
  partner_id?: number;
  company_id?: number;
  db?: string;
  session_id?: string; // Can be in response body OR in Set-Cookie header
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
  debug_headers?: Record<string, string>; // Added by our proxy
}

interface ProxyErrorResponse {
    error: string;
    details?: string;
    debug_headers?: Record<string, string>; // Added by our proxy
}

interface TestConnectionResult {
  success: boolean;
  message: string;
  data?: UhhAuthResponseResult; 
  debugHeaders?: Record<string, string> | null;
  sessionIdFromHeader?: string | null; // Explicitly track session ID source
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

/**
 * Attempts to authenticate with the Odoo server via the Next.js API proxy.
 * @param uhhBaseUrl - The base URL of the Odoo instance.
 * @param username - Odoo login username.
 * @param password - Odoo login password.
 * @param dbName - Odoo database name.
 * @returns Promise<TestConnectionResult> - Result of the authentication attempt.
 */
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
  
  addLog("UHH Connectivity", `Attempting authentication to ${odooFullAuthUrl} for user ${username}, DB: ${dbName}.`, "Info");

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

    // Try to parse JSON, but handle cases where it might not be (e.g. network error before proxy)
    let responseBody;
    try {
        responseBody = await proxyResponse.json();
    } catch (parseError) {
        const errorText = await proxyResponse.text().catch(() => "Could not read response body.");
        addLog("UHH Connectivity", `Proxy response parsing error. Status: ${proxyResponse.status} ${proxyResponse.statusText}. Body: ${errorText.substring(0,300)}`, "Error");
        return {
            success: false,
            message: `Failed to parse response from proxy. Status: ${proxyResponse.status}. Check network or proxy logs.`,
            debugHeaders: null, // Headers might not be available if parsing failed early
        };
    }
    
    receivedDebugHeaders = responseBody.debug_headers || null;

    if (!proxyResponse.ok) {
      const errorData: ProxyErrorResponse = responseBody;
      const errorMessage = `Proxy or Odoo Server error: ${proxyResponse.status} ${proxyResponse.statusText}. ${errorData.error || errorData.details || "An unexpected error occurred."}`.trim();
      addLog("UHH Connectivity", `Proxy/Server Error: ${errorMessage}. Status: ${proxyResponse.status}. Odoo Response Body (if any): ${JSON.stringify(responseBody)}. Headers: ${JSON.stringify(receivedDebugHeaders)}`, "Error");
      return {
        success: false,
        message: errorMessage,
        debugHeaders: receivedDebugHeaders,
      };
    }

    const responseData: UhhAuthResponse = responseBody;

    let sessionIdFromHeader: string | null = null;
    // Odoo might send multiple Set-Cookie headers as an array or a single string
    const setCookieHeader = receivedDebugHeaders?.['set-cookie'] || receivedDebugHeaders?.['Set-Cookie'];

    if (setCookieHeader) {
      const cookies = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
      for (const cookieStr of cookies) {
        const match = cookieStr.match(/session_id=([^;]+)/);
        if (match && match[1] && match[1] !== "false" && match[1] !== "") { // Ensure session_id is not 'false' or empty
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
      const fullOdooError = `Code: ${responseData.error.code}, Message: ${odooErrorMessage || 'Odoo error'}, Details: ${JSON.stringify(errorDetails)}`;
      addLog("UHH Connectivity", `Odoo Authentication Error: ${fullOdooError}`, "Error");
      return {
        success: false,
        message: `Authentication failed: ${odooErrorMessage || "Invalid credentials, database name, or server configuration issue."}`,
        debugHeaders: receivedDebugHeaders,
      };
    }

    // Prefer session_id from Set-Cookie header as it's the standard way Odoo establishes sessions
    if (sessionIdFromHeader) {
      // WARNING: Storing session_id in localStorage is convenient but has security implications.
      // For Electron, consider using main process memory or safeStorage if more robustness is needed.
      localStorage.setItem("uhh_session_id", sessionIdFromHeader);
      const userDetailsToStore = {
        uid: responseData.result?.uid,
        name: responseData.result?.name,
        username: responseData.result?.username || username, // Fallback to login username
        db: responseData.result?.db || dbName,  // Fallback to provided dbName
        url: uhhBaseUrl,
        isAdmin: responseData.result?.is_admin,
        companyId: responseData.result?.company_id || responseData.result?.user_companies?.current_company?.[0],
        partnerId: responseData.result?.partner_id,
        userContext: responseData.result?.user_context,
      };
      localStorage.setItem("uhh_user_details", JSON.stringify(userDetailsToStore));
      addLog("UHH Connectivity", `Authentication successful (via Set-Cookie header). Session ID (last 5 chars): ...${sessionIdFromHeader.slice(-5)}. User: ${userDetailsToStore.name || userDetailsToStore.username}`, "Success");
      return {
        success: true,
        message: "Authentication successful! Session established.",
        data: responseData.result,
        debugHeaders: receivedDebugHeaders,
        sessionIdFromHeader: sessionIdFromHeader,
      };
    }
    
    // Fallback to session_id from response body (less common for /web/session/authenticate but possible)
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
      addLog("UHH Connectivity", `Authentication successful (via response body). Session ID (last 5 chars): ...${responseData.result.session_id.slice(-5)}. User: ${userDetailsToStore.name || userDetailsToStore.username}`, "Success");
       return {
        success: true,
        message: "Authentication successful! Session established.",
        data: responseData.result,
        debugHeaders: receivedDebugHeaders,
        sessionIdFromHeader: responseData.result.session_id, 
      };
    }
    
    // If neither header nor body session_id is found, but no Odoo error was reported
    addLog("UHH Connectivity", `Authentication response OK, but no session_id found in 'Set-Cookie' header or response body. Response: ${JSON.stringify(responseData)}. Headers: ${JSON.stringify(receivedDebugHeaders)}`, "Error");
    return {
      success: false,
      message: "Authentication Succeeded (no error from Odoo), but Session ID not found. Check Odoo logs or configuration (e.g. session handling).",
      debugHeaders: receivedDebugHeaders,
    };

  } catch (error) {
    let errorMessage = "Connection failed due to an unexpected client-side error. Check your network or the UHH URL.";
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
  const [password, setPassword] = React.useState(""); // Not persisted after successful auth
  const [dbName, setDbName] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [isPushing, setIsPushing] = React.useState(false);
  const [activeSession, setActiveSession] = React.useState<{sessionId: string; user: string; db: string; url: string} | null>(null);

  const [pushFrequency, setPushFrequency] = React.useState<string>(PUSH_FREQUENCY_OPTIONS[1].value); // Default 15m
  const [pushBatchSize, setPushBatchSize] = React.useState<string>(PUSH_BATCH_SIZE_OPTIONS[1].value); // Default 50 records

  React.useEffect(() => {
    addLog("UHH Connectivity", "Page loaded. Initializing settings from localStorage.", "Debug");
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
           addLog("UHH Connectivity", `Active session restored for user ${userDetails.name || userDetails.username}. Session ID (last 5): ...${storedSessionId.slice(-5)}`, "Info");
        } else {
            // Clear potentially stale session if user details are incomplete
            if(storedSessionId) localStorage.removeItem("uhh_session_id"); 
            setActiveSession(null);
             addLog("UHH Connectivity", "Stored user details incomplete or stale session ID found. Session cleared.", "Debug");
        }
      } catch (e) {
        console.error("Failed to parse stored user details", e);
        addLog("UHH Connectivity", `Error parsing stored user details: ${e instanceof Error ? e.message : String(e)}. Clearing session.`, "Error");
        localStorage.removeItem("uhh_session_id");
        localStorage.removeItem("uhh_user_details");
        setActiveSession(null);
      }
    } else {
      if(localStorage.getItem("uhh_session_id")) localStorage.removeItem("uhh_session_id"); // Clean up orphan session_id
      setActiveSession(null);
    }

    // Load push settings, defaulting if not found
    if (storedPushFrequency && PUSH_FREQUENCY_OPTIONS.find(opt => opt.value === storedPushFrequency)) {
      setPushFrequency(storedPushFrequency);
    } else {
      localStorage.setItem("uhh_pushFrequency", PUSH_FREQUENCY_OPTIONS[1].value); // Persist default
      setPushFrequency(PUSH_FREQUENCY_OPTIONS[1].value);
    }
    if (storedPushBatchSize && PUSH_BATCH_SIZE_OPTIONS.find(opt => opt.value === storedPushBatchSize)) {
      setPushBatchSize(storedPushBatchSize);
    } else {
      localStorage.setItem("uhh_pushBatchSize", PUSH_BATCH_SIZE_OPTIONS[1].value); // Persist default
      setPushBatchSize(PUSH_BATCH_SIZE_OPTIONS[1].value);
    }
  }, []);


  React.useEffect(() => {
    localStorage.setItem("uhh_pushFrequency", pushFrequency);
  }, [pushFrequency]);

  React.useEffect(() => {
    localStorage.setItem("uhh_pushBatchSize", pushBatchSize);
  }, [pushBatchSize]);


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

    if (result.success && result.sessionIdFromHeader && result.data) {
        setActiveSession({
            sessionId: result.sessionIdFromHeader,
            user: result.data.name || result.data.username || username,
            db: result.data.db || dbName,
            url: uhhUrl,
        });
        setPassword(""); // Clear password field after successful authentication
    } else if (!result.success) {
        setActiveSession(null); // Ensure session is cleared on failure
    }
  };

  const handleLogout = () => {
    addLog("UHH Connectivity", `User ${activeSession?.user || 'unknown'} logged out. Session and related details cleared. Session ID (last 5): ...${activeSession?.sessionId.slice(-5)}`, "Info");
    localStorage.removeItem("uhh_session_id");
    localStorage.removeItem("uhh_user_details"); // Clear all stored user details on logout
    setActiveSession(null);
    setPassword(""); 
    // Do not clear URL, username, dbName fields, so user can easily re-login
    toast({
      title: "Logged Out",
      description: "UHH session has been cleared. Your connection details (URL, username, DB) are remembered.",
    });
  };

  /**
   * Placeholder function to simulate pushing attendance data to Odoo.
   * In Electron, this would involve IPC to the main process for the actual HTTP request
   * and database updates.
   * @param isManual - Indicates if the push was triggered manually by the user.
   */
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
    const pushType = isManual ? "Manual" : "Scheduled";
    addLog("UHH Connectivity", `Starting ${pushType} push to UHH (Odoo). Session: ...${activeSession.sessionId.slice(-5)}`, "Info");

    const allTransactions = getAttendanceTransactions();
    const notUploadedTransactions = allTransactions.filter(t => t.status === 'not_uploaded');
    
    if (notUploadedTransactions.length === 0) {
      addLog("UHH Connectivity", "No 'not_uploaded' attendance records to push.", "Info");
      if (isManual) toast({ title: "No Data", description: "No new attendance records to push." });
      setIsPushing(false);
      return;
    }

    const batchSize = parseInt(pushBatchSize, 10);
    const batchToPush = notUploadedTransactions.slice(0, batchSize);
    const batchIds = batchToPush.map(t => t.id);

    // TODO: [Electron Main Process] Refine Odoo data transformation.
    // The structure of 'params' for 'execute_kw' or a custom endpoint needs to be precise.
    // employee_id lookup (e.g., by barcode) usually happens on Odoo side or needs pre-fetching.
    const odooFormattedBatch = batchToPush.map(t => ({
      employee_external_id: t.employee_id, 
      timestamp: t.transaction_time,
      action: t.transaction_type === 'check-in' ? 'sign_in' : 'sign_out',
      device_id: t.device_id,
    }));

    // This payload is conceptual for a custom Odoo endpoint.
    // For Odoo's standard 'execute_kw' to create 'hr.attendance', the payload would be different.
    const pushPayload = {
      jsonrpc: "2.0",
      method: "call", 
      params: {
        attendance_data: odooFormattedBatch, 
        // session_id: activeSession.sessionId // Might be needed if not using cookies, but proxy should handle cookies.
      },
      id: `push_${Date.now()}`
    };

    // Conceptual Odoo endpoint for batch creating attendance.
    const targetPushUrl = `${activeSession.url.replace(/\/$/, "")}/api/custom/batch_attendance_create`; 
    addLog("UHH Connectivity", `Attempting to push ${batchToPush.length} records to ${targetPushUrl}. Batch IDs (first 5): ${batchIds.slice(0,5).join(', ')}.`, "Info");
    // addLog("UHH Connectivity", `Simulated Odoo Payload: ${JSON.stringify(pushPayload)}`, "Debug"); // Can be verbose

    // TODO: [Electron Main Process] Implement actual scheduled push logic, including robust retry.
    // The scheduler (e.g., setInterval or node-cron) would live in the main process.
    let success = false;
    const MAX_RETRIES = 2; // Reduced for faster UI feedback during simulation
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        // The proxy MUST be configured to forward the session_id cookie from localStorage
        // or the Electron main process must handle attaching it.
        const proxyResponse = await fetch("/api/uhh-proxy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ targetUrl: targetPushUrl, payload: pushPayload }),
        });

        const responseBody = await proxyResponse.json().catch(() => ({ error: "Failed to parse proxy JSON response" }));

        if (proxyResponse.ok) {
          // TODO: Define clear success criteria based on actual Odoo endpoint response.
          // Example: responseBody.result?.processed_count === batchToPush.length
          const odooResult = responseBody.result; 
          if (odooResult && (odooResult === true || odooResult.success || (typeof odooResult.processed_count === 'number' && odooResult.processed_count > 0) )) {
             addLog("UHH Connectivity", `Successfully pushed ${batchToPush.length} records (Attempt ${attempt}). Odoo Response: ${JSON.stringify(odooResult).substring(0,100)}...`, "Success");
            updateAttendanceTransactionStatus(batchIds, "uploaded");
            if (isManual) toast({ title: "Push Successful", description: `${batchToPush.length} records pushed to Odoo.` });
            success = true;
            break; 
          } else {
             const errorMessage = `Odoo reported an issue with pushed data (Attempt ${attempt}). Response: ${JSON.stringify(responseBody).substring(0,300)}`;
             addLog("UHH Connectivity", errorMessage, "Error");
             if (attempt === MAX_RETRIES && isManual) {
                toast({ title: "Push Failed", description: `Odoo reported an issue after ${MAX_RETRIES} attempts. Check logs. Details: ${responseBody.error?.message || responseBody.error || 'Unknown Odoo error'}`, variant: "destructive", duration: 7000 });
             }
          }
        } else {
          const errorData: ProxyErrorResponse | UhhAuthResponse = responseBody;
          let detailMsg = "Unknown proxy/server error.";
          if ('error' in errorData && typeof errorData.error === 'string') detailMsg = errorData.error;
          if ('details' in errorData && typeof errorData.details === 'string') detailMsg += ` ${errorData.details}`;
          if ('error' in errorData && typeof errorData.error === 'object' && errorData.error?.message) detailMsg = errorData.error.message;


          const errorMessage = `Proxy/Server error during push: ${proxyResponse.status} ${proxyResponse.statusText}. ${detailMsg} (Attempt ${attempt})`;
          addLog("UHH Connectivity", errorMessage, "Error");
          if (attempt === MAX_RETRIES && isManual) {
            toast({ title: "Push Failed", description: `Failed to push data after ${MAX_RETRIES} attempts due to server/proxy error. Check logs.`, variant: "destructive" });
          }
        }
      } catch (error) {
        const catchMessage = error instanceof Error ? error.message : String(error);
        addLog("UHH Connectivity", `Client-side error during push (Attempt ${attempt}): ${catchMessage}`, "Error");
        if (attempt === MAX_RETRIES && isManual) {
           toast({ title: "Push Error", description: `A client-side error occurred during push after ${MAX_RETRIES} attempts. Check logs.`, variant: "destructive" });
        }
      }
      if (!success && attempt < MAX_RETRIES) {
        addLog("UHH Connectivity", `Push attempt ${attempt} failed. Retrying in 3 seconds...`, "Info");
        await new Promise(resolve => setTimeout(resolve, 3000)); // Shorter retry for simulation
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
            <CardTitle className="font-headline text-2xl">UHH Odoo Connectivity</CardTitle>
          </div>
          <CardDescription>Configure and test connectivity to the UHH (Odoo) server. Session details are stored locally for convenience (password is not stored after login).</CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          {activeSession ? (
            <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                <h4 className="text-lg font-semibold text-green-800 dark:text-green-300">Active Session</h4>
              </div>
              <p className="text-sm text-green-700 dark:text-green-400">
                Connected as <span className="font-medium">{activeSession.user}</span> to database <span className="font-medium">{activeSession.db}</span> on <span className="font-medium">{activeSession.url}</span>.
              </p>
              <p className="text-xs text-green-600 dark:text-green-400 mt-1 truncate" title={`Full Session ID: ${activeSession.sessionId}`}>Session ID: ...{activeSession.sessionId.slice(-10)} (Last 10 chars)</p>
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
                Please enter your UHH server details and test the connection. Previously used details (URL, Username, DB) are pre-filled if available.
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
                placeholder="Enter your Odoo username (e.g., email)"
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
                placeholder="Enter your Odoo password"
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
                placeholder="Enter the Odoo database name"
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
                    Configure how often and how much attendance data is pushed to Odoo.
                    (Automatic push scheduling to be implemented in Electron main process).
                </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
                <div className="space-y-2">
                    <Label htmlFor="push-frequency">Push Data Frequency</Label>
                    <Select 
                        value={pushFrequency} 
                        onValueChange={(value) => {
                            setPushFrequency(value);
                            addLog("UHH Connectivity", `Push frequency set to: ${PUSH_FREQUENCY_OPTIONS.find(o => o.value === value)?.label || value}.`, "Info");
                        }}
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
                        onValueChange={(value) => {
                            setPushBatchSize(value);
                            addLog("UHH Connectivity", `Push batch size set to: ${PUSH_BATCH_SIZE_OPTIONS.find(o => o.value === value)?.label || value}.`, "Info");
                        }}
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
                        The maximum number of 'Not Uploaded' attendance records to include in a single push attempt to Odoo.
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
    
