import React, { useState, useEffect } from 'react';
import { GameState, GamePhase, Player, JudgePersonality, MemeSubmission } from './types';
import { Lobby } from './components/Lobby';
import UploadPhase from './components/GamePhase/UploadPhase';
import { CaptioningPhase } from './components/GamePhase/CaptioningPhase';
import { JudgingPhase } from './components/GamePhase/JudgingPhase';
import { ResultsPhase } from './components/GamePhase/ResultsPhase';
import { judgeMemes } from './services/geminiService';
import { Icons } from './components/ui/Icons';
import { db } from './firebase';
import { doc, updateDoc, onSnapshot, arrayUnion } from "firebase/firestore";

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
    currentPlayerId: null,
  });

  const [image, setImage] = useState<string | null>(null);
  const [hostFinishedUpload, setHostFinishedUpload] = useState(false);

  const updatePhase = (phase: GamePhase) => {
    setGameState(prev => ({ ...prev, phase }));
  };

  const handleStartGame = async (
    players: Player[],
    personality: JudgePersonality,
    isHost: boolean,
    code: string,
    playerId?: string
  ) => {
    await callViaSocket('START_GAME', { roomCode: code });
    setGameState(prev => ({
      ...prev,
      players,
      judgePersonality: personality,
      phase: GamePhase.UPLOAD,
      isHost,
      roomCode: code,
      currentPlayerId: playerId || prev.currentPlayerId
    }));
  };

  const handleImageSelected = (base64: string) => {
    setGameState(prev => ({
      ...prev,
      currentImageBase64: base64,
    }));
  };

  const handleStartCaptioning = async () => {
    if (gameState.isHost && gameState.roomCode) {
      try {
        const SERVER_IP = "192.168.1.149";
        await updateDoc(doc(db, "games", gameState.roomCode), {
          status: 'HOST_FINISHED_UPLOAD'
        });
        setHostFinishedUpload(true);
        const response = await fetch(`http://${SERVER_IP}:4000/image_base64/${gameState.roomCode}`);
        const data = await response.json();
        setImage(data.image);
        updatePhase(GamePhase.CAPTIONING);
      } catch (e) {
        console.error("שגיאה בעדכון סטטוס מארח:", e);
      }
    } else {
      updatePhase(GamePhase.CAPTIONING);
    }
  };

  const handleSubmitCaptions = async (submissions: MemeSubmission[]) => {
    updatePhase(GamePhase.JUDGING);

    try {
      const imageToJudge = gameState.currentImageBase64 || image;
      if (!imageToJudge) throw new Error("No image found for judging");

      const results = await judgeMemes(
        imageToJudge,
        submissions,
        gameState.players
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
      alert("אירעה שגיאה בשיפוט ה-AI.");
      updatePhase(GamePhase.LOBBY);
    }
  };

const handleNextRound = async () => {
  if (gameState.isHost && gameState.roomCode) {
    try {
      const SERVER_IP = "192.168.1.149";
      
      // משוך את התמונה הבאה מהשרת
      const response = await fetch(`http://${SERVER_IP}:4000/next_image/${gameState.roomCode}`);
      const data = await response.json();

      if (data.image) {
        // עדכון ה-DB: אנחנו מעדכנים ל-HOST_FINISHED_UPLOAD כדי שכולם יראו את התמונה מיד
        await updateDoc(doc(db, "games", gameState.roomCode), {
          submissions: [],
          judgments: [],
          status: 'HOST_FINISHED_UPLOAD' 
        });

        // שמירת התמונה החדשה ב-State
        setImage(data.image);
        setHostFinishedUpload(true); // המארח סיים "להעלות" (כי התמונה הגיעה מהשרת)
        updatePhase(GamePhase.CAPTIONING); // מעבר ישיר לשלב הכתיבה
        
        return; // יוצאים מהפונקציה כדי לא להמשיך לאיפוס למטה
      }
    } catch (e) {
      console.error("Error fetching next image:", e);
    }
  }

  // Fallback למקרה שמשהו נכשל או אם זה לא המארח
  setGameState(prev => ({
    ...prev,
    currentImageBase64: null,
    submissions: [],
    judgments: [],
    roundsPlayed: prev.roundsPlayed + 1,
    phase: GamePhase.UPLOAD
  }));
  setImage(null);
  setHostFinishedUpload(false);
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

    if (gameState.phase !== GamePhase.LOBBY && gameState.roomCode) {
      unsubscribe = onSnapshot(doc(db, "games", gameState.roomCode), async (docSnap) => {
        if (!docSnap.exists()) return;
        const data = docSnap.data();
        setGameState(prev => ({
        ...prev,
        players: data.players || [],
        submissions: data.submissions || [] // זה מה שיגרום לכיתובים להופיע!
      }));

        // מעבר שלב לשחקנים
        if (data.status === 'HOST_FINISHED_UPLOAD' && !gameState.isHost && gameState.phase === GamePhase.UPLOAD) {
          try {
            const SERVER_IP = "192.168.1.149";
            const response = await fetch(`http://${SERVER_IP}:4000/image_base64/${gameState.roomCode}`);
            const imageData = await response.json();
            setGameState(prev => ({
              ...prev,
              currentImageBase64: imageData.image,
              phase: GamePhase.CAPTIONING
            }));
            setHostFinishedUpload(true);
          } catch (e) { console.error(e); }
        }

        // לוגיקת המארח - בדיקה שכולם שלחו (פעם אחת בלבד)
        if (gameState.isHost && gameState.phase === GamePhase.CAPTIONING && data.submissions?.length === gameState.players.length) {
          const finalizedSubmissions = gameState.players.map(p =>
            data.submissions.find((s: any) => s.playerId === p.id)
          ).filter(Boolean);

          handleSubmitCaptions(finalizedSubmissions);
        }
      });
    }
    return () => unsubscribe();
  }, [gameState.phase, gameState.roomCode, gameState.isHost, gameState.players.length]);

  const handleSubmitSingleCaption = async (caption: string) => {
    if (!gameState.roomCode || !gameState.currentPlayerId) return;
    updatePhase(GamePhase.JUDGING);
    try {
      await updateDoc(doc(db, "games", gameState.roomCode), {
        submissions: arrayUnion({
          playerId: gameState.currentPlayerId,
          caption: caption
        })
      });
    } catch (e) {
      console.error(e);
      alert("שגיאה בשליחה");
      updatePhase(GamePhase.CAPTIONING);
    }
  };

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
                <div className="text-center space-y-6">
                  <h2 className="text-2xl font-bold text-white">התמונה עלתה בהצלחה!</h2>
                  <img
                    src={`data:image/jpeg;base64,${image}`}
                    alt="uploaded meme"
                    className="max-w-lg rounded-xl shadow-lg border-4 border-pink-500"
                  />
                  <p className="text-zinc-400">המתן שכל השחקנים יצטרפו לשלב הכתיבה...</p>
                </div>
              ) : (
                <div className="text-center">
                  <h1 className="text-6xl font-bold text-white">
                    {gameState.players.find(p => p.id === gameState.currentPlayerId)?.name || "שחקן"}
                  </h1>
                  <p className="text-pink-200 mt-4 text-2xl font-bold">המארח מכין את הממים... ⏳</p>
                </div>
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
              
        {gameState.phase === GamePhase.CAPTIONING && (gameState.currentImageBase64 || image) && (
          gameState.isHost ? (
    /* מה שהמארח רואה בזמן שהאחרים כותבים */
            <div className="flex flex-col items-center justify-center space-y-8 animate-in fade-in">
              <h2 className="text-3xl font-black text-white italic">השחקנים כותבים כרגע... 🔥</h2>
              <div className="relative group">
                <img 
                  src={`data:image/jpeg;base64,${image}`} 
                  alt="Meme being captioned" 
                  className="max-w-2xl rounded-[2rem] border-8 border-zinc-800 shadow-2xl"
                />
                <div className="absolute -bottom-4 -right-4 bg-pink-500 text-white px-6 py-2 rounded-full font-bold shadow-lg">
                  ממתין לכיתובים...
                </div>
              </div>
              <div className="flex gap-4">
                {/* אופציונלי: הצגת התקדמות השחקנים */}
                <p className="text-zinc-400 font-medium">הכיתובים יופיעו כאן ברגע שכולם יסיימו.</p>
              </div>
            </div>
          ) : (
          <CaptioningPhase 
            imageSrc={gameState.isHost ? `data:image/jpeg;base64,${image}` : (gameState.currentImageBase64 || "")} 
            playerId={gameState.currentPlayerId!} 
            playerName={gameState.players.find(p => p.id === gameState.currentPlayerId)?.name || ""}
            onSubmitCaption={handleSubmitSingleCaption}
          />
          )
        )}
        
        {gameState.phase === GamePhase.JUDGING && (
          <JudgingPhase/>
        )}
        
        {gameState.phase === GamePhase.RESULTS && (gameState.currentImageBase64 || image) && (
          <ResultsPhase 
            imageSrc={gameState.currentImageBase64 || `data:image/jpeg;base64,${image}`}
            results={gameState.judgments}
            players={gameState.players}
            submissions={gameState.submissions}
            onNextRound={handleNextRound}
          />
        )}
      </main>
    </div>
  );
}
export default App;