import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { Icons } from '../ui/Icons';

interface CaptioningPhaseProps {
  imageSrc: string;
  playerId: string;
  playerName: string;
  onSubmitCaption: (caption: string) => void;
}

export const CaptioningPhase: React.FC<CaptioningPhaseProps> = ({ 
  imageSrc, 
  playerName, 
  onSubmitCaption 
}) => {
  const [currentInput, setCurrentInput] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = () => {
    if (!currentInput.trim() || isSubmitted) return;
    setIsSubmitted(true);
    onSubmitCaption(currentInput);
  };

  if (isSubmitted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-8 animate-fade-in text-center">
        <div className="bg-zinc-900 p-10 rounded-[2.5rem] border-4 border-zinc-800 shadow-2xl">
          <Icons.Check className="w-20 h-20 text-green-500 mx-auto mb-4" />
          <h2 className="text-4xl font-black text-white">הכיתוב נשלח!</h2>
          <p className="text-xl text-zinc-400 mt-2">מחכים ששאר השחקנים יסיימו... ⏳</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-12 items-start animate-fade-in pt-4">
      {/* תצוגת התמונה - הסרתי את הסוגריים המיותרים כדי שהיא תופיע */}
      <div className="w-full lg:w-1/2">
        <div className="bg-black rounded-[2rem] overflow-hidden shadow-2xl shadow-black/50 border-4 border-zinc-800 relative group">
           <img src={imageSrc} alt="Meme Context" className="w-full h-auto object-contain" />
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex flex-col space-y-8">
        <div className="flex items-center gap-6">
            <h3 className="text-sm uppercase tracking-[0.2em] text-zinc-500 font-black">
              היי {playerName}, כתוב כיתוב:
            </h3>
        </div>

        <textarea
          value={currentInput}
          onChange={(e) => setCurrentInput(e.target.value)}
          placeholder="כתוב כאן משהו קורע..."
          className="w-full bg-white text-zinc-900 rounded-[2rem] p-8 h-64 text-3xl font-bold outline-none resize-none shadow-xl border-b-8 border-zinc-300 focus:border-pink-500 transition-all"
          autoFocus
        />

        <Button 
          onClick={handleSubmit} 
          size="xl" 
          className="w-full shadow-2xl shadow-pink-500/20"
        >
          שלח כיתוב!
        </Button>
      </div>
    </div>
  );
};