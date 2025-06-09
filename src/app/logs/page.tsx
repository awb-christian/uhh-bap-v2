
"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectLabel, SelectGroup } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

// Conceptual Table Schemas for SQLite (to be managed by a backend/Electron main process):
//
// logs table:
//   id INTEGER PRIMARY KEY AUTOINCREMENT,
//   timestamp DATETIME DEFAULT CURRENT_TIMESTAMP, (Should store as ISO8601 string or Unix timestamp)
//   source TEXT,
//   message TEXT,
//   status TEXT CHECK(status IN ('Success', 'Error', 'Info', 'Debug'))
//
// attendance_transactions table:
//   id INTEGER PRIMARY KEY AUTOINCREMENT,
//   employee_id TEXT NOT NULL,
//   transaction_type TEXT CHECK(transaction_type IN ('check-in', 'check-out')) NOT NULL,
//   transaction_time DATETIME NOT NULL, (Should store as ISO8601 string or Unix timestamp)
//   source_type TEXT DEFAULT 'biometric',
//   device_id TEXT,
//   status TEXT CHECK(status IN ('not_uploaded', 'uploaded')) DEFAULT 'not_uploaded'

// Placeholder log data type
type LogEntry = {
  id: number;
  timestamp: string; // ISO string format
  source: string;
  message: string;
  status: 'Success' | 'Error' | 'Info' | 'Debug';
};

// Placeholder data for logs - in a real app, this would come from the database
const initialLogs: LogEntry[] = [
  { id: 1, timestamp: new Date(Date.now() - 5 * 60000).toISOString(), source: 'ZKTeco Biotime', message: 'Fetched 50 attendance records.', status: 'Success' },
  { id: 2, timestamp: new Date(Date.now() - 4 * 60000).toISOString(), source: 'Odoo Server', message: 'Attempting to push 50 records.', status: 'Info' },
  { id: 3, timestamp: new Date(Date.now() - 3 * 60000).toISOString(), source: 'Odoo Server', message: 'Pushed 50 records to Odoo instance.', status: 'Success' },
  { id: 4, timestamp: new Date(Date.now() - 2 * 60000).toISOString(), source: 'ZKTeco Time', message: 'Connection error: Device at 192.168.1.202 offline.', status: 'Error' },
  { id: 5, timestamp: new Date(Date.now() - 1 * 60000).toISOString(), source: 'Sentry', message: 'Scheduled sync started.', status: 'Info' },
  { id: 6, timestamp: new Date(Date.now() - 10 * 60000).toISOString(), source: 'System', message: 'Application initialized.', status: 'Debug' },
  { id: 7, timestamp: new Date(Date.now() - 6 * 3600 * 1000).toISOString(), source: 'Odoo Server', message: 'Failed to authenticate. Invalid credentials.', status: 'Error' },
];


const RETENTION_OPTIONS = [
  { value: '1d', label: '1 Day' },
  { value: '7d', label: '7 Days' },
  { value: '14d', label: '14 Days' },
  { value: '30d', label: '30 Days' },
  { value: '90d', label: '90 Days' },
  { value: 'never', label: 'Never Delete' },
];

const DISPLAY_LIMIT_OPTIONS = [
  { value: '20', label: '20 Logs' },
  { value: '50', label: '50 Logs' },
  { value: '100', label: '100 Logs' },
  { value: '200', label: '200 Logs' },
  { value: 'all', label: 'All Logs' },
];

export default function LogsPage() {
  const [logRetentionPeriod, setLogRetentionPeriod] = React.useState<string>(RETENTION_OPTIONS[2].value); // Default to 14 days
  const [displayLogLimit, setDisplayLogLimit] = React.useState<string>(DISPLAY_LIMIT_OPTIONS[1].value); // Default to 50 logs
  const [logs, setLogs] = React.useState<LogEntry[]>(initialLogs.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())); // Sorted by newest first

  React.useEffect(() => {
    const storedRetention = localStorage.getItem("logRetentionPeriod");
    if (storedRetention && RETENTION_OPTIONS.find(opt => opt.value === storedRetention)) {
      setLogRetentionPeriod(storedRetention);
    }
    const storedLimit = localStorage.getItem("displayLogLimit");
    if (storedLimit && DISPLAY_LIMIT_OPTIONS.find(opt => opt.value === storedLimit)) {
      setDisplayLogLimit(storedLimit);
    }
  }, []);

  React.useEffect(() => {
    localStorage.setItem("logRetentionPeriod", logRetentionPeriod);
    // Placeholder for triggering log deletion logic based on retentionPeriod.
    // In an Electron app, this might involve an IPC call to the main process
    // which then handles database cleanup periodically.
    // console.log(`Log retention period set to: ${logRetentionPeriod}. Implement cleanup logic.`);
  }, [logRetentionPeriod]);

  React.useEffect(() => {
    localStorage.setItem("displayLogLimit", displayLogLimit);
  }, [displayLogLimit]);

  const displayedLogs = React.useMemo(() => {
    const limit = parseInt(displayLogLimit, 10);
    if (isNaN(limit)) { // Handles 'all' case or unexpected values
      return logs;
    }
    return logs.slice(0, limit);
  }, [logs, displayLogLimit]);

  // Placeholder function for where database fetching logic would be
  // React.useEffect(() => {
  //   async function fetchLogsFromDb() {
  //     // This would be an async call, possibly via IPC to Electron main process
  //     // const fetchedLogs = await someIpcCall('get-logs', { limit: displayLogLimit });
  //     // setLogs(fetchedLogs.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
  //   }
  //   fetchLogsFromDb();
  // }, [displayLogLimit]); // Re-fetch if limit changes

  return (
    <div className="flex flex-col h-full space-y-6">
      <Card className="shadow-lg rounded-lg">
        <CardHeader className="border-b">
          <CardTitle className="font-headline text-xl">Log Settings</CardTitle>
          <CardDescription>Configure log retention and display preferences.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="log-retention">Auto-delete logs older than:</Label>
            <Select value={logRetentionPeriod} onValueChange={setLogRetentionPeriod}>
              <SelectTrigger id="log-retention" className="w-full">
                <SelectValue placeholder="Select retention period" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Retention Period</SelectLabel>
                  {RETENTION_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Logs older than this will be deleted periodically. Requires an active background process to enforce.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="display-limit">Show recent logs:</Label>
            <Select value={displayLogLimit} onValueChange={setDisplayLogLimit}>
              <SelectTrigger id="display-limit" className="w-full">
                <SelectValue placeholder="Select display limit" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Display Limit</SelectLabel>
                  {DISPLAY_LIMIT_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Controls the number of recent log entries shown below.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="flex-1 flex flex-col overflow-hidden shadow-lg rounded-lg">
        <CardHeader className="border-b">
          <CardTitle className="font-headline text-2xl">Activity Logs</CardTitle>
          <CardDescription>System activity, data synchronization, and request logs.</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto p-0">
          <ScrollArea className="h-full">
            <Table className="min-w-full">
              <TableHeader className="sticky top-0 bg-card z-10 shadow-sm">
                <TableRow>
                  <TableHead className="p-4 w-[200px]">Timestamp</TableHead>
                  <TableHead className="p-4 w-[180px]">Source</TableHead>
                  <TableHead className="p-4">Message</TableHead>
                  <TableHead className="p-4 w-[100px] text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedLogs.map((log) => (
                  <TableRow key={log.id} className="hover:bg-muted/50">
                    <TableCell className="p-4 whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</TableCell>
                    <TableCell className="p-4 whitespace-nowrap">{log.source}</TableCell>
                    <TableCell className="p-4">{log.message}</TableCell>
                    <TableCell className="p-4 whitespace-nowrap text-right">
                      <Badge 
                        variant={
                          log.status === 'Error' ? 'destructive' : 
                          log.status === 'Success' ? 'default' : // 'default' often maps to primary color
                          log.status === 'Debug' ? 'outline' : // 'outline' for less emphasis
                          'secondary' // 'Info' and other types
                        }
                        className={
                          log.status === 'Success' ? 'bg-green-500 hover:bg-green-600 text-white' : 
                          log.status === 'Debug' ? 'border-blue-500 text-blue-700' : ''
                        }
                      >
                        {log.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {displayedLogs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center p-8 text-muted-foreground">
                      No logs found or all logs have been filtered.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
