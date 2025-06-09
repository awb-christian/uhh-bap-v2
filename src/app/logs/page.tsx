import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

// Placeholder data for logs
const logs = [
  { id: 1, timestamp: new Date(Date.now() - 5*60000).toISOString(), source: 'ZKTeco Biotime', message: 'Fetched 50 attendance records.', status: 'Success' },
  { id: 2, timestamp: new Date(Date.now() - 4*60000).toISOString(), source: 'Odoo Server', message: 'Attempting to push 50 records.', status: 'Info' },
  { id: 3, timestamp: new Date(Date.now() - 3*60000).toISOString(), source: 'Odoo Server', message: 'Pushed 50 records to Odoo instance.', status: 'Success' },
  { id: 4, timestamp: new Date(Date.now() - 2*60000).toISOString(), source: 'ZKTeco Time', message: 'Connection error: Device at 192.168.1.202 offline.', status: 'Error' },
  { id: 5, timestamp: new Date(Date.now() - 1*60000).toISOString(), source: 'Sentry', message: 'Scheduled sync started.', status: 'Info' },
];

export default function LogsPage() {
  return (
    <div className="flex flex-col h-full">
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
                {logs.map((log) => (
                  <TableRow key={log.id} className="hover:bg-muted/50">
                    <TableCell className="p-4 whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</TableCell>
                    <TableCell className="p-4 whitespace-nowrap">{log.source}</TableCell>
                    <TableCell className="p-4">{log.message}</TableCell>
                    <TableCell className="p-4 whitespace-nowrap text-right">
                      <Badge variant={log.status === 'Error' ? 'destructive' : log.status === 'Success' ? 'default' : 'secondary'}
                             className={log.status === 'Success' ? 'bg-green-500 hover:bg-green-600 text-white' : ''}
                      >
                        {log.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {logs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center p-8 text-muted-foreground">
                      No logs found. System is quiet.
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
