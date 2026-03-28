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
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setUploadStatus('uploading');

    // 1. הכנת הקורא כדי להציג את התמונה בדפדפן (לצרכי תצוגה בלבד ב-Firebase)
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      
      try {
        const SERVER_IP = "192.168.1.149"; // ודאי שזה ה-IP הנכון!
        
        console.log("מתחיל שליחה לשרת...");
          // שינוי הנתיב ל-upload/ROOM_CODE
          await fetch(`http://${SERVER_IP}:4000/upload/${roomCode}`, {
            method: 'POST',
            body: file, // שליחת הקובץ הגולמי
          });
        
        setUploadStatus('success');
        setIsProcessing(false);
        setSelectedImage(base64String);
        
        // רק  עוברים לשלב הבא במשחק
        setTimeout(() => {
          onUploadComplete(base64String);
        }, 1000); // השהייה קלה כדי שתראי את ה-V הירוק

      } catch (error) {
        console.error("נכשל בשליחה:", error);
        setUploadStatus('error');
        setIsProcessing(false);
        // אם את רוצה שהמשחק ימשיך גם כשזה נכשל:
        // onUploadComplete(base64String); 
        setSelectedImage(base64String);
      }
    };

    reader.readAsDataURL(file);
  };

  const handleHostStart = () => {
      if (selectedImage) {
        onUploadComplete(selectedImage);
      } else {
        alert("עדיין לא הועלתה תמונה!");
      }
    };
    
  return (
    <div className="flex flex-col items-center justify-center p-6 bg-zinc-900/50 rounded-3xl border-2 border-white/10 backdrop-blur-xl shadow-2xl">
      <div className="text-xs font-black uppercase tracking-widest text-pink-500 mb-2">
        {isHost ? "Host" : "Player"}
      </div>


      <h2 className="text-3xl font-black mb-6 text-white italic">
        {isHost ? "Waiting for others" : "!Upload your image"}
      </h2>

      {isHost ? (
        <div className="text-center space-y-6">
          <p className="text-zinc-400 font-medium">?All players have uploaded their images. Ready to start</p>
          <button 
            onClick={onStartGame} // חיבור הלחיצה למעבר השלב
            className="group relative px-8 py-4 bg-white text-black font-black rounded-full hover:scale-105 transition-all duration-300 shadow-[0_0_20px_rgba(255,255,255,0.3)]"
          >
            <span className="relative z-10">First Round</span>
            <span className="absolute inset-0 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur"></span>
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
              {isProcessing ? "Uploading..." : 
               uploadStatus === 'success' ? "Success!" : "Choose Image"}
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
                The server is not available. Please ensure you are connected to the same Wi-Fi network and that the server is running.
              </p>
            </div>
          )}
        </div> /* כאן היה התיקון של ה-div הסוגר */
      )}
      <div className="mt-4 text-xs text-gray-400">
        pic is being uploaded to the server, not stored locally. If you refresh, the image will be lost and you will need to upload again.
      </div>
    </div>
  );
};

export default UploadPhase;