
"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectLabel,
  SelectGroup,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { LogDetailsModal } from "@/components/logs/log-details-modal";
import type { LogEntry, LogEntryStatus } from "@/lib/app-logger"; 
import { getLogs, clearLogs } from "@/lib/app-logger"; // We'll use getLogs

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


const RETENTION_OPTIONS = [
  { value: "1d", label: "1 Day" },
  { value: "7d", label: "7 Days" },
  { value: "14d", label: "14 Days" },
  { value: "30d", label: "30 Days" },
  { value: "90d", label: "90 Days" },
  { value: "never", label: "Never Delete" },
];

const DISPLAY_LIMIT_OPTIONS = [
  { value: "20", label: "20 Logs" },
  { value: "50", label: "50 Logs" },
  { value: "100", label: "100 Logs" },
  { value: "200", label: "200 Logs" },
  { value: "all", label: "All Logs" },
];

export default function LogsPage() {
  const [logRetentionPeriod, setLogRetentionPeriod] = React.useState<string>(
    RETENTION_OPTIONS[1].value // Default to 7 days
  );
  const [displayLogLimit, setDisplayLogLimit] = React.useState<string>(
    DISPLAY_LIMIT_OPTIONS[1].value // Default to 50 logs
  );
  const [logs, setLogs] = React.useState<LogEntry[]>([]);
  const [selectedLog, setSelectedLog] = React.useState<LogEntry | null>(null);
  const [isModalOpen, setIsModalOpen] = React.useState(false);

  // Function to load logs and apply settings
  const loadAndSetLogs = React.useCallback(() => {
    const allLogs = getLogs().sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()); // Ensure sorted by newest
    setLogs(allLogs);
  }, []);


  React.useEffect(() => {
    const storedRetention = localStorage.getItem("logRetentionPeriod");
    if (storedRetention && RETENTION_OPTIONS.find(opt => opt.value === storedRetention)) {
      setLogRetentionPeriod(storedRetention);
    }
    const storedLimit = localStorage.getItem("displayLogLimit");
    if (storedLimit && DISPLAY_LIMIT_OPTIONS.find(opt => opt.value === storedLimit)) {
      setDisplayLogLimit(storedLimit);
    }
    loadAndSetLogs();

    // Listen for custom event that logs might have been updated elsewhere
    const handleLogsUpdated = () => loadAndSetLogs();
    window.addEventListener('logsUpdated', handleLogsUpdated);
    return () => {
      window.removeEventListener('logsUpdated', handleLogsUpdated);
    };

  }, [loadAndSetLogs]);

  React.useEffect(() => {
    localStorage.setItem("logRetentionPeriod", logRetentionPeriod);
    // Placeholder: In a real app, this change would trigger logic (e.g., via IPC to Electron main)
    // to schedule or perform log cleanup based on the new retention period.
    // console.log(`Log retention period set to: ${logRetentionPeriod}. Implement backend cleanup logic.`);
  }, [logRetentionPeriod]);

  React.useEffect(() => {
    localStorage.setItem("displayLogLimit", displayLogLimit);
    // No direct action needed here other than persisting, filtering is done by displayedLogs memo
  }, [displayLogLimit]);

  const displayedLogs = React.useMemo(() => {
    const limit = parseInt(displayLogLimit, 10);
    if (isNaN(limit)) { // Handles 'all' case
      return logs;
    }
    return logs.slice(0, limit);
  }, [logs, displayLogLimit]);

  const handleRowClick = (log: LogEntry) => {
    setSelectedLog(log);
    setIsModalOpen(true);
  };

  const getBadgeVariant = (status: LogEntryStatus): { variant: "default" | "destructive" | "secondary" | "outline", className?: string } => {
    switch (status) {
      case 'Success':
        return { variant: 'default', className: 'bg-green-100 hover:bg-green-200 text-green-800 border border-green-300' };
      case 'Error':
        return { variant: 'destructive', className: 'bg-red-100 hover:bg-red-200 text-red-800 border border-red-300' }; // Destructive usually has its own distinct styling
      case 'Info':
        return { variant: 'secondary', className: 'bg-blue-100 hover:bg-blue-200 text-blue-800 border border-blue-300' };
      case 'Debug':
        return { variant: 'outline', className: 'bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-300' };
      default:
        return { variant: 'outline' };
    }
  };
  

  return (
    <div className="flex flex-col h-full space-y-6">
      <Card className="shadow-lg rounded-lg">
        <CardHeader className="border-b">
          <CardTitle className="font-headline text-xl">Log Settings</CardTitle>
          <CardDescription>
            Configure log retention and display preferences. Log deletion based on retention period requires a background process.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="log-retention">Log Retention Period</Label>
            <Select
              value={logRetentionPeriod}
              onValueChange={setLogRetentionPeriod}
            >
              <SelectTrigger id="log-retention" className="w-full">
                <SelectValue placeholder="Select retention period" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Retention Period</SelectLabel>
                  {RETENTION_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Select how long logs should be kept. Older logs will be periodically deleted by a background process.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="display-limit">Show recent logs:</Label>
            <Select
              value={displayLogLimit}
              onValueChange={setDisplayLogLimit}
            >
              <SelectTrigger id="display-limit" className="w-full">
                <SelectValue placeholder="Select display limit" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Display Limit</SelectLabel>
                  {DISPLAY_LIMIT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
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
          <CardDescription>
            System activity, data synchronization, and request logs. Click a row to view details.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto p-0">
          <ScrollArea className="h-full">
            <Table className="min-w-full">
              <TableHeader className="sticky top-0 bg-card z-10 shadow-sm">
                <TableRow>
                  <TableHead className="p-4 w-[200px]">Timestamp</TableHead>
                  <TableHead className="p-4 w-[180px]">Source</TableHead>
                  <TableHead className="p-4">Message (Preview)</TableHead>
                  <TableHead className="p-4 w-[100px] text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedLogs.map((log) => {
                  const badgeStyle = getBadgeVariant(log.status);
                  return (
                    <TableRow
                      key={log.id}
                      onClick={() => handleRowClick(log)}
                      className="cursor-pointer hover:bg-muted/50"
                    >
                      <TableCell className="p-4 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString()}
                      </TableCell>
                      <TableCell className="p-4 whitespace-nowrap">
                        {log.source}
                      </TableCell>
                      <TableCell className="p-4 truncate max-w-md" title={log.message}>
                        {log.message}
                      </TableCell>
                      <TableCell className="p-4 whitespace-nowrap text-right">
                        <Badge variant={badgeStyle.variant} className={badgeStyle.className}>
                          {log.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {displayedLogs.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="text-center p-8 text-muted-foreground"
                    >
                      No logs available yet, or all logs have been filtered based on current settings.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {selectedLog && (
        <LogDetailsModal
          log={selectedLog}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedLog(null);
          }}
        />
      )}
    </div>
  );
}
