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
import { doc, updateDoc, onSnapshot, arrayUnion, increment } from "firebase/firestore";
import { WinnerPhase } from './components/GamePhase/WinnerPhase';
import { SERVER_IP } from './constants';

/**
 * קומפוננטת האב המרכזית - App
 * מנהלת את הסטייט הגלובלי של המשחק, סנכרון הנתונים מול Firebase,
 * תקשורת מול שרת ה-Backend (פייתון/סוקטים), וניתוב בין שלבי המשחק השונים.
 */
const App: React.FC = () => {
  // הסטייט המרכזי של המשחק המחזיק את נתוני החדר, השחקנים, והשלב הנוכחי
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

  // סטייט מקומי לשמירת תמונת הסיבוב הנוכחי בפורמט Base64
  const [image, setImage] = useState<string | null>(null);
  // דגל המציין האם המארח סיים להעלות/להכין את תמונת הסיבוב
  const [hostFinishedUpload, setHostFinishedUpload] = useState(false);

  /**
   * עדכון שלב המשחק בסטייט המקומי
   * @param phase השלב החדש אליו עוברים
   */
  const updatePhase = (phase: GamePhase) => {
    setGameState(prev => ({ ...prev, phase }));
  };

  /**
   * אתחול ותחילת המשחק מתוך הלובי
   * מופעל על ידי מנהל החדר או בעת הצטרפות מאושרת.
   */
  const handleStartGame = async (
    players: Player[],
    personality: JudgePersonality,
    isHost: boolean,
    code: string,
    playerId?: string
  ) => {
    // שליחת איתות לשרת הסוקטים על תחילת המשחק
    await callViaSocket('START_GAME', { roomCode: code });
    
    // עדכון הסטייט המקומי לשלב ההעלאה (Upload)
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

  /**
   * שמירת תמונה שנבחרה/הועלתה בסטייט
   * @param base64 מחרוזת התמונה המקודדת
   */
  const handleImageSelected = (base64: string) => {
    setGameState(prev => ({
      ...prev,
      currentImageBase64: base64,
    }));
  };

  /**
   * מעבר משלב העלאת התמונה לשלב כתיבת הכיתובים (Captioning)
   * פונקציה זו מנהלת את הלוגיקה הדינמית בהתאם לתפקיד המשתמש (Host/Player)
   */
  const handleStartCaptioning = async () => {
    if (gameState.isHost && gameState.roomCode) {
      try {
        // 1. עדכון ה-Firebase ששלב ההעלאה של המארח הסתיים
        await updateDoc(doc(db, "games", gameState.roomCode), {
          status: 'HOST_FINISHED_UPLOAD'
        });
        setHostFinishedUpload(true);
        
        // 2. משיכת התמונה הבאה מהשרת המרכזי
        const response = await fetch(`http://${SERVER_IP}:4000/next_image/${gameState.roomCode}`);
        const data = await response.json();
        
        if (data.status === "game_over") {
          // טיפול במצב של סיום מוקדם או חוסר בתמונות
        } else {
          setImage(data.image);
        }
        
        setImage(data.image);
        updatePhase(GamePhase.CAPTIONING);
      } catch (e) {
        console.error("שגיאה בעדכון סטטוס מארח:", e);
      }
    } else {
      // שחקן רגיל פשוט מעדכן מקומית (הסנכרון האמיתי יקרה מה-Snapshot)
      updatePhase(GamePhase.CAPTIONING);
    }
  };

  /**
   * שליחת כל הכיתובים של השחקנים לשיפוט ה-AI של Gemini
   * מבוצע על ידי המארח בלבד בסיום איסוף התשובות.
   * @param submissions מערך הכיתובים שנאספו מכלל השחקנים
   */
  const handleSubmitCaptions = async (submissions: MemeSubmission[]) => {
    updatePhase(GamePhase.JUDGING);

    try {
      const imageToJudge = gameState.currentImageBase64 || image;
      if (!imageToJudge) throw new Error("No image found for judging");

      // קריאה לשירות Gemini המנתח את התמונה והטקסטים ומחזיר ציונים וביקורת
      const results = await judgeMemes(
        imageToJudge,
        submissions,
        gameState.players
      );

      // עדכון ציוני השחקנים במערך המקומי על בסיס תוצאות השיפוט
      const updatedPlayers = gameState.players.map(p => {
        const playerResult = results.find(r => r.playerId === p.id);
        return playerResult ? { ...p, score: p.score + playerResult.totalScore } : p;
      });

      // עדכון ה-Firebase בתוצאות החדשות ובסטטוס סיום השיפוט
      if (gameState.roomCode) {
        await updateDoc(doc(db, "games", gameState.roomCode), {
          players: updatedPlayers,
          status: 'JUDGING_FINISHED',
          results: results
        });
      }

      // מעבר לשלב הצגת התוצאות (Results Phase)
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

  /**
   * מעבר לסיבוב הבא במשחק
   * מושך תמונה חדשה מהשרת ומאפס את נתוני הסיבוב הקודם ב-Firebase ובסטייט
   */
  const handleNextRound = async () => {
    if (gameState.isHost && gameState.roomCode) {
      try {
        // פנייה לשרת לקבלת התמונה הבאה בתור
        const response = await fetch(`http://${SERVER_IP}:4000/next_image/${gameState.roomCode}`);
        const data = await response.json();

        // בדיקה האם הגענו לסוף מאגר התמונות והמשחק נגמר
        if (data.status === "game_over") {
          await updateDoc(doc(db, "games", gameState.roomCode), {
            status: "GAME_OVER"
          });

          setGameState(prev => ({
            ...prev,
            phase: GamePhase.LOBBY
          }));
          return;
        }

        if (data.image) {
          // עדכון ה-Firebase: ניקוי כיתובים, קידום מספר הסיבוב ושינוי הסטטוס
          await updateDoc(doc(db, "games", gameState.roomCode), {
            submissions: [],
            status: 'START_NEXT_ROUND',
            roundsPlayed: increment(1),
            lastImageUpdate: Date.now()
          });

          // עדכון הסטייט המקומי אצל המארח
          setImage(data.image);
          setHostFinishedUpload(true);
          
          setGameState(prev => ({
            ...prev,
            currentImageBase64: data.image,
            submissions: [],
            judgments: [],
            roundsPlayed: prev.roundsPlayed + 1,
            phase: GamePhase.CAPTIONING,
            players: prev.players, // שמירה על הניקוד המצטבר מהסיבובים הקודמים
            totalRounds: data.total_images,
          }));
          
          // השהייה קלה והעברת החדר למצב משחק פעיל (Playing)
          setTimeout(async () => {
            await updateDoc(doc(db, "games", gameState.roomCode!), {
              status: 'PLAYING'
            });
          }, 2000);
          return; 
        } else {
          // מנגנון הגנה למקרה שהתמונה ריקה - סיום המשחק
          await updateDoc(doc(db, "games", gameState.roomCode), {
            status: 'GAME_OVER'
          });
          
          setGameState(prev => ({
            ...prev,
            phase: GamePhase.GAME_OVER
          }));
        }
      } catch (e) {
        console.error("Error fetching next image:", e);
      }
    }

    // Fallback: איפוס ומניעת תקיעה במקרה של נפילת שרת או שגיאה חמורה
    setGameState(prev => ({
      ...prev,
      currentImageBase64: null,
      submissions: [],
      judgments: [],
      roundsPlayed: prev.roundsPlayed + 1,
      phase: GamePhase.UPLOAD,
      players: prev.players
    }));
    setImage(null);
    setHostFinishedUpload(false);
  };

  /**
   * פרוקסי לשליחת בקשות דרך שרת ה-Socket HTTP REST API
   */
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

  /**
   * useEffect מרכזי - מאזין לשינויים בזמן אמת (Realtime Snapshot) מול Firestore.
   * מסנכרן את כל השחקנים בחדר לפעולות המארח ולקצב התקדמות המשחק.
   */
  useEffect(() => {
    let unsubscribe = () => {};

    // האזנה פעילה תתבצע רק אם אנחנו מחוץ ללובי ויש קוד חדר תקין
    if (gameState.phase !== GamePhase.LOBBY && gameState.roomCode) {
      unsubscribe = onSnapshot(doc(db, "games", gameState.roomCode), async (docSnap) => {
        if (!docSnap.exists()) return;
        const data = docSnap.data();

        // בדיקה האם המשחק הגיע לסיומו
        if (data.status === "GAME_OVER") {
          setGameState(prev => ({ ...prev, phase: GamePhase.GAME_OVER }));
        }

        // 1. עדכון שוטף של רשימת השחקנים, הכיתובים שנשלחו ומספר הסיבוב הנוכחי
        setGameState(prev => ({
          ...prev,
          players: data.players || [],
          submissions: data.submissions || [],
          roundsPlayed: data.roundsPlayed !== undefined ? data.roundsPlayed : prev.roundsPlayed
        }));

        // 2. מעבר לשלב התוצאות ברגע שהמארח מסיים את תהליך השיפוט ב-Gemini
        if (data.status == 'JUDGING_FINISHED' && gameState.phase !== GamePhase.RESULTS) {
          if (gameState.isHost) {
            setGameState(prev => ({
              ...prev,
              judgments: data.results || [],
              phase: GamePhase.RESULTS
            }));
          } else { 
            setGameState(prev => ({
              ...prev,
              judgments: data.results || []
            }));
          }
        }

        // 3. לוגיקת מעבר שלב אוטומטית עבור שחקנים (Clients)
        const isStartingNextRound = data.status === 'START_NEXT_ROUND';
        const isFirstUpload = data.status === 'HOST_FINISHED_UPLOAD' && gameState.phase === GamePhase.UPLOAD;

        if (!gameState.isHost && (isStartingNextRound || isFirstUpload)) {
          try {
            // משיכת תמונת ה-Base64 העדכנית מהשרת עבור השחקנים
            if (gameState.phase !== GamePhase.CAPTIONING || isStartingNextRound) {
              const response = await fetch(`http://${SERVER_IP}:4000/image_base64/${gameState.roomCode}`);
              const imageData = await response.json();

              if (imageData.image) {
                setGameState(prev => ({
                  ...prev,
                  currentImageBase64: imageData.image,
                  phase: GamePhase.CAPTIONING,
                  submissions: [], // ניקוי הסטייט מנתוני הסיבוב הקודם
                  judgments: [],   
                  roundsPlayed: data.roundsPlayed || prev.roundsPlayed
                }));
                setHostFinishedUpload(true);
              }
            }
          } catch (e) {
            console.error("Failed to fetch image:", e);
          }
        }

        // 4. לוגיקת המארח: בדיקה אוטומטית האם כל השחקנים שלחו כיתובים על מנת להפעיל את השיפוט
        if (gameState.isHost && gameState.phase === GamePhase.CAPTIONING && 
            data.submissions?.length === gameState.players.length && gameState.players.length > 0) {
          
          const finalizedSubmissions = gameState.players.map(p =>
            data.submissions.find((s: any) => s.playerId === p.id)
          ).filter(Boolean);

          // אם כמות הכיתובים התקינים שווה בדיוק לכמות השחקנים - מפעילים את השיפוט
          if (finalizedSubmissions.length === gameState.players.length) {
            handleSubmitCaptions(finalizedSubmissions);
          }
        } 
      });
    }
    
    // ניקוי ההאזנה (Unsubscribe) בעת פירוק הקומפוננטה או שינוי דפנדנסיז
    return () => unsubscribe();
  }, [gameState.phase, gameState.roomCode, gameState.isHost, gameState.players.length]);

  /**
   * שליחת כיתוב בודד של שחקן ל-Firebase
   * @param caption הטקסט שהשחקן כתב עבור המם
   */
  const handleSubmitSingleCaption = async (caption: string) => {
    if (!gameState.roomCode || !gameState.currentPlayerId) return;
    updatePhase(GamePhase.JUDGING); // העברת השחקן למסך המתנה (שיפוט)
    try {
      // דחיפת הכיתוב למערך ה-submissions בתוך ה-Document ב-Firestore
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

  /**
   * סיום המשחק בצורה יזומה על ידי המארח
   */
  const handleGameEnd = async () => {
    if (gameState.roomCode) {
      try {
        await updateDoc(doc(db, "games", gameState.roomCode), {
          status: "GAME_OVER"
        });
        setGameState(prev => ({
          ...prev,
          phase: GamePhase.GAME_OVER
        }));
      } catch (e) {
        console.error("Error ending game:", e);
      }
    }
  };

  /**
   * איפוס מלא של החדר ב-DB ורענון האפליקציה למצב ראשוני
   */
  const handleRestart = async () => {
    if (gameState.isHost && gameState.roomCode) {
      try {
        // איפוס מוחלט של מסמך המשחק ב-Firebase לטובת שחקנים חדשים/חוזרים
        await updateDoc(doc(db, "games", gameState.roomCode), {
          status: 'LOBBY',
          players: [],
          submissions: [],
          roundsPlayed: 0,
          results: [],
          currentImageBase64: null 
        });
      } catch (e) {
        console.error("Error cleaning DB:", e);
      }
    }
    
    // ביצוע טעינה מחדש של הדף (Hard Reload) להבטחת ניקוי זיכרון וסטייט מקומי
    window.location.reload();
  };

  // משתני עזר לרינדור
  const finalImage = gameState.currentImageBase64 || image || "";
  const isLastRound = 
    gameState.totalRounds !== undefined &&
    gameState.roundsPlayed + 1 >= gameState.totalRounds;

  return (
    <div className="min-h-screen flex flex-col font-sans selection:bg-pink-500 selection:text-white">
      {/* Header הגלובלי - מוצג לאורך כל המשחק למעט בשלב הלובי ההתחלתי */}
      {gameState.phase !== GamePhase.LOBBY && (
        <header className="glass-panel border-b border-white/5 p-4 sticky top-0 z-50 shadow-lg">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-6">
              <span className="font-black text-2xl text-transparent bg-clip-text bg-gradient-to-r from-white to-pink-200 tracking-tight">MEMEMASTER</span>
              <div className="hidden md:flex items-center gap-3">
                <span className="bg-zinc-800 border border-zinc-700 px-4 py-1.5 rounded-full text-sm text-zinc-300 font-bold">
                  Round {gameState.roundsPlayed + 1}
                </span>
                {gameState.roomCode && (
                   <span className="bg-pink-500/20 border border-pink-500/30 px-4 py-1.5 rounded-full text-sm text-pink-200 font-bold">
                     PIN: {gameState.roomCode}
                   </span>
                )}
              </div>
            </div>
            {/* רשימת שחקנים קטנה עם הניקוד המעודכן שלהם בבר העליון */}
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

      {/* האזור המרכזי של האפליקציה - ניתוב שלבים (Routing) מבוסס תנאים */}
      <main className="flex-1 p-6 md:p-10 max-w-7xl mx-auto w-full relative z-10">
        
        {/* שלב 1: לובי */}
        {gameState.phase === GamePhase.LOBBY && (
          <Lobby onStartGame={handleStartGame} />
        )}
        
        {/* שלב 2: העלאת תמונה */}
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
                    {gameState.players.find(p => p.id === gameState.currentPlayerId)?.name || "Player"} is uploading...
                  </h1>
                  <p className="text-pink-200 mt-4 text-2xl font-bold"> The Host is making the memes...</p>
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
              
        {/* שלב 3: כתיבת כיתובים לתמונה (Captioning) */}
        {gameState.phase === GamePhase.CAPTIONING && (gameState.currentImageBase64 || image) && (
          gameState.isHost ? (
            /* מבט המארח - רואה את התמונה הגדולה ואת קצב התקדמות שליחת התשובות בזמן אמת */
            <div className="flex flex-col items-center justify-center space-y-8 animate-in fade-in">
              <h2 className="outfit-bold text-3xl font-black text-white italic"> Captions are being written</h2>
              <div className="relative flex flex-col items-center gap-6">
                  
                  <div className="relative group shadow-2xl shadow-pink-500/10">
                    <div className="absolute -inset-1 bg-gradient-to-r from-pink-500 to-purple-600 rounded-[2.5rem] blur opacity-30 group-hover:opacity-50 transition duration-1000"></div>
                    <img 
                      src={`data:image/jpeg;base64,${image}`} 
                      alt="Meme being captioned" 
                      className="relative max-w-4xl max-h-[70vh] rounded-[2.5rem] border-8 border-zinc-900 shadow-inner object-contain"
                    />
                  </div>

                  {/* בועת סטטוס המציגה כמה שחקנים מתוך הסך הכל כבר הגישו תשובה */}
                  <div className="flex items-center gap-4 bg-zinc-900 border-2 border-pink-500/30 px-8 py-4 rounded-full shadow-lg transform hover:scale-105 transition-transform duration-300">
                    <div className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-pink-500"></span>
                    </div>
                    <span className="text-white text-xl font-black uppercase tracking-wider">
                      Waiting for captions
                    </span>
                    <span className="text-pink-300 text-xl font-bold">
                      ({gameState.submissions.length} / {gameState.players.length})
                    </span>
                  </div>
                  
              </div>
            </div>
          ) : (
            /* מבט השחקן - מזין את הכיתוב שלו למם */
            <CaptioningPhase 
              playerId={gameState.currentPlayerId!}
              playerName={gameState.players.find(p => p.id === gameState.currentPlayerId)?.name || ""}
              onSubmitCaption={handleSubmitSingleCaption} 
              imageSrc={''}
            />
          )
        )}

        {/* שלב 4: שיפוט ה-AI (Judging) */}
        {gameState.phase === GamePhase.JUDGING && (
          gameState.isHost ? (
            <JudgingPhase />
          ) : (
            gameState.judgments.length > 0 ? (
              /* שחקן שקיבל כבר את התוצאות מונחה להביט במסך הראשי של ההוסט */
              <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-8 animate-in fade-in zoom-in duration-500">
                <div className="relative">
                  <div className="absolute -inset-4 bg-pink-500 blur-2xl opacity-20 animate-pulse rounded-full"></div>
                  <Icons.Trophy className="w-24 h-24 text-yellow-400 relative z-10 mx-auto" />
                </div>
                <div className="space-y-4">
                  <h2 className="outfit-bold text-5xl font-black text-white italic tracking-tight">
                    Results on the Screen!
                  </h2>
                  <p className="outfit-medium text-pink-200 text-xl font-bold opacity-80">
                    Take a look at the main screen to see who won the round...
                  </p>
                </div>
                <div className="flex gap-2 justify-center">
                  <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce"></div>
                </div>
              </div>
            ) : (
              <JudgingPhase />
            )
          )
        )}
        
        {/* שלב 5: הצגת תוצאות הסיבוב (Results) */}
        {gameState.phase === GamePhase.RESULTS && (gameState.currentImageBase64 || image) && (
          <ResultsPhase 
            imageSrc={
              finalImage.startsWith('data:') 
                ? finalImage 
                : `data:image/jpeg;base64,${finalImage}`
            }
            results={gameState.judgments}
            players={gameState.players}
            submissions={gameState.submissions}
            onNextRound={handleNextRound}
            isLastRound={isLastRound}
            onGameEnd={handleGameEnd}
          />
        )}

        {/* שלב 6: סיום המשחק והכרזת המנצח הכללי (Game Over) */}
        {gameState.phase === GamePhase.GAME_OVER && (
          <WinnerPhase 
            players={gameState.players}
            isHost={gameState.isHost} 
            currentPlayerId={gameState.currentPlayerId} 
            onRestart={handleRestart} 
            roomCode={gameState.roomCode!}
          />
        )}
      </main>
    </div>
  );
}

export default App;