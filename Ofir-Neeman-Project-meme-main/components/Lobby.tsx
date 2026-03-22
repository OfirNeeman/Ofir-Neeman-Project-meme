import React, { useState, useEffect } from 'react';
import { JudgePersonality, Player, GameState } from '../types';
import {MIN_PLAYERS } from '../constants';
import { Button } from './ui/Button';
import { Icons } from './ui/Icons';
import { db } from '../firebase'; 
import { doc, setDoc, onSnapshot, updateDoc, arrayUnion, getDoc } from "firebase/firestore";

interface LobbyProps {
  onStartGame: (players: Player[], personality: JudgePersonality, isHost: boolean, roomCode: string, playerId?: string) => void;
}

type LobbyMode = 'MENU' | 'HOST' | 'JOIN' | 'WAITING';

export const Lobby: React.FC<LobbyProps> = ({ onStartGame }) => {
  const [mode, setMode] = useState<LobbyMode>('MENU');
  const [roomCode, setRoomCode] = useState<string>('');
  const [inputCode, setInputCode] = useState<string>('');
  const [playerName, setPlayerName] = useState<string>('');
  const [players, setPlayers] = useState<Player[]>([]);
  const [personality, setPersonality] = useState<JudgePersonality>(JudgePersonality.ROASTER);
  const [joined, setJoined] = useState(false);
  const [localPlayerId, setLocalPlayerId] = useState<string | null>(null);

  const colors = [
    'bg-pink-500', 'bg-rose-500', 'bg-fuchsia-500', 'bg-purple-500', 
    'bg-violet-500', 'bg-indigo-500', 'bg-blue-500', 'bg-cyan-500'
  ];
  const maxLength = 8;

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const value = e.target.value;
  if (value.length <= maxLength) {
    setPlayerName(value);
  }
};
  useEffect(() => {
    let unsubscribe = () => {};
    
    // קביעת הקוד הפעיל בהתאם לתפקיד המשתמש (מארח או שחקן)
    const activeCode = mode === 'HOST' ? roomCode : inputCode.toUpperCase();

    if (activeCode && activeCode.length === 5) {
      // האזנה לשינויים במסמך המשחק ב-Firebase
      unsubscribe = onSnapshot(doc(db, "games", activeCode), (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          
          // עדכון רשימת השחקנים שכולם יראו מי הצטרף לחדר
          setPlayers(data.players || []);

          // בדיקה עבור שחקנים שממתינים: האם המארח התחיל את המשחק?
          // אם הסטטוס הוא 'STARTING', הפונקציה onStartGame תעביר את האפליקציה לשלב ה-UPLOAD
          if (mode === 'WAITING' && data.status === 'STARTING') {
            onStartGame(data.players, data.personality, false, activeCode, localPlayerId || undefined);
          }
        }
      });
    }

    // ניקוי המאזין כשהקומפוננטה נסגרת
    return () => unsubscribe();
  }, [roomCode, inputCode, mode, onStartGame, localPlayerId]);

  const generateRoomCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 5; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const handleCreateGame = async () => {
    const newCode = generateRoomCode();
    setRoomCode(newCode);
    setMode('HOST');
    
    try {
      // 1. יצירת המשחק ב-Firebase (הקוד הקיים שלך)
      await setDoc(doc(db, "games", newCode), {
        status: 'LOBBY',
        players: [],
        personality: personality,
        createdAt: new Date(),
        roundsPlayed: 0,
        isHost: true
      });

      // 2. השלב החדש: יצירת תיקייה בשרת הפייתון
      const SERVER_IP = "192.168.1.149"; // וודא שזה ה-IP הנכון של המחשב שמריץ פייתון
      await fetch(`https://${SERVER_IP}:4000/create-room-dir`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ roomCode: newCode }),
      });

    } catch (e) {
      console.error("שגיאה ביצירת חדר או תיקייה:", e);
    }
  };

const handleJoinGame = async () => {
  if (!inputCode || !playerName) return;

  const roomRef = doc(db, "games", inputCode.toUpperCase());
  
  try {
    // משיכת נתוני החדר הנוכחיים כדי לבדוק את רשימת השחקנים
    const docSnap = await getDoc(roomRef);
    
    if (!docSnap.exists()) {
      alert("חדר לא נמצא!");
      return;
    }

    const currentPlayers = docSnap.data().players || [];
    
    // בדיקה האם קיים כבר שחקן עם אותו שם (תוך התעלמות מרישיות ורווחים מיותרים)
    const isNameTaken = currentPlayers.some(
      (p: Player) => p.name.trim().toLowerCase() === playerName.trim().toLowerCase()
    );

    if (isNameTaken) {
      alert("השם הזה כבר תפוס בחדר, בחר שם אחר!");
      return;
    }

    const avatar = colors[Math.floor(Math.random() * colors.length)];
    const newId = crypto.randomUUID(); 
    const newPlayer = { id: newId, name: playerName.trim(), score: 0, avatar: avatar };
    await updateDoc(roomRef, {
      players: arrayUnion(newPlayer)
    });
    
    setMode('WAITING');
    setLocalPlayerId(newId); // שמירת ה-ID של השחקן המקומי
    setJoined(true);
  } catch (e) {
    console.error(e);
    alert("שגיאה בחיבור לחדר");
  }
};

const handleStart = async () => {
  if (players.length >= MIN_PLAYERS) {
    await updateDoc(doc(db, "games", roomCode), {
      status: 'STARTING',
      personality: personality
    });
    // העברת roomCode כארגומנט רביעי
    onStartGame(players, personality, true, roomCode);
  } else {
    alert(`צריך לפחות ${MIN_PLAYERS} שחקנים כדי להתחיל!`);
  }
};

  const renderJudgeIcon = (type: JudgePersonality) => {
    switch (type) {
      case JudgePersonality.ROASTER: return <Icons.Flame className="w-8 h-8 text-orange-400" />;
      case JudgePersonality.GRANDMA: return <Icons.Glasses className="w-8 h-8 text-teal-300" />;
      case JudgePersonality.GEN_Z: return <Icons.Sparkles className="w-8 h-8 text-yellow-300" />;
    }
  };

  if (mode === 'MENU') {
  return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 animate-fade-in relative z-10">
        <div className="text-center mb-12 md:mb-16 relative">
          <div className="absolute -inset-10 bg-pink-500 blur-[100px] opacity-20 rounded-full animate-pulse"></div>
          {/* הקטנת הפונט במובייל - text-5xl במקום text-8xl */}
          <h1 className="relative text-5xl md:text-8xl font-black text-white drop-shadow-2xl transform -rotate-2 leading-none">
            MEME<span className="text-pink-500">MASTER</span>
          </h1>
          <p className="text-xl md:text-3xl text-pink-200 font-bold tracking-widest mt-4 uppercase">AI Party Game</p>
        </div>

        {/* Grid שהופך לטור אחד במובייל (grid-cols-1) ושני טורים במחשב (md:grid-cols-2) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 w-full max-w-4xl">
          <div 
            onClick={handleCreateGame} 
            className="cursor-pointer group glass-panel p-6 md:p-8 rounded-3xl border-2 border-white/10 hover:border-pink-500 hover:bg-pink-500/10 transition-all flex flex-row md:flex-col items-center gap-4 md:gap-0 text-right md:text-center"
          >
            <div className="bg-pink-500 rounded-2xl md:rounded-full p-4 md:p-6 md:mb-6 shadow-xl">
              <Icons.Brain className="w-8 h-8 md:w-12 md:h-12 text-white" />
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-black text-white">HOST GAME</h2>
              <p className="text-pink-200 text-sm md:text-base opacity-80">צור חדר והקרן על המסך</p>
            </div>
          </div>

          <div 
            onClick={() => setMode('JOIN')} 
            className="cursor-pointer group glass-panel p-6 md:p-8 rounded-3xl border-2 border-white/10 hover:border-cyan-500 hover:bg-cyan-500/10 transition-all flex flex-row md:flex-col items-center gap-4 md:gap-0 text-right md:text-center"
          >
            <div className="bg-cyan-500 rounded-2xl md:rounded-full p-4 md:p-6 md:mb-6 shadow-xl">
              <Icons.User className="w-8 h-8 md:w-12 md:h-12 text-white" />
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-black text-white">JOIN GAME</h2>
              <p className="text-pink-200 text-sm md:text-base opacity-80">הצטרף מהטלפון שלך</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

if (mode === 'JOIN' || mode === 'WAITING') {
  return (
    <div className="flex flex-col items-center justify-start md:justify-center min-h-screen md:min-h-[60vh] max-w-md mx-auto pt-8 md:pt-0 px-4 relative z-10">
      <div className="glass-panel p-6 md:p-10 rounded-[2rem] md:rounded-[2.5rem] shadow-2xl w-full text-center space-y-6 md:space-y-8 border-2 border-white/10">
        {!joined ? (
          <>
            <h2 className="text-3xl md:text-4xl font-black text-white italic">מוכנים?</h2>
            <div className="space-y-4 md:space-y-6">
              <input 
                type="text" 
                placeholder="קוד חדר" 
                value={inputCode} 
                onChange={(e) => setInputCode(e.target.value.toUpperCase())} 
                className="w-full bg-zinc-950/50 border-2 border-zinc-700 rounded-2xl px-4 py-4 md:py-5 text-center text-3xl font-black uppercase text-white focus:border-pink-500 outline-none transition-colors" 
                maxLength={5} 
              />
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="כינוי" 
                  value={playerName} 
                  onChange={handleNameChange} 
                  className="w-full bg-zinc-950/50 border-2 border-zinc-700 rounded-2xl px-4 py-4 md:py-5 text-center text-xl md:text-2xl font-bold text-white focus:border-pink-500 outline-none transition-colors" 
                />
                <span className="absolute left-4 bottom-2 text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                  {playerName.length}/{maxLength}
                </span>
              </div>
            </div>
            <Button onClick={handleJoinGame} disabled={!inputCode || !playerName} size="xl" className="w-full py-6 text-xl shadow-lg shadow-pink-500/20">
              כניסה למשחק
            </Button>
          </>
        ) : (
          <div className="space-y-6 py-8">
            <div className="text-7xl md:text-8xl animate-bounce">🤘</div>
            <h2 className="text-3xl md:text-4xl font-black text-white italic">נרשמת בהצלחה!</h2>
            <p className="text-pink-200 text-lg">עכשיו רק נשאר לחכות שהמארח ילחץ על START</p>
            <div className="flex gap-2 justify-center pt-4">
              <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
              <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
              <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce"></div>
            </div>
          </div>
        )}
      </div>
      {!joined && (
        <button onClick={() => setMode('MENU')} className="mt-8 text-zinc-500 hover:text-white font-bold text-sm uppercase tracking-widest p-4">
           ← חזרה לתפריט
        </button>
      )}
    </div>
  );
}
  return (
    <div className="max-w-6xl mx-auto p-4 flex flex-col items-center relative z-10">
      <div className="bg-white text-zinc-950 px-16 py-6 rounded-full shadow-2xl border-4 border-pink-500 mb-16">
        <span className="text-xs font-black uppercase text-pink-600 mb-1 block text-center">Game PIN</span>
        <span className="text-7xl font-black tracking-widest font-mono">{roomCode}</span>
      </div>
      <div className="flex flex-col md:flex-row w-full gap-10">
        <div className="flex-1 glass-panel rounded-[2rem] p-8 border border-white/10">
          <h2 className="text-3xl font-black text-white mb-8">שחקנים ({players.length})</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {players.map((p) => (
              <div key={p.id} className="bg-zinc-800 p-3 rounded-2xl flex items-center gap-3">
                <div className={`p-2 rounded-xl ${p.avatar}`}><Icons.User className="w-5 h-5 text-white" /></div>
                <span className="font-bold text-white truncate">{p.name}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="w-full md:w-96 space-y-6">
          <Button onClick={handleStart} size="xl" className="w-full" disabled={players.length < MIN_PLAYERS}>העלו תמונות</Button>
          <div className="text-center pt-2">
            <button onClick={() => setMode('MENU')} className="text-zinc-500 hover:text-white font-bold text-sm uppercase tracking-widest transition-colors">
               ביטול ויציאה
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};