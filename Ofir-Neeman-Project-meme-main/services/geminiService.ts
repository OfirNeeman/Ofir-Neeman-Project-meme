import { GoogleGenerativeAI } from "@google/generative-ai";
import { AIJudgmentResult } from "../types";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!API_KEY) {
  console.error("Gemini API Key is missing! Check your .env file.");
}

const genAI = new GoogleGenerativeAI(API_KEY || "");

const cleanBase64 = (b64: string) => {
  return b64.replace(/^data:image\/(png|jpg|jpeg|webp);base64,/, "");
};

export const judgeMemes = async (
  imageBase64: string, 
  submissions: any[], 
  players: any[]
): Promise<AIJudgmentResult[]> => {
  
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `
    אתה מומחה לניתוח הומור וממים באינטרנט. 
    המשימה שלך היא לשפוט תחרות ממים בצורה אובייקטיבית אך משעשעת מאוד.
    
    לפניך תמונה ורשימת כיתובים ששחקנים שונים כתבו עליה.
    נתח את הקשר בין הטקסט לסיטואציה שבתמונה וקבע מי הכי מצחיק, מקורי וקולע.
    
    הנה רשימת הכיתובים:
    ${submissions.map(s => {
      const player = players.find(p => p.id === s.playerId);
      return `מזהה שחקן: ${s.playerId}, שם שחקן: ${player?.name || 'לא ידוע'}, כיתוב: "${s.caption}"`;
    }).join('\n')}
    
    עבור כל שחקן, החזר אובייקט עם הנתונים הבאים:
    1. playerId: מזהה השחקן המדויק שקיבלת.
    2. totalScore: ניקוד סופי בין 0 ל-100.
    3. comment: ביקורת קצרה, שנונה ומצחיקה בעברית (עד 20 מילים).
    
    עליך להחזיר אך ורק פורמט JSON תקני של מערך אובייקטים, ללא שום טקסט נוסף לפני או אחרי.
    המבנה:
    [
      { "playerId": "string", "totalScore": number, "comment": "string" }
    ]
  `;

  try {
    const result = await model.generateContent([
      { text: prompt },
      {
        inlineData: {
          data: cleanBase64(imageBase64),
          mimeType: "image/jpeg"
        }
      }
    ]);

    const response = await result.response;
    const text = response.text();
    const cleanJson = text.replace(/```json|```/g, "").trim();
    const parsedResults = JSON.parse(cleanJson);

    // הוספת ה-scores כדי להתאים ל-Interface של TypeScript
    return parsedResults.map((res: any) => ({
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
    console.error("Error calling Gemini:", error);
    
    // במקרה של שגיאה, מחזירים תוצאת מחדל לכל שחקן כדי שהמשחק לא ייתקע
    return submissions.map(sub => ({
      playerId: sub.playerId,
      totalScore: 50,
      comment: "השופט יצא להפסקה (שגיאת רשת), אבל הכיתוב שלך לא רע!",
      scores: { creativity: 5, visualFit: 5, vibeCheck: 5 }
    }));
  }
};