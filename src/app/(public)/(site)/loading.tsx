import { Skeleton } from "@/components/ui/skeleton";

export default function PublicLoading() {
  return (
    <div className="site-page-shell min-h-[calc(100vh-4rem)]">
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-16 sm:px-6">
        <Skeleton className="h-10 w-56 rounded-xl" />
        <Skeleton className="h-4 w-96 max-w-full" />
        <Skeleton className="mt-8 h-72 w-full rounded-[1.75rem]" />
      </div>
    </div>
  );
}
