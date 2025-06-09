import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Fingerprint } from "lucide-react";

export default function ZKTecoBiotimePage() {
  return (
    <Card className="shadow-lg rounded-lg">
      <CardHeader className="border-b">
        <div className="flex items-center gap-3">
          <Fingerprint className="h-8 w-8 text-primary" />
          <CardTitle className="font-headline text-2xl">ZKTeco Biotime Integration</CardTitle>
        </div>
        <CardDescription>Manage and synchronize attendance data from ZKTeco Biotime devices.</CardDescription>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        <div>
          <h3 className="font-semibold text-lg mb-2">Device Configuration</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="biotime-ip">Device IP Address</Label>
              <Input id="biotime-ip" placeholder="e.g., 192.168.1.201" defaultValue="192.168.1.201" />
            </div>
            <div>
              <Label htmlFor="biotime-port">Port</Label>
              <Input id="biotime-port" placeholder="e.g., 80" defaultValue="80" />
            </div>
          </div>
        </div>
        
        <div>
          <h3 className="font-semibold text-lg mb-2">Actions</h3>
          <div className="flex flex-wrap gap-3">
            <Button>
              <Fingerprint className="mr-2 h-4 w-4" /> Test Connection
            </Button>
            <Button variant="outline">
              Fetch Attendance Data
            </Button>
            <Button variant="secondary">
              View Device Logs
            </Button>
          </div>
        </div>

        <div>
          <h3 className="font-semibold text-lg mb-2">Status</h3>
          <p className="text-sm text-muted-foreground">
            Last sync: Not yet synced. Device status: Unknown.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
