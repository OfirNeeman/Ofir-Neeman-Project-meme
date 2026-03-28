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
  const sorted = [...players].sort((a, b) => b.score - a.score);
  const highScore = sorted[0]?.score || 0;
  const winners = sorted.filter(p => p.score === highScore && highScore > 0);
  const others = sorted.filter(p => p.score !== highScore);

const renderHostView = () => (
    <div className="max-w-5xl mx-auto text-center pt-12 pb-24 px-4">
      <h1 className="text-5xl font-black text-white mb-16 tracking-tighter">
        {winners.length > 1 ? "🤝 IT'S A TIE" : "🏆 THE WINNER"}
      </h1>

      <div className="flex flex-wrap justify-center gap-6 mb-20">
        {winners.map((player) => (
          <div key={player.id} className="relative">
            {/* הורדתי את ה-div עם ה-blur הסגול שהיה כאן */}
            <div className="relative flex flex-col items-center bg-white/10 border border-white/20 p-8 rounded-2xl min-w-[200px] shadow-lg">
              <div className="text-5xl mb-4">👑</div>
              <div className={`p-4 rounded-full ${player.avatar || 'bg-white/5'} mb-4 border border-white/10`}>
                <Icons.User className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-black text-white">{player.name}</h2>
              <p className="text-pink-400 font-bold text-xl">{player.score} pts</p>
            </div>
          </div>
        ))}
      </div>

      {/* רשימת הדירוג - עשינו אותה יותר שקופה ופחות "כבדה" */}
      {others.length > 0 && (
        <div className="max-w-md mx-auto mb-12">
          <div className="space-y-2">
            {others.map((p, i) => (
              <div key={p.id} className="flex justify-between items-center bg-black/20 p-3 rounded-xl border border-white/5">
                <div className="flex items-center gap-3">
                  <span className="text-white/40 font-mono text-sm">{winners.length + i + 1}</span>
                  <span className="text-white font-bold">{p.name}</span>
                </div>
                <span className="text-white/60 text-sm">{p.score} pts</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <Button 
        onClick={onRestart} 
        className="bg-white text-black hover:bg-pink-500 hover:text-white px-12 py-6 rounded-full font-black transition-all"
      >
        PLAY AGAIN
      </Button>
    </div>
  );

  const renderPlayerView = () => {
    const myPlayer = players.find(p => p.id === currentPlayerId);
    
    if (!myPlayer) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen text-center p-6">
          <h1 className="text-4xl font-bold text-white mb-4">The game has ended</h1>
          <Button onClick={onRestart}>Back to Lobby</Button>
        </div>
      );
    }

    const myRank = sorted.findIndex(p => p.id === currentPlayerId) + 1;
    const isWinner = myPlayer.score === highScore && highScore > 0;

    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center p-6 animate-in fade-in duration-500">
        <div className="relative mb-8">
          {isWinner && <div className="absolute -inset-6 bg-pink-400/30 blur-3xl rounded-full animate-pulse"></div>}
          <div className={`text-7xl ${isWinner ? 'animate-bounce' : ''}`}>
            {isWinner ? "🏆" : "🏅"}
          </div>
        </div>

        <div className="space-y-4 mb-8">
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

        <div className={`p-6 rounded-3xl ${myPlayer.avatar || 'bg-white/10'} mb-10 border border-white/10 backdrop-blur-lg`}>
          <Icons.User className="w-12 h-12 text-white" />
        </div>

        <div className="w-full max-w-xs space-y-4">
          <Button onClick={onRestart} size="lg" className="w-full bg-white/10 backdrop-blur hover:bg-white/20">
            Back to Lobby
          </Button>
          <p className="text-pink-200 text-xs">Waiting for host to restart</p>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen overflow-y-auto bg-transparent">
      {isHost ? renderHostView() : renderPlayerView()}
    </div>
  );
};
