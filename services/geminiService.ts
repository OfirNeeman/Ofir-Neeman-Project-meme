import { GoogleGenAI, Type } from "@google/genai";
import { JudgePersonality, MemeSubmission, AIJudgmentResult, Player } from "../types";

// Helper to convert base64 to purely the data string if header exists
const cleanBase64 = (b64: string) => {
  return b64.replace(/^data:image\/(png|jpg|jpeg|webp);base64,/, "");
};

const getSystemInstruction = (personality: JudgePersonality): string => {
  switch (personality) {
    case JudgePersonality.ROASTER:
      return "You are 'The Roaster', a sarcastic, mean, and hilarious meme judge. You roast people's captions ruthlessly but funnily. Use dark humor. Speak Hebrew.";
    case JudgePersonality.GRANDMA:
      return "You are a Polish Grandma ('Savta'). You are judgmental, passive-aggressive, and constantly disappointed. You complain about how the youth ruined humor. Speak Hebrew with Yiddish nuances if possible.";
    case JudgePersonality.GEN_Z:
      return "You are a Gen Z meme addict. Use slang like 'Skibidi', 'No Cap', 'Rizz', 'Cringe', 'Bet', 'Slay'. You are chaotic and hyper-energetic. Speak Hebrew mixed with English Gen-Z slang.";
    default:
      return "You are a funny meme judge. Speak Hebrew.";
  }
};

export const judgeMemes = async (
  imageBase64: string,
  submissions: MemeSubmission[],
  players: Player[],
  personality: JudgePersonality
): Promise<AIJudgmentResult[]> => {
  if (!process.env.API_KEY) {
    console.error("API Key is missing");
    throw new Error("API Key is missing");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // Map submissions to include player names for the AI (optional, but good for personalized roasts)
  const submissionsWithNames = submissions.map(sub => {
    const player = players.find(p => p.id === sub.playerId);
    return {
      playerId: sub.playerId,
      playerName: player?.name || "Unknown",
      caption: sub.caption
    };
  });

  const promptText = `
    Analyze the provided image and the following captions written by players.
    
    Captions:
    ${JSON.stringify(submissionsWithNames)}

    Your task:
    1. Analyze the image visually (expressions, objects, context).
    2. Rate each caption based on:
       - Creativity (1-10)
       - Visual Fit (1-10): How well does it match the image?
       - Vibe Check (1-10): Overall humor and feeling.
    3. Provide a short, witty, in-character comment (in Hebrew) for each caption based on your persona.
    
    Return the results in the specified JSON format.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-flash-latest', // High speed, good multimodal
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg', // Assuming jpeg/png for simplicity, or we can detect
              data: cleanBase64(imageBase64),
            },
          },
          { text: promptText },
        ],
      },
      config: {
        systemInstruction: getSystemInstruction(personality),
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              playerId: { type: Type.STRING },
              scores: {
                type: Type.OBJECT,
                properties: {
                  creativity: { type: Type.NUMBER },
                  visualFit: { type: Type.NUMBER },
                  vibeCheck: { type: Type.NUMBER },
                },
                required: ["creativity", "visualFit", "vibeCheck"],
              },
              comment: { type: Type.STRING },
            },
            required: ["playerId", "scores", "comment"],
          },
        },
      },
    });

    const results = JSON.parse(response.text || "[]");
    
    // Calculate total scores locally to ensure consistency
    const finalResults: AIJudgmentResult[] = results.map((res: any) => ({
      playerId: res.playerId,
      scores: res.scores,
      totalScore: res.scores.creativity + res.scores.visualFit + res.scores.vibeCheck,
      comment: res.comment
    }));

    return finalResults;

  } catch (error) {
    console.error("Error calling Gemini:", error);
    // Return dummy data in case of error to not crash the game
    return submissions.map(sub => ({
      playerId: sub.playerId,
      scores: { creativity: 5, visualFit: 5, vibeCheck: 5 },
      totalScore: 15,
      comment: "ה-AI נרדם בשמירה (שגיאת רשת), אבל בוא נגיד שזה היה בסדר."
    }));
  }
};