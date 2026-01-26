import React from 'react';
import { JudgePersonality } from '../../types';
import { JUDGE_DESCRIPTIONS } from '../../constants';
import { Icons } from '../ui/Icons';

interface JudgingPhaseProps {
  personality: JudgePersonality;
}

export const JudgingPhase: React.FC<JudgingPhaseProps> = ({ personality }) => {
  const judge = JUDGE_DESCRIPTIONS[personality];

  const getIcon = () => {
      switch (personality) {
          case JudgePersonality.ROASTER: return <Icons.Flame className="w-40 h-40 text-orange-500" />;
          case JudgePersonality.GRANDMA: return <Icons.Glasses className="w-40 h-40 text-teal-400" />;
          case JudgePersonality.GEN_Z: return <Icons.Sparkles className="w-40 h-40 text-yellow-400" />;
          default: return <Icons.Brain className="w-40 h-40 text-pink-500" />;
      }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-12 text-center animate-fade-in">
      
      <div className="relative group">
        <div className="absolute inset-0 bg-pink-500 blur-[100px] opacity-30 rounded-full animate-pulse group-hover:opacity-50 transition-opacity duration-1000"></div>
        <div className="relative z-10 drop-shadow-[0_0_30px_rgba(236,72,153,0.6)] animate-bounce-slow">
            {getIcon()}
        </div>
      </div>
      
      <div className="space-y-4 max-w-lg">
        <h2 className="text-5xl font-black text-white leading-tight">{judge.name} חושב/ת...</h2>
        <p className="text-2xl text-pink-200 font-medium opacity-80">"רגע, אני מחפש את הפאנץ'..."</p>
      </div>

      <div className="flex gap-4 p-4 bg-white/5 rounded-full backdrop-blur-md border border-white/10">
        <div className="w-4 h-4 bg-pink-500 rounded-full animate-bounce delay-0 shadow-[0_0_15px_#ec4899]"></div>
        <div className="w-4 h-4 bg-purple-500 rounded-full animate-bounce delay-150 shadow-[0_0_15px_#a855f7]"></div>
        <div className="w-4 h-4 bg-cyan-500 rounded-full animate-bounce delay-300 shadow-[0_0_15px_#06b6d4]"></div>
      </div>
    </div>
  );
};