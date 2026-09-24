import React from 'react';

export const LoadingSpinner: React.FC<{ message?: string; fullScreen?: boolean }> = ({
  message = 'Loading...',
  fullScreen = false,
}) => {
  const content = (
    <div className="flex flex-col items-center justify-center p-8 text-center select-none">
      {/* Brand Logo with Laser Scanning Effect */}
      <div className="relative mb-5 p-4 rounded-3xl bg-white/90 backdrop-blur-md border border-sky-100 shadow-xl shadow-sky-500/10 flex items-center justify-center overflow-hidden animate-print-laser">
        {/* Scanner laser bar */}
        <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-sky-500 to-transparent shadow-[0_0_8px_#0080FF] animate-print-scan pointer-events-none" />

        {/* PrintSetu Logo */}
        <img
          src="/logo.png"
          alt="PrintSetu"
          className="h-10 sm:h-12 w-auto object-contain animate-print-feed"
        />
      </div>

      {/* Modern micro-progress bar */}
      <div className="w-36 h-1.5 bg-slate-200/80 rounded-full overflow-hidden mb-3 relative">
        <div className="absolute top-0 bottom-0 bg-gradient-to-r from-sky-500 via-blue-600 to-sky-400 rounded-full w-1/2 animate-[shimmer_1.4s_infinite]"
          style={{
            animation: 'printFeed 1.4s ease-in-out infinite alternate',
            width: '60%',
          }}
        />
      </div>

      {/* Status Message */}
      <p className="text-xs sm:text-sm font-semibold tracking-wide text-slate-700">
        {message}
      </p>
      <span className="text-[10px] text-sky-600 font-bold uppercase tracking-widest mt-1">
        PrintSetu Engine
      </span>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-50/80 backdrop-blur-xs">
        {content}
      </div>
    );
  }

  return content;
};
