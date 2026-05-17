import React, { useState } from 'react';
import { SERVER_IP } from '../../constants';

/**
 * Props של קומפוננטת UploadPhase
 */
interface UploadPhaseProps {

  /**
   * מופעל לאחר העלאה מוצלחת של תמונה.
   * מחזיר את התמונה בפורמט Base64.
   */
  onUploadComplete: (imageUrl: string) => void;

  /**
   * האם המשתמש הנוכחי הוא ה־Host של החדר.
   */
  isHost: boolean;

  /**
   * קוד החדר הנוכחי.
   * משמש כדי להעלות את התמונה לחדר המתאים בשרת.
   */
  roomCode: string;

  /**
   * פונקציה שמתחילה את המשחק.
   * זמינה רק ל־Host.
   */
  onStartGame: () => void
}

/**
 * שלב העלאת התמונות במשחק.
 *
 * התנהגות:
 * - Host יכול להתחיל את המשחק
 * - Players מעלים תמונות לשרת
 * - מציג סטטוס העלאה
 * - שומר preview של התמונה ב־Base64
 */
const UploadPhase: React.FC<UploadPhaseProps> = ({
  onUploadComplete,
  isHost,
  onStartGame,
  roomCode
}) => {

  /**
   * האם כרגע מתבצע תהליך העלאה.
   */
  const [isProcessing, setIsProcessing] = useState(false);

  /**
   * סטטוס העלאה:
   * - idle → עדיין לא הועלתה תמונה
   * - uploading → מתבצעת העלאה
   * - success → העלאה הצליחה
   * - error → שגיאה בהעלאה
   */
  const [uploadStatus, setUploadStatus] = useState<
    'idle' | 'uploading' | 'success' | 'error'
  >('idle');

  /**
   * שומר את התמונה שנבחרה בפורמט Base64.
   * משמש לתצוגה מקומית ולהמשך המשחק.
   */
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  /**
   * מופעל כאשר המשתמש בוחר קובץ תמונה.
   *
   * התהליך:
   * 1. בדיקה שנבחר קובץ
   * 2. קריאת התמונה ל־Base64
   * 3. שליחת הקובץ לשרת
   * 4. עדכון סטטוס העלאה
   * 5. מעבר לשלב הבא במשחק
   */
  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {

    /**
     * הקובץ הראשון שנבחר.
     */
    const file = e.target.files?.[0];

    if (!file) return;

    setIsProcessing(true);
    setUploadStatus('uploading');

    /**
     * FileReader משמש להמרת הקובץ ל־Base64
     * כדי להציג preview בדפדפן.
     */
    const reader = new FileReader();

    reader.onloadend = async () => {

      /**
       * התמונה בפורמט Base64.
       */
      const base64String = reader.result as string;

      try {

        console.log("מתחיל שליחה לשרת...");

        /**
         * שליחת הקובץ הגולמי לשרת.
         *
         * הנתיב כולל את קוד החדר,
         * כדי שהשרת ידע לאיזה חדר לשייך את התמונה.
         */
        await fetch(
          `http://${SERVER_IP}:4000/upload/${roomCode}`,
          {
            method: 'POST',

            /**
             * שליחת הקובץ עצמו ללא JSON.
             */
            body: file,
          }
        );

        /**
         * עדכון מצב הצלחה.
         */
        setUploadStatus('success');
        setIsProcessing(false);

        /**
         * שמירת התמונה בזיכרון המקומי.
         */
        setSelectedImage(base64String);

        /**
         * מעבר לשלב הבא אחרי השהייה קצרה,
         * כדי שהמשתמש יספיק לראות את הודעת ההצלחה.
         */
        setTimeout(() => {
          onUploadComplete(base64String);
        }, 1000);

      } catch (error) {

        /**
         * טיפול בשגיאות העלאה.
         */
        console.error("נכשל בשליחה:", error);

        setUploadStatus('error');
        setIsProcessing(false);

        /**
         * עדיין שומרים את התמונה locally.
         */
        setSelectedImage(base64String);

        /**
         * אם רוצים להמשיך גם במקרה של שגיאה:
         *
         * onUploadComplete(base64String);
         */
      }
    };

    /**
     * התחלת קריאת הקובץ כ־Data URL.
     */
    reader.readAsDataURL(file);
  };

  /**
   * התחלת המשחק ע"י ה־Host.
   *
   * בודק שקיימת תמונה לפני מעבר לשלב הבא.
   */
  const handleHostStart = () => {

    if (selectedImage) {

      onUploadComplete(selectedImage);

    } else {

      alert("עדיין לא הועלתה תמונה!");
    }
  };

  return (

    /**
     * מיכל ראשי של המסך.
     */
    <div className="flex flex-col items-center justify-center p-6 bg-zinc-900/50 rounded-3xl border-2 border-white/10 backdrop-blur-xl shadow-2xl">

      {/* תגית Host / Player */}
      <div className="text-xs font-black uppercase tracking-widest text-pink-500 mb-2">
        {isHost ? "Host" : "Player"}
      </div>

      {/* כותרת המסך */}
      <h2 className="outfit-medium text-3xl font-black mb-6 text-white italic">
        {isHost ? "Waiting for others" : "Upload your image!"}
      </h2>

      {isHost ? (

        /**
         * תצוגת Host
         */
        <div className="text-center space-y-6">

          <p className="outfit-light text-zinc-400 font-medium text-lg">
            Want to make memes out of your images? Upload them now!
          </p>

          <button
            onClick={onStartGame}
            className="group relative px-8 py-4 bg-white text-black font-black rounded-full hover:scale-105 transition-all duration-300 shadow-[0_0_20px_rgba(255,255,255,0.3)]"
          >

            <span className="outfit-medium relative z-10">
              First Round
            </span>

            <span className="absolute inset-0 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur"></span>

          </button>

        </div>

      ) : (

        /**
         * תצוגת Player
         */
        <div className="flex flex-col items-center gap-4">

          {/* כפתור העלאת תמונה */}
          <label
            className={`relative cursor-pointer group overflow-hidden px-10 py-5 rounded-2xl font-black transition-all duration-500 shadow-xl ${
              uploadStatus === 'success'
                ? 'bg-green-500 text-white scale-95'
                : 'bg-gradient-to-r from-pink-500 to-purple-600 text-white hover:shadow-pink-500/20'
            }`}
          >

            <span className="outfit-medium relative z-10 flex items-center gap-3">

              {isProcessing
                ? "Uploading..."
                : uploadStatus === 'success'
                ? "Success!"
                : "Choose Image"}

            </span>

            {/* Input מוסתר */}
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"

              /**
               * מונע בחירה חוזרת בזמן העלאה
               * או אחרי הצלחה.
               */
              disabled={
                isProcessing ||
                uploadStatus === 'success'
              }
            />

          </label>

          {/* הודעת שגיאה */}
          {uploadStatus === 'error' && (

            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">

              <p className="text-red-400 text-sm font-bold text-center">

                The server is not available.
                Please ensure you are connected
                to the same Wi-Fi network and
                that the server is running.

              </p>

            </div>
          )}

        </div>
      )}

      {/* טקסט תחתון */}
      <div className="outfit-light mt-4 text-base text-gray-400 text-center text-lg">

        Upload pics to the server and wait for the host to start the game.
        Make sure you are connected to the same Wi-Fi network as the host.

      </div>

    </div>
  );
};

export default UploadPhase;