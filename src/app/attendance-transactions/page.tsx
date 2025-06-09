
"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
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
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarIcon, Trash2, Search, FilterX } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { AttendanceTransaction, TransactionType, UploadStatus } from "@/lib/attendance-manager";
import {
  getAttendanceTransactions,
  clearAttendanceTransactions,
  seedSampleTransactions,
  addAttendanceTransaction, // Added for potential future use
} from "@/lib/attendance-manager";

const RECORDS_PER_PAGE_OPTIONS = [
  { value: "10", label: "10 per page" },
  { value: "25", label: "25 per page" },
  { value: "50", label: "50 per page" },
  { value: "100", label: "100 per page" },
];

const TRANSACTION_TYPE_OPTIONS: { value: TransactionType | "all"; label: string }[] = [
  { value: "all", label: "All Types" },
  { value: "check-in", label: "Check-in" },
  { value: "check-out", label: "Check-out" },
];

const UPLOAD_STATUS_OPTIONS: { value: UploadStatus | "all"; label: string }[] = [
  { value: "all", label: "All Statuses" },
  { value: "not_uploaded", label: "Not Uploaded" },
  { value: "uploaded", label: "Uploaded" },
];

export default function AttendanceTransactionsPage() {
  const { toast } = useToast();
  const [allTransactions, setAllTransactions] = React.useState<AttendanceTransaction[]>([]);
  
  // Filters
  const [employeeIdFilter, setEmployeeIdFilter] = React.useState("");
  const [transactionTypeFilter, setTransactionTypeFilter] = React.useState<TransactionType | "all">("all");
  const [statusFilter, setStatusFilter] = React.useState<UploadStatus | "all">("all");
  const [dateFromFilter, setDateFromFilter] = React.useState<Date | undefined>();
  const [dateToFilter, setDateToFilter] = React.useState<Date | undefined>();

  // Pagination
  const [currentPage, setCurrentPage] = React.useState(1);
  const [recordsPerPage, setRecordsPerPage] = React.useState<string>(
    RECORDS_PER_PAGE_OPTIONS[1].value // Default to 25
  );

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);

  const loadAndSetTransactions = React.useCallback(() => {
    let transactions = getAttendanceTransactions();
    if (transactions.length === 0) {
      seedSampleTransactions(); // Seed if local storage is empty
      transactions = getAttendanceTransactions();
    }
    // Default sort by transaction_time descending (newest first)
    transactions.sort((a, b) => new Date(b.transaction_time).getTime() - new Date(a.transaction_time).getTime());
    setAllTransactions(transactions);
  }, []);

  React.useEffect(() => {
    loadAndSetTransactions();
    const handleTransactionsUpdated = () => loadAndSetTransactions();
    window.addEventListener('attendanceTransactionsUpdated', handleTransactionsUpdated);
    return () => window.removeEventListener('attendanceTransactionsUpdated', handleTransactionsUpdated);
  }, [loadAndSetTransactions]);

  React.useEffect(() => {
    localStorage.setItem("attendanceRecordsPerPage", recordsPerPage);
  }, [recordsPerPage]);

  React.useEffect(() => {
    const storedRecordsPerPage = localStorage.getItem("attendanceRecordsPerPage");
    if (storedRecordsPerPage && RECORDS_PER_PAGE_OPTIONS.find(opt => opt.value === storedRecordsPerPage)) {
      setRecordsPerPage(storedRecordsPerPage);
    }
  }, []);


  const filteredTransactions = React.useMemo(() => {
    setCurrentPage(1); // Reset to first page on filter change
    return allTransactions.filter((transaction) => {
      const matchesEmployeeId = employeeIdFilter
        ? transaction.employee_id.toLowerCase().includes(employeeIdFilter.toLowerCase())
        : true;
      const matchesTransactionType =
        transactionTypeFilter === "all"
          ? true
          : transaction.transaction_type === transactionTypeFilter;
      const matchesStatus =
        statusFilter === "all" ? true : transaction.status === statusFilter;
      
      let matchesDate = true;
      if (dateFromFilter || dateToFilter) {
        const transactionDate = new Date(transaction.transaction_time);
        if (dateFromFilter && transactionDate < new Date(new Date(dateFromFilter).setHours(0,0,0,0))) {
          matchesDate = false;
        }
        if (dateToFilter && transactionDate > new Date(new Date(dateToFilter).setHours(23,59,59,999))) {
          matchesDate = false;
        }
      }
      return matchesEmployeeId && matchesTransactionType && matchesStatus && matchesDate;
    });
  }, [allTransactions, employeeIdFilter, transactionTypeFilter, statusFilter, dateFromFilter, dateToFilter]);

  const numRecordsPerPage = parseInt(recordsPerPage, 10);
  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / numRecordsPerPage));
  
  const paginatedTransactions = React.useMemo(() => {
    const startIndex = (currentPage - 1) * numRecordsPerPage;
    const endIndex = startIndex + numRecordsPerPage;
    return filteredTransactions.slice(startIndex, endIndex);
  }, [filteredTransactions, currentPage, numRecordsPerPage]);

  const handleClearAllTransactions = () => {
    clearAttendanceTransactions();
    toast({
      title: "Attendance Transactions Cleared",
      description: "All attendance transaction records have been deleted.",
    });
    setIsDeleteDialogOpen(false);
    // loadAndSetTransactions will be called by the event listener
  };
  
  const handleResetFilters = () => {
    setEmployeeIdFilter("");
    setTransactionTypeFilter("all");
    setStatusFilter("all");
    setDateFromFilter(undefined);
    setDateToFilter(undefined);
    toast({ title: "Filters Reset", description: "All transaction filters have been cleared." });
  };

  const getBadgeVariantForStatus = (status: UploadStatus): { variant: "default" | "secondary" | "outline", className?: string } => {
    switch (status) {
      case 'uploaded':
        return { variant: 'default', className: 'bg-green-100 hover:bg-green-200 text-green-800 border border-green-300 dark:bg-green-700/30 dark:text-green-300 dark:border-green-600 dark:hover:bg-green-700/50' };
      case 'not_uploaded':
        return { variant: 'secondary', className: 'bg-yellow-100 hover:bg-yellow-200 text-yellow-800 border border-yellow-300 dark:bg-yellow-700/30 dark:text-yellow-300 dark:border-yellow-600 dark:hover:bg-yellow-700/50' };
      default:
        return { variant: 'outline', className: 'dark:text-gray-400 dark:border-gray-600' };
    }
  };

  return (
    <div className="flex flex-col h-full space-y-6">
      <Card className="shadow-lg rounded-lg">
        <CardHeader className="border-b">
          <CardTitle className="font-headline text-xl">Filter Attendance Transactions</CardTitle>
          <CardDescription>
            Refine the list of transactions using the filters below.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
            <div>
              <Label htmlFor="employeeIdFilter">Employee ID</Label>
              <Input
                id="employeeIdFilter"
                placeholder="Search by Employee ID"
                value={employeeIdFilter}
                onChange={(e) => setEmployeeIdFilter(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="transactionTypeFilter">Transaction Type</Label>
              <Select
                value={transactionTypeFilter}
                onValueChange={(value) => setTransactionTypeFilter(value as TransactionType | "all")}
              >
                <SelectTrigger id="transactionTypeFilter">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {TRANSACTION_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="statusFilter">Upload Status</Label>
              <Select
                value={statusFilter}
                onValueChange={(value) => setStatusFilter(value as UploadStatus | "all")}
              >
                <SelectTrigger id="statusFilter">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {UPLOAD_STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="dateFromFilter">Date From</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="dateFromFilter"
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateFromFilter && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFromFilter ? format(dateFromFilter, "PPP") : <span>Pick a start date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dateFromFilter}
                    onSelect={setDateFromFilter}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label htmlFor="dateToFilter">Date To</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="dateToFilter"
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateToFilter && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateToFilter ? format(dateToFilter, "PPP") : <span>Pick an end date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dateToFilter}
                    onSelect={setDateToFilter}
                    disabled={(date) => dateFromFilter ? date < dateFromFilter : false}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
             <div className="flex items-end">
                <Button onClick={handleResetFilters} variant="outline" className="w-full">
                    <FilterX className="mr-2 h-4 w-4" /> Reset Filters
                </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="flex-1 flex flex-col overflow-hidden shadow-lg rounded-lg">
        <CardHeader className="border-b flex flex-row items-center justify-between">
          <div>
            <CardTitle className="font-headline text-2xl">Attendance Records</CardTitle>
            <CardDescription>
              Showing {paginatedTransactions.length} of {filteredTransactions.length} transactions.
              (Page {currentPage} of {totalPages})
            </CardDescription>
          </div>
           <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="mr-2 h-4 w-4" /> Delete All Transactions
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete all
                  attendance transaction records.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleClearAllTransactions} className="bg-destructive hover:bg-destructive/90">
                  Yes, delete all transactions
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto p-0">
          <ScrollArea className="h-full">
            <Table className="min-w-full">
              <TableHeader className="sticky top-0 bg-card z-10 shadow-sm">
                <TableRow>
                  <TableHead className="p-3 w-[100px]">ID</TableHead>
                  <TableHead className="p-3 w-[150px]">Employee ID</TableHead>
                  <TableHead className="p-3 w-[180px]">Transaction Time</TableHead>
                  <TableHead className="p-3 w-[120px]">Type</TableHead>
                  <TableHead className="p-3 w-[150px]">Source Type</TableHead>
                  <TableHead className="p-3 w-[150px]">Device ID</TableHead>
                  <TableHead className="p-3 w-[120px] text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedTransactions.length > 0 ? (
                  paginatedTransactions.map((transaction) => {
                    const badgeStyle = getBadgeVariantForStatus(transaction.status);
                    return (
                    <TableRow key={transaction.id}>
                      <TableCell className="p-3 truncate" title={transaction.id}>{transaction.id.substring(0, 8)}...</TableCell>
                      <TableCell className="p-3">{transaction.employee_id}</TableCell>
                      <TableCell className="p-3">
                        {format(new Date(transaction.transaction_time), "PPpp")}
                      </TableCell>
                      <TableCell className="p-3">{transaction.transaction_type}</TableCell>
                      <TableCell className="p-3">{transaction.source_type}</TableCell>
                      <TableCell className="p-3 truncate" title={transaction.device_id}>{transaction.device_id}</TableCell>
                      <TableCell className="p-3 text-right">
                         <Badge variant={badgeStyle.variant} className={badgeStyle.className}>
                          {transaction.status.replace("_", " ")}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  )})
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center p-8 text-muted-foreground h-48">
                      No attendance transactions found matching your criteria, or no data available.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
        <CardFooter className="border-t pt-4 pb-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Label htmlFor="recordsPerPage" className="text-sm">Rows per page:</Label>
            <Select
              value={recordsPerPage}
              onValueChange={(value) => {
                setRecordsPerPage(value);
                setCurrentPage(1); // Reset to first page when changing records per page
              }}
            >
              <SelectTrigger id="recordsPerPage" className="w-[120px] h-9">
                <SelectValue placeholder="Select count" />
              </SelectTrigger>
              <SelectContent>
                {RECORDS_PER_PAGE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
        </CardFooter>
      </Card>
    </div>
  );
}


    