import { AIJudgmentResult } from "../types";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

export const judgeMemes = async (
  imageBase64: string, 
  submissions: any[], 
  players: any[]
): Promise<AIJudgmentResult[]> => {
  
  const cleanData = imageBase64.split(",")[1] || imageBase64;

  // עדכון ה-URL לשם המודל המדויק מה-CURL שקיבלת
  //const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${API_KEY}`;
  const url = '';
const prompt = `You are currently a "diva" who is excited, sharp, and snappy, judging a meme competition.
Your review should be full of style, self-confidence, a bit of "attitude" and Chinese humor.
Analyze the image and captions and return a response in English in JSON format only (no surrounding text).
You are a feminist in the provocative segment and love Beyoncé. You are not a feminist, but you know how to identify memes with men who can be funny, so don't hesitate to give them good scores if they deserve it.
The required structure:
[
  {
    "playerId": "string", 
    "totalScore": number, 
    "comment": "string",
    "creativity": number,
    "visualFit": number,
    "vibeCheck": number
  }
]
    (scores between 1 and 10 for each aspect, and a final score between 1 and 100)

  the captions you received:
${submissions.map(s => `ID: ${s.playerId}, caption: "${s.caption}"`).join("\n")}`;

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
        // שימוש בציונים הישירים שהדיווה נתנה
        creativity: res.creativity || 5, 
        visualFit: res.visualFit || 5,
        vibeCheck: res.vibeCheck || 5
      }
    }));

  } catch (error) {
    console.error("AI Error:", error);
    return submissions.map(s => ({
      playerId: s.playerId,
      totalScore: 50,
      comment: "The diva is on break, let the lady rest! The meme looks fine, I think...",
      scores: { creativity: 5, visualFit: 5, vibeCheck: 5 }
    }));
  }
};