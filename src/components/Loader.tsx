import React from 'react';

interface LoaderProps {
  text?: string;
  fullScreen?: boolean;
}

export default function Loader({ text = "Wird geladen...", fullScreen = false }: LoaderProps) {
  return (
    <div className={`flex flex-col items-center justify-center gap-4 ${fullScreen ? 'fixed inset-0 bg-white/80 backdrop-blur-sm z-50' : 'w-full py-12'}`}>
      {/* El círculo giratorio (Spinner) */}
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 border-4 border-[#E4F6FD] rounded-full"></div>
        <div className="absolute inset-0 border-4 border-[#2B8EB5] rounded-full border-t-transparent animate-spin"></div>
      </div>
      
      {/* Texto animado */}
      <p className="text-[#2B8EB5] font-bold text-sm tracking-wide animate-pulse uppercase">
        {text}
      </p>
    </div>
  );
}