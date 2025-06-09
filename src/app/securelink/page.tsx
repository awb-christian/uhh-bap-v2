import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link2 } from "lucide-react"; // Using Link2 as per sidebar nav

export default function SecureLinkPage() {
  return (
    <Card className="shadow-lg rounded-lg">
      <CardHeader className="border-b">
         <div className="flex items-center gap-3">
          <Link2 className="h-8 w-8 text-primary" />
          <CardTitle className="font-headline text-2xl">SecureLink Management</CardTitle>
        </div>
        <CardDescription>Manage secure connections or configurations for data transfer.</CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <p className="text-muted-foreground">
          This section is intended for managing secure communication channels or specific configurations related to "SecureLink".
          This might involve settings for VPNs, encrypted tunnels, or API key management for secure data exchange with Odoo or other services.
        </p>
         <div className="mt-6 p-6 bg-muted rounded-lg">
            <h4 className="font-semibold mb-2">Placeholder Content</h4>
            <p>Details about current secure links or configuration options would appear here.</p>
            <p className="mt-2 text-sm">Example: "Odoo API Connection: Secured (SSL/TLS)"</p>
        </div>
      </CardContent>
    </Card>
  );
}
