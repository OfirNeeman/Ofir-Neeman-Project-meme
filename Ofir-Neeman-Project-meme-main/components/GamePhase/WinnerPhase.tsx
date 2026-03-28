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
    <div className="max-w-5xl mx-auto text-center pt-12 pb-24 px-4 animate-in fade-in duration-500">
      <h1 className="text-6xl font-black text-pink-400 mb-12 animate-pulse drop-shadow-lg">
        {winners.length > 1 ? "🤝 It's a tie 🤝" : "🏆 The Winner 🏆"}
      </h1>

      <div className="flex flex-wrap justify-center gap-10 mb-20">
        {winners.map((player) => (
          <div key={player.id} className="relative group">
            <div className="absolute -inset-2 bg-gradient-to-r from-pink-400 via-fuchsia-500 to-purple-500 rounded-3xl blur-xl opacity-70"></div>
            <div className="relative flex flex-col items-center backdrop-blur-xl bg-white/5 border border-white/10 p-10 rounded-3xl shadow-2xl min-w-[220px]">
              <div className="text-6xl mb-4">👑</div>
              <div className={`p-5 rounded-2xl ${player.avatar || 'bg-white/10'} mb-4`}>
                <Icons.User className="w-12 h-12 text-white" />
              </div>
              <h2 className="text-3xl font-black text-white mb-2">{player.name}</h2>
              <p className="text-pink-300 font-bold text-2xl">{player.score} pts</p>
            </div>
          </div>
        ))}
      </div>

      {others.length > 0 && (
        <div className="max-w-xl mx-auto mb-16">
          <h3 className="text-pink-200 font-bold uppercase tracking-widest text-sm mb-6">Final Ranking</h3>
          <div className="space-y-3">
            {others.map((p, i) => (
              <div key={p.id} className="flex justify-between items-center backdrop-blur-lg bg-white/5 p-4 rounded-xl border border-white/10">
                <div className="flex items-center gap-3">
                  <span className="text-pink-300 font-mono w-6 text-left">{winners.length + i + 1}.</span>
                  <div className={`p-2 rounded-lg ${p.avatar || 'bg-white/10'} scale-75`}>
                    <Icons.User className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-white font-bold text-lg">{p.name}</span>
                </div>
                <span className="text-pink-300 font-medium">{p.score} pts</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <Button 
        onClick={onRestart} 
        size="xl" 
        className="bg-gradient-to-r from-pink-500 via-fuchsia-500 to-purple-600 px-16 shadow-xl hover:scale-105 transition"
      >
        Back to Lobby
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
    <div className="min-h-screen bg-gradient-to-br from-pink-900 via-fuchsia-900 to-purple-900 overflow-y-auto">
      {isHost ? renderHostView() : renderPlayerView()}
    </div>
  );
};
