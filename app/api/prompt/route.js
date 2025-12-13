// app/api/prompt/route.js

import { NextResponse } from "next/server";

export async function POST(request) {
  const { prompt } = await request.json();

  const headers = new Headers({
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "HTTP-Referer": process.env.SITE_URL || "http://localhost:3000",
        "X-Title": "Arzuno Humanizer",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "nex-agi/deepseek-v3.1-nex-n1:free",
        messages: [
          {
            role: "user",
            content: prompt, // SAME prompt you already send
          },
        ],
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("OpenRouter error:", errorText);
      throw new Error("OpenRouter request failed");
    }

    const data = await res.json();

    const text =
      data?.choices?.[0]?.message?.content ?? "";

    return new NextResponse(JSON.stringify({ text }), {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("API error:", error);

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
