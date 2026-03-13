import React, { useState } from 'react';
import { Player } from '../../types';
import { Button } from '../ui/Button';
import { Icons } from '../ui/Icons';

interface CaptioningPhaseProps {
  imageSrc: string;
  playerId: string; // הוספת ה-ID של השחקן המקומי
  playerName: string; // הוספת השם של השחקן המקומי
  onSubmitCaption: (caption: string) => void; // שינוי לשליחת כיתוב יחיד
}

export const CaptioningPhase: React.FC<CaptioningPhaseProps> = ({ imageSrc, 
  playerId, 
  playerName, 
  onSubmitCaption }) => {
    const [currentInput, setCurrentInput] = useState("");

    const handleSubmit = () => {
      if (!currentInput.trim()) return;
      onSubmitCaption(currentInput);
    };
  /*const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
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
  }*/

  return (
    <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-12 items-start animate-fade-in pt-4">
      {/* Image Preview */}
    {  <div className="w-full lg:w-1/2">
        <div className="bg-black rounded-[2rem] overflow-hidden shadow-2xl shadow-black/50 border-4 border-zinc-800 relative group">
           <img src={imageSrc} alt="Meme Context" className="w-full h-auto object-contain" />
        </div>
      </div> }

        <div className="w-full lg:w-1/2 flex flex-col space-y-8">
        <div className="flex items-center gap-6">
            <h3 className="text-sm uppercase tracking-[0.2em] text-zinc-500 font-black">היי {playerName}, כתוב כיתוב:</h3>
        </div>

        <textarea
          value={currentInput}
          onChange={(e) => setCurrentInput(e.target.value)}
          placeholder="כתוב כאן משהו קורע..."
          className="w-full bg-white text-zinc-900 rounded-[2rem] p-8 h-64 text-3xl font-bold outline-none resize-none"
          autoFocus
        />

        <Button onClick={handleSubmit} size="xl" className="w-full">
          שלח כיתוב!
        </Button>
      </div>
    </div>
  );
};