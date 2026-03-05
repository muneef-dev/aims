export default function ChatbotLoading() {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b pb-4">
        <div className="h-8 w-60 animate-pulse rounded bg-muted" />
        <div className="mt-2 h-4 w-96 animate-pulse rounded bg-muted" />
      </div>
      <div className="flex flex-1 items-center justify-center">
        <div className="text-muted-foreground">Loading chat...</div>
      </div>
    </div>
  );
}
