
"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Link2, FileUp, KeyRound, Loader2, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Mock data for tmpTRecords for debugging purposes
const mockTmpTRecords = [
  { UserID: 101, RecordDate: "2024-06-10T08:00:00Z", RecordType: "I", DeviceID: "EntryDevice1" },
  { UserID: 102, RecordDate: "2024-06-10T08:05:15Z", RecordType: "I", DeviceID: "EntryDevice2" },
  { UserID: 101, RecordDate: "2024-06-10T17:00:30Z", RecordType: "O", DeviceID: "ExitDevice1" },
  { UserID: 103, RecordDate: "2024-06-11T09:00:00Z", RecordType: "I", DeviceID: "EntryDevice1" },
  { UserID: 102, RecordDate: "2024-06-11T17:30:00Z", RecordType: "O", DeviceID: "ExitDevice2" },
];

export default function SecureLinkPage() {
  const { toast } = useToast();
  const [mdbFile, setMdbFile] = React.useState<File | null>(null); // Stores the actual File object
  const [mdbFileName, setMdbFileName] = React.useState<string>(""); // Stores the name for display and persistence
  const [password, setPassword] = React.useState<string>("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [debugOutput, setDebugOutput] = React.useState<string>("");
  const [isConnected, setIsConnected] = React.useState(false);

  // Load saved settings from localStorage on component mount
  React.useEffect(() => {
    const savedFileName = localStorage.getItem("securelink_mdbFileName");
    const savedPassword = localStorage.getItem("securelink_password");
    if (savedFileName) {
      setMdbFileName(savedFileName);
      // Note: We can't reconstruct the File object from localStorage.
      // The user would still need to re-select the file if actual file access is needed on load.
      // The mdbFileName is kept to pre-fill the context for the user.
    }
    if (savedPassword) {
      setPassword(savedPassword);
    }
  }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.name.toLowerCase().endsWith(".mdb")) {
      setMdbFile(file); // Store the File object
      setMdbFileName(file.name); // Update the name
      localStorage.setItem("securelink_mdbFileName", file.name);
      setDebugOutput(""); // Clear previous debug output
      setIsConnected(false); // Reset connection status
    } else {
      setMdbFile(null);
      setMdbFileName("");
      localStorage.removeItem("securelink_mdbFileName");
      if (file) { // if a file was selected but it wasn't .mdb
        toast({
          title: "Invalid File Type",
          description: "Please select a valid .mdb file.",
          variant: "destructive",
        });
      }
    }
  };

  const handlePasswordChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newPassword = event.target.value;
    setPassword(newPassword);
    localStorage.setItem("securelink_password", newPassword);
  };

  /**
   * Placeholder function to simulate testing the MDB database connection.
   * In a real Electron application, this function would trigger an IPC call
   * to the main process. The main process would then use a library like
   * 'node-adodb' or 'odbc' to:
   * 1. Access the MDB file using the full path (obtained via Electron's dialog API, not the File object).
   * 2. Attempt to open the database with the provided password.
   * 3. If successful, execute a query like "SELECT * FROM tmpTRecords".
   * 4. Return the success status and data (or error message) back to this renderer process.
   */
  const handleTestConnection = async () => {
    // Ensure a file name is present (either from current selection or localStorage) and password is entered
    if (!mdbFileName || !password) {
        toast({
            title: "Missing Information",
            description: "Please select an MDB file and enter the password.",
            variant: "destructive",
        });
        return;
    }
    // If mdbFile is null, it means the name is from localStorage, and user needs to reselect for actual ops.
    // For simulation, we proceed if mdbFileName exists. In real app, you'd need mdbFile or its actual path.
    
    setIsLoading(true);
    setDebugOutput("");
    setIsConnected(false);

    // Simulate asynchronous operation (e.g., network request or file access)
    await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 500));

    // SIMULATION LOGIC:
    // Replace this with actual database connection attempt via IPC to main process.
    // For this simulation, we'll assume connection is successful if password is "Timmy".
    if (password === "Timmy") {
      // Simulate fetching data from 'tmpTRecords'
      const simulatedData = mockTmpTRecords; // Using mock data
      setDebugOutput(JSON.stringify(simulatedData, null, 2));
      setIsConnected(true);
      toast({
        title: "Connection Successful (Simulated)",
        description: `Successfully connected to ${mdbFileName}. Displaying mock 'tmpTRecords' data.`,
      });
    } else {
      const errorMessage = "Error: Invalid password or unable to open database (Simulated).";
      setDebugOutput(errorMessage);
      setIsConnected(false);
      toast({
        title: "Connection Failed (Simulated)",
        description: "Invalid password or unable to open the MDB file. Please check credentials and file path.",
        variant: "destructive",
      });
    }
    setIsLoading(false);
  };
  
  // Enable button if a file name is set (either from new selection or localStorage) AND password is not empty
  const canTestConnection = Boolean(mdbFileName && password && !isLoading);

  return (
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
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg shadow-sm flex items-center gap-3">
            <CheckCircle className="h-6 w-6 text-green-600" />
            <div>
              <h4 className="text-lg font-semibold text-green-800">Database Connected (Simulated)</h4>
              <p className="text-sm text-green-700">
                Successfully established a simulated connection to <span className="font-medium">{mdbFileName}</span>.
              </p>
            </div>
          </div>
        )}
        {!isConnected && mdbFileName && !isLoading && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg shadow-sm">
                <p className="text-sm text-blue-700">
                Selected database: <span className="font-medium">{mdbFileName}</span>. 
                {mdbFile ? "Ready to test." : "Please re-select the file if you want to perform a new connection test with actual file content."}
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
            accept=".mdb" // Restrict file selection to .mdb
            onChange={handleFileChange}
            className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
            disabled={isLoading}
          />
          <p className="text-xs text-muted-foreground">
            Select the AAS database (e.g., TMKQ.mdb). It is usually located in Program Files. It is in .mdb file format.
          </p>
           {mdbFileName && !mdbFile && ( // Show if name exists (from localStorage) but no File object (not re-selected)
            <p className="text-xs text-yellow-600 mt-1">
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
            disabled={isLoading}
            autoComplete="current-password" // Helps with password managers, though be mindful of Electron context
          />
          <p className="text-xs text-muted-foreground">
            It will be use to access AAS database and fetch attendance transactions from biometric devices.
          </p>
        </div>

        <div className="flex justify-end">
          <Button 
            onClick={handleTestConnection} 
            disabled={!canTestConnection}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Test Connection
          </Button>
        </div>

        {(debugOutput || isLoading || isConnected) && ( // Show debug area if there's output, loading, or connected
          <div className="space-y-2 pt-4 border-t">
            <Label htmlFor="debug-output" className="font-medium">Debug Output (Simulated 'tmpTRecords' Data)</Label>
            <Textarea
              id="debug-output"
              value={isLoading ? "Connecting and fetching data..." : debugOutput}
              readOnly
              rows={10}
              className="font-mono text-xs bg-muted/30 border rounded-md p-2 h-48"
              placeholder="Attempt connection to see simulated records from 'tmpTRecords'..."
            />
             <p className="text-xs text-muted-foreground">
                This textbox is for debugging purposes to show simulated data. In a real app, data would be processed differently.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

    