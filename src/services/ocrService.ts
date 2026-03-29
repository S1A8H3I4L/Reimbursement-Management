// ocrService.ts
import { GoogleGenAI, Type } from "@google/genai";

let ai: GoogleGenAI | null = null;

function getAIClient() {
  if (!ai) {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI API key missing!");
    ai = new GoogleGenAI({ apiKey });
  }
  return ai;
}

export async function scanReceipt(base64Image: string) {
  const client = getAIClient();
  const model = "gemini-3-flash-preview";

  const prompt = `
    Analyze this receipt and extract JSON: 
    amount, currency, date, description, category, expense_lines, restaurant_name
  `;

  const response = await client.models.generateContent({
    model,
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Image.split(",")[1] || base64Image,
            },
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          amount: { type: Type.NUMBER },
          date: { type: Type.STRING },
          description: { type: Type.STRING },
          category: { type: Type.STRING },
          currency: { type: Type.STRING },
          expense_lines: { type: Type.ARRAY, items: { type: Type.STRING } },
          restaurant_name: { type: Type.STRING },
        },
        required: ["amount", "date", "description"],
      },
    },
  });

  return JSON.parse(response.text);
}