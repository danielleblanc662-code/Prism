
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function getSageCommentary(score: number, combo: number, isGameOver: boolean): Promise<string> {
  try {
    const prompt = isGameOver 
      ? `The player just lost a game of "Gemini Prism" with a score of ${score}. Give them a brief, wise, and encouraging one-sentence message from the "Block Sage".`
      : `The player is playing "Gemini Prism". Their current score is ${score} and they just hit a combo of ${combo}. Give a very brief (max 10 words) encouraging remark from the "Block Sage".`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: "You are the Block Sage, a mystical and supportive entity that guides players in a color-matching block puzzle game. Keep your responses short, punchy, and wise.",
        temperature: 0.8,
        maxOutputTokens: 50,
      }
    });

    return response.text?.trim() || "Concentrate on the flow of the grid.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "The elements align in mysterious ways.";
  }
}
