"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Send, Bot, User, Loader2, MessageSquare, X, FileText } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "model";
  text: string;
  timestamp: Date;
}

/** Lightweight markdown-to-HTML renderer for bot messages (reports). */
function renderMarkdown(text: string): string {
  let html = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Markdown tables — process before inline formatting so | pipes aren't mangled
  html = html.replace(
    /(?:^(\|.+\|)\n(\|[\s\-:|]+\|)\n((?:\|.+\|\n?)+))/gm,
    (_match, header: string, _sep: string, body: string) => {
      const thCells = header
        .split("|")
        .filter((c: string) => c.trim())
        .map(
          (c: string) =>
            `<th class="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">${c.trim()}</th>`
        )
        .join("");
      const rows = body
        .trim()
        .split("\n")
        .map(
          (row: string, i: number) => {
            const cells = row
              .split("|")
              .filter((c: string) => c.trim())
              .map(
                (c: string) =>
                  `<td class="px-3 py-2 text-xs">${c.trim()}</td>`
              )
              .join("");
            return `<tr class="border-t ${i % 2 === 1 ? "bg-muted/40" : ""}">${cells}</tr>`;
          }
        )
        .join("");
      return `<div class="overflow-x-auto my-3 rounded-lg border"><table class="w-full text-xs"><thead><tr class="bg-muted/70">${thCells}</tr></thead><tbody>${rows}</tbody></table></div>`;
    }
  );

  // Headings
  html = html.replace(
    /^### (.+)$/gm,
    '<h4 class="font-semibold text-xs mt-3 mb-1 text-muted-foreground uppercase tracking-wide">$1</h4>'
  );
  html = html.replace(
    /^## (.+)$/gm,
    '<div class="mt-4 mb-2 flex items-center gap-2"><div class="h-4 w-1 rounded bg-primary"></div><h3 class="font-semibold text-sm">$1</h3></div>'
  );
  html = html.replace(
    /^# (.+)$/gm,
    '<div class="mb-3 pb-2 border-b"><h2 class="font-bold text-base">$1</h2></div>'
  );

  // Bold and italic
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");

  // Ordered lists  (1.  Item / 2.  Item)
  html = html.replace(
    /^(\d+)\.\s+(.+)$/gm,
    '<li class="ml-5 text-xs list-decimal leading-relaxed" value="$1">$2</li>'
  );
  html = html.replace(
    /((?:<li class="ml-5 text-xs list-decimal[^"]*"[^>]*>.*<\/li>\n?)+)/g,
    '<ol class="my-2 space-y-1">$1</ol>'
  );

  // Unordered lists  (- Item / * Item)
  html = html.replace(
    /^[\-\*]\s+(.+)$/gm,
    '<li class="ml-5 text-xs list-disc leading-relaxed">$1</li>'
  );
  html = html.replace(
    /((?:<li class="ml-5 text-xs list-disc[^"]*">.*<\/li>\n?)+)/g,
    '<ul class="my-2 space-y-1">$1</ul>'
  );

  // Horizontal rules
  html = html.replace(/^---$/gm, '<hr class="my-3 border-border"/>');

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code class="rounded bg-muted px-1 py-0.5 text-[11px] font-mono">$1</code>');

  // Line breaks
  html = html.replace(/\n/g, "<br/>");
  // Clean up excessive breaks after block elements
  html = html.replace(/(<\/h[234]>)<br\/>/g, "$1");
  html = html.replace(/(<\/div>)<br\/>/g, "$1");
  html = html.replace(/(<\/ul>)<br\/>/g, "$1");
  html = html.replace(/(<\/ol>)<br\/>/g, "$1");
  html = html.replace(/(<\/table>)<br\/>/g, "$1");
  html = html.replace(/(<hr[^>]*\/>)<br\/>/g, "$1");
  // Remove double breaks
  html = html.replace(/(<br\/>){3,}/g, "<br/><br/>");

  return html;
}

function isReport(text: string): boolean {
  return /^#\s/.test(text) || /\n##\s/.test(text) || (text.includes("|") && text.includes("---"));
}

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "model",
      text: "Hello! I'm your AIMS Inventory Assistant. Ask me anything about your inventory — stock levels, product details, alerts, and more!",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  // Build Gemini-format history from messages (exclude welcome)
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

    // Add user message
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

      const botMsg: Message = {
        id: crypto.randomUUID(),
        role: "model",
        text: res.ok
          ? data.response
          : data.error ?? "Something went wrong. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMsg]);
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

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed right-6 bottom-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105"
        aria-label="Open chat assistant"
      >
        <MessageSquare className="h-6 w-6" />
      </button>
    );
  }

  return (
    <div className="fixed right-6 bottom-6 z-50 flex h-137.5 w-105 flex-col rounded-xl border bg-background shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between rounded-t-xl border-b bg-primary px-4 py-3 text-primary-foreground">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5" />
          <span className="font-semibold">AIMS Assistant</span>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="rounded p-1 transition-colors hover:bg-primary-foreground/20"
          aria-label="Close chat"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role === "model" && (
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <Bot className="h-4 w-4 text-primary" />
              </div>
            )}
            <div
              className={`rounded-lg px-3 py-2 text-sm ${
                msg.role === "user"
                  ? "max-w-[75%] bg-primary text-primary-foreground whitespace-pre-wrap"
                  : isReport(msg.text)
                    ? "max-w-[95%] bg-muted/60 text-foreground border"
                    : "max-w-[75%] bg-muted text-foreground"
              }`}
            >
              {msg.role === "model" && isReport(msg.text) ? (
                <div
                  className="report-content"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.text) }}
                />
              ) : (
                <span className="whitespace-pre-wrap">{msg.text}</span>
              )}
            </div>
            {msg.role === "user" && (
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted">
                <User className="h-4 w-4" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <Bot className="h-4 w-4 text-primary" />
            </div>
            <div className="rounded-lg bg-muted px-3 py-2">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t p-3">
        {messages.length <= 1 && (
          <div className="mb-2 flex flex-wrap gap-1">
            {[
              "Generate inventory health report",
              "Low stock analysis report",
              "Category breakdown report",
            ].map((prompt) => (
              <button
                key={prompt}
                onClick={() => { setInput(prompt); }}
                className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-muted"
              >
                <FileText className="mr-1 inline h-3 w-3" />
                {prompt}
              </button>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your inventory..."
            className="flex-1 rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
            maxLength={1000}
            disabled={isLoading}
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
