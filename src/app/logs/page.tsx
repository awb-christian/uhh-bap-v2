
"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
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
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectLabel,
  SelectGroup,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { LogDetailsModal } from "@/components/logs/log-details-modal";
import type { LogEntry, LogEntryStatus } from "@/lib/app-logger";
import { getLogs, clearLogs, addLog, applyRetentionPolicy } from "@/lib/app-logger";
import { useToast } from "@/hooks/use-toast";
import { Trash2, FilterX } from "lucide-react";


const RETENTION_OPTIONS = [
  { value: "1d", label: "1 Day" },
  { value: "7d", label: "7 Days" },
  { value: "14d", label: "14 Days" },
  { value: "30d", label: "30 Days" },
  { value: "90d", label: "90 Days" },
  { value: "never", label: "Never Delete" },
];

const LOGS_PER_PAGE_OPTIONS = [
  { value: "20", label: "20 per page" },
  { value: "50", label: "50 per page" },
  { value: "100", label: "100 per page" },
  { value: "200", label: "200 per page" },
  { value: "all", label: "Show All" },
];

const STATUS_FILTER_OPTIONS: { value: LogEntryStatus | "all"; label: string }[] = [
    { value: "all", label: "All Statuses" },
    { value: "Success", label: "Success" },
    { value: "Error", label: "Error" },
    { value: "Info", label: "Info" },
    { value: "Debug", label: "Debug" },
];


export default function LogsPage() {
  const { toast } = useToast();
  const [allLogs, setAllLogs] = React.useState<LogEntry[]>([]);
  
  // Settings
  const [logRetentionPeriod, setLogRetentionPeriod] = React.useState<string>(
    RETENTION_OPTIONS[1].value // Default to 7 days
  );
  
  // Filters
  const [sourceFilter, setSourceFilter] = React.useState<string>("all");
  const [statusFilter, setStatusFilter] = React.useState<LogEntryStatus | "all">("all");
  
  // Pagination & Display
  const [logsPerPage, setLogsPerPage] = React.useState<string>(
    LOGS_PER_PAGE_OPTIONS[1].value // Default to 50 logs
  );
  const [currentPage, setCurrentPage] = React.useState(1);

  const [selectedLog, setSelectedLog] = React.useState<LogEntry | null>(null);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [isClearLogsDialogOpen, setIsClearLogsDialogOpen] = React.useState(false);
  const [settingsInitialized, setSettingsInitialized] = React.useState(false);


  const loadAndSetLogs = React.useCallback(() => {
    const logsData = getLogs().sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    setAllLogs(logsData);
  }, []);

  React.useEffect(() => {
    const storedRetention = localStorage.getItem("logRetentionPeriod");
    if (storedRetention && RETENTION_OPTIONS.find(opt => opt.value === storedRetention)) {
      setLogRetentionPeriod(storedRetention);
    } else {
      localStorage.setItem("logRetentionPeriod", RETENTION_OPTIONS[1].value);
      setLogRetentionPeriod(RETENTION_OPTIONS[1].value);
    }

    const storedLogsPerPage = localStorage.getItem("logsPerPage");
    if (storedLogsPerPage && LOGS_PER_PAGE_OPTIONS.find(opt => opt.value === storedLogsPerPage)) {
      setLogsPerPage(storedLogsPerPage);
    } else {
      localStorage.setItem("logsPerPage", LOGS_PER_PAGE_OPTIONS[1].value);
      setLogsPerPage(LOGS_PER_PAGE_OPTIONS[1].value);
    }
    setSettingsInitialized(true);
    loadAndSetLogs();

    const handleLogsUpdated = () => loadAndSetLogs();
    window.addEventListener('logsUpdated', handleLogsUpdated);
    
    return () => {
      window.removeEventListener('logsUpdated', handleLogsUpdated);
    };
  }, [loadAndSetLogs]);

  React.useEffect(() => {
    if (!settingsInitialized) return;
    localStorage.setItem("logRetentionPeriod", logRetentionPeriod);
    applyRetentionPolicy(logRetentionPeriod);
    // This also indirectly triggers a log reload if applyRetentionPolicy modifies logs,
    // which it currently doesn't directly but would in a full implementation.
  }, [logRetentionPeriod, settingsInitialized]);

  React.useEffect(() => {
    if (!settingsInitialized) return;
    localStorage.setItem("logsPerPage", logsPerPage);
    setCurrentPage(1); // Reset to first page when logs per page changes
  }, [logsPerPage, settingsInitialized]);
  
  React.useEffect(() => {
    setCurrentPage(1); // Reset to first page when filters change
  }, [sourceFilter, statusFilter]);


  const uniqueLogSources = React.useMemo(() => {
    const sources = new Set(allLogs.map(log => log.source));
    return ["all", ...Array.from(sources)].map(source => ({
      value: source,
      label: source === "all" ? "All Sources" : source,
    }));
  }, [allLogs]);

  const filteredLogs = React.useMemo(() => {
    return allLogs.filter(log => {
      const matchesSource = sourceFilter === "all" || log.source === sourceFilter;
      const matchesStatus = statusFilter === "all" || log.status === statusFilter;
      return matchesSource && matchesStatus;
    });
  }, [allLogs, sourceFilter, statusFilter]);

  const numLogsPerPage = parseInt(logsPerPage, 10);
  const showAllLogs = logsPerPage === "all";

  const totalPages = React.useMemo(() => {
    if (showAllLogs || filteredLogs.length === 0) return 1;
    return Math.max(1, Math.ceil(filteredLogs.length / numLogsPerPage));
  }, [filteredLogs.length, numLogsPerPage, showAllLogs]);

  const paginatedLogs = React.useMemo(() => {
    if (showAllLogs) return filteredLogs;
    const startIndex = (currentPage - 1) * numLogsPerPage;
    const endIndex = startIndex + numLogsPerPage;
    return filteredLogs.slice(startIndex, endIndex);
  }, [filteredLogs, currentPage, numLogsPerPage, showAllLogs]);


  const handleRowClick = (log: LogEntry) => {
    setSelectedLog(log);
    setIsModalOpen(true);
  };

  const handleClearAllLogs = () => {
    clearLogs(); // This will trigger the 'logsUpdated' event
    toast({
      title: "Logs Cleared",
      description: "All activity logs have been deleted.",
    });
    setIsClearLogsDialogOpen(false);
    addLog("LogsPage", "All activity logs were manually cleared by the user.", "Info");
  };
  
  const handleResetFilters = () => {
    setSourceFilter("all");
    setStatusFilter("all");
    toast({ title: "Filters Reset", description: "Source and Status filters have been cleared." });
    addLog("LogsPage", "Log filters (source, status) reset.", "Info");
  };

  const getBadgeVariant = (status: LogEntryStatus): { variant: "default" | "destructive" | "secondary" | "outline", className?: string } => {
    switch (status) {
      case 'Success':
        return { variant: 'default', className: 'bg-green-100 hover:bg-green-200 text-green-800 border border-green-300 dark:bg-green-700/30 dark:text-green-300 dark:border-green-600 dark:hover:bg-green-700/50' };
      case 'Error':
        return { variant: 'destructive', className: 'bg-red-100 hover:bg-red-200 text-red-800 border border-red-300 dark:bg-red-700/30 dark:text-red-300 dark:border-red-600 dark:hover:bg-red-700/50' };
      case 'Info':
        return { variant: 'secondary', className: 'bg-blue-100 hover:bg-blue-200 text-blue-800 border border-blue-300 dark:bg-blue-700/30 dark:text-blue-300 dark:border-blue-600 dark:hover:bg-blue-700/50' };
      case 'Debug':
        return { variant: 'outline', className: 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 dark:bg-gray-700/30 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700/50' };
      default:
        return { variant: 'outline', className: 'dark:text-gray-400 dark:border-gray-600' };
    }
  };
  

  return (
    <div className="flex flex-col h-full space-y-6">
      <Card className="shadow-lg rounded-lg">
        <CardHeader className="border-b">
          <CardTitle className="font-headline text-xl">Log Configuration & Filters</CardTitle>
          <CardDescription>
            Manage log retention, display, and apply filters to refine the log view.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-end">
          <div className="space-y-2">
            <Label htmlFor="log-retention">Log Retention Period</Label>
            <Select
              value={logRetentionPeriod}
              onValueChange={(value) => {
                setLogRetentionPeriod(value);
                addLog("LogsPage", `Log retention period set to: ${RETENTION_OPTIONS.find(o => o.value === value)?.label || value}.`, "Info");
              }}
            >
              <SelectTrigger id="log-retention">
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
              Logs older than this will be periodically evaluated for deletion. (Requires robust main process implementation for actual deletion).
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="log-source-filter">Filter by Source</Label>
            <Select
              value={sourceFilter}
              onValueChange={(value) => {
                  setSourceFilter(value);
                  addLog("LogsPage", `Filter by source: ${value}`, "Debug");
              }}
            >
              <SelectTrigger id="log-source-filter">
                <SelectValue placeholder="Select source" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Source</SelectLabel>
                  {uniqueLogSources.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="log-status-filter">Filter by Status</Label>
            <Select
              value={statusFilter}
              onValueChange={(value) => {
                  setStatusFilter(value as LogEntryStatus | "all");
                  addLog("LogsPage", `Filter by status: ${value}`, "Debug");
              }}
            >
              <SelectTrigger id="log-status-filter">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Status</SelectLabel>
                  {STATUS_FILTER_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-end md:col-start-1 lg:col-start-auto"> {/* Adjust column start for medium and large screens if needed or let it flow */}
              <Button onClick={handleResetFilters} variant="outline" className="w-full">
                  <FilterX className="mr-2 h-4 w-4" /> Reset Filters
              </Button>
          </div>

        </CardContent>
         <CardFooter className="border-t pt-6 flex justify-start items-center"> {/* Changed justify-between to justify-start */}
          <AlertDialog open={isClearLogsDialogOpen} onOpenChange={setIsClearLogsDialogOpen}>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="mr-2 h-4 w-4" /> Delete All Activity Logs
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete all
                  activity logs stored in your browser's local storage.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => addLog("LogsPage", "Delete all logs cancelled by user.", "Debug")}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleClearAllLogs} className="bg-destructive hover:bg-destructive/90">
                  Yes, delete all logs
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardFooter>
      </Card>

      <Card className="flex-1 flex flex-col overflow-hidden shadow-lg rounded-lg">
        <CardHeader className="border-b">
          <CardTitle className="font-headline text-2xl">Activity Logs</CardTitle>
          <CardDescription>
            System activity, data synchronization, and request logs. Click a row to view details.
            Showing {paginatedLogs.length} of {filteredLogs.length} filtered logs.
            {!showAllLogs && ` (Page ${currentPage} of ${totalPages})`}
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
                {paginatedLogs.length > 0 ? paginatedLogs.map((log) => {
                  const badgeStyle = getBadgeVariant(log.status);
                  return (
                    <TableRow
                      key={log.id}
                      onClick={() => handleRowClick(log)}
                      className="cursor-pointer hover:bg-muted/50 dark:hover:bg-muted/20"
                    >
                      <TableCell className="p-4 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString()}
                      </TableCell>
                      <TableCell className="p-4 whitespace-nowrap">
                        {log.source}
                      </TableCell>
                      <TableCell className="p-4 truncate max-w-xs md:max-w-md lg:max-w-lg xl:max-w-xl" title={log.message}>
                        {log.message}
                      </TableCell>
                      <TableCell className="p-4 whitespace-nowrap text-right">
                        <Badge variant={badgeStyle.variant} className={badgeStyle.className}>
                          {log.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                }) : (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="text-center p-8 text-muted-foreground h-48"
                    >
                      {allLogs.length > 0 ? "No logs found matching your criteria." : "No logs available yet."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
        <CardFooter className="border-t pt-4 pb-4 flex items-center justify-between">
            <div className="flex items-center space-x-2">
                <Label htmlFor="logsPerPage" className="text-sm">Logs per page:</Label>
                <Select
                value={logsPerPage}
                onValueChange={(value) => {
                    setLogsPerPage(value);
                    addLog("LogsPage", `Logs per page set to: ${LOGS_PER_PAGE_OPTIONS.find(o => o.value === value)?.label || value}.`, "Info");
                }}
                >
                <SelectTrigger id="logsPerPage" className="w-[140px] h-9">
                    <SelectValue placeholder="Select count" />
                </SelectTrigger>
                <SelectContent>
                    <SelectGroup>
                        <SelectLabel>Display Limit</SelectLabel>
                        {LOGS_PER_PAGE_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                            {option.label}
                            </SelectItem>
                        ))}
                    </SelectGroup>
                </SelectContent>
                </Select>
            </div>
            {!showAllLogs && filteredLogs.length > 0 && (
                <div className="flex items-center space-x-2">
                    <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    >
                    Previous
                    </Button>
                    <span className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                    </span>
                    <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    >
                    Next
                    </Button>
                </div>
            )}
        </CardFooter>
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

