import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Network } from "lucide-react";

export default function UhhConnectivityPage() {
  return (
    <Card className="shadow-lg rounded-lg">
      <CardHeader className="border-b">
        <div className="flex items-center gap-3">
          <Network className="h-8 w-8 text-primary" />
          <CardTitle className="font-headline text-2xl">UHH Connectivity</CardTitle>
        </div>
        <CardDescription>Monitor and manage connectivity related to UHH (University Hospital Hamburg or similar context).</CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <p className="text-muted-foreground">
          This section would display status information or configuration options related to network connectivity,
          potentially specific to a UHH environment or related services. This could include Odoo server reachability,
          local network device status, or VPN connections if applicable.
        </p>
        <div className="mt-6 p-6 bg-muted rounded-lg">
            <h4 className="font-semibold mb-2">Connectivity Status</h4>
            <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Odoo Server: <span className="text-green-600 font-semibold">Connected</span></li>
                <li>Local Network: <span className="text-green-600 font-semibold">Stable</span></li>
                <li>Internet Access: <span className="text-green-600 font-semibold">Available</span></li>
                <li>UHH VPN (if applicable): <span className="text-red-600 font-semibold">Disconnected</span></li>
            </ul>
        </div>
      </CardContent>
    </Card>
  );
}
