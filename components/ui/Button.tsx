import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  isLoading = false,
  ...props 
}) => {
  const baseStyles = "inline-flex items-center justify-center font-black transition-all transform focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed active:translate-y-1 active:border-b-0";
  
  const variants = {
    primary: "bg-pink-500 hover:bg-pink-400 text-white border-b-4 border-pink-700 rounded-full shadow-lg shadow-pink-900/40",
    secondary: "bg-zinc-800 hover:bg-zinc-700 text-pink-100 border-b-4 border-zinc-950 rounded-full",
    danger: "bg-red-500 hover:bg-red-400 text-white border-b-4 border-red-700 rounded-full",
    ghost: "bg-transparent hover:bg-white/5 text-pink-200 border-none rounded-xl",
  };

  const sizes = {
    sm: "px-4 py-2 text-sm border-b-2",
    md: "px-6 py-3 text-base",
    lg: "px-8 py-4 text-xl",
    xl: "px-10 py-5 text-2xl tracking-wide",
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? (
        <span className="flex items-center gap-2">
          <svg className="animate-spin h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          טוען...
        </span>
      ) : children}
    </button>
  );
};