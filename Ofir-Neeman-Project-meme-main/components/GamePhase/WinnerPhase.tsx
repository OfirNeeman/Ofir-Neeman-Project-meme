import React from "react";
import { Player } from "../../types";
import { Icons } from "../ui/Icons";
import { Button } from "../ui/Button";
import { SERVER_IP } from '../../constants';

/**
 * פרופס עבור קומפוננטת WinnerPhase
 */
interface WinnerPhaseProps {
  /** מערך השחקנים בחדר */
  players: Player[];
  /** האם המשתמש הנוכחי הוא מנהל החדר (Host) */
  isHost: boolean;
  /** המזהה הייחודי של השחקן הנוכחי (null אם מדובר בצופה/הוסט בלבד) */
  currentPlayerId: string | null;
  /** פונקציית קולבק לאיחול מחדש של החדר וחזרה ללובי */
  onRestart: () => void;
  /** קוד החדר הנוכחי (לצורך ניקוי נתונים בשרת) */
  roomCode: string;
}

/**
 * קומפוננטת WinnerPhase - מציגה את מסך סיום המשחק.
 * הקומפוננטה מציגה פודיום מנצחים וטבלת מובילים עבור ה-Host,
 * ומסך תוצאה אישי (מיקום וניקוד) עבור השחקנים במכשירים שלהם.
 */
export const WinnerPhase: React.FC<WinnerPhaseProps> = ({ 
  players, 
  isHost, 
  currentPlayerId, 
  roomCode,
  onRestart 
}) => {
  // 1. מיון השחקנים מהציון הגבוה לנמוך (יצירת עותק כדי לא לפגוע במערך המקורי)
  const sorted = [...players].sort((a, b) => b.score - a.score);
  
  // 2. שליפת הציון הגבוה ביותר במשחק
  const highScore = sorted[0]?.score || 0;
  
  // 3. סינון המנצחים (תומך בריבוי מנצחים במקרה של תיקו, בתנאי שהציון מעל 0)
  const winners = sorted.filter(p => p.score === highScore && highScore > 0);
  
  // 4. סינון שאר השחקנים לצורך הצגתם בטבלת הרייטינג המשנית
  const others = sorted.filter(p => p.score !== highScore);

  /**
   * תצוגת ההוסט (Host View) - מיועדת למסך המרכזי.
   * מציגה פודיום חגיגי של המנצחים, דירוג כללי וכפתור חזרה ללובי שמנקה את השרת.
   */
  const renderHostView = () => (
    <div className="max-w-5xl mx-auto text-center pt-12 pb-24 px-4">
      {/* כותרת דינמית בהתאם למצב המשחק (מנצח יחיד או תיקו) */}
      <h1 className="outfit-bold text-5xl font-black text-white mb-16 tracking-tighter">
        {winners.length > 1 ? " IT'S A TIE" : " THE WINNER"}
      </h1>

      {/* פודיום המנצחים */}
      <div className="flex flex-wrap justify-center gap-6 mb-20">
        {winners.map((player) => (
          <div key={player.id} className="relative">
            <div className="relative flex flex-col items-center bg-white/10 border border-white/20 p-8 rounded-2xl min-w-[200px] shadow-lg">
              <div className="text-5xl mb-4">👑</div>
              <div className={`p-4 rounded-full ${player.avatar || 'bg-white/5'} mb-4 border border-white/10`}>
                <Icons.User className="w-10 h-10 text-white" />
              </div>
              <h2 className="outfit-bold text-2xl font-black text-white">{player.name}</h2>
              <p className="outfit-bold text-pink-400 font-bold text-xl">{player.score} pts</p>
            </div>
          </div>
        ))}
      </div>

      {/* רשימת הדירוג המשנית (Leaderboard) לשאר השחקנים */}
      {others.length > 0 && (
        <div className="max-w-md mx-auto mb-12">
          <div className="space-y-2">
            {others.map((p, i) => (
              <div key={p.id} className="flex justify-between items-center bg-black/20 p-3 rounded-xl border border-white/5">
                <div className="flex items-center gap-3">
                  {/* חישוב המיקום היחסי: מספר המנצחים בתיקו + האינדקס הנוכחי + 1 */}
                  <span className="outfit-medium text-white/40 font-mono text-sm">{winners.length + i + 1}</span>
                  <span className="outfit-bold text-white font-bold">{p.name}</span>
                </div>
                <span className="outfit-medium text-white/60 text-sm">{p.score} pts</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* כפתור הפעלה מחדש וחזרה ללובי */}
      <Button 
        onClick={() => {
          // קריאת אסינכרונית למחיקת התיקייה הזמנית בשרת הפייתון.
          // לא משתמשים ב-await כדי לא לעכב את מעבר ה-UI של המשתמשים ללובי.
          fetch(`http://${SERVER_IP}:4000/delete-room-dir/${roomCode}`, { 
            method: 'POST' 
          }).catch(err => console.error("Cleanup failed:", err));

          // החזרת המשחק למצב לובי בסטייט הכללי
          onRestart();
        }} 
        className="outfit-bold bg-white text-black hover:bg-pink-500 hover:text-white px-12 py-6 rounded-full font-black transition-all"
      >
        Back to Lobby
      </Button>
    </div>
  );

  /**
   * תצוגת השחקן (Player View) - מיועדת למכשירים האישיים.
   * מציגה לשחקן את המיקום הספציפי אליו הגיע עם אפקטים מותאמים אישית.
   */
  const renderPlayerView = () => {
    // איתור נתוני השחקן הנוכחי מתוך הרשימה
    const myPlayer = players.find(p => p.id === currentPlayerId);
    
    // מנגנון הגנה: אם השחקן לא נמצא (למשל עקב ניתוק), מציגים מסך סיום גנרי
    if (!myPlayer) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen text-center p-6">
          <h1 className="text-4xl font-bold text-white mb-4">The game has ended</h1>
          <Button onClick={onRestart}>Back to Lobby</Button>
        </div>
      );
    }

    // חישוב המיקום של השחקן (אינדקס במערך הממוין + 1)
    const myRank = sorted.findIndex(p => p.id === currentPlayerId) + 1;
    // בדיקה האם השחקן הנוכחי הוא אחד מהמנצחים
    const isWinner = myPlayer.score === highScore && highScore > 0;

    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center p-6 animate-in fade-in duration-500">
        {/* אזור האייקון/מדליה עם אפקטים מיוחדים למנצח */}
        <div className="relative mb-8">
          {isWinner && <div className="absolute -inset-6 bg-pink-400/30 blur-3xl rounded-full animate-pulse"></div>}
          <div className={`text-7xl ${isWinner ? 'animate-bounce' : ''}`}>
            {isWinner ? "🏆" : "🏅"}
          </div>
        </div>

        {/* כותרות וטקסט דירוג מותאם אישית */}
        <div className="outfit-bold space-y-4 mb-8">
          <h1 className="text-4xl font-black text-white italic">
            {isWinner ? "You won" : "Nice try"}
          </h1>
          <p className={`${isWinner ? 'text-pink-300' : 'text-pink-200'} text-3xl font-bold`}>
             {isWinner ? "1st Place" : `Place ${myRank}`}
          </p>
          <p className="text-pink-200 text-xl">
            {myPlayer.score} points
          </p>
        </div>

        {/* תצוגת האווטאר של השחקן */}
        <div className={`p-6 rounded-3xl ${myPlayer.avatar || 'bg-white/10'} mb-10 border border-white/10 backdrop-blur-lg`}>
          <Icons.User className="w-12 h-12 text-white" />
        </div>

        {/* כפתורים וסטטוס המתנה */}
        <div className="w-full max-w-xs space-y-4">
          <Button onClick={onRestart} size="lg" className="w-full bg-white/10 backdrop-blur hover:bg-white/20">
            Back to Lobby
          </Button>
          <p className="text-pink-200 text-xs">Waiting for host to restart</p>
        </div>
      </div>
    );
  };

  // רינדור התבנית הראשית - פיצול דינמי לפי תפקיד המשתמש (Host מול Player)
  return (
    <div className="min-h-screen overflow-y-auto bg-transparent">
      {isHost ? renderHostView() : renderPlayerView()}
    </div>
  );
};