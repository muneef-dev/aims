"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Send, Bot, User, Loader2, Trash2 } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "model";
  text: string;
  timestamp: Date;
}

/** Detect whether a message looks like a structured report. */
function isReport(text: string): boolean {
  return /^#\s/.test(text) || /\n##\s/.test(text) || (text.includes("|") && text.includes("---"));
}

/** Lightweight markdown-to-HTML renderer for bot report messages. */
function renderMarkdown(text: string): string {
  let html = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Tables — process first so | pipes aren't mangled by inline formatting
  html = html.replace(
    /(?:^(\|.+\|)\n(\|[\s\-:|]+\|)\n((?:\|.+\|\n?)+))/gm,
    (_match, header: string, _sep: string, body: string) => {
      const thCells = header
        .split("|")
        .filter((c: string) => c.trim())
        .map((c: string) => `<th class="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">${c.trim()}</th>`)
        .join("");
      const rows = body.trim().split("\n").map((row: string, i: number) => {
        const cells = row.split("|").filter((c: string) => c.trim()).map((c: string) => `<td class="px-3 py-2 text-sm">${c.trim()}</td>`).join("");
        return `<tr class="border-t ${i % 2 === 1 ? "bg-muted/40" : ""}">${cells}</tr>`;
      }).join("");
      return `<div class="overflow-x-auto my-3 rounded-lg border"><table class="w-full"><thead><tr class="bg-muted/70">${thCells}</tr></thead><tbody>${rows}</tbody></table></div>`;
    }
  );

  // Headings
  html = html.replace(/^### (.+)$/gm, '<h4 class="font-semibold text-sm mt-4 mb-1 text-muted-foreground">$1</h4>');
  html = html.replace(/^## (.+)$/gm, '<div class="mt-5 mb-2 flex items-center gap-2"><div class="h-5 w-1 rounded bg-primary"></div><h3 class="font-semibold text-base">$1</h3></div>');
  html = html.replace(/^# (.+)$/gm, '<div class="mb-4 pb-2 border-b"><h2 class="font-bold text-lg">$1</h2></div>');

  // Bold and italic
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");

  // Ordered lists
  html = html.replace(/^(\d+)\.\s+(.+)$/gm, '<li class="ml-5 text-sm list-decimal leading-relaxed" value="$1">$2</li>');
  html = html.replace(/((?:<li class="ml-5 text-sm list-decimal[^"]*"[^>]*>.*<\/li>\n?)+)/g, '<ol class="my-2 space-y-1">$1</ol>');

  // Unordered lists
  html = html.replace(/^[\-\*]\s+(.+)$/gm, '<li class="ml-5 text-sm list-disc leading-relaxed">$1</li>');
  html = html.replace(/((?:<li class="ml-5 text-sm list-disc[^"]*">.*<\/li>\n?)+)/g, '<ul class="my-2 space-y-1">$1</ul>');

  // Horizontal rules
  html = html.replace(/^---$/gm, '<hr class="my-3 border-border"/>');

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code class="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">$1</code>');

  // Line breaks
  html = html.replace(/\n/g, "<br/>");
  html = html.replace(/(<\/h[234]>)<br\/>/g, "$1");
  html = html.replace(/(<\/div>)<br\/>/g, "$1");
  html = html.replace(/(<\/ul>)<br\/>/g, "$1");
  html = html.replace(/(<\/ol>)<br\/>/g, "$1");
  html = html.replace(/(<\/table>)<br\/>/g, "$1");
  html = html.replace(/(<hr[^>]*\/>)<br\/>/g, "$1");
  html = html.replace(/(<br\/>){3,}/g, "<br/><br/>");

  return html;
}

const WELCOME_MSG: Message = {
  id: "welcome",
  role: "model",
  text: "Hello! I'm your AIMS Inventory Assistant. I have access to your live inventory data. You can ask me things like:\n\n• \"What products are out of stock?\"\n• \"How much Wireless Mouse do we have?\"\n• \"What's the total inventory value?\"\n• \"Show me recent stock updates\"\n• \"Which products need restocking?\"\n\nHow can I help you today?",
  timestamp: new Date(),
};

export default function ChatbotPage() {
  const [messages, setMessages] = useState<Message[]>([WELCOME_MSG]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function getHistory() {
    return messages
      .filter((m) => m.id !== "welcome")
      .map((m) => ({
        role: m.role,
        parts: [{ text: m.text }],
      }));
  }

  async function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      text: trimmed,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          history: getHistory(),
        }),
      });

      const data = await res.json();

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "model",
          text: res.ok
            ? data.response
            : data.error ?? "Something went wrong.",
          timestamp: new Date(),
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "model",
          text: "Network error. Please check your connection and try again.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleClear() {
    setMessages([WELCOME_MSG]);
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold">AI Inventory Assistant</h1>
          <p className="text-sm text-muted-foreground">
            Ask questions about your inventory, stock levels, alerts, and more
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleClear}>
          <Trash2 className="mr-2 h-4 w-4" />
          Clear Chat
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-4 overflow-y-auto py-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role === "model" && (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <Bot className="h-5 w-5 text-primary" />
              </div>
            )}
            <div
              className={`rounded-lg px-4 py-3 text-sm ${
                msg.role === "user"
                  ? "max-w-[70%] bg-primary text-primary-foreground whitespace-pre-wrap"
                  : isReport(msg.text)
                    ? "max-w-[90%] bg-muted/60 text-foreground border"
                    : "max-w-[70%] bg-muted text-foreground whitespace-pre-wrap"
              }`}
            >
              {msg.role === "model" && isReport(msg.text) ? (
                <div dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.text) }} />
              ) : (
                msg.text
              )}
            </div>
            {msg.role === "user" && (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                <User className="h-5 w-5" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <div className="rounded-lg bg-muted px-4 py-3">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t pt-4">
        <div className="flex gap-3">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your inventory..."
            className="flex-1 rounded-lg border bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary"
            maxLength={1000}
            disabled={isLoading}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            size="lg"
          >
            <Send className="mr-2 h-4 w-4" />
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}
