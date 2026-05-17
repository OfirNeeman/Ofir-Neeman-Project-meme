import { AIJudgmentResult } from "../types";

// שליפת מפתח ה-API של Gemini מתוך משתני הסביבה של Vite
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

/**
 * שולחת את תמונת המימ ואת הניסוחים של השחקנים למודל הבינה המלאכותית (Gemini)
 * כדי לקבל שיפוט, ציונים ותגובות מותאמות אישית מאופי של "דיווה".
 * 
 * @param imageBase64 - התמונה של המימ הנוכחי מקודדת בצירוף ה-MIME Header או בלעדיו.
 * @param submissions - מערך של ההגשות (הטקסטים שכתבו השחקנים). לכל הגשה יש playerId ו-caption.
 * @param players - מערך השחקנים בחדר (לצורך התאמות עתידיות במידת הצורך).
 * @returns מערך של אובייקטי שפיטה הכוללים ציונים ותגובות לכל שחקן.
 */
export const judgeMemes = async (
  imageBase64: string, 
  submissions: any[], 
  players: any[]
): Promise<AIJudgmentResult[]> => {
  
  // ניקוי ה-MIME Header מה-Base64 (למשל: "data:image/jpeg;base64,") כדי להשאיר רק את המידע הבינארי הנקי
  const cleanData = imageBase64.split(",")[1] || imageBase64;
  
  // כתובת ה-API הרשמית של גוגל עבור המודל Gemini Flash (החזר אותה לפעולה במידת הצורך)
  // const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash:generateContent?key=${API_KEY}`;
  const url = ''; // כרגע ריק לפי הקוד שלך

  // בניית הפרומפט (ההנחיה) שמגדיר ל-AI את האופי שלו ואת פורמט התשובה המבוקש
  const prompt = `You are currently a "diva" who is excited, sharp, and snappy, judging a meme competition.
Your review should be full of style, self-confidence, a bit of "attitude" and Chinese humor.
Analyze the image and captions and return a response in Hebrew in JSON format only (no surrounding text). Make sure that the text is appropriate for all audiences, and avoid any offensive language. The JSON should be an array of objects, each containing the playerId, a totalScore (between 1 and 100), a comment, and individual scores for creativity, visual fit, and vibe check (each between 1 and 10). The totalScore should reflect the overall quality of the meme, while the individual scores should provide insight into specific aspects of the meme. Be sure to provide constructive feedback in your comments to help players improve their memes in future rounds.
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

  // בניית גוף הבקשה (RequestBody) במבנה המולטי-מודאלי ש-Gemini דורש (טקסט + תמונה)
  const body = {
    contents: [
      {
        parts: [
          { text: prompt }, // הציפיות והטקסטים של השחקנים
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: cleanData // התמונה המשויכת
            }
          }
        ]
      }
    ],
    generationConfig: {
      // מכריח את המודל להחזיר פלט שהוא JSON תקין ומבטל סיכון לתוספות טקסט מיותרות
      responseMimeType: "application/json"
    }
  };

  try {
    // שליחת בקשת ה-HTTP לשרתי גוגל
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
    
    // שליפת תגובת הטקסט הגולמית מתוך המבנה של Gemini API
    const responseText = data.candidates[0].content.parts[0].text;
    
    // המרה של מחרוזת ה-JSON שחזרה מהמודל לאובייקט/מערך JavaScript
    const parsed = JSON.parse(responseText.trim());

    // מיפוי (Mapping) של התוצאות למבנה הנתונים הפנימי של האפליקציה שלך
    return parsed.map((res: any) => ({
      playerId: res.playerId,
      totalScore: res.totalScore,
      comment: res.comment,
      scores: {
        // שימוש בציונים הספציפיים שהדיווה נתנה (עם הגנה של ציון 5 כברירת מחדל אם משהו חסר)
        creativity: res.creativity || 5, 
        visualFit: res.visualFit || 5,
        vibeCheck: res.vibeCheck || 5
      }
    }));

  } catch (error) {
    // מנגנון הגנה (Fallback) - אם ה-API נכשל, נגמר ה-Quota או ה-JSON שבור, המשחק לא קורס
    console.error("AI Error:", error);
    
    // מחזיר ציון פרווה של 50 ותגובה משעשעת מהדיווה כברירת מחדל כדי שהמשחק ימשיך כסדרו
    return submissions.map(s => ({
      playerId: s.playerId,
      totalScore: 50,
      comment: "הדיווה בהפסקה, תנו לגברת לנוח! המימ נראה בסדר גמור, אני מניחה...",
      scores: { creativity: 5, visualFit: 5, vibeCheck: 5 }
    }));
  }
};