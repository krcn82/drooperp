import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QrCode } from "lucide-react";

export default function CustomerMenuPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/20">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle className="flex items-center justify-center gap-2 text-2xl">
            <QrCode className="h-8 w-8" />
            Customer QR Menu
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            This page is a placeholder for the customer-facing QR code menu.
            When developed, customers will be able to scan a QR code at their table
            to view the menu and place orders directly.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
