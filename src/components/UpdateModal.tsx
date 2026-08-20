import { useState, useEffect } from "react";
import { Sparkles, Save, Crown, X } from "lucide-react";

// 💡 CADA VEZ QUE QUIERAS MOSTRAR NUEVOS CAMBIOS, SOLO CAMBIA ESTA VERSIÓN (ej. a "v1.1.0")
const CURRENT_VERSION = "v1.0.0"; 

export default function UpdateModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Revisamos si el usuario ya vio esta versión específica
    const hasSeenUpdate = localStorage.getItem(`dentiva_update_${CURRENT_VERSION}`);
    
    if (!hasSeenUpdate) {
      // Pequeño retraso para que no aparezca de golpe al cargar la página
      const timer = setTimeout(() => setIsOpen(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    // Guardamos que ya lo vio para que no vuelva a molestar
    localStorage.setItem(`dentiva_update_${CURRENT_VERSION}`, "true");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6">
      {/* Fondo oscuro con blur */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-fade-in transition-opacity"
        onClick={handleClose}
      />
      
      {/* Tarjeta del Modal */}
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden animate-slide-up z-10 border border-border">
        
        {/* Encabezado decorativo */}
        <div className="bg-gradient-to-r from-[#E4F6FD] to-[#F4FBFF] p-6 text-center border-b border-[#C8E8F5]">
          <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-sm border border-[#C8E8F5] text-primary">
            <Sparkles className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-textMain">Was gibt's Neues?</h2>
          <p className="text-sm text-textMain/70 mt-1">
            Wir haben Dentiva für dich verbessert!
          </p>
        </div>

        {/* Lista de novedades */}
        <div className="p-6 space-y-6">
          <div className="flex gap-4">
            <div className="flex-shrink-0 mt-1">
              <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
            </div>
            <div>
              <h3 className="font-bold text-textMain text-sm">Neues Trainingszentrum</h3>
              <p className="text-sm text-textMain/70 mt-1 leading-relaxed">
                Wähle zwischen Schnelltests (15), Standard (25) oder Intensivsimulationen (50 Fragen) für deine optimale Prüfungsvorbereitung.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0 mt-1">
              <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Save className="w-4 h-4" />
              </div>
            </div>
            <div>
              <h3 className="font-bold text-textMain text-sm">Automatisches Speichern</h3>
              <p className="text-sm text-textMain/70 mt-1 leading-relaxed">
                Unterbrich deinen Test jederzeit! Dein Fortschritt wird jetzt automatisch gespeichert, sodass du später genau dort weitermachen kannst.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0 mt-1">
              <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
                <Crown className="w-4 h-4" />
              </div>
            </div>
            <div>
              <h3 className="font-bold text-textMain text-sm">PRO-Erweiterungen</h3>
              <p className="text-sm text-textMain/70 mt-1 leading-relaxed">
                Als Premium-Nutzer hast du nun exklusiven Zugriff auf die großen 25- und 50-Fragen-Simulationen.
              </p>
            </div>
          </div>
        </div>

        {/* Botón de acción */}
        <div className="p-6 pt-2">
          <button
            onClick={handleClose}
            className="w-full bg-primary hover:bg-[#3a9bc4] text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-md hover:-translate-y-0.5 flex justify-center items-center"
          >
            Toll, los geht's!
          </button>
        </div>

        {/* Botón X de cerrar */}
        <button 
          onClick={handleClose}
          className="absolute top-4 right-4 text-textMain/40 hover:text-textMain bg-white/50 hover:bg-white rounded-full p-1.5 transition"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}