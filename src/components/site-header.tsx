import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-b border-border/80 bg-card/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-sm font-bold text-accent">
            LV
          </span>
          <span className="text-lg font-semibold tracking-tight text-primary">
            LeoVerify
          </span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link
            href="/#verify"
            className="rounded-md px-3 py-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            Verify
          </Link>
          <Link
            href="/login"
            className="rounded-md px-3 py-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            Club login
          </Link>
        </nav>
      </div>
    </header>
  );
}
