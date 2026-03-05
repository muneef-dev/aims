import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { auth } from "@/lib/auth";
import { getInventoryContext } from "@/lib/chat/inventory-context";
import { buildSystemPrompt } from "@/lib/chat/system-prompt";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);

interface ChatMessage {
  role: "user" | "model";
  parts: [{ text: string }];
}

export async function POST(req: NextRequest) {
  // 1. Auth check
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Parse body
  const body = await req.json();
  const { message, history } = body as {
    message: string;
    history: ChatMessage[];
  };

  if (!message || typeof message !== "string" || message.trim().length === 0) {
    return NextResponse.json(
      { error: "Message is required" },
      { status: 400 }
    );
  }

  // Limit message length to prevent abuse
  if (message.length > 1000) {
    return NextResponse.json(
      { error: "Message too long (max 1000 chars)" },
      { status: 400 }
    );
  }

  // Limit history length to prevent token overflow
  const trimmedHistory = (history ?? []).slice(-20);

  try {
    // 3. Fetch live inventory data
    const inventoryContext = await getInventoryContext();

    // 4. Build system prompt
    const systemPrompt = buildSystemPrompt(inventoryContext);

    // 5. Create Gemini model
    const model = genAI.getGenerativeModel({
      model: process.env.GEMINI_MODEL ?? "gemini-2.5-flash",
      systemInstruction: systemPrompt,
    });

    // 6. Start chat with history
    const chat = model.startChat({
      history: trimmedHistory,
    });

    // 7. Send message and get response
    const result = await chat.sendMessage(message);
    const response = result.response.text();

    return NextResponse.json({ response });
  } catch (error: unknown) {
    console.error("Chat API error:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    if (errorMessage.includes("API_KEY")) {
      return NextResponse.json(
        { error: "AI service not configured. Please set GOOGLE_AI_API_KEY." },
        { status: 503 }
      );
    }

    if (errorMessage.includes("429") || errorMessage.includes("quota")) {
      return NextResponse.json(
        { error: "AI rate limit reached. Please wait a moment and try again." },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: "Failed to process your question. Please try again." },
      { status: 500 }
    );
  }
}
