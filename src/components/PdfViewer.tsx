import React, { useState, useEffect } from 'react';

interface PdfViewerProps {
  images: string[];
  title: string;
}

export default function PdfViewer({ images, title }: PdfViewerProps) {
  const [loadedImagesCount, setLoadedImagesCount] = useState(0);
  
  // 🚀 1. NUEVO: Estado para saber si React ya "despertó" en el navegador
  const [isMounted, setIsMounted] = useState(false);
  
  const totalImages = images.length;

  // 🚀 2. NUEVO: Apenas el componente carga en el navegador, lo marcamos como montado
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  const isLoading = loadedImagesCount < totalImages;

  return (
    <div className="mb-10 p-6 border border-border rounded-xl bg-card shadow-sm">
      <h3 className="font-bold text-textMain mb-4 flex items-center gap-2">
        <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
        </svg>
        Lernmaterial: {title}
      </h3>
      
      <div className="relative bg-[#f8f9fa] rounded-lg border border-border overflow-hidden min-h-[400px]">
        
        {/* 🌀 PANTALLA DE CARGA */}
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm z-20">
            <div className="relative w-14 h-14 mb-4">
              <div className="absolute inset-0 border-4 border-[#E4F6FD] rounded-full"></div>
              <div className="absolute inset-0 border-4 border-[#2B8EB5] rounded-full border-t-transparent animate-spin"></div>
            </div>
            <p className="text-[#2B8EB5] font-bold text-sm tracking-wide animate-pulse">
              Lade Dokument... ({loadedImagesCount}/{totalImages})
            </p>
          </div>
        )}

        {/* 📄 CONTENEDOR DE IMÁGENES */}
        <div 
          className={`flex flex-col gap-4 max-h-[600px] overflow-y-auto p-4 custom-scrollbar transition-opacity duration-700 ease-in-out ${isLoading ? 'opacity-0' : 'opacity-100'}`} 
          onContextMenu={(e) => e.preventDefault()} 
        >
          {/* 🚀 3. MAGIA: Solo inyectamos las imágenes si React ya está montado */}
          {isMounted && images.map((imgUrl, index) => (
            <img 
              key={index}
              src={imgUrl} 
              alt={`Página ${index + 1} de ${title}`} 
              className="w-full h-auto rounded-md shadow-sm pointer-events-none select-none"
              // Ahora sí React escuchará cada imagen perfectamente
              onLoad={() => setLoadedImagesCount(prev => prev + 1)}
              onError={() => setLoadedImagesCount(prev => prev + 1)}
            />
          ))}
        </div>
      </div>

      <p className="text-xs text-center mt-3 text-textMain/50 font-medium">
        🔒 Geschütztes Dokument. Scrollen Sie nach unten, um alle Seiten zu lesen.
      </p>
    </div>
  );
}