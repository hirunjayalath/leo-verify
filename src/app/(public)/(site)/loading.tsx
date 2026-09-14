import { Skeleton } from "@/components/ui/skeleton";

export default function PublicLoading() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-16 sm:px-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-96 max-w-full" />
      <Skeleton className="mt-8 h-64 w-full max-w-xl rounded-2xl" />
    </div>
  );
}
