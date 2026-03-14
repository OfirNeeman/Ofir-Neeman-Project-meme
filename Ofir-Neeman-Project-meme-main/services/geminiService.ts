import { AIJudgmentResult } from "../types";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

export const judgeMemes = async (
  imageBase64: string, 
  submissions: any[], 
  players: any[]
): Promise<AIJudgmentResult[]> => {
  
  const cleanData = imageBase64.split(",")[1] || imageBase64;

  // עדכון ה-URL לשם המודל המדויק מה-CURL שקיבלת
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${API_KEY}`;

  const prompt = `אתה שופט מומחה בתחרות ממים. נתח את התמונה והכיתובים.
  החזר מערך JSON בלבד (ללא טקסט מסביב) במבנה הבא:
  [{"playerId": "string", "totalScore": number, "comment": "string"}]
  
  הכיתובים:
  ${submissions.map(s => `ID: ${s.playerId}, כיתוב: "${s.caption}"`).join("\n")}`;

  const body = {
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: cleanData
            }
          }
        ]
      }
    ],
    generationConfig: {
      responseMimeType: "application/json"
    }
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(JSON.stringify(errorData));
    }

    const data = await response.json();
    const responseText = data.candidates[0].content.parts[0].text;
    const parsed = JSON.parse(responseText.trim());

    return parsed.map((res: any) => ({
      playerId: res.playerId,
      totalScore: res.totalScore,
      comment: res.comment,
      scores: {
        creativity: Math.floor(res.totalScore / 3),
        visualFit: Math.floor(res.totalScore / 3),
        vibeCheck: Math.floor(res.totalScore / 3)
      }
    }));

  } catch (error) {
    console.error("AI Error:", error);
    return submissions.map(s => ({
      playerId: s.playerId,
      totalScore: 50,
      comment: "השופט יצא להפסקה, אבל המם נראה מבטיח!",
      scores: { creativity: 5, visualFit: 5, vibeCheck: 5 }
    }));
  }
};