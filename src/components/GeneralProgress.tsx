import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

export default function GeneralProgress({ userId, accessToken }: { userId: string, accessToken: string }) {
    const [isLoading, setIsLoading] = useState(true);
    const [progress, setProgress] = useState({ completadas: 0, totales: 0 });

    useEffect(() => {
        async function fetchProgress() {
            try {
                // 🚀 1. Creamos el cliente autenticado
                const supabase = createClient(
                    import.meta.env.PUBLIC_SUPABASE_URL,
                    import.meta.env.PUBLIC_SUPABASE_KEY, // OJO: suele ser ANON_KEY, verifica tu variable
                    { global: { headers: { Authorization: `Bearer ${accessToken}` } } }
                );

                // 2. Pedimos el total de ejercicios (Solo Lernen)
                const { count: totalExercises, error: errorTotal } = await supabase
                    .from("exercises")
                    .select("*", { count: "exact", head: true })
                    .eq("is_assessment", false);

                if (errorTotal) console.error("🛑 Error pidiendo total de ejercicios:", errorTotal);

                // 3. Obtenemos los IDs de los ejercicios Lernen
                const { data: lernenExercises } = await supabase
                    .from("exercises")
                    .select("id")
                    .eq("is_assessment", false);

                const lernenExerciseIds = lernenExercises?.map(e => e.id) || [];

                // 🛡️ 4. BARRERA DE SEGURIDAD: Solo buscamos si hay IDs válidos
                let attemptsData: any[] = [];
                if (lernenExerciseIds.length > 0) {
                    const { data: attempts, error: errorAttempts } = await supabase
                        .from("user_attempts")
                        .select("exercise_id")
                        .eq("user_id", userId)
                        .in("exercise_id", lernenExerciseIds);
                    
                    if (errorAttempts) console.error("🛑 Error pidiendo intentos:", errorAttempts);
                    if (attempts) attemptsData = attempts;
                }

                // 🔍 CHIVATOS
                console.log("👉 Total de ejercicios Lernen en BD:", totalExercises);
                console.log("👉 Intentos válidos del usuario:", attemptsData);

                // 5. Calculamos los únicos
                const uniqueAttempts = new Set(attemptsData.map(a => a.exercise_id));

                setProgress({
                    completadas: uniqueAttempts.size,
                    totales: totalExercises || 0
                });

            } catch (error) {
                console.error("🛑 Error crítico en fetchProgress:", error);
            } finally {
                setIsLoading(false);
            }
        }

        if (userId && accessToken) {
            fetchProgress();
        }
    }, [userId, accessToken]);

    const porcentaje = progress.totales > 0
        ? Math.round((progress.completadas / progress.totales) * 100)
        : 0;

    return (
        <div>
            <div className="flex justify-between text-xs font-bold text-gray-700 mb-2 tracking-wide">
                <span className="uppercase flex items-center gap-2">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                    Lernen
                </span>
                <span className="text-[#1B8BB9] font-bold">
                    {isLoading ? "Cargando..." : `${porcentaje}%`}
                </span>
            </div>

            <div className="h-3 w-full bg-blue-100 rounded-full overflow-hidden relative">
                {isLoading ? (
                    <div className="absolute inset-0 bg-blue-200 animate-pulse rounded-full"></div>
                ) : (
                    <div className="h-full bg-gradient-to-r from-[#39ADDB] to-[#1B8BB9] transition-all duration-1000 ease-out rounded-full" style={{ width: `${porcentaje}%` }}></div>
                )}
            </div>
        </div>
    );
}