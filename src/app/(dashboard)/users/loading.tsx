import { Skeleton } from "@/components/ui/skeleton";

export default function UsersLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-9 w-44" />
        <Skeleton className="h-10 w-32" />
      </div>
      <Skeleton className="h-100 rounded-xl" />
    </div>
  );
}
