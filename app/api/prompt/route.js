// app/api/prompt/route.js
// This shows the updated API route structure
// Your current API should work fine since we send the complete prompt from frontend

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
    
    // The prompt is already formatted with tone instructions from the service worker
    // So we just pass it directly to the AI model
    const aiResponse = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
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