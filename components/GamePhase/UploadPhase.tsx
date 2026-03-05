import React, { useState } from 'react';

interface UploadPhaseProps {
  onUploadComplete: (imageUrl: string) => void;
  isHost: boolean;
}

const UploadPhase: React.FC<UploadPhaseProps> = ({ onUploadComplete, isHost }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');

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
        
        console.log("מתחיל שליחה לסוקט...");
        await fetch(`http://${SERVER_IP}:4000`, {
          method: 'POST',
          body: file,
          mode: 'no-cors'
        });
        
        console.log("הסוקט סיים (או לפחות שלח)");
        setUploadStatus('success');
        
        // רק עכשיו עוברים לשלב הבא במשחק
        setTimeout(() => {
          onUploadComplete(base64String);
        }, 1000); // השהייה קלה כדי שתראי את ה-V הירוק

      } catch (error) {
        console.error("נכשל בשליחה לסוקט:", error);
        setUploadStatus('error');
        // אם את רוצה שהמשחק ימשיך גם כשזה נכשל:
        // onUploadComplete(base64String); 
      }
    };

    reader.readAsDataURL(file);
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-white rounded-xl shadow-lg border-2 border-purple-200">
      <div className="text-sm text-gray-500 mb-2">
        {isHost ? "המארח" : "משתמש רגיל"}
      </div>

      <h2 className="text-2xl font-bold mb-4 text-purple-800">
        בחירת תמונה למם
      </h2>

      {isHost ? (
        <>
          <p className="mb-6 text-gray-600 text-center">
            המשתתפים מעלים עכשיו תמונות… המתן לבחירה שלהם.
          </p>
          <button className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-full shadow-md transition-all">
           התחל שלב הבא! 🚀
          </button>
        </>
      ) : (
        <>
          <p className="mb-6 text-gray-600 text-center">
            העלאה ישירה לשרת הסוקטים (תיקיית uploads):
          </p>
          <label className={`cursor-pointer font-bold py-3 px-6 rounded-full transition-all shadow-md ${
            uploadStatus === 'success' ? 'bg-green-500 text-white' : 'bg-purple-600 hover:bg-purple-700 text-white'
          }`}>
            {isProcessing ? "מעלה לשרת..." : 
             uploadStatus === 'success' ? "נשלח לסוקט! ✅" : "בחר תמונה והעלה"}
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
              disabled={isProcessing}
            />
          </label>
          
          {uploadStatus === 'error' && (
            <p className="mt-2 text-red-500 text-xs text-center">
              השרת לא זמין, התמונה תישמר ב-Firebase בלבד.
            </p>
          )}
        </>
      )}

      <div className="mt-4 text-xs text-gray-400">
        * התמונה נשלחת במקביל לשרת פייתון ול-Firebase
      </div>
    </div>
  );
};

export default UploadPhase;