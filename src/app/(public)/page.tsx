import { BadgeCheck, Archive, QrCode, Search } from "lucide-react";
import { VerifyForm } from "@/components/verify-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const pillars = [
  {
    icon: QrCode,
    title: "Instant QR verification",
    body: "Every certificate carries a unique ID and QR that opens a live public record.",
  },
  {
    icon: BadgeCheck,
    title: "Automated generation",
    body: "Upload a roster once. The system stamps each name onto your template and produces PDFs.",
  },
  {
    icon: Archive,
    title: "Permanent archive",
    body: "Records outlive board turnovers — nothing lives only on someone's laptop.",
  },
  {
    icon: Search,
    title: "Public re-download",
    body: "Recipients who lose a file can find and download it again without messaging anyone.",
  },
];

export default function HomePage() {
  return (
    <div className="surface-grid">
      <section className="mx-auto max-w-6xl px-4 pb-16 pt-16 sm:px-6 sm:pb-24 sm:pt-24">
        <div className="max-w-2xl">
          <p className="mb-3 text-sm font-medium uppercase tracking-[0.18em] text-accent-foreground/80">
            Credentialing for Leo Clubs
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-primary sm:text-5xl">
            LeoVerify
          </h1>
          <p className="mt-4 max-w-xl text-lg leading-relaxed text-muted-foreground">
            Issue signed certificates your community can trust. Anyone can check a
            record independently of the PDF — no login required.
          </p>
        </div>

        <Card id="verify" className="mt-12 max-w-xl scroll-mt-24">
          <CardHeader>
            <CardTitle>Verify a certificate</CardTitle>
            <CardDescription>
              Enter the ID from the certificate, or open the link / QR code directly.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <VerifyForm />
          </CardContent>
        </Card>
      </section>

      <section className="border-t border-border bg-card">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
          {pillars.map((pillar) => {
            const Icon = pillar.icon;
            return (
              <div key={pillar.title} className="space-y-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/5 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <h2 className="text-base font-semibold text-foreground">
                  {pillar.title}
                </h2>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {pillar.body}
                </p>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
