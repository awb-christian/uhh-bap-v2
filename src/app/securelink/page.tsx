
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
import { Link2, FileUp, KeyRound, Loader2, CheckCircle, RefreshCw, Settings2, Calendar as CalendarIcon, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { addLog } from "@/lib/app-logger";
import { cn } from "@/lib/utils";
import { format, parseISO, setHours, setMinutes, setSeconds, setMilliseconds } from 'date-fns';


// Mock data for tmpTRecords for debugging purposes
const mockTmpTRecords = [
  { UserID: 101, RecordDate: "2024-06-10T08:00:00Z", RecordType: "I", DeviceID: "EntryDevice1" },
  { UserID: 102, RecordDate: "2024-06-10T08:05:15Z", RecordType: "I", DeviceID: "EntryDevice2" },
  { UserID: 101, RecordDate: "2024-06-10T17:00:30Z", RecordType: "O", DeviceID: "ExitDevice1" },
];

const FETCH_FREQUENCY_OPTIONS = [
  { value: "30m", label: "Every 30 minutes" },
  { value: "1h", label: "Every 1 hour" },
  { value: "2h", label: "Every 2 hours" },
  { value: "4h", label: "Every 4 hours" },
];

export default function SecureLinkPage() {
  const { toast } = useToast();
  const [mdbFile, setMdbFile] = React.useState<File | null>(null);
  const [mdbFileName, setMdbFileName] = React.useState<string>("");
  const [password, setPassword] = React.useState<string>("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [isFetchingNow, setIsFetchingNow] = React.useState(false);
  const [debugOutput, setDebugOutput] = React.useState<string>("");
  const [isConnected, setIsConnected] = React.useState(false);

  // Synchronization settings
  const [fetchFrequency, setFetchFrequency] = React.useState<string>(FETCH_FREQUENCY_OPTIONS[0].value);
  const [fetchUpToDate, setFetchUpToDate] = React.useState<Date | undefined>(new Date());
  const [fetchUpToHour, setFetchUpToHour] = React.useState<string>(format(new Date(), "HH"));
  const [fetchUpToMinute, setFetchUpToMinute] = React.useState<string>(format(new Date(), "mm"));
  
  // For last fetch timestamp (conceptual, managed by actual fetch logic)
  // const [lastFetchedTimestamp, setLastFetchedTimestamp] = React.useState<string | null>(null);


  React.useEffect(() => {
    addLog("SecureLinkPage", "Page loaded. Initializing settings from localStorage.", "Debug");
    const savedFileName = localStorage.getItem("securelink_mdbFileName");
    const savedPassword = localStorage.getItem("securelink_password");
    const savedFetchFrequency = localStorage.getItem("securelink_fetchFrequency");
    const savedFetchUpToDateTime = localStorage.getItem("securelink_fetchUpToDateTime");
    // const savedLastFetched = localStorage.getItem("securelink_lastFetchedTimestamp");

    if (savedFileName) setMdbFileName(savedFileName);
    if (savedPassword) setPassword(savedPassword);
    if (savedFetchFrequency && FETCH_FREQUENCY_OPTIONS.find(opt => opt.value === savedFetchFrequency)) {
      setFetchFrequency(savedFetchFrequency);
    }
    if (savedFetchUpToDateTime) {
        try {
            const parsedDate = parseISO(savedFetchUpToDateTime);
            setFetchUpToDate(parsedDate);
            setFetchUpToHour(format(parsedDate, "HH"));
            setFetchUpToMinute(format(parsedDate, "mm"));
        } catch (e) {
            console.error("Failed to parse fetchUpToDateTime from localStorage", e);
            addLog("SecureLinkPage", "Failed to parse 'fetchUpToDateTime' from localStorage.", "Error");
        }
    }
    // if (savedLastFetched) setLastFetchedTimestamp(savedLastFetched);
     addLog("SecureLinkPage", "Settings initialized.", "Info");
  }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.name.toLowerCase().endsWith(".mdb")) {
      setMdbFile(file);
      setMdbFileName(file.name);
      localStorage.setItem("securelink_mdbFileName", file.name);
      setDebugOutput("");
      setIsConnected(false);
      addLog("SecureLinkPage", `MDB file selected: ${file.name}`, "Info");
    } else {
      setMdbFile(null);
      setMdbFileName("");
      localStorage.removeItem("securelink_mdbFileName");
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
    localStorage.setItem("securelink_password", newPassword);
  };
  
  const handleFetchFrequencyChange = (value: string) => {
    setFetchFrequency(value);
    localStorage.setItem("securelink_fetchFrequency", value);
    addLog("SecureLinkPage", `Fetch frequency set to: ${FETCH_FREQUENCY_OPTIONS.find(opt => opt.value === value)?.label}`, "Info");
  };

  const updateFetchUpToDateTime = (date?: Date, hour?: string, minute?: string) => {
    const currentDate = date || fetchUpToDate || new Date();
    const currentHour = parseInt(hour || fetchUpToHour, 10);
    const currentMinute = parseInt(minute || fetchUpToMinute, 10);

    if (isNaN(currentHour) || isNaN(currentMinute) || currentHour < 0 || currentHour > 23 || currentMinute < 0 || currentMinute > 59) {
        // Potentially show a toast for invalid time
        return;
    }
    
    let newDateTime = setHours(currentDate, currentHour);
    newDateTime = setMinutes(newDateTime, currentMinute);
    newDateTime = setSeconds(newDateTime, 0);
    newDateTime = setMilliseconds(newDateTime, 0);
    
    localStorage.setItem("securelink_fetchUpToDateTime", newDateTime.toISOString());
    addLog("SecureLinkPage", `Fetch up to date/time set to: ${newDateTime.toISOString()}`, "Info");
  };


  React.useEffect(() => {
      updateFetchUpToDateTime(fetchUpToDate, fetchUpToHour, fetchUpToMinute);
  }, [fetchUpToDate, fetchUpToHour, fetchUpToMinute]);


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
    setDebugOutput("Attempting to connect (simulated)...");
    setIsConnected(false);
    addLog("SecureLinkPage", `Attempting simulated connection to ${mdbFileName}.`, "Info");

    // SIMULATION:
    await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 500));

    if (password === "Timmy") { 
      const simulatedData = mockTmpTRecords;
      setDebugOutput(`Connection successful (simulated).\n\n--- Mock tmpTRecords Data ---\n${JSON.stringify(simulatedData, null, 2)}`);
      setIsConnected(true);
      toast({
        title: "Connection Successful (Simulated)",
        description: `Successfully connected to ${mdbFileName}. Displaying mock 'tmpTRecords' data.`,
      });
      addLog("SecureLinkPage", `Simulated connection to ${mdbFileName} successful.`, "Success");
    } else {
      const errorMessage = "Error: Invalid password or unable to open database (Simulated).";
      setDebugOutput(errorMessage);
      setIsConnected(false);
      toast({
        title: "Connection Failed (Simulated)",
        description: "Invalid password or unable to open the MDB file. Please check credentials and file path.",
        variant: "destructive",
      });
      addLog("SecureLinkPage", `Simulated connection to ${mdbFileName} failed. Password used: '${password}'`, "Error");
    }
    setIsLoading(false);
  };

  // Placeholder for the actual scheduled fetch logic (would be in Electron main process)
  const initiateScheduledFetch = async () => {
    addLog("SecureLinkPage", "Placeholder: initiateScheduledFetch called.", "Debug");
    // 1. Get `securelink_lastFetchedTimestamp` from localStorage.
    // 2. Get `securelink_fetchFrequency`.
    // 3. Get `securelink_fetchUpToDateTime`.
    // 4. Calculate if current time is past `lastFetchedTimestamp` + `fetchFrequency`.
    // 5. If yes, call `handleManualFetch(true)` or similar internal fetch function,
    //    passing `fetchUpToDateTime` as a parameter.
    // 6. On success, update `securelink_lastFetchedTimestamp` to now.
    //    And potentially update `securelink_fetchUpToDateTime` to the timestamp of the last record fetched.
    console.log("Placeholder: Simulating check for scheduled fetch...");
    // This function would typically be invoked by a timer in the Electron main process.
  };
  
  // Placeholder for manual fetch
  const handleManualFetch = async (isScheduled: boolean = false) => {
    if (!isConnected && !mdbFile) { // Require connection or at least file selection if not connected for manual fetch attempt
        toast({ title: "Not Connected", description: "Please test the MDB connection first, or ensure an MDB file is selected.", variant: "destructive"});
        addLog("SecureLinkPage", "Manual fetch attempted without active connection or MDB file.", "Error");
        return;
    }
    setIsFetchingNow(true);
    const fetchType = isScheduled ? "scheduled" : "manual";
    addLog("SecureLinkPage", `Initiating ${fetchType} data fetch from AAS (simulated). Fetch up to: ${localStorage.getItem("securelink_fetchUpToDateTime")}`, "Info");
    setDebugOutput(prev => `${prev}\n\nInitiating ${fetchType} fetch (simulated)...`);
    
    // In a real app, this would call an Electron IPC function:
    // await window.electronAPI.fetchAASData({ filePath: mdbFile?.path, password, fetchUpTo: localStorage.getItem("securelink_fetchUpToDateTime") });
    // This function would:
    // 1. Connect to the MDB file.
    // 2. Query 'tmpTRecords' (and potentially 'Employee') for records up to 'fetchUpToDateTime'.
    // 3. Process these records and store them (e.g., in the 'attendance_transactions' SQLite table).
    // 4. On success, update 'securelink_lastFetchedTimestamp' and potentially 'securelink_fetchUpToDateTime'.
    // 5. Return status and any new data count or errors.

    await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 1000)); // Simulate fetch time

    const success = Math.random() > 0.2; // Simulate success/failure
    if (success) {
      const fetchedCount = Math.floor(Math.random() * 20) + 1;
      toast({ title: "Fetch Successful (Simulated)", description: `Fetched ${fetchedCount} new records from AAS.` });
      setDebugOutput(prev => `${prev}\nSimulated ${fetchType} fetch successful: ${fetchedCount} new records processed.`);
      addLog("SecureLinkPage", `Simulated ${fetchType} fetch successful. ${fetchedCount} records.`, "Success");
      
      // Update last fetched timestamp (conceptual)
      // localStorage.setItem("securelink_lastFetchedTimestamp", new Date().toISOString());
      // Potentially update fetchUpToDateTime to the latest record fetched
      // const newFetchUpTo = new Date(); // Example: set to now
      // setFetchUpToDate(newFetchUpTo);
      // setFetchUpToHour(format(newFetchUpTo, "HH"));
      // setFetchUpToMinute(format(newFetchUpTo, "mm"));
      // localStorage.setItem("securelink_fetchUpToDateTime", newFetchUpTo.toISOString());

    } else {
      toast({ title: "Fetch Failed (Simulated)", description: "Could not retrieve new records from AAS. Check logs.", variant: "destructive" });
      setDebugOutput(prev => `${prev}\nSimulated ${fetchType} fetch failed.`);
      addLog("SecureLinkPage", `Simulated ${fetchType} fetch failed.`, "Error");
    }
    setIsFetchingNow(false);
  };

  const canTestConnection = Boolean(mdbFileName && password && !isLoading);

  return (
    <div className="space-y-6">
      <Card className="shadow-lg rounded-lg">
        <CardHeader className="border-b">
          <div className="flex items-center gap-3">
            <Link2 className="h-8 w-8 text-primary" />
            <CardTitle className="font-headline text-2xl">SecureLink AAS Configuration</CardTitle>
          </div>
          <CardDescription>Configure and test connection to the SecureLink (AAS) biometric MDB database.</CardDescription>
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
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg shadow-sm">
                  <p className="text-sm text-blue-700 dark:text-blue-400">
                  Selected database: <span className="font-medium">{mdbFileName}</span>. 
                  {mdbFile ? " Ready to test." : " Please re-select the file if you want to perform a new connection test with actual file content."}
                  </p>
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
              className="file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer dark:file:bg-primary/20 dark:file:text-primary-foreground dark:hover:file:bg-primary/30"
              disabled={isLoading || isFetchingNow}
            />
            <p className="text-xs text-muted-foreground">
              Select the AAS database (e.g., TMKQ.mdb). It is usually located in Program Files. It is in .mdb file format.
            </p>
            {mdbFileName && !mdbFile && (
              <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                Previously selected: {mdbFileName}. For actual operations, please re-select the file.
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
              Used to access AAS database and fetch attendance transactions from biometric devices.
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
              <Label htmlFor="debug-output" className="font-medium">Debug Output</Label>
              <Textarea
                id="debug-output"
                value={isLoading ? "Connecting and fetching data..." : (isFetchingNow ? `${debugOutput}\nFetching now...` : debugOutput)}
                readOnly
                rows={10}
                className="font-mono text-xs bg-muted/30 dark:bg-muted/50 border rounded-md p-2 h-48"
                placeholder="Attempt connection to see simulated records from 'tmpTRecords'..."
              />
              <p className="text-xs text-muted-foreground">
                  This textbox is for debugging purposes.
              </p>
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
          <CardDescription>Configure how and when attendance data is fetched from SecureLink AAS.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="fetch-frequency">Automatic Fetch Frequency</Label>
            <Select value={fetchFrequency} onValueChange={handleFetchFrequencyChange} disabled={isFetchingNow}>
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
              How often the application should automatically try to fetch new attendance records.
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
                            disabled={isFetchingNow}
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
                            disabled={isFetchingNow}
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
                            onChange={(e) => setFetchUpToHour(e.target.value.padStart(2,'0'))}
                            placeholder="HH"
                            disabled={isFetchingNow}
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
                            onChange={(e) => setFetchUpToMinute(e.target.value.padStart(2,'0'))}
                            placeholder="MM"
                            disabled={isFetchingNow}
                            className="h-9"
                        />
                    </div>
                </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Specify the latest date and time for which attendance transactions should be fetched from AAS. This is updated automatically after each successful fetch.
            </p>
          </div>
        </CardContent>
        <CardFooter className="border-t pt-6">
            <Button onClick={() => handleManualFetch(false)} disabled={isFetchingNow || isLoading || (!isConnected && !mdbFile)}>
                {isFetchingNow && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <RefreshCw className="mr-2 h-4 w-4" /> Fetch Now
            </Button>
        </CardFooter>
      </Card>

    </div>
  );
}

