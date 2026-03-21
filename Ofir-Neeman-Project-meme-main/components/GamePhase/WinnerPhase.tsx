import React from "react";
import { Player } from "../../types";
import { Icons } from "../ui/Icons";
import { Button } from "../ui/Button";

interface WinnerPhaseProps {
  players: Player[];
  onRestart: () => void;
}

export const WinnerPhase: React.FC<WinnerPhaseProps> = ({ players, onRestart }) => {
  // 1. מיון השחקנים לפי ניקוד מהגבוה לנמוך
  const sorted = [...players].sort((a, b) => b.score - a.score);
  
  // 2. מציאת הניקוד הגבוה ביותר
  const highScore = sorted[0]?.score || 0;
  
  // 3. סינון כל השחקנים שיש להם את הניקוד הזה (הזוכים)
  const winners = sorted.filter(p => p.score === highScore && highScore > 0);
  
  // 4. שאר השחקנים (אלו שלא ניצחו)
  const others = sorted.filter(p => p.score !== highScore);

  return (
    <div className="max-w-5xl mx-auto text-center pt-12 pb-24 px-4">
      {/* כותרת משתנה לפי כמות המנצחים */}
      <h1 className="text-6xl font-black text-white mb-8 animate-bounce">
        {winners.length > 1 ? "🤝 יש לנו תיקו! 🤝" : "🏆 המנצח הגדול 🏆"}
      </h1>

      {/* תצוגת המנצחים */}
      <div className="flex flex-wrap justify-center gap-8 mb-20">
        {winners.map((player) => (
          <div key={player.id} className="relative group">
            {/* אפקט הילה למנצח */}
            <div className="absolute -inset-1 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-2xl blur opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-pulse"></div>
            
            <div className="relative flex flex-col items-center bg-zinc-900 border-2 border-yellow-500/50 p-8 rounded-2xl shadow-2xl min-w-[200px]">
              <div className="text-5xl mb-4">👑</div>
              <div className={`p-4 rounded-2xl ${player.avatar} mb-4 shadow-inner`}>
                <Icons.User className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-black text-white mb-1">{player.name}</h2>
              <p className="text-yellow-400 font-bold text-xl">{player.score} נקודות</p>
            </div>
          </div>
        ))}
      </div>

      {/* טבלת שאר הדירוגים */}
      {others.length > 0 && (
        <div className="max-w-md mx-auto bg-white/5 backdrop-blur-sm rounded-3xl p-8 mb-12 border border-white/10">
          <h3 className="text-zinc-400 font-bold uppercase tracking-widest text-sm mb-6">דירוג סופי</h3>
          <div className="space-y-4">
            {others.map((p, i) => (
              <div key={p.id} className="flex justify-between items-center bg-zinc-800/50 p-3 rounded-xl border border-white/5">
                <div className="flex items-center gap-3">
                  <span className="text-zinc-500 font-mono w-4">{winners.length + i + 1}.</span>
                  <span className="text-white font-bold">{p.name}</span>
                </div>
                <span className="text-zinc-400 font-medium">{p.score} pts</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col items-center gap-4">
        <Button onClick={onRestart} size="xl" className="bg-gradient-to-r from-pink-500 to-purple-600 hover:scale-105 transition-transform px-12">
          חזרה ללובי הראשי
        </Button>
        <p className="text-zinc-500 text-sm italic">המשחק הסתיים ברוח טובה (בתקווה)</p>
      </div>
    </div>
  );
};