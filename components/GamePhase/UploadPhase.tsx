import React, { useState } from 'react';

// הגדרת מה הקומפוננטה מקבלת מבחוץ
interface UploadPhaseProps {
  onUploadComplete: (imageUrl: string ) => void;
  isHost: boolean;
}

const UploadPhase: React.FC<UploadPhaseProps> = ({ onUploadComplete, isHost }) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // הגבלה ל-1MB כדי שלא יכביד על ה-Database
    if (file.size > 1024 * 1024) {
      alert("התמונה גדולה מדי. אנא בחרו תמונה קטנה מ-1MB");
      return;
    }

    setIsProcessing(true);

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // כאן אנחנו שולחים את הטקסט של התמונה ישירות למשחק
      onUploadComplete(base64String);
      setIsProcessing(false);
    };

    reader.readAsDataURL(file);
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-white rounded-xl shadow-lg border-2 border-purple-200">
      <div className="text-sm text-gray-500 mb-2">{isHost ? "המארח" : "משתמש 111רגיל"}</div>
      <h2 className="text-2xl font-bold mb-4 text-purple-800">בחירת תמונה למם</h2>
      <p className="mb-6 text-gray-600 text-center">
        בחרו תמונה מהמכשיר שלכם (גלריה או קבצים):
      </p>
      
      <label className="cursor-pointer bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-full transition-all shadow-md">
        {isProcessing ? "מעבד תמונה..." : "בחר קובץ"}
        <input 
          type="file" 
          accept="image/*" 
          onChange={handleFileChange} 
          className="hidden" 
          disabled={isProcessing}
        />
      </label>

      <div className="mt-4 text-xs text-gray-400">
        * בשיטה זו אין צורך בחיבור Storage
      </div>
    </div>
  );
};

export default UploadPhase;