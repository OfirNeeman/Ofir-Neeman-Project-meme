import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { Icons } from '../ui/Icons';

interface CaptioningPhaseProps {
  /** מחרוזת ה-src של התמונה (יכולה להיות נתיב, URL או מחרוזת Base64) */
  imageSrc: string;
  /** מזהה ייחודי של השחקן הנוכחי */
  playerId: string;
  /** הכינוי של השחקן, משמש לפנייה אישית במסך */
  playerName: string;
  /** פונקציית קולבק שמופעלת ומעבירה את הטקסט המיוצר לקומפוננטה האם בזמן שליחה */
  onSubmitCaption: (caption: string) => void;
}

export const CaptioningPhase: React.FC<CaptioningPhaseProps> = ({ 
  imageSrc, 
  playerName, 
  onSubmitCaption 
}) => {
  // --- ניהול ה-State המקומי ---
  const [currentInput, setCurrentInput] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);

  /**
   * מטפלת בתהליך שליחת הכיתוב.
   * מונעת שליחה של טקסט ריק או שליחה כפולה במידה והשחקן כבר שלח.
   */
  const handleSubmit = () => {
    if (!currentInput.trim() || isSubmitted) return;
    
    setIsSubmitted(true);
    onSubmitCaption(currentInput.trim());
  };

  // ==========================================
  // תצוגת המתנה (מצב לאחר שליחת הכיתוב)
  // ==========================================
  if (isSubmitted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-8 animate-fade-in text-center">
        <div className="bg-zinc-900 p-10 rounded-[2.5rem] border-4 border-zinc-800 shadow-2xl">
          <Icons.Check className="w-20 h-20 text-green-500 mx-auto mb-4" />
          <h2 className="text-4xl font-black text-white">Caption Submitted</h2>
          <p className="text-xl text-zinc-400 mt-2">Waiting for other players to finish</p>
        </div>
      </div>
    );
  }

  // ==========================================
  // תצוגת כתיבה פעילה (מצב עריכה)
  // ==========================================
  return (
    <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-12 items-start animate-fade-in pt-4">
      
      {/* 1. אזור תצוגת התמונה: מרונדר רק אם קיימת תמונה תקינה בסיבוב */}
      {imageSrc && (
        <div className="w-full lg:w-1/2">
          <div className="bg-black rounded-[2rem] overflow-hidden shadow-2xl border-4 border-zinc-800 relative group">
            <img src={imageSrc} alt="Meme Context" className="w-full h-auto object-contain" />
          </div>
        </div>
      )}

      {/* 2. אזור הזנת הטקסט והשליחה: מתרחב אוטומטית לכל הרוחב אם אין תמונה בנמצא */}
      <div className={`w-full ${imageSrc ? 'lg:w-1/2' : 'max-w-2xl mx-auto'} flex flex-col space-y-8`}>
        
        {/* כותרת פנייה אישית לשחקן */}
        <div className="flex items-center gap-6">
          <h3 className="outfit-bold text-sm uppercase tracking-[0.2em] text-zinc-500 font-black">
            Hey {playerName}, What's your caption?
          </h3>
        </div>

        {/* תיבת הזנת הטקסט הגדולה */}
        <textarea
          value={currentInput}
          onChange={(e) => setCurrentInput(e.target.value)}
          placeholder="Write something funny..."
          // autoFocus גורם למקלדת להיפתח מייד במובייל או לסימון הקלדה במחשב ללא צורך בלחיצה נוספת
          autoFocus
          className="outfit-light w-full bg-white text-zinc-900 rounded-[2rem] p-8 h-64 text-3xl font-bold outline-none resize-none shadow-xl border-b-8 border-zinc-300 focus:border-pink-500 transition-all"
        />

        {/* כפתור השליחה הראשי */}
        <Button 
          onClick={handleSubmit} 
          size="xl" 
          // חוסם את הכפתור חזותית אם השחקן לא הקליד דבר
          disabled={!currentInput.trim()}
          className="outfit-bold w-full shadow-2xl shadow-pink-500/20"
        >
          Submit Caption!
        </Button>
      </div>
    </div>
  );
};