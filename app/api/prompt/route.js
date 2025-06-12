import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export async function POST(request) {
  const key = process.env.GOOGLE_API_KEY || "AIzaSyCwJ2UgzEK6slBuUTr0jTqJ2WXFtT1KxU8";

  const { prompt } = await request.json();


  // Ensure the CORS headers are set
  const responseHeaders = new Headers();
  responseHeaders.set("Access-Control-Allow-Origin", "*"); // Allow all origins
  responseHeaders.set("Access-Control-Allow-Methods", "POST");
  responseHeaders.set("Access-Control-Allow-Headers", "Content-Type");

  // If it's a preflight (OPTIONS) request, return 200 status with CORS headers
  if (request.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 200,
      headers: responseHeaders,
    });
  }

  try {
    const ai = new GoogleGenAI({ apiKey: key });
    const enhancedPrompt = `Rewrite the following text to make it sound more natural, fluent, and human-like. Use everyday conversational language while preserving the original meaning. Avoid robotic or overly formal phrasing. Return only the rewritten version without any explanation or labels. Text: "${prompt}"`;

    const aiResponse = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: enhancedPrompt,
    });

    const text = aiResponse.candidates[0].content.parts[0].text;

    // Return the response with the appropriate CORS headers
    return new NextResponse(
      JSON.stringify({ text }),
      { status: 200, headers: responseHeaders }
    );
  } catch (error) {
    console.error("Error during API request:", error);
    return new NextResponse(
      JSON.stringify({ error: 'An error occurred while processing the prompt.' }),
      { status: 500, headers: responseHeaders }
    );
  }
}
