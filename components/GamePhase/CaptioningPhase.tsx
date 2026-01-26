import React, { useState } from 'react';
import { Player } from '../../types';
import { Button } from '../ui/Button';
import { Icons } from '../ui/Icons';

interface CaptioningPhaseProps {
  imageSrc: string;
  players: Player[];
  onSubmitCaptions: (captions: { playerId: string; caption: string }[]) => void;
}

export const CaptioningPhase: React.FC<CaptioningPhaseProps> = ({ imageSrc, players, onSubmitCaptions }) => {
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [captions, setCaptions] = useState<{ playerId: string; caption: string }[]>([]);
  const [currentInput, setCurrentInput] = useState("");
  const [showPassScreen, setShowPassScreen] = useState(false);

  const currentPlayer = players[currentPlayerIndex];

  const handleNext = () => {
    if (!currentInput.trim()) return;

    const newCaptions = [...captions, { playerId: currentPlayer.id, caption: currentInput }];
    setCaptions(newCaptions);
    setCurrentInput("");

    if (currentPlayerIndex < players.length - 1) {
      setShowPassScreen(true);
    } else {
      onSubmitCaptions(newCaptions);
    }
  };

  const handlePass = () => {
    setShowPassScreen(false);
    setCurrentPlayerIndex(prev => prev + 1);
  };

  if (showPassScreen) {
    const nextPlayer = players[currentPlayerIndex + 1];
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-12 animate-fade-in text-center">
        <div className="relative">
             <div className="absolute inset-0 bg-pink-500 blur-2xl opacity-30 rounded-full animate-pulse"></div>
             <div className="p-10 bg-zinc-900 rounded-[2.5rem] border-4 border-zinc-800 shadow-2xl relative z-10">
                <Icons.Lock className="w-24 h-24 text-pink-500" />
            </div>
        </div>
        <div>
            <h2 className="text-5xl font-black text-white mb-4">להעביר ל-{nextPlayer.name}</h2>
            <p className="text-2xl text-zinc-400 font-bold">בלי להציץ! 👀</p>
        </div>
        <Button onClick={handlePass} size="xl" variant="secondary" className="px-16">אני מוכן!</Button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-12 items-start animate-fade-in pt-4">
      {/* Image Preview */}
      <div className="w-full lg:w-1/2">
        <div className="bg-black rounded-[2rem] overflow-hidden shadow-2xl shadow-black/50 border-4 border-zinc-800 relative group">
           <img src={imageSrc} alt="Meme Context" className="w-full h-auto object-contain" />
        </div>
      </div>

      {/* Input Area */}
      <div className="w-full lg:w-1/2 flex flex-col space-y-8">
        
        <div className="flex items-center gap-6">
            <div className={`p-4 rounded-2xl ${currentPlayer.avatar} shadow-lg border-2 border-white/10`}>
                <Icons.User className="w-10 h-10 text-white" />
            </div>
            <div>
              <h3 className="text-sm uppercase tracking-[0.2em] text-zinc-500 font-black mb-1">תורו של</h3>
              <p className="text-4xl font-black text-white">{currentPlayer.name}</p>
            </div>
        </div>

        <div className="relative">
          <textarea
            value={currentInput}
            onChange={(e) => setCurrentInput(e.target.value)}
            placeholder="כתוב כאן משהו קורע..."
            className="w-full bg-white text-zinc-900 border-b-8 border-zinc-300 rounded-[2rem] p-8 h-64 text-3xl font-bold focus:border-pink-500 focus:ring-0 outline-none resize-none transition-all placeholder-zinc-300 shadow-xl"
            autoFocus
          />
          <div className="absolute top-4 right-4 bg-zinc-100 text-zinc-400 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">
             Meme Caption
          </div>
        </div>

        <Button 
          onClick={handleNext} 
          disabled={!currentInput.trim()} 
          size="xl"
          className="w-full shadow-2xl shadow-pink-500/20"
        >
          {currentPlayerIndex === players.length - 1 ? "סיים ושלח לשופט" : "שלח והעבר הלאה"}
        </Button>
      </div>
    </div>
  );
};