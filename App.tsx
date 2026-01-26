import React, { useState } from 'react';
import { GameState, GamePhase, Player, JudgePersonality, MemeSubmission, AIJudgmentResult } from './types';
import { Lobby } from './components/Lobby';
import { UploadPhase } from './components/GamePhase/UploadPhase';
import { CaptioningPhase } from './components/GamePhase/CaptioningPhase';
import { JudgingPhase } from './components/GamePhase/JudgingPhase';
import { ResultsPhase } from './components/GamePhase/ResultsPhase';
import { judgeMemes } from './services/geminiService';
import { Icons } from './components/ui/Icons';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>({
    phase: GamePhase.LOBBY,
    players: [],
    judgePersonality: JudgePersonality.ROASTER,
    currentImageBase64: null,
    submissions: [],
    judgments: [],
    roundsPlayed: 0,
    roomCode: null,
    isHost: false,
  });

  const updatePhase = (phase: GamePhase) => {
    setGameState(prev => ({ ...prev, phase }));
  };

  const handleStartGame = (players: Player[], personality: JudgePersonality, isHost: boolean) => {
    setGameState(prev => ({
      ...prev,
      players,
      judgePersonality: personality,
      phase: GamePhase.UPLOAD,
      isHost
    }));
  };

  const handleImageSelected = (base64: string) => {
    setGameState(prev => ({
      ...prev,
      currentImageBase64: base64,
      phase: GamePhase.CAPTIONING
    }));
  };

  const handleSubmitCaptions = async (submissions: MemeSubmission[]) => {
    setGameState(prev => ({
      ...prev,
      submissions,
      phase: GamePhase.JUDGING
    }));

    try {
      const results = await judgeMemes(
        gameState.currentImageBase64!,
        submissions,
        gameState.players,
        gameState.judgePersonality
      );

      // Update player scores locally based on results
      const updatedPlayers = gameState.players.map(p => {
        const playerResult = results.find(r => r.playerId === p.id);
        return playerResult ? { ...p, score: p.score + playerResult.totalScore } : p;
      });

      setGameState(prev => ({
        ...prev,
        players: updatedPlayers,
        judgments: results,
        phase: GamePhase.RESULTS
      }));
    } catch (error) {
      console.error("Critical game error:", error);
      alert("אירעה שגיאה בשיפוט. נסה שוב.");
      updatePhase(GamePhase.LOBBY);
    }
  };

  const handleNextRound = () => {
    setGameState(prev => ({
      ...prev,
      currentImageBase64: null,
      submissions: [],
      judgments: [],
      roundsPlayed: prev.roundsPlayed + 1,
      phase: GamePhase.UPLOAD
    }));
  };

  return (
    <div className="min-h-screen flex flex-col font-sans selection:bg-pink-500 selection:text-white">
      {/* Header / StatusBar - Only show when game is active (not in Lobby) */}
      {gameState.phase !== GamePhase.LOBBY && (
        <header className="glass-panel border-b border-white/5 p-4 sticky top-0 z-50 shadow-lg">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-6">
              <span className="font-black text-2xl text-transparent bg-clip-text bg-gradient-to-r from-white to-pink-200 drop-shadow-sm tracking-tight">MEMEMASTER</span>
              
              <div className="hidden md:flex items-center gap-3">
                <span className="bg-zinc-800 border border-zinc-700 px-4 py-1.5 rounded-full text-sm text-zinc-300 font-bold shadow-inner">
                  סיבוב {gameState.roundsPlayed + 1}
                </span>
                {gameState.roomCode && (
                   <span className="bg-pink-500/20 border border-pink-500/30 px-4 py-1.5 rounded-full text-sm text-pink-200 font-bold shadow-[0_0_15px_rgba(236,72,153,0.3)]">
                      PIN: {gameState.roomCode}
                   </span>
                )}
              </div>
            </div>
            
            <div className="flex gap-2 overflow-x-auto pb-1 max-w-[50vw] items-center no-scrollbar">
              {gameState.players.map(p => (
                <div key={p.id} className="flex flex-col items-center mx-1 group cursor-default">
                  <div className={`p-1.5 rounded-xl ${p.avatar} shadow-md border-2 border-transparent group-hover:border-white transition-all transform group-hover:-translate-y-1`}>
                     <Icons.User className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-[10px] font-black mt-1 text-zinc-400 group-hover:text-white transition-colors">{p.score}</span>
                </div>
              ))}
            </div>
          </div>
        </header>
      )}

      {/* Main Content Area */}
      <main className="flex-1 p-6 md:p-10 max-w-7xl mx-auto w-full relative z-10">
        {gameState.phase === GamePhase.LOBBY && (
          <Lobby onStartGame={handleStartGame} />
        )}
        
        {gameState.phase === GamePhase.UPLOAD && (
          <UploadPhase onImageSelected={handleImageSelected} />
        )}
        
        {gameState.phase === GamePhase.CAPTIONING && gameState.currentImageBase64 && (
          <CaptioningPhase 
            imageSrc={gameState.currentImageBase64} 
            players={gameState.players}
            onSubmitCaptions={handleSubmitCaptions}
          />
        )}
        
        {gameState.phase === GamePhase.JUDGING && (
          <JudgingPhase personality={gameState.judgePersonality} />
        )}
        
        {gameState.phase === GamePhase.RESULTS && gameState.currentImageBase64 && (
          <ResultsPhase 
            imageSrc={gameState.currentImageBase64}
            results={gameState.judgments}
            players={gameState.players}
            onNextRound={handleNextRound}
          />
        )}
      </main>
      
      {/* Footer */}
      <footer className="p-8 text-center text-zinc-500 text-xs font-medium tracking-widest uppercase opacity-60">
        <p>Powered by Gemini 2.5 Flash • Created for the meme culture</p>
      </footer>
    </div>
  );
};

export default App;