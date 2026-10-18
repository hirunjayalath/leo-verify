import { HomeEditorialFooter } from "@/components/public/home-editorial-footer";
import { HomeEditorialHeader } from "@/components/public/home-editorial-header";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="home-editorial-page flex min-h-full flex-1 flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-accent-foreground"
      >
        Skip to content
      </a>
      <HomeEditorialHeader />
      <main id="main-content" className="flex flex-1 flex-col">
        {children}
      </main>
      <HomeEditorialFooter />
    </div>
  );
}
