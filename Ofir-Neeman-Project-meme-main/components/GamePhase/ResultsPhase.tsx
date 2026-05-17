import React, { useState } from 'react';
import { AIJudgmentResult, Player } from '../../types';
import { Button } from '../ui/Button';
import { Icons } from '../ui/Icons';

interface ResultsPhaseProps {
  /** מחרוזת ה-src של תמונת הרקע של המימ הנוכחי */
  imageSrc: string;
  /** מערך התוצאות והציונים שהתקבלו משרת ה-AI של הדיווה */
  results: AIJudgmentResult[];
  /** רשימת השחקנים הפעילים בחדר */
  players: Player[];
  /** רשימת המשפטים המקוריים שהגישו השחקנים בסיבוב הזה */
  submissions: any[];
  /** פונקציית מעבר לסיבוב הבא */
  onNextRound: () => void;
  /** משתנה בוליאני המציין האם הגענו לסיבוב האחרון במשחק */
  isLastRound: boolean;
  /** פונקציית מעבר למסך סיום המשחק והכרזת המנצח הכללי */
  onGameEnd: () => void;
}

export const ResultsPhase: React.FC<ResultsPhaseProps> = ({ 
  imageSrc, 
  results, 
  players, 
  submissions, 
  onNextRound, 
  isLastRound, 
  onGameEnd 
}) => {
  // מונה השחקנים שנחשפו עד כה במסך (מתחיל מ-0, חושף כרטיס אחד בכל לחיצה)
  const [revealedCount, setRevealedCount] = useState(0);

  // מיון רשימת התוצאות מהציון הנמוך ביותר לגבוה ביותר (כדי שהמנצח ייחשף אחרון בסוף)
  const sortedResults = [...results].sort((a, b) => a.totalScore - b.totalScore);
  
  /** קידום המונה ב-1 כדי לחשוף את השחקן הבא בתור ברשימה */
  const handleRevealNext = () => {
    setRevealedCount(prev => prev + 1);
  };

  /** מקבלת מזהה שחקן ומחזירה את אובייקט השחקן המלא מתוך הרשימה */
  const getPlayer = (id: string) => players.find(p => p.id === id);

  /** חישוב הציון הגבוה ביותר שהושג בסיבוב הנוכחי */
  const maxScoreInRound = Math.max(...results.map(r => r.totalScore));

  /**
   * קומפוננטה פנימית לרנדור מד ציון אינטראקטיבי (Progress Bar) 
   * עבור מדדי היצירתיות, ההתאמה והאווירה (1 עד 10).
   */
  const ScoreBar = ({ label, value, color }: { label: string, value: number, color: string }) => (
    <div className="mb-4">
      <div className="flex justify-between text-xs font-black uppercase tracking-widest mb-1.5 opacity-90 text-zinc-400">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div className="h-4 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800/50 shadow-inner">
        <div 
          className={`h-full ${color} transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(255,255,255,0.3)]`} 
          // המכפלה ב-10 הופכת את הציון (למשל 8.5 מתוך 10) לאחוז תצוגה מדויק ב-CSS (85%)
          style={{ width: `${value * 10}%` }}
        ></div>
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto pb-32 pt-8">
      {/* כותרת השלב המרכזית */}
      <h2 className="outfit-bold text-6xl font-black text-center mb-16 text-white drop-shadow-[0_4px_0_rgba(0,0,0,0.5)]">
        Round Results
      </h2>

      {/* רשת כרטיסי התוצאות של השחקנים */}
      <div className="grid gap-12">
        {sortedResults.slice(0, revealedCount + 1).map((result) => {
          // התאמת ה-Submission של השחקן מול הציון (כולל ניקוי רווחים למניעת באגים בהשוואת מחרוזות)
          const playerSubmission = submissions.find(s => String(s.playerId).trim() === String(result.playerId).trim());
          const player = getPlayer(result.playerId);
          
          // השחקן מוכרז כמנצח רק אם יש לו את הציון המקסימלי ורשימת החשיפה הגיעה לסופה
          const isWinner = result.totalScore === maxScoreInRound && revealedCount === sortedResults.length - 1;

          return (
            <div 
              key={result.playerId} 
              className={`bg-zinc-950 rounded-[2.5rem] overflow-hidden shadow-2xl transform transition-all duration-700 animate-slide-up border-4 
                ${isWinner 
                  ? 'border-yellow-400 ring-4 ring-yellow-400/20 shadow-yellow-900/40 scale-105 z-10' 
                  : 'border-zinc-800'}`}
            >
              <div className="flex flex-col md:flex-row h-full">
                
                {/* חצי כרטיס שמאלי: תצוגה מקדימה חזותית של המימ המשולב */}
                <div className="md:w-5/12 relative bg-black flex items-center justify-center overflow-hidden border-b-4 md:border-b-0 md:border-l-4 border-zinc-800 min-h-[300px]">
                  <img src={imageSrc} className="w-full h-full object-cover opacity-40 blur-sm scale-110" alt="background" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
                  
                  <div className="absolute inset-0 flex items-center justify-center p-6">
                    <div className="w-full text-center">
                      <div className="bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/10 inline-block mb-3">
                        <Icons.Message className="w-8 h-8 text-white mx-auto" />
                      </div>
                      <p className="text-white text-3xl font-black uppercase tracking-tight drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] text-center break-words max-w-full px-4">
                        {playerSubmission?.caption || "No caption"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* חצי כרטיס ימני: פירוט הציונים והפידבק מהדיווה */}
                <div className="p-8 md:p-10 md:w-7/12 flex flex-col justify-between bg-zinc-900">
                  <div>
                    {/* שורת פרופיל שחקן + הצגת הציון המשוקלל */}
                    <div className="flex items-start justify-between mb-8">
                      <div className="flex items-center gap-5">
                        <div className={`p-4 rounded-[1.5rem] ${player?.avatar} shadow-lg border-2 border-white/10`}>
                          <Icons.User className="w-8 h-8 text-white" />
                        </div>
                        <div>
                          <h3 className="text-3xl font-black text-white tracking-tight">{player?.name}</h3>
                          {isWinner && (
                            <span className="flex items-center gap-1 text-yellow-400 text-sm font-bold mt-1 uppercase tracking-wider bg-yellow-400/10 px-2 py-1 rounded-md border border-yellow-400/20 w-fit">
                              <Icons.Trophy className="w-4 h-4" /> WINNER
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl px-5 py-3 shadow-inner">
                          <span className="block text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Total Score</span>
                          <span className="text-5xl font-black text-white">{result.totalScore}</span>
                        </div>
                      </div>
                    </div>

                    {/* בועת התגובה המילולית של הדיווה */}
                    <div className="relative mb-8">
                      <div className="absolute -top-3 -left-2 bg-pink-500 text-white p-1.5 rounded-full border-4 border-zinc-900 transform -rotate-12 z-10">
                        <Icons.Message className="w-5 h-5" />
                      </div>
                      <div className="bg-white text-zinc-900 p-6 rounded-tr-[2rem] rounded-bl-[2rem] rounded-tl-lg rounded-br-lg shadow-xl relative">
                        <p className="font-bold text-xl leading-relaxed">"{result.comment}"</p>
                      </div>
                    </div>

                    {/* גרפים של רכיבי הציון המפורטים */}
                    <div className="space-y-1">
                      <ScoreBar label="Creativity" value={result.scores.creativity} color="bg-gradient-to-r from-pink-500 to-pink-400" />
                      <ScoreBar label="Visual Fit" value={result.scores.visualFit} color="bg-gradient-to-r from-cyan-500 to-cyan-400" />
                      <ScoreBar label="Vibe Check" value={result.scores.vibeCheck} color="bg-gradient-to-r from-purple-500 to-purple-400" />
                    </div>
                  </div>
                </div>

              </div>
            </div>
          );
        })}
      </div>

      {/* פאנל כפתורי ניווט ושליטה קבוע בתחתית המסך (Floating Action Panel) */}
      <div className="fixed bottom-10 left-0 right-0 flex justify-center px-4 z-50 pointer-events-none">
        <div className="pointer-events-auto">
          {revealedCount < sortedResults.length - 1 ? (
            // כפתור חשיפת השחקן הבא בתור (מופיע כל עוד לא נחשפו כולם)
            <Button onClick={handleRevealNext} size="xl" className="shadow-[0_10px_40px_rgba(0,0,0,0.5)] animate-bounce">
              Reveal Next
            </Button>
          ) : (
            // כפתור סיום/מעבר שלב (מתחלף חזותית רק לאחר חשיפת כל השחקנים)
            <Button 
              onClick={isLastRound ? onGameEnd : onNextRound}
              size="xl" 
              variant="secondary" 
              className="shadow-[0_10px_40px_rgba(0,0,0,0.5)] bg-white text-zinc-900 hover:bg-zinc-200 border-zinc-400"
            >
              {isLastRound ? "View Winner 🏆" : "Next Round 🔄"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};