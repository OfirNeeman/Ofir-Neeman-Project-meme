import React, { useState, useEffect } from 'react';
import { JudgePersonality, Player, GameState } from '../types';
import { JUDGE_DESCRIPTIONS, MIN_PLAYERS } from '../constants';
import { Button } from './ui/Button';
import { Icons } from './ui/Icons';
import { db } from '../firebase'; 
import { doc, setDoc, onSnapshot, updateDoc, arrayUnion } from "firebase/firestore";

interface LobbyProps {
  onStartGame: (players: Player[], personality: JudgePersonality, isHost: boolean) => void;
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

  const colors = [
    'bg-pink-500', 'bg-rose-500', 'bg-fuchsia-500', 'bg-purple-500', 
    'bg-violet-500', 'bg-indigo-500', 'bg-blue-500', 'bg-cyan-500'
  ];

  useEffect(() => {
    let unsubscribe = () => {};
    const activeCode = mode === 'HOST' ? roomCode : inputCode.toUpperCase();

    if (activeCode && activeCode.length === 5) {
      unsubscribe = onSnapshot(doc(db, "games", activeCode), (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setPlayers(data.players || []);
          if (mode === 'WAITING' && data.status === 'STARTING') {
            onStartGame(data.players, data.personality, false);
          }
        }
      });
    }
    return () => unsubscribe();
  }, [roomCode, inputCode, mode]);

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
      await setDoc(doc(db, "games", newCode), {
        status: 'LOBBY',
        players: [],
        personality: personality,
        createdAt: new Date(),
        isHost: true
      });
    } catch (e) {
      console.error(e);
      alert("שגיאה ביצירת חדר");
    }
  };

  const handleJoinGame = async () => {
    if (!inputCode || !playerName) return;
    const avatar = colors[Math.floor(Math.random() * colors.length)];
    const newPlayer = { id: crypto.randomUUID(), name: playerName, score: 0, avatar: avatar };
    try {
      await updateDoc(doc(db, "games", inputCode.toUpperCase()), {
        players: arrayUnion(newPlayer)
      });
      setMode('WAITING');
      setJoined(true);
    } catch (e) {
      alert("חדר לא נמצא!");
    }
  };

  const handleStart = async () => {
    if (players.length >= MIN_PLAYERS) {
      await updateDoc(doc(db, "games", roomCode), {
        status: 'STARTING',
        personality: personality
      });
      onStartGame(players, personality, true);
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
      <div className="flex flex-col items-center justify-center min-h-[70vh] animate-fade-in relative z-10">
        <div className="text-center mb-16 relative">
          <div className="absolute -inset-10 bg-pink-500 blur-[100px] opacity-20 rounded-full animate-pulse"></div>
          <h1 className="relative text-8xl font-black text-white drop-shadow-[0_5px_5px_rgba(0,0,0,0.5)] transform -rotate-2">
            MEME<span className="text-pink-500">MASTER</span>
          </h1>
          <p className="text-3xl text-pink-200 font-bold tracking-widest mt-4 uppercase text-shadow-sm">AI Party Game</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl px-4">
          <div onClick={handleCreateGame} className="cursor-pointer group glass-panel p-8 rounded-3xl border-2 border-white/10 hover:border-pink-500 hover:bg-pink-500/10 transition-all transform hover:-translate-y-2 flex flex-col items-center text-center">
            <div className="bg-pink-500 rounded-full p-6 mb-6 shadow-xl"><Icons.Brain className="w-12 h-12 text-white" /></div>
            <h2 className="text-3xl font-black mb-2">HOST GAME</h2>
            <p className="text-pink-200 opacity-80">צור חדר והקרן על המסך</p>
          </div>
          <div onClick={() => setMode('JOIN')} className="cursor-pointer group glass-panel p-8 rounded-3xl border-2 border-white/10 hover:border-cyan-500 hover:bg-cyan-500/10 transition-all transform hover:-translate-y-2 flex flex-col items-center text-center">
            <div className="bg-cyan-500 rounded-full p-6 mb-6 shadow-xl"><Icons.User className="w-12 h-12 text-white" /></div>
            <h2 className="text-3xl font-black mb-2">JOIN GAME</h2>
            <p className="text-pink-200 opacity-80">הצטרף מהטלפון שלך</p>
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'JOIN' || mode === 'WAITING') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] max-w-md mx-auto relative z-10">
        <div className="glass-panel p-10 rounded-[2.5rem] shadow-2xl w-full text-center space-y-8 border-2 border-white/10">
          {!joined ? (
            <>
              <h2 className="text-4xl font-black text-white">הצטרפות</h2>
              <div className="space-y-6">
                <input type="text" placeholder="קוד חדר" value={inputCode} onChange={(e) => setInputCode(e.target.value.toUpperCase())} className="w-full bg-zinc-950/50 border-2 border-zinc-700 rounded-2xl px-6 py-5 text-center text-3xl font-black uppercase text-white" maxLength={5} />
                <input type="text" placeholder="כינוי" value={playerName} onChange={(e) => setPlayerName(e.target.value)} className="w-full bg-zinc-950/50 border-2 border-zinc-700 rounded-2xl px-6 py-5 text-center text-2xl font-bold text-white" />
              </div>
              <Button onClick={handleJoinGame} disabled={!inputCode || !playerName} size="xl" className="w-full">Let's Go!</Button>
            </>
          ) : (
            <div className="space-y-8 py-10">
              <div className="text-8xl animate-bounce">🤘</div>
              <h2 className="text-4xl font-black text-white">התחברת!</h2>
              <p className="text-pink-200">חכה שהמארח יתחיל את המשחק...</p>
            </div>
          )}
        </div>
        {!joined && (
          <button onClick={() => setMode('MENU')} className="mt-8 text-pink-300/60 hover:text-white font-bold text-sm uppercase tracking-widest transition-colors">
            חזרה לתפריט
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
          <Button onClick={handleStart} size="xl" className="w-full" disabled={players.length < MIN_PLAYERS}>התחל משחק 🚀</Button>
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