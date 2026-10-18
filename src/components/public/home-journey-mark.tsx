import { cn } from "@/lib/utils";

/** Small monochrome marks for the five journey steps. */
export function HomeJourneyMark({
  step,
  className,
}: {
  step: string;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 80 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-16 w-20 text-[var(--he-fg)]", className)}
      aria-hidden="true"
    >
      {step === "01" ? <TemplateMark /> : null}
      {step === "02" ? <QrMark /> : null}
      {step === "03" ? <EnvelopeMark /> : null}
      {step === "04" ? <PortfolioMark /> : null}
      {step === "05" ? <CheckMark /> : null}
    </svg>
  );
}

function TemplateMark() {
  return (
    <>
      <rect x="14" y="8" width="52" height="48" stroke="currentColor" strokeWidth="1.75" />
      <path d="M22 20h28M22 28h36M22 36h20" stroke="currentColor" strokeWidth="1.75" />
    </>
  );
}

function QrMark() {
  return (
    <>
      <rect x="16" y="10" width="16" height="16" stroke="currentColor" strokeWidth="1.75" />
      <rect x="48" y="10" width="16" height="16" stroke="currentColor" strokeWidth="1.75" />
      <rect x="16" y="38" width="16" height="16" stroke="currentColor" strokeWidth="1.75" />
      <path d="M21 15h6v6h-6zM53 15h6v6h-6zM21 43h6v6h-6z" fill="currentColor" />
      <path d="M40 14v8M48 42h8M40 46h6M56 50h8" stroke="currentColor" strokeWidth="1.75" />
    </>
  );
}

function EnvelopeMark() {
  return (
    <>
      <rect x="10" y="16" width="60" height="36" stroke="currentColor" strokeWidth="1.75" />
      <path d="M10 16l30 22L70 16" stroke="currentColor" strokeWidth="1.75" />
    </>
  );
}

function PortfolioMark() {
  return (
    <>
      <circle cx="28" cy="22" r="7" stroke="currentColor" strokeWidth="1.75" />
      <path d="M16 46c2-8 8-12 12-12s10 4 12 12" stroke="currentColor" strokeWidth="1.75" />
      <rect x="44" y="18" width="22" height="28" stroke="currentColor" strokeWidth="1.75" />
      <path d="M50 26h10M50 32h10M50 38h6" stroke="currentColor" strokeWidth="1.75" />
    </>
  );
}

function CheckMark() {
  return (
    <>
      <circle cx="40" cy="32" r="18" stroke="currentColor" strokeWidth="1.75" />
      <path d="M32 32l5 5 11-12" stroke="currentColor" strokeWidth="1.75" />
    </>
  );
}
