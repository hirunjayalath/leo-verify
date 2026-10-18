import { cn } from "@/lib/utils";

/** Line drawings for the four get-started paths. */
export function HomeQuickPathMark({
  code,
  className,
}: {
  code: string;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 80 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      stroke="currentColor"
      strokeWidth="1.75"
      className={cn("h-20 w-24", className)}
      aria-hidden="true"
    >
      {code === "DEMO-001" ? <Certificate /> : null}
      {code === "CAMERA" ? <Camera /> : null}
      {code === "CLAIM" ? <Inbox /> : null}
      {code === "NEW CLUB" ? <Building /> : null}
    </svg>
  );
}

function Certificate() {
  return (
    <>
      <rect x="18" y="6" width="44" height="52" rx="2" />
      <path d="M28 18h24M28 26h24M28 34h16" />
      <path d="M34 48l6 6 12-14" />
    </>
  );
}

function Camera() {
  return (
    <>
      <rect x="10" y="18" width="60" height="36" rx="4" />
      <path d="M28 18l4-8h16l4 8" />
      <circle cx="40" cy="36" r="10" />
    </>
  );
}

function Inbox() {
  return (
    <>
      <path d="M10 28l8-16h44l8 16v22H10V28z" />
      <path d="M10 28h16l4 8h20l4-8h16" />
    </>
  );
}

function Building() {
  return (
    <>
      <path d="M16 58V22L40 8l24 14v36" />
      <path d="M16 58h48" />
      <path d="M32 58V40h16v18" />
      <path d="M28 28h6M46 28h6M28 36h6M46 36h6" />
    </>
  );
}
