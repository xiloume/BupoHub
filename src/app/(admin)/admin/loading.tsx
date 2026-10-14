import { Skeleton } from "@/components/ui/misc";

export default function Loading() {
  return (
    <div className="flex flex-col gap-8" aria-busy>
      <Skeleton className="h-40 rounded-3xl" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-2xl" />)}
      </div>
      <div className="grid gap-6 lg:grid-cols-5">
        <Skeleton className="h-56 rounded-2xl lg:col-span-3" />
        <Skeleton className="h-56 rounded-2xl lg:col-span-2" />
      </div>
    </div>
  );
}
