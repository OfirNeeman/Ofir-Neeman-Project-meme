import React from "react";
import { Player } from "../../types";
import { Icons } from "../ui/Icons";
import { Button } from "../ui/Button";

interface WinnerPhaseProps {
  players: Player[];
  onRestart: () => void;
}

export const WinnerPhase: React.FC<WinnerPhaseProps> = ({ players, onRestart }) => {
  // מיון לפי ניקוד
  const sorted = [...players].sort((a, b) => b.score - a.score);

  const top3 = sorted.slice(0, 3);
  const rest = sorted.slice(3);

  const podiumOrder = [1, 0, 2]; // כדי שהמקום הראשון באמצע

  return (
    <div className="max-w-5xl mx-auto text-center pt-12 pb-24">
      <h1 className="text-6xl font-black text-white mb-16">
        🏆 המנצחים 🏆
      </h1>

      {/* פודיום */}
      <div className="flex justify-center items-end gap-6 mb-20">
        {podiumOrder.map((pos, i) => {
          const player = top3[pos];
          if (!player) return null;

          const heights = ["h-40", "h-56", "h-32"]; // 2nd, 1st, 3rd
          const medals = ["🥈", "🥇", "🥉"];

          return (
            <div key={player.id} className="flex flex-col items-center">
              <div className="mb-4 text-4xl">{medals[i]}</div>

              <div className={`w-28 ${heights[i]} bg-gradient-to-t from-pink-500 to-purple-500 rounded-2xl flex flex-col justify-end items-center pb-4 shadow-xl`}>
                <div className={`p-3 rounded-xl ${player.avatar} mb-2`}>
                  <Icons.User className="w-6 h-6 text-white" />
                </div>

                <span className="text-white font-black text-lg">
                  {player.name}
                </span>

                <span className="text-white text-sm opacity-80">
                  {player.score} pts
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* שאר השחקנים */}
      {rest.length > 0 && (
        <div className="bg-zinc-900 rounded-2xl p-6 mb-10">
          <h2 className="text-xl font-bold text-white mb-4">
            שאר המשתתפים
          </h2>

          <div className="space-y-2">
            {rest.map((p, i) => (
              <div key={p.id} className="flex justify-between text-zinc-300">
                <span>{i + 4}. {p.name}</span>
                <span>{p.score}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <Button onClick={onRestart} size="xl">
        משחק חדש 🔄
      </Button>
    </div>
  );
};