import React from 'react';
import { Icons } from '../ui/Icons';

/**
 * קומפוננטת שלב השיפוט (Judging Phase).
 * מסך המתנה אינטראקטיבי המוצג לכל השחקנים בזמן ששרת ה-AI (Gemini)
 * מעבד את המימים ומייצר את הציונים והתגובות של הדיווה.
 */
export const JudgingPhase: React.FC = () => {

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-12 text-center animate-fade-in">
      
      {/* אזור האייקון המרכזי עם אפקט הזוהר והריחוף ברקע */}
      <div className="relative group">
        {/* אפקט הילה פועמת ורודה מאחורי האייקון */}
        <div className="absolute inset-0 bg-pink-500 blur-[100px] opacity-30 rounded-full animate-pulse group-hover:opacity-50 transition-opacity duration-1000"></div>
        
        {/* האייקון הראשי בריחוף איטי (Bounce Slow) עם צל ייחודי */}
        <div className="relative z-10 drop-shadow-[0_0_30px_rgba(236,72,153,0.6)] animate-bounce-slow">
          <Icons.Brain className="w-40 h-40 text-pink-500" />
        </div>
      </div>
      
      {/* כותרת וטקסט מצב הרוח של השופטת (The Diva) */}
      <div className="space-y-4 max-w-lg">
        <h2 className="outfit-bold text-5xl font-black text-white leading-tight">
          The diva is thinking...
        </h2>
        <p className="outfit-medium text-2xl text-pink-200 font-medium opacity-80 italic">
          "Wait, I'm looking for the funny part"
        </p>
      </div>

      {/* מד טעינה (Loader) מעוצב המורכב משלוש נקודות צבעוניות קופצות בסנכרון מדורג */}
      <div className="flex gap-4 p-4 bg-white/5 rounded-full backdrop-blur-md border border-white/10">
        {/* נקודה 1: ורודה */}
        <div className="w-4 h-4 bg-pink-500 rounded-full animate-bounce delay-0 shadow-[0_0_15px_#ec4899]"></div>
        {/* נקודה 2: סגולה עם השהיית קפיצה קלה */}
        <div className="w-4 h-4 bg-purple-500 rounded-full animate-bounce delay-150 shadow-[0_0_15px_#a855f7]"></div>
        {/* נקודה 3: תכלת/ציאן עם השהיית קפיצה נוספת */}
        <div className="w-4 h-4 bg-cyan-500 rounded-full animate-bounce delay-300 shadow-[0_0_15px_#06b6d4]"></div>
      </div>

    </div>
  );
};