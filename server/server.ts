import express from "express";
import cors from "cors";
import { GoogleGenAI, Type } from "@google/genai";

const app = express();
app.use(cors());
app.use(express.json());

// Hardcoded API Key (no .env needed)
const AI_API_KEY = "YOUR_GOOGLE_GENAI_API_KEY";

const ai = new GoogleGenAI({ apiKey: AI_API_KEY });

// OCR endpoint
app.post("/api/analyze-receipt", async (req, res) => {
  const { base64Image } = req.body;
  if (!base64Image) return res.status(400).json({ error: "No image provided" });

  try {
    const matches = base64Image.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
    if (!matches || matches.length !== 3)
      return res.status(400).json({ error: "Invalid image format" });

    const mimeType = matches[1];
    const data = matches[2];

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        { inlineData: { mimeType, data } },
        {
          text: `Analyze this receipt image and return JSON:
          - amount (number)
          - currency (string, ISO like USD)
          - date (YYYY-MM-DD)
          - merchant (string)
          - category (Travel, Meals, Lodging, Office Supplies, Software)
          - description (string)`,
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            amount: { type: Type.NUMBER },
            currency: { type: Type.STRING },
            date: { type: Type.STRING },
            merchant: { type: Type.STRING },
            category: { type: Type.STRING },
            description: { type: Type.STRING },
          },
        },
      },
    });

    if (!response.text) throw new Error("Empty AI response");
    res.json(JSON.parse(response.text));
  } catch (error) {
    console.error("OCR Error:", error);
    res.status(500).json({ error: "Failed to analyze receipt" });
  }
});

const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));