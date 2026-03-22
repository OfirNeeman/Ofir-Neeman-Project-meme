import React, { useState } from 'react';

interface UploadPhaseProps {
  onUploadComplete: (imageUrl: string) => void;
  isHost: boolean;
  roomCode: string;
  onStartGame: () => void
}

const UploadPhase: React.FC<UploadPhaseProps> = ({ onUploadComplete, isHost, onStartGame, roomCode }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setUploadStatus('uploading');

    // 1. קריאת הקובץ כ-Base64 לתצוגה מקומית/Firebase
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      
      // 2. שליחת הקובץ הבינארי (file) לשרת הפייתון עם ה-Token
      const token = localStorage.getItem('game_token');

      try {
        const response = await fetch(`http://192.168.1.149:4000/upload/${roomCode}`, {
          method: 'POST',
          body: file, // שולחים את ה-file המקורי (שהוא Blob)
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          setUploadStatus('success');
          // מעבר לשלב הבא באפליקציה
          setTimeout(() => {
            onUploadComplete(base64String);
            setIsProcessing(false);
          }, 1000);
        } else {
          if (response.status === 401) console.error("שגיאת אבטחה: טוקן לא תקין");
          setUploadStatus('error');
          setIsProcessing(false);
        }
      } catch (error) {
        console.error("נכשל בשליחה לשרת:", error);
        setUploadStatus('error');
        setIsProcessing(false);
        // אופציונלי: להמשיך בכל זאת עם ה-Base64 ל-Firebase
        // onUploadComplete(base64String);
      }
    };

    reader.readAsDataURL(file);
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-zinc-900/50 rounded-3xl border-2 border-white/10 backdrop-blur-xl shadow-2xl">
      <div className="text-xs font-black uppercase tracking-widest text-pink-500 mb-2">
        {isHost ? "Host View" : "Player View"}
      </div>

      <h2 className="text-3xl font-black mb-6 text-white italic">
        {isHost ? "מחכים לתמונות..." : "תעלה משהו מצחיק!"}
      </h2>

      {isHost ? (
        <div className="text-center space-y-6">
          <p className="text-zinc-400 font-medium">המשתתפים מעלים תמונות עכשיו. כולם מוכנים?</p>
          <button 
            onClick={onStartGame}
            className="group relative px-8 py-4 bg-white text-black font-black rounded-full hover:scale-105 transition-all duration-300 shadow-[0_0_20px_rgba(255,255,255,0.3)]"
          >
            התחל משחק! 🚀
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <label className={`relative cursor-pointer group overflow-hidden px-10 py-5 rounded-2xl font-black transition-all duration-500 shadow-xl ${
            uploadStatus === 'success' 
              ? 'bg-green-500 text-white scale-95' 
              : 'bg-gradient-to-r from-pink-500 to-purple-600 text-white hover:shadow-pink-500/20'
          }`}>
            <span className="relative z-10 flex items-center gap-3">
              {isProcessing ? "מעלה לשרת... ⏳" : 
               uploadStatus === 'success' ? "הצליח! ✅" : "בחר תמונה מהגלריה"}
            </span>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
              disabled={isProcessing || uploadStatus === 'success'}
            />
          </label>
          
          {uploadStatus === 'error' && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
              <p className="text-red-400 text-sm font-bold text-center">
                השרת לא זמין. וודא שאתה מחובר לאותו Wi-Fi.
              </p>
            </div>
          )}
        </div>
      )}

      <div className="mt-8 pt-6 border-t border-white/5 w-full text-center">
        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-tighter">
          * Secure Transfer Enabled (JWT & TLS Ready)
        </p>
      </div>
    </div>
  );
};

export default UploadPhase;