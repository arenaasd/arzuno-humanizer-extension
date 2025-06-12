import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

// Handle POST requests
export async function POST(request) {
  const key = process.env.GOOGLE_API_KEY;
  const { prompt } = await request.json();

  const headers = new Headers({
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });

  try {
    const ai = new GoogleGenAI({ apiKey: key });
    const enhancedPrompt = `Rewrite the following text to make it sound more natural, fluent, and human-like. Use everyday conversational language while preserving the original meaning. Avoid robotic or overly formal phrasing. Return only the rewritten version without any explanation or labels. Text: "${prompt}"`;

    const aiResponse = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: enhancedPrompt,
    });

    const text = aiResponse.candidates?.[0]?.content?.parts?.[0]?.text || "";

    return new NextResponse(JSON.stringify({ text }), {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("Error during API request:", error);
    return new NextResponse(
      JSON.stringify({ error: "An error occurred while processing the prompt." }),
      { status: 500, headers }
    );
  }
}

// Handle OPTIONS requests (CORS preflight)
export function OPTIONS() {
  const headers = new Headers({
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });

  return new NextResponse(null, { status: 200, headers });
}
