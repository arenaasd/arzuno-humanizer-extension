// app/api/prompt/route.js

import { NextResponse } from "next/server";
import { OpenRouter } from "@openrouter/sdk";

export async function POST(request) {
  const { prompt } = await request.json();

  const headers = new Headers({
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });

  try {
    const openrouter = new OpenRouter({
      apiKey: process.env.OPENROUTER_API_KEY,
    });

    const completion = await openrouter.chat.completions.create({
      model: "nex-agi/deepseek-v3.1-nex-n1:free",
      messages: [
        {
          role: "user",
          content: prompt, // SAME prompt you already send
        },
      ],
    });

    const text =
      completion.choices?.[0]?.message?.content ?? "";

    return new NextResponse(JSON.stringify({ text }), {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("OpenRouter API error:", error);

    return new NextResponse(
      JSON.stringify({
        error: "An error occurred while processing the prompt.",
      }),
      { status: 500, headers }
    );
  }
}

export function OPTIONS() {
  const headers = new Headers({
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });

  return new NextResponse(null, { status: 200, headers });
}
