import React from "react";
import { Player } from "../../types";
import { Icons } from "../ui/Icons";
import { Button } from "../ui/Button";

interface WinnerPhaseProps {
  players: Player[];
  isHost: boolean;
  currentPlayerId: string | null;
  onRestart: () => void;
}

export const WinnerPhase: React.FC<WinnerPhaseProps> = ({ 
  players, 
  isHost, 
  currentPlayerId, 
  onRestart 
}) => {
  // 1. מיון ודירוג
  const sorted = [...players].sort((a, b) => b.score - a.score);
  const highScore = sorted[0]?.score || 0;
  const winners = sorted.filter(p => p.score === highScore && highScore > 0);
  const others = sorted.filter(p => p.score !== highScore);

  // ------------------------------------------------------------------
  // תצוגת המארח - מסך ראשי
  // ------------------------------------------------------------------
  const renderHostView = () => (
    <div className="max-w-5xl mx-auto text-center pt-12 pb-24 px-4 animate-in fade-in duration-500">
      <h1 className="text-6xl font-black text-white mb-8 animate-pulse">
        {winners.length > 1 ? "🤝 יש לנו תיקו! 🤝" : "🏆 המנצח הגדול 🏆"}
      </h1>

      <div className="flex flex-wrap justify-center gap-8 mb-20">
        {winners.map((player) => (
          <div key={player.id} className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-3xl blur opacity-75 group-hover:opacity-100 transition duration-1000 animate-pulse"></div>
            <div className="relative flex flex-col items-center bg-zinc-900 border-2 border-yellow-500/50 p-10 rounded-3xl shadow-2xl min-w-[220px]">
              <div className="text-6xl mb-4">👑</div>
              <div className={`p-5 rounded-2xl ${player.avatar || 'bg-zinc-700'} mb-4 shadow-inner`}>
                <Icons.User className="w-12 h-12 text-white" />
              </div>
              <h2 className="text-3xl font-black text-white mb-2">{player.name}</h2>
              <p className="text-yellow-400 font-bold text-2xl">{player.score} pts</p>
            </div>
          </div>
        ))}
      </div>

      {others.length > 0 && (
        <div className="max-w-xl mx-auto bg-white/5 backdrop-blur-sm rounded-3xl p-8 mb-16 border border-white/10 shadow-lg">
          <h3 className="text-zinc-400 font-bold uppercase tracking-widest text-sm mb-6">דירוג סופי</h3>
          <div className="space-y-4">
            {others.map((p, i) => (
              <div key={p.id} className="flex justify-between items-center bg-zinc-800/50 p-4 rounded-xl border border-white/5">
                <div className="flex items-center gap-3">
                  <span className="text-zinc-500 font-mono w-6 text-left">{winners.length + i + 1}.</span>
                  <div className={`p-2 rounded-lg ${p.avatar || 'bg-zinc-700'} scale-75`}>
                    <Icons.User className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-white font-bold text-lg">{p.name}</span>
                </div>
                <span className="text-zinc-400 font-medium">{p.score} נקודות</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col items-center gap-4">
        <Button onClick={onRestart} size="xl" className="bg-gradient-to-r from-pink-500 to-purple-600 px-16">
          חזרה ללובי וריענון
        </Button>
      </div>
    </div>
  );

  // ------------------------------------------------------------------
  // תצוגת השחקן - טלפון (מתוקן)
  // ------------------------------------------------------------------
  const renderPlayerView = () => {
    const myPlayer = players.find(p => p.id === currentPlayerId);
    
    if (!myPlayer) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen text-center p-6 bg-zinc-950">
          <h1 className="text-4xl font-bold text-white mb-4">המשחק הסתיים!</h1>
          <Button onClick={onRestart}>חזרה ללובי</Button>
        </div>
      );
    }

    const myRank = sorted.findIndex(p => p.id === currentPlayerId) + 1;
    const isWinner = myRank === 1;

    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center p-6 bg-zinc-950 animate-in fade-in duration-500">
        <div className="relative mb-8">
          {isWinner && <div className="absolute -inset-6 bg-yellow-400/20 blur-3xl rounded-full animate-pulse"></div>}
          <div className={`text-7xl ${isWinner ? 'animate-bounce' : ''}`}>
            {isWinner ? "🏆" : "🏅"}
          </div>
        </div>

        <div className="space-y-4 mb-8">
          <h1 className="text-4xl font-black text-white italic">
            {isWinner ? "ניצחתם!" : "כל הכבוד!"}
          </h1>
          <p className={`${isWinner ? 'text-yellow-400' : 'text-pink-200'} text-3xl font-bold`}>
            מקום {myRank}
          </p>
          <p className="text-zinc-400 text-xl">
            {myPlayer.score} נקודות
          </p>
        </div>

        <div className={`p-6 rounded-3xl ${myPlayer.avatar || 'bg-zinc-700'} mb-10 border-4 border-white/10 shadow-xl`}>
          <Icons.User className="w-12 h-12 text-white" />
        </div>

        <div className="w-full max-w-xs space-y-4">
          <Button onClick={onRestart} size="lg" className="w-full bg-zinc-800">
            חזרה ללובי
          </Button>
          <p className="text-zinc-600 text-xs">המארח מאתחל את המשחק...</p>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-zinc-950 overflow-y-auto">
      {isHost ? renderHostView() : renderPlayerView()}
    </div>
  );
};