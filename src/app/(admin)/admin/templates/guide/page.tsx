import Link from "next/link";
import { requireClubAdmin } from "@/lib/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function DesignerGuidePage() {
  await requireClubAdmin();

  return (
    <div className="mx-auto max-w-2xl space-y-6 animate-fade-up">
      <div>
        <p className="text-sm text-muted-foreground">
          <Link
            href="/admin/templates"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Templates
          </Link>
          {" · "}
          Designer guide
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          How to design a certificate
        </h1>
        <p className="mt-1 text-muted-foreground">
          Each event has its own template. Paint the artwork, upload it, then
          place name, role, and QR. The PNG is not scanned.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Page size</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            A4 landscape (297 × 210 mm). Export PNG at{" "}
            <strong className="text-foreground">1684 × 1190 px</strong> (2×
            842 × 595 pt), under 5 MB.
          </p>
          <p>
            The PDF stretches the background to 842 × 595. A 16:9 file such as
            1280 × 720 will look distorted.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>What you paint vs what the app fills</CardTitle>
          <CardDescription>
            Email is never printed. Do not add extra CSV columns.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <ul className="list-disc space-y-1.5 pl-5">
            <li>
              <strong className="text-foreground">On the PNG:</strong> frame,
              title, sentences, event title, club or logo, signature lines.
            </li>
            <li>
              <strong className="text-foreground">CSV:</strong> recipient name,
              role, optional achievement, email (for sending only).
            </li>
            <li>
              <strong className="text-foreground">Issue:</strong> date,
              certificate ID, QR.
            </li>
          </ul>
          <p className="mt-3">
            If you paint the event or club name, delete those fields in the
            designer so they are not printed twice.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Reserved gaps</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            Leave empty bands for name (largest, ~30 pt), role (~15 pt),
            optional achievement, date, ID (bottom left), and QR (bottom right,
            at least 78 × 78 pt with a quiet zone).
          </p>
          <p>
            After upload, open Edit layout and drag those fields onto the gaps.
            Coordinates are PDF points from the top-left.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
