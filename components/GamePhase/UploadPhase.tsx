import React, { useRef, useState } from 'react';
import { Button } from '../ui/Button';
import { Icons } from '../ui/Icons';

interface UploadPhaseProps {
  onImageSelected: (base64: string) => void;
}

export const UploadPhase: React.FC<UploadPhaseProps> = ({ onImageSelected }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsProcessing(true);
      const reader = new FileReader();
      reader.onloadend = () => {
        onImageSelected(reader.result as string);
        setIsProcessing(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRandomImage = async () => {
    setIsProcessing(true);
    try {
      const response = await fetch('https://picsum.photos/600/600');
      const blob = await response.blob();
      const reader = new FileReader();
      reader.onloadend = () => {
        onImageSelected(reader.result as string);
        setIsProcessing(false);
      };
      reader.readAsDataURL(blob);
    } catch (error) {
      console.error("Failed to fetch random image", error);
      alert("שגיאה בטעינת תמונה אקראית");
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-12 animate-fade-in">
      <div className="text-center space-y-2">
         <h2 className="text-5xl font-black text-white drop-shadow-md">בחרו תמונה</h2>
         <p className="text-xl text-pink-200 opacity-80">זה הזמן להבריק או ליפול בגדול</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 w-full max-w-3xl">
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="group cursor-pointer aspect-square rounded-[2rem] border-4 border-dashed border-zinc-700 hover:border-pink-500 bg-zinc-900/30 hover:bg-pink-500/10 transition-all duration-300 flex flex-col items-center justify-center transform hover:-translate-y-2"
        >
          <div className="p-8 bg-zinc-800 rounded-full mb-8 group-hover:scale-110 transition-transform shadow-2xl border-2 border-zinc-700 group-hover:border-pink-500">
             <Icons.Upload className="w-16 h-16 text-pink-400" />
          </div>
          <span className="text-2xl font-black text-white group-hover:text-pink-300 transition-colors">העלאה</span>
          <p className="text-zinc-500 font-bold mt-2 uppercase tracking-wider text-sm">מהגלריה</p>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            accept="image/*" 
            className="hidden" 
          />
        </div>

        <div 
          onClick={handleRandomImage}
          className="group cursor-pointer aspect-square rounded-[2rem] border-4 border-dashed border-zinc-700 hover:border-cyan-500 bg-zinc-900/30 hover:bg-cyan-500/10 transition-all duration-300 flex flex-col items-center justify-center transform hover:-translate-y-2"
        >
          <div className="p-8 bg-zinc-800 rounded-full mb-8 group-hover:scale-110 transition-transform shadow-2xl border-2 border-zinc-700 group-hover:border-cyan-500">
            <Icons.Dice className="w-16 h-16 text-cyan-400" />
          </div>
          <span className="text-2xl font-black text-white group-hover:text-cyan-300 transition-colors">אקראי</span>
          <p className="text-zinc-500 font-bold mt-2 uppercase tracking-wider text-sm">מהרשת</p>
        </div>
      </div>
      
      {isProcessing && (
        <div className="glass-panel px-8 py-3 rounded-full flex items-center gap-3">
           <div className="w-4 h-4 bg-pink-500 rounded-full animate-bounce"></div>
           <span className="text-pink-100 font-bold">מעבד תמונה...</span>
        </div>
      )}
    </div>
  );
};