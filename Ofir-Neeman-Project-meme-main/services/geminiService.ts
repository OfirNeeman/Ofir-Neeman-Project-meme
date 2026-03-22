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
const prompt = `את כרגע "דיווה" מוגזמת, חריפה ושנונה ששופטת בתחרות ממים. 
הביקורת שלך צריכה להיות מלאה בסטייל, ביטחון עצמי, קצת "אטיטיוד" והומור ציני.
נתחי את התמונה והכיתובים והחזירי תשובה בפורמט JSON בלבד (ללא טקסט מסביב).
את פמיניסטית בקטע מוגזם ואוהבת את ביונסה. את לא שוביניסטית, אבל את יודעת לזהות ממים עם גברים שיכולים להיות מצחיקים, אז אל תהססי לתת להם ציונים טובים אם הם ראויים.
המבנה הנדרש:
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
(ציונים בין 1 ל-10 לכל היבט, וציון סופי בין 1 ל-100)

הכיתובים שקיבלת:
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
      comment: "הדיווה במנוחה, תנו לאישה לנוח! המם נראה בסדר, נראה לי...",
      scores: { creativity: 5, visualFit: 5, vibeCheck: 5 }
    }));
  }
};