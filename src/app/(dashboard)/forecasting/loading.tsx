import { Skeleton } from "@/components/ui/skeleton";

export default function ForecastingLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-9 w-52" />
        <Skeleton className="h-10 w-48" />
      </div>
      <Skeleton className="h-10 w-64" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Skeleton className="h-80 rounded-xl" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
    </div>
  );
}
