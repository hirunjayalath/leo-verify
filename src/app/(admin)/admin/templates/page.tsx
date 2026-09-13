import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function AdminTemplatesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-primary">
          Templates
        </h1>
        <p className="mt-1 text-muted-foreground">
          Templates are data: a background image plus field-position JSON — never
          hardcoded layouts.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Designer coming soon</CardTitle>
          <CardDescription>
            Canvas-based positioning (Fabric.js / Konva) will let club officers place
            name, role, date, and QR fields visually.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
