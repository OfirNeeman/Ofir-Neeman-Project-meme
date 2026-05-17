import React, { useState, useEffect } from 'react';
import { JudgePersonality, Player } from '../types';
import { MIN_PLAYERS, SERVER_IP } from '../constants';
import { Button } from './ui/Button';
import { Icons } from './ui/Icons';
import { db } from '../firebase'; 
import { doc, setDoc, onSnapshot, updateDoc, arrayUnion, getDoc } from "firebase/firestore";

interface LobbyProps {
  /** פונקציית מעבר שלב שמופעלת כשהמשחק מתחיל בפועל */
  onStartGame: (players: Player[], personality: JudgePersonality, isHost: boolean, roomCode: string, playerId?: string) => void;
}

// מצבי התצוגה השונים של הלובי (מכונת מצבים חזותית)
type LobbyMode = 'MENU' | 'HOST' | 'JOIN' | 'WAITING';

export const Lobby: React.FC<LobbyProps> = ({ onStartGame }) => {
  // --- ניהול מצבי תצוגה וממשק ---
  const [mode, setMode] = useState<LobbyMode>('MENU');
  const [roomCode, setRoomCode] = useState<string>('');
  const [inputCode, setInputCode] = useState<string>('');
  const [playerName, setPlayerName] = useState<string>('');
  const [players, setPlayers] = useState<Player[]>([]);
  const [personality] = useState<JudgePersonality>(JudgePersonality.ROASTER);
  const [joined, setJoined] = useState(false);
  const [localPlayerId, setLocalPlayerId] = useState<string | null>(null);
  
  // --- ניהול סיסמאות ואבטחה ---
  const [roomPassword, setRoomPassword] = useState<string>(''); // מוצג למארח
  const [inputPassword, setInputPassword] = useState<string>(''); // מוזן ע"י שחקן
  const [showPassword, setShowPassword] = useState(false);

  // עיצובים אקראיים לאווטארים של השחקנים
  const colors = [
    'bg-pink-500', 'bg-rose-500', 'bg-fuchsia-500', 'bg-purple-500', 
    'bg-violet-500', 'bg-indigo-500', 'bg-blue-500', 'bg-cyan-500'
  ];
  const maxLength = 8; // הגבלת אורך שם שחקן

  /**
   * מייצרת סיסמה אקראית ומורכבת המשלבת אותיות גדולות, קטנות ומספרים.
   */
  const generateComplexPassword = (length: number): string => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'; 
    let password = '';
    for (let i = 0; i < length; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  /**
   * מייצרת קוד חדר ייחודי (PIN) בן 5 תווים המורכב מאותיות ומספרים.
   */
  const generateRoomCode = (): string => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 5; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  /**
   * מאבטח הגזמת אורך שם השחקן בזמן הקלדה.
   */
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value.length <= maxLength) {
      setPlayerName(value);
    }
  };

  // ==========================================
  // האזנה בזמן אמת לשינויים בחדר (Firebase)
  // ==========================================
  useEffect(() => {
    let unsubscribe = () => {};
    
    // שליפת הקוד הרלוונטי בהתאם לשאלה אם המשתמש הוא Host או שחקן שמנסה להצטרף
    const activeCode = mode === 'HOST' ? roomCode : inputCode.toUpperCase();

    if (activeCode && activeCode.length === 5) {
      // יצירת מאזין (onSnapshot) שמקבל עדכונים מיידיים מ-Firestore על החדר הזה
      unsubscribe = onSnapshot(doc(db, "games", activeCode), (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          
          // עדכון רשימת השחקנים המוצגת בלובי בזמן אמת
          setPlayers(data.players || []);

          // עבור שחקנים ממתינים: אם סטטוס החדר השתנה ל-'STARTING', סימן שהמארח התחיל את המשחק
          if (mode === 'WAITING' && data.status === 'STARTING') {
            onStartGame(data.players, data.personality, false, activeCode, localPlayerId || undefined);
          }
        }
      });
    }

    // פונקציית ניקוי (Cleanup) - מנתקת את ההאזנה ל-Firebase כשהקומפוננטה נסגרת או משתנה
    return () => unsubscribe();
  }, [roomCode, inputCode, mode, onStartGame, localPlayerId]);

  // ==========================================
  // לוגיקת יצירת משחק חדש (Host)
  // ==========================================
  const handleCreateGame = async () => {
    const newCode = generateRoomCode();
    setRoomCode(newCode);
    
    const generatedPassword = generateComplexPassword(6); 
    setRoomPassword(generatedPassword);

    try {
      // 1. שליחת הסיסמה לשרת הפייתון כדי לקבל גרסת גיבוב (Hash) מאובטחת
      const res = await fetch(`http://${SERVER_IP}:4000/hash-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: generatedPassword })
      });
      const { hash: hashedPassword } = await res.json();
      
      setMode('HOST');
      
      // 2. שמירת רשומת החדר החדשה ב-Firebase Firestore
      await setDoc(doc(db, "games", newCode), {
        status: 'LOBBY',
        players: [],
        personality: personality,
        createdAt: new Date(),
        roundsPlayed: 0,
        password: hashedPassword, // שמירת ה-hash ולא הסיסמה הגלויה!
        isHost: true
      });
      
      // 3. יצירת תיקיית העלאות פיזית בשרת הפייתון עבור קבצי ה-GIF והתמונות של החדר
      await fetch(`http://${SERVER_IP}:4000/create-room-dir`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomCode: newCode }),
      });

    } catch (e) {
      console.error("Error creating room or folder structure:", e);
    }
  };

  // ==========================================
  // לוגיקת הצטרפות למשחק קיים (Player)
  // ==========================================
  const handleJoinGame = async () => {
    if (!inputCode || !playerName || !inputPassword) {
      alert("Please fill in all fields");
      return;
    }

    const targetRoom = inputCode.toUpperCase();
    const roomRef = doc(db, "games", targetRoom);
    
    try {
      // משיכת נתוני החדר מ-Firebase לצורך אימות
      const docSnap = await getDoc(roomRef);
      
      if (!docSnap.exists()) {
        alert("Room not found!");
        return;
      }

      const data = docSnap.data();

      // שליחת סיסמת השחקן לשרת הפייתון כדי לוודא התאמה מול ה-Hash השמור
      const verifyRes = await fetch(`http://${SERVER_IP}:4000/verify-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: inputPassword, stored_hash: data.password })
      });
      const { match } = await verifyRes.json();

      if (data.password && !match) {
        alert("Incorrect password!");
        return;
      }

      const currentPlayers = data.players || [];
      
      // בדיקה למניעת כפל שמות (התעלמות מרווחים מיותרים ואותיות קטנות/גדולות)
      const isNameTaken = currentPlayers.some(
        (p: Player) => p.name.trim().toLowerCase() === playerName.trim().toLowerCase()
      );

      if (isNameTaken) {
        alert("The name is already taken in the room, please choose a different name!");
        return;
      }

      // יצירת שחקן חדש והוספתו למערך ב-Firebase
      const avatar = colors[Math.floor(Math.random() * colors.length)];
      const newId = crypto.randomUUID(); 
      const newPlayer = { id: newId, name: playerName.trim(), score: 0, avatar: avatar };
      
      await updateDoc(roomRef, {
        players: arrayUnion(newPlayer)
      });
      
      setMode('WAITING');
      setLocalPlayerId(newId); // שמירת מזהה השחקן המקומי בדפדפן
      setJoined(true);
    } catch (e) {
      console.error("Error joining game:", e);
      alert("Error joining the room. Please check the code and try again.");
    }
  };

  // ==========================================
  // תחילת המשחק (Host בלבד)
  // ==========================================
  const handleStart = async () => {
    if (players.length >= MIN_PLAYERS) {
      // עדכון הסטטוס ב-Firebase ל-'STARTING', מה שיקפיץ אוטומטית את כל השחקנים הממתינים
      await updateDoc(doc(db, "games", roomCode), {
        status: 'STARTING',
        personality: personality
      });
      
      // העברת המארח עצמו למסך המשחק
      onStartGame(players, personality, true, roomCode);
    } else {
      alert(`Need at least ${MIN_PLAYERS} players to start!`);
    }
  };

  // ==========================================
  // רינדור וממשק משתמש (UI Layouts)
  // ==========================================
  
  // --- תצוגה 1: מסך תפריט ראשי ---
  if (mode === 'MENU') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 animate-fade-in relative z-10">
        <div className="text-center mb-12 md:mb-16 relative">
          <div className="absolute -inset-10 bg-pink-500 blur-[100px] opacity-20 rounded-full animate-pulse"></div>
          <h1 className="relative text-5xl md:text-8xl font-black text-white drop-shadow-2xl transform -rotate-2 leading-none">
            MEME<span className="text-pink-500">MASTER</span>
          </h1>
          <p className="text-xl md:text-3xl text-pink-200 font-bold tracking-widest mt-4 uppercase">Meme Party Game</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 w-full max-w-4xl">
          {/* כפתור יצירת חדר */}
          <div 
            onClick={handleCreateGame} 
            className="cursor-pointer group glass-panel p-6 md:p-8 rounded-3xl border-2 border-white/10 hover:border-pink-500 hover:bg-pink-500/10 transition-all flex flex-row md:flex-col items-center gap-4 md:gap-0 text-right md:text-center"
          >
            <div className="bg-pink-500 rounded-2xl md:rounded-full p-4 md:p-6 md:mb-6 shadow-xl">
              <Icons.Brain className="w-8 h-8 md:w-12 md:h-12 text-white" />
            </div>
            <div>
              <h2 className="outfit-bold text-5xl text-white">HOST GAME</h2>
              <p className="outfit-medium text-pink-200 text-lg md:text-2xl opacity-80">Invite your friends to join</p>
            </div>
          </div>

          {/* כפתור הצטרפות לחדר קיים */}
          <div 
            onClick={() => setMode('JOIN')} 
            className="cursor-pointer group glass-panel p-6 md:p-8 rounded-3xl border-2 border-white/10 hover:border-cyan-500 hover:bg-cyan-500/10 transition-all flex flex-row md:flex-col items-center gap-4 md:gap-0 text-right md:text-center"
          >
            <div className="bg-cyan-500 rounded-2xl md:rounded-full p-4 md:p-6 md:mb-6 shadow-xl">
              <Icons.User className="w-8 h-8 md:w-12 md:h-12 text-white" />
            </div>
            <div>
              <h2 className="outfit-bold text-5xl text-white">JOIN GAME</h2>
              <p className="outfit-medium text-pink-200 text-lg md:text-2xl opacity-80">Join an existing game</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- תצוגה 2: מסך הצטרפות / מסך המתנה לשחקן ---
  if (mode === 'JOIN' || mode === 'WAITING') {
    return (
      <div className="flex flex-col items-center justify-start md:justify-center min-h-screen md:min-h-[60vh] max-w-md mx-auto pt-8 md:pt-0 px-4 relative z-10">
        <div className="glass-panel p-6 md:p-10 rounded-[2rem] md:rounded-[2.5rem] shadow-2xl w-full text-center space-y-6 md:space-y-8 border-2 border-white/10">
          {!joined ? (
            <>
              <h2 className="outfit-bold text-3xl md:text-4xl font-black text-white italic">Ready to join?</h2>
              <div className="space-y-4 md:space-y-6">
                <input 
                  type="text" 
                  placeholder="Room Code" 
                  value={inputCode} 
                  onChange={(e) => setInputCode(e.target.value.toUpperCase())} 
                  className="w-full bg-zinc-950/50 border-2 border-zinc-700 rounded-2xl px-4 py-4 md:py-5 text-center text-xl md:text-2xl font-bold text-white focus:border-pink-500 outline-none transition-colors" 
                  maxLength={5} 
                />
                
                {/* שדה הזנת סיסמה עם אפשרות חשיפה */}
                <div className="relative w-full">
                  <input 
                    type={showPassword ? "text" : "password"} 
                    placeholder="Enter Password" 
                    value={inputPassword} 
                    onChange={(e) => setInputPassword(e.target.value)} 
                    maxLength={6} 
                    className="w-full bg-zinc-950/50 border-2 border-zinc-700 rounded-2xl px-4 py-4 md:py-5 text-center text-xl md:text-2xl font-bold text-white focus:border-pink-500 outline-none transition-colors" 
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-pink-500 transition-colors"
                  >
                    {showPassword ? <Icons.EyeOff className="w-6 h-6" /> : <Icons.Eye className="w-6 h-6" />}
                  </button>
                </div>

                {/* שדה הזנת כינוי */}
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="Nickname" 
                    value={playerName} 
                    onChange={handleNameChange} 
                    className="w-full bg-zinc-950/50 border-2 border-zinc-700 rounded-2xl px-4 py-4 md:py-5 text-center text-xl md:text-2xl font-bold text-white focus:border-pink-500 outline-none transition-colors" 
                  />
                  <span className="absolute left-4 bottom-2 text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                    {playerName.length}/{maxLength}
                  </span>
                </div>
              </div>
              
              <Button onClick={handleJoinGame} disabled={!inputCode || !playerName || !inputPassword} size="xl" className="w-full py-6 text-xl shadow-lg shadow-pink-500/20">
                Join Game
              </Button>
            </>
          ) : (
            // מסך טעינה והמתנה לאחר שהצטרפת בהצלחה
            <div className="space-y-6 py-8">
              <div className="text-7xl md:text-8xl animate-bounce">🤘</div>
              <h2 className="outfit-medium text-3xl md:text-4xl font-black text-white italic">Successfully Joined</h2>
              <p className="outfit-medium text-pink-200 text-lg">Now you just need to wait for the host to press START</p>
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
             ← Back to Menu
          </button>
        )}
      </div>
    );
  }

  // --- תצוגה 3: מסך הלובי המרכזי של המארח (Host Screen) ---
  return (
    <div className="max-w-6xl mx-auto p-4 flex flex-col items-center relative z-10">
      {/* תצוגת ה-PIN של החדר והסיסמה הזמנית עבור החברים */}
      <div className="bg-white text-zinc-950 px-16 py-6 rounded-full shadow-2xl border-4 border-pink-500 mb-16 text-center">
        <span className="outfit-medium text-xs font-black uppercase text-pink-600 mb-1 block">Game PIN</span>
        <span className="outfit-bold text-7xl font-black tracking-widest font-mono">{roomCode}</span>
        <div className="mt-2 pt-2 border-t border-zinc-200 flex flex-col items-center">
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Room Password</span>
          <span className="outfit-bold text-xl font-black text-pink-600 font-mono tracking-wider italic">
            {roomPassword}
          </span>
        </div>
      </div>

      <div className="flex flex-col md:flex-row w-full gap-10">
        {/* רשימת שחקנים מחוברים בזמן אמת */}
        <div className="flex-1 glass-panel rounded-[2rem] p-8 border border-white/10">
          <h2 className="outfit-bold text-3xl font-black text-white mb-8">Players ({players.length})</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {players.map((p) => (
              <div key={p.id} className="bg-zinc-800 p-3 rounded-2xl flex items-center gap-3">
                <div className={`p-2 rounded-xl ${p.avatar}`}><Icons.User className="w-5 h-5 text-white" /></div>
                <span className="outfit-medium font-bold text-white truncate">{p.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* פאנל כפתור שליטה והפעלה למארח */}
        <div className="w-full md:w-96 space-y-6">
          <Button onClick={handleStart} size="xl" className="w-full" disabled={players.length < MIN_PLAYERS}>
            START
          </Button>
          <div className="text-center pt-2">
            <button onClick={() => setMode('MENU')} className="text-zinc-500 hover:text-white font-bold text-sm uppercase tracking-widest transition-colors">
               Cancel and Exit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};