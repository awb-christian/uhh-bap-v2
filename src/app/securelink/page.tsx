
"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Link2, FileUp, KeyRound, Loader2, CheckCircle, RefreshCw, Settings2, Calendar as CalendarIcon, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { addLog } from "@/lib/app-logger";
import { cn } from "@/lib/utils";
import { format, parseISO, setHours, setMinutes, setSeconds, setMilliseconds, isValid } from 'date-fns';

// This page simulates interaction with a local MDB file.
// For a production Electron app:
// - MDB file access (reading, querying) MUST be done in Electron's main process using a library like 'node-adodb'.
// - The frontend (this Next.js page) would use Electron IPC to send requests to the main process and receive data.
// - Storing the MDB password directly in localStorage is NOT secure for production. Use Electron's 'safeStorage' in the main process.
// TODO: [Electron Main Process] Replace all `localStorage` access for sensitive MDB details with IPC calls to Electron's main process for secure storage and file operations.

const FETCH_FREQUENCY_OPTIONS = [
  { value: "30m", label: "Every 30 minutes" },
  { value: "1h", label: "Every 1 hour" },
  { value: "2h", label: "Every 2 hours" },
  { value: "4h", label: "Every 4 hours" },
];

export default function SecureLinkPage() {
  const { toast } = useToast();
  const [mdbFile, setMdbFile] = React.useState<File | null>(null); // Only used to get name, not for direct access
  const [mdbFileName, setMdbFileName] = React.useState<string>(""); // Persisted file name
  const [password, setPassword] = React.useState<string>(""); // Persisted password (unsafe for production)
  const [isLoading, setIsLoading] = React.useState(false);
  const [isFetchingNow, setIsFetchingNow] = React.useState(false);
  const [debugOutput, setDebugOutput] = React.useState<string>("");
  const [isConnected, setIsConnected] = React.useState(false); // Simulated connection status

  // Synchronization settings
  const [fetchFrequency, setFetchFrequency] = React.useState<string>(FETCH_FREQUENCY_OPTIONS[0].value);
  const [fetchUpToDate, setFetchUpToDate] = React.useState<Date | undefined>(new Date());
  const [fetchUpToHour, setFetchUpToHour] = React.useState<string>(format(new Date(), "HH"));
  const [fetchUpToMinute, setFetchUpToMinute] = React.useState<string>(format(new Date(), "mm"));
  

  React.useEffect(() => {
    addLog("SecureLinkPage", "Page loaded. Initializing settings from localStorage.", "Debug");
    const savedFileName = localStorage.getItem("securelink_mdbFileName");
    // WARNING: Loading passwords from localStorage is insecure for production.
    // TODO: [Electron Main Process] Replace with secure loading mechanism if password needs to be persisted.
    const savedPassword = localStorage.getItem("securelink_password"); 
    const savedFetchFrequency = localStorage.getItem("securelink_fetchFrequency");
    const savedFetchUpToDateTime = localStorage.getItem("securelink_fetchUpToDateTime");

    if (savedFileName) setMdbFileName(savedFileName);
    if (savedPassword) setPassword(savedPassword); 
    if (savedFetchFrequency && FETCH_FREQUENCY_OPTIONS.find(opt => opt.value === savedFetchFrequency)) {
      setFetchFrequency(savedFetchFrequency);
    }
    if (savedFetchUpToDateTime) {
        try {
            const parsedDate = parseISO(savedFetchUpToDateTime);
            if (isValid(parsedDate)) {
                setFetchUpToDate(parsedDate);
                setFetchUpToHour(format(parsedDate, "HH"));
                setFetchUpToMinute(format(parsedDate, "mm"));
            } else {
                throw new Error("Invalid date stored in localStorage");
            }
        } catch (e) {
            console.error("Failed to parse fetchUpToDateTime from localStorage", e);
            addLog("SecureLinkPage", `Failed to parse 'fetchUpToDateTime' from localStorage. Error: ${e instanceof Error ? e.message : String(e)}`, "Error");
            localStorage.removeItem("securelink_fetchUpToDateTime"); 
        }
    }
    addLog("SecureLinkPage", "Settings initialized.", "Info");
  }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.name.toLowerCase().endsWith(".mdb")) {
      // TODO: [Electron Main Process] Send file path (file.path) to main process via IPC instead of just name for actual file access.
      setMdbFile(file); 
      setMdbFileName(file.name);
      localStorage.setItem("securelink_mdbFileName", file.name);
      setDebugOutput("");
      setIsConnected(false);
      addLog("SecureLinkPage", `MDB file selected: ${file.name}. Full path (available in Electron context): ${file.path || "N/A in browser"}`, "Info");
    } else {
      setMdbFile(null);
      if (file) { 
        toast({
          title: "Invalid File Type",
          description: "Please select a valid .mdb file.",
          variant: "destructive",
        });
        addLog("SecureLinkPage", `Invalid file type selected: ${file.name}`, "Error");
      }
    }
  };

  const handlePasswordChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newPassword = event.target.value;
    setPassword(newPassword);
    // WARNING: Storing passwords in localStorage is insecure.
    // TODO: [Electron Main Process] For Electron, send password to main process via IPC to be stored using 'safeStorage'.
    localStorage.setItem("securelink_password", newPassword);
  };
  
  const handleFetchFrequencyChange = (value: string) => {
    setFetchFrequency(value);
    localStorage.setItem("securelink_fetchFrequency", value);
    addLog("SecureLinkPage", `Fetch frequency set to: ${FETCH_FREQUENCY_OPTIONS.find(opt => opt.value === value)?.label}`, "Info");
  };

  const updateFetchUpToDateTime = React.useCallback((date?: Date, hour?: string, minute?: string) => {
    const baseDate = date || fetchUpToDate || new Date(); 
    
    let numHour = parseInt(hour || fetchUpToHour, 10);
    let numMinute = parseInt(minute || fetchUpToMinute, 10);

    if (isNaN(numHour) || numHour < 0 || numHour > 23) numHour = parseInt(format(new Date(), "HH"), 10);
    if (isNaN(numMinute) || numMinute < 0 || numMinute > 59) numMinute = parseInt(format(new Date(), "mm"), 10);
    
    let newDateTime = setHours(baseDate, numHour);
    newDateTime = setMinutes(newDateTime, numMinute);
    newDateTime = setSeconds(newDateTime, 0);
    newDateTime = setMilliseconds(newDateTime, 0);
    
    localStorage.setItem("securelink_fetchUpToDateTime", newDateTime.toISOString());
  }, [fetchUpToDate, fetchUpToHour, fetchUpToMinute]);


  React.useEffect(() => {
    if (fetchUpToDate) { 
        const currentHour = fetchUpToHour.padStart(2, '0');
        const currentMinute = fetchUpToMinute.padStart(2, '0');
        updateFetchUpToDateTime(fetchUpToDate, currentHour, currentMinute);
        addLog("SecureLinkPage", `Fetch up to date/time changed. New value: ${format(fetchUpToDate, "yyyy-MM-dd")} ${currentHour}:${currentMinute}`, "Debug");
    }
  }, [fetchUpToDate, fetchUpToHour, fetchUpToMinute, updateFetchUpToDateTime]);


  const handleTestConnection = async () => {
    if (!mdbFileName || !password) {
        toast({
            title: "Missing Information",
            description: "Please select an MDB file and enter the password.",
            variant: "destructive",
        });
        addLog("SecureLinkPage", "Test connection attempted with missing MDB file or password.", "Error");
        return;
    }
    
    setIsLoading(true);
    setDebugOutput("Attempting to connect (simulated via Electron IPC)...");
    setIsConnected(false);
    addLog("SecureLinkPage", `Attempting connection to ${mdbFileName} (simulated).`, "Info");

    // TODO: [Electron Main Process] Implement actual MDB connection via IPC.
    // const result = await window.electronAPI.testSecureLinkConnection({ filePath: mdbFile?.path, password });
    // For now, simulate:
    await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 500));

    // Example of how data might be returned from Electron main process.
    // This would involve querying 'tmpTRecords' and 'Employee' tables.
    const simulatedSuccess = password === "Timmy"; // Simple simulation
    if (simulatedSuccess) {
      const simulatedData = [ 
        { UserID: 101, RecordDate: "2024-07-01T08:00:00Z", RecordType: "I", DeviceID: "SimDevice1" },
        { UserID: 102, RecordDate: "2024-07-01T08:05:00Z", RecordType: "I", DeviceID: "SimDevice2" }
      ];
      setDebugOutput(`Connection successful (simulated).\n\n--- Mock 'tmpTRecords' Data (from Electron main process) ---\n${JSON.stringify(simulatedData, null, 2)}`);
      setIsConnected(true);
      toast({
        title: "Connection Successful (Simulated)",
        description: `Successfully connected to ${mdbFileName}. Mock data displayed.`,
      });
      addLog("SecureLinkPage", `Simulated connection to ${mdbFileName} successful.`, "Success");
    } else {
      const errorMessage = "Error: Invalid password or unable to open database (Simulated via Electron IPC).";
      setDebugOutput(errorMessage);
      setIsConnected(false);
      toast({
        title: "Connection Failed (Simulated)",
        description: "Invalid password or MDB file issue. Check credentials/file.",
        variant: "destructive",
      });
      addLog("SecureLinkPage", `Simulated connection to ${mdbFileName} failed.`, "Error");
    }
    setIsLoading(false);
  };
  
  /**
   * Placeholder for manual/scheduled data fetch.
   * In Electron, this would trigger an IPC call to the main process.
   * @param {boolean} isScheduled - Indicates if the fetch was triggered by a scheduler.
   */
  const handleManualFetch = async (isScheduled: boolean = false) => {
    if (!isConnected && !mdbFileName) { 
        toast({ title: "Not Connected/No File", description: "Please test connection or select MDB file.", variant: "destructive"});
        addLog("SecureLinkPage", "Manual fetch attempted without active connection or MDB file.", "Error");
        return;
    }
    if (isFetchingNow) {
        toast({ title: "Fetch In Progress", description: "Data fetch is already running.", variant: "default"});
        return;
    }

    setIsFetchingNow(true);
    const fetchType = isScheduled ? "scheduled" : "manual";
    const fetchUpToISO = localStorage.getItem("securelink_fetchUpToDateTime") || new Date().toISOString();
    const fetchUpToFormatted = format(parseISO(fetchUpToISO), "Pp");

    const logMessage = `Initiating ${fetchType} data fetch from AAS (simulated via Electron IPC). Fetch up to: ${fetchUpToFormatted}`;
    addLog("SecureLinkPage", logMessage, "Info");
    setDebugOutput(prev => `${prev}\n\n${logMessage}
    This involves:
    1. Connecting to ${mdbFileName} (via Electron main process).
    2. Querying 'tmpTRecords' and 'Employee' tables for records where RecordDate <= ${fetchUpToFormatted}.
    3. Transforming data (e.g., UserID to Employee String ID, RecordType to 'check-in'/'check-out').
    4. Calling addAttendanceTransaction() for each valid new record.
    5. Updating 'securelink_lastFetchedTimestamp' and 'securelink_fetchUpToDateTime'.
    (Actual implementation requires Electron IPC for all file/DB operations)`);
    
    // TODO: [Electron Main Process] Implement actual data fetching logic via IPC.
    // const result = await window.electronAPI.fetchSecureLinkData({ filePath: mdbFile?.path, password, fetchUpTo: fetchUpToISO });
    // The main process would then:
    // - Connect to MDB using 'node-adodb' or similar.
    // - Query 'tmpTRecords' (and potentially 'Employee' table for string IDs).
    // - Filter records based on `fetchUpToISO`.
    // - Transform data: map UserID to Employee String ID, RecordType to 'check-in'/'check-out'.
    // - For each valid new record, call `addAttendanceTransaction()` (this might mean sending data back to renderer or main process handles it if SQLite is in main).
    // - Update 'securelink_lastFetchedTimestamp' (in main process storage or send back to renderer).
    // - Update 'securelink_fetchUpToDateTime' to the timestamp of the latest record processed.
    await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 1000)); 

    const success = Math.random() > 0.2; 
    if (success) {
      const fetchedCount = Math.floor(Math.random() * 20) + 1;
      toast({ title: "Fetch Successful (Simulated)", description: `Fetched ${fetchedCount} new records from AAS.` });
      setDebugOutput(prev => `${prev}\nSimulated ${fetchType} fetch successful: ${fetchedCount} new records processed.`);
      addLog("SecureLinkPage", `Simulated ${fetchType} fetch successful. ${fetchedCount} records.`, "Success");
      
      const newLastFetchedTimestamp = new Date().toISOString();
      localStorage.setItem("securelink_lastFetchedTimestamp", newLastFetchedTimestamp);
      const newFetchUpToDate = new Date(parseISO(fetchUpToISO).getTime() + fetchedCount * 60000 * 5); 
      setFetchUpToDate(newFetchUpToDate); 
      setFetchUpToHour(format(newFetchUpToDate, "HH"));
      setFetchUpToMinute(format(newFetchUpToDate, "mm"));
      localStorage.setItem("securelink_fetchUpToDateTime", newFetchUpToDate.toISOString()); 
      addLog("SecureLinkPage", `Simulated: Updated 'fetchUpToDateTime' to ${newFetchUpToDate.toISOString()} and 'lastFetchedTimestamp' to ${newLastFetchedTimestamp}`, "Debug");

    } else {
      toast({ title: "Fetch Failed (Simulated)", description: "Could not retrieve new records from AAS. Check logs.", variant: "destructive" });
      setDebugOutput(prev => `${prev}\nSimulated ${fetchType} fetch failed.`);
      addLog("SecureLinkPage", `Simulated ${fetchType} fetch failed.`, "Error");
    }
    setIsFetchingNow(false);
  };

  /**
   * Placeholder for initiating scheduled fetch.
   * TODO: [Electron Main Process] Implement a scheduler (e.g., using node-cron or setInterval in main.js)
   * that calls this function's logic periodically based on `fetchFrequency` and `lastFetchedTimestamp`.
   * The main process would manage these checks and trigger `handleManualFetch(true)` or its equivalent.
   */
  const initiateScheduledFetch = React.useCallback(async () => {
    addLog("SecureLinkPage", "Placeholder: initiateScheduledFetch called. This logic should be managed by Electron main process.", "Debug");
    // const lastFetched = localStorage.getItem("securelink_lastFetchedTimestamp");
    // const frequency = localStorage.getItem("securelink_fetchFrequency");
    // If (currentTime > lastFetched + frequency) then call handleManualFetch(true) or main process equivalent.
  }, []);

  const canTestConnection = Boolean(mdbFileName && password && !isLoading);

  return (
    <div className="space-y-6">
      <Card className="shadow-lg rounded-lg">
        <CardHeader className="border-b">
          <div className="flex items-center gap-3">
            <Link2 className="h-8 w-8 text-primary" />
            <CardTitle className="font-headline text-2xl">SecureLink AAS Configuration</CardTitle>
          </div>
          <CardDescription>Configure and test connection to the SecureLink (AAS) biometric MDB database. File path and password (excluding actual value) are stored locally (Warning: Insecure without Electron safeStorage).</CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          {isConnected && (
            <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg shadow-sm flex items-center gap-3">
              <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
              <div>
                <h4 className="text-lg font-semibold text-green-800 dark:text-green-300">Database Connected (Simulated)</h4>
                <p className="text-sm text-green-700 dark:text-green-400">
                  Successfully established a simulated connection to <span className="font-medium">{mdbFileName}</span>.
                </p>
              </div>
            </div>
          )}
          {!isConnected && mdbFileName && !isLoading && (
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg shadow-sm flex items-center gap-3">
                 <XCircle className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  <div>
                    <h4 className="text-lg font-semibold text-blue-800 dark:text-blue-300">Ready to Test</h4>
                    <p className="text-sm text-blue-700 dark:text-blue-400">
                    Selected database: <span className="font-medium">{mdbFileName}</span>. Enter password and test connection.
                    </p>
                  </div>
              </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="mdb-file" className="flex items-center gap-2 font-medium">
              <FileUp className="h-5 w-5 text-primary" />
              AAS Database File (.mdb)
            </Label>
            <Input
              id="mdb-file"
              type="file"
              accept=".mdb"
              onChange={handleFileChange}
              className="file:mr-3 file:py-1 file:px-2 file:text-xs file:rounded-md file:border-0 file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer dark:file:bg-primary/20 dark:file:text-primary-foreground dark:hover:file:bg-primary/30"
              disabled={isLoading || isFetchingNow}
            />
            <p className="text-xs text-muted-foreground">
              Select the AAS database (e.g., TMKQ.mdb). File path is used by Electron's main process.
            </p>
            {mdbFileName && !mdbFile && (
              <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                Previously selected: {mdbFileName}. Re-select if path changed.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="mdb-password" className="flex items-center gap-2 font-medium">
              <KeyRound className="h-5 w-5 text-primary" />
              Database Password
            </Label>
            <Input
              id="mdb-password"
              type="password"
              value={password}
              onChange={handlePasswordChange}
              placeholder="Enter database password"
              disabled={isLoading || isFetchingNow}
              autoComplete="current-password"
            />
            <p className="text-xs text-muted-foreground">
              Used to access AAS database. Password will be handled by Electron's main process using `safeStorage`.
            </p>
          </div>

          <div className="flex justify-end">
            <Button 
              onClick={handleTestConnection} 
              disabled={!canTestConnection || isFetchingNow}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Test Connection
            </Button>
          </div>

          {(debugOutput || isLoading || isFetchingNow || isConnected) && (
            <div className="space-y-2 pt-4 border-t">
              <Label htmlFor="debug-output" className="font-medium">Debug Output / Connection Status</Label>
              <Textarea
                id="debug-output"
                value={isLoading ? "Connecting (simulated via Electron IPC)..." : (isFetchingNow ? `${debugOutput}\nFetching now (simulated via Electron IPC)...` : debugOutput)}
                readOnly
                rows={10}
                className="font-mono text-xs bg-muted/30 dark:bg-muted/50 border rounded-md p-2 h-48"
                placeholder="Connection status and simulated data will appear here..."
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-lg rounded-lg">
        <CardHeader className="border-b">
          <div className="flex items-center gap-3">
            <Settings2 className="h-8 w-8 text-primary" />
            <CardTitle className="font-headline text-2xl">Synchronization Settings</CardTitle>
          </div>
          <CardDescription>Configure how and when attendance data is fetched from SecureLink AAS. Requires successful connection.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="fetch-frequency">Automatic Fetch Frequency</Label>
            <Select value={fetchFrequency} onValueChange={handleFetchFrequencyChange} disabled={isFetchingNow || isLoading}>
              <SelectTrigger id="fetch-frequency">
                <SelectValue placeholder="Select frequency" />
              </SelectTrigger>
              <SelectContent>
                {FETCH_FREQUENCY_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              How often the application should automatically try to fetch new attendance records. (Background scheduler to be implemented in Electron main process).
            </p>
          </div>

          <div className="space-y-2">
            <Label>Fetch Records Up To</Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                <div className="sm:col-span-2">
                    <Popover>
                        <PopoverTrigger asChild>
                        <Button
                            variant={"outline"}
                            className={cn(
                            "w-full justify-start text-left font-normal",
                            !fetchUpToDate && "text-muted-foreground"
                            )}
                            disabled={isFetchingNow || isLoading}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {fetchUpToDate ? format(fetchUpToDate, "PPP") : <span>Pick a date</span>}
                        </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                        <Calendar
                            mode="single"
                            selected={fetchUpToDate}
                            onSelect={setFetchUpToDate}
                            initialFocus
                            disabled={isFetchingNow || isLoading}
                        />
                        </PopoverContent>
                    </Popover>
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <Label htmlFor="fetch-hour" className="text-xs">Hour (00-23)</Label>
                        <Input 
                            id="fetch-hour" 
                            type="number" 
                            min="0" max="23" 
                            value={fetchUpToHour} 
                            onChange={(e) => setFetchUpToHour(e.target.value)}
                            onBlur={(e) => setFetchUpToHour(e.target.value.padStart(2,'0'))}
                            placeholder="HH"
                            disabled={isFetchingNow || isLoading}
                            className="h-9"
                        />
                    </div>
                    <div>
                        <Label htmlFor="fetch-minute" className="text-xs">Minute (00-59)</Label>
                        <Input 
                            id="fetch-minute" 
                            type="number" 
                            min="0" max="59" 
                            value={fetchUpToMinute} 
                            onChange={(e) => setFetchUpToMinute(e.target.value)}
                            onBlur={(e) => setFetchUpToMinute(e.target.value.padStart(2,'0'))}
                            placeholder="MM"
                            disabled={isFetchingNow || isLoading}
                            className="h-9"
                        />
                    </div>
                </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Specify the latest date and time for which attendance transactions should be fetched. This is typically updated automatically after each successful fetch by the main process.
            </p>
          </div>
        </CardContent>
        <CardFooter className="border-t pt-6">
            <Button onClick={() => handleManualFetch(false)} disabled={isFetchingNow || isLoading || (!isConnected && !mdbFileName) }>
                {isFetchingNow && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <RefreshCw className="mr-2 h-4 w-4" /> Fetch Now (Simulated)
            </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
