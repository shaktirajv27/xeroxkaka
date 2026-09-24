import React from 'react';

export const LoadingSpinner: React.FC<{ message?: string; fullScreen?: boolean }> = ({
  message = 'Loading...',
  fullScreen = false,
}) => {
  const content = (
    <div className="flex flex-col items-center justify-center p-6 text-center select-none max-w-sm mx-auto">
      {/* Brand Logo Card with Precision Laser Scanning Effect */}
      <div className="relative mb-4 px-7 py-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-lg shadow-slate-900/5 flex items-center justify-center overflow-hidden animate-pulse-glow">
        {/* Soft vertical light beam */}
        <div className="absolute inset-0 bg-gradient-to-b from-sky-400/5 via-sky-500/10 to-transparent pointer-events-none" />

        {/* High-tech precision scanner laser line */}
        <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-sky-500 to-transparent shadow-[0_0_10px_#0284c7] animate-laser-sweep pointer-events-none z-10" />

        {/* Crisp PrintSetu Official Logo */}
        <img
          src="/logo.png"
          alt="PrintSetu"
          className="h-9 sm:h-11 w-auto object-contain relative z-0 transition-transform duration-300"
        />
      </div>

      {/* Smooth Shimmer Progress Bar */}
      <div className="w-40 sm:w-48 h-1.5 bg-slate-200/70 rounded-full overflow-hidden mb-3 relative shadow-inner">
        <div className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-sky-500 via-blue-600 to-sky-400 rounded-full animate-shimmer-bar" />
      </div>

      {/* Status Message */}
      <p className="text-xs sm:text-sm font-bold text-slate-800 tracking-tight">
        {message}
      </p>

      {/* Live Cloud Synchronized Badge */}
      <div className="flex items-center gap-1.5 mt-1.5 px-2.5 py-0.5 rounded-full bg-sky-50 border border-sky-100">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-[10px] text-sky-700 font-bold uppercase tracking-wider">
          PrintSetu Engine • Live
        </span>
      </div>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-50/90 backdrop-blur-xs">
        {content}
      </div>
    );
  }

  return content;
};

