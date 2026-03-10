import React, { useState } from 'react';
import { GameState, GamePhase, Player, JudgePersonality, MemeSubmission } from './types';
import { Lobby } from './components/Lobby';
import UploadPhase from './components/GamePhase/UploadPhase';
import { CaptioningPhase } from './components/GamePhase/CaptioningPhase';
import { JudgingPhase } from './components/GamePhase/JudgingPhase';
import { ResultsPhase } from './components/GamePhase/ResultsPhase';
import { judgeMemes } from './services/geminiService';
import { Icons } from './components/ui/Icons';
import { useEffect } from 'react';
import { db } from './firebase'; 
import { doc, updateDoc, onSnapshot } from "firebase/firestore"; // הוסף את אלו

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>({
    phase: GamePhase.LOBBY,
    players: [],
    judgePersonality: JudgePersonality.ROASTER,
    currentImageBase64: null,
    submissions: [],
    judgments: [],
    roundsPlayed: 0,
    roomCode: null, // כאן נשמור את הקוד
    isHost: false,
  });

  const [hostFinishedUpload, setHostFinishedUpload] = useState(false);

  const updatePhase = (phase: GamePhase) => {
    setGameState(prev => ({ ...prev, phase }));
  };

  // --- תיקון 1: קבלת roomCode מהלובי ---
  const handleStartGame = async (players: any, personality: any, isHost: boolean, code: string) => {
  // שליחת הודעה דרך הסוקט שהמשחק התחיל
    await callViaSocket('START_GAME', { roomCode: code });
    
    setGameState(prev => ({
        ...prev,
        players,
        judgePersonality: personality,
        phase: GamePhase.UPLOAD,
        isHost,
        roomCode: code // שמירת הקוד ב-State הכללי
      }));
    };

  const handleImageSelected = (base64: string) => {
    setGameState(prev => ({
      ...prev,
      currentImageBase64: base64,
    }));
  };

// בתוך App.tsx
  const handleStartCaptioning = async () => {
    if (gameState.isHost && gameState.roomCode) {
      try {
        // מעדכנים את Firebase - זה יגרום ל-useEffect של כולם "לקפוץ"
        await updateDoc(doc(db, "games", gameState.roomCode), {
          status: 'HOST_FINISHED_UPLOAD'
        });
        // למארח עצמו אנחנו מעדכנים גם מקומית ליתר ביטחון
        setHostFinishedUpload(true);
      } catch (e) {
        console.error("שגיאה בעדכון סטטוס מארח:", e);
      }
    } else {
      updatePhase(GamePhase.CAPTIONING);
    }
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
    setHostFinishedUpload(false); // איפוס המצב לסיבוב הבא
  };

  const callViaSocket = async (action: string, data: any) => {
  try {
    const response = await fetch('http://localhost:4001/proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...data })
    });
    return await response.json();
  } catch (e) {
    console.error("Socket Proxy Error:", e);
  }
};

useEffect(() => {
  let unsubscribe = () => {};

  // מאזינים לשינויים בחדר רק אם המשחק התחיל ויש קוד חדר
  if (gameState.phase !== GamePhase.LOBBY && gameState.roomCode) {
    unsubscribe = onSnapshot(doc(db, "games", gameState.roomCode), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        // אם הסטטוס השתנה לזה שהמארח סיים - כולם מעדכנים את ה-State המקומי
        if (data.status === 'HOST_FINISHED_UPLOAD') {
          setHostFinishedUpload(true);
        }
      }
    });
  }

  return () => unsubscribe();
}, [gameState.phase, gameState.roomCode]);

  return (
    <div className="min-h-screen flex flex-col font-sans selection:bg-pink-500 selection:text-white">
      {gameState.phase !== GamePhase.LOBBY && (
        <header className="glass-panel border-b border-white/5 p-4 sticky top-0 z-50 shadow-lg">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-6">
              <span className="font-black text-2xl text-transparent bg-clip-text bg-gradient-to-r from-white to-pink-200 tracking-tight">MEMEMASTER</span>
              <div className="hidden md:flex items-center gap-3">
                <span className="bg-zinc-800 border border-zinc-700 px-4 py-1.5 rounded-full text-sm text-zinc-300 font-bold">
                  סיבוב {gameState.roundsPlayed + 1}
                </span>
                {gameState.roomCode && (
                   <span className="bg-pink-500/20 border border-pink-500/30 px-4 py-1.5 rounded-full text-sm text-pink-200 font-bold">
                     PIN: {gameState.roomCode}
                   </span>
                )}
              </div>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 max-w-[50vw] items-center no-scrollbar">
              {gameState.players.map(p => (
                <div key={p.id} className="flex flex-col items-center mx-1 group cursor-default">
                  <div className={`p-1.5 rounded-xl ${p.avatar} shadow-md border-2 border-transparent group-hover:border-white transition-all`}>
                     <Icons.User className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-[10px] font-black mt-1 text-zinc-400 group-hover:text-white">{p.score}</span>
                </div>
              ))}
            </div>
          </div>
        </header>
      )}

      <main className="flex-1 p-6 md:p-10 max-w-7xl mx-auto w-full relative z-10">
        {gameState.phase === GamePhase.LOBBY && (
          <Lobby onStartGame={handleStartGame} />
        )}
        
        {gameState.phase === GamePhase.UPLOAD && (
          hostFinishedUpload ? (
            <div className="flex flex-col items-center justify-center min-h-[400px]">
              {gameState.isHost ? (
                <h1 className="text-6xl font-bold text-white animate-bounce">שלום</h1>
              ) : (
                <h1 className="text-6xl font-bold text-white animate-pulse">להתראות</h1>
              )}
            </div>
          ) : (
            <UploadPhase 
              roomCode={gameState.roomCode || ""} 
              onUploadComplete={handleImageSelected} 
              isHost={gameState.isHost}
              onStartGame={handleStartCaptioning}
            />
          )
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
    </div>
  );
};

export default App;