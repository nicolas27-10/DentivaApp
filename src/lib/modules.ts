import { supabase } from "./supabaseClient";

export async function getModulesWithProgress(userId: string | undefined, cookies: any) {
  const token = cookies?.get('sb-access-token')?.value;

  if (!userId || !token) return [];

  // Ordenamos estrictamente por tu columna order_index
  const { data: modules, error: modError } = await supabase
    .from("modules")
    .select("*")
    .order("order_index", { ascending: true })
    .setHeader('Authorization', `Bearer ${token}`); 

  if (modError) {
    console.error("Error al cargar módulos:", modError);
    return [];
  }

  const { data: progress, error: progError } = await supabase
    .from("user_progress")
    .select("*")
    .eq("user_id", userId)
    .setHeader('Authorization', `Bearer ${token}`); 

  if (progError) {
    console.error("Error al cargar progreso:", progError);
    return [];
  }

  const hasSubscription = false; 

  console.log("--- INICIANDO REVISIÓN DE MÓDULOS ---");

  return modules.map((module, index) => {
    const userProgress = progress.find((p) => p.module_id === module.id);
    let isLocked = false;
    let lockReason = null; 

    console.log(`\nEvaluando Módulo: [${index}] ${module.title}`);

    // Si index > 0 significa: "A partir del SEGUNDO módulo"
    if (index > 0) {
      const previousModule = modules[index - 1];
      const previousProgress = progress.find((p) => p.module_id === previousModule.id);
      const prevPercentage = Number(previousProgress?.progress_percentage) || 0;
      
      const isPrevCompleted = 
        previousProgress?.completed === true || 
        previousProgress?.completed === 'true' || 
        previousProgress?.completed === 1;

      const isPreviousDone = isPrevCompleted || prevPercentage >= 99;

      console.log(`  -> Su anterior es: ${previousModule.title}`);
      console.log(`  -> ¿Anterior superado? ${isPreviousDone}`);

      // 1. Prioridad Máxima: Bloqueo por orden de estudio (no has pasado el anterior)
      if (!isPreviousDone) {
        isLocked = true;
        lockReason = 'previous_incomplete';
        console.log(`  -> 🔒 ACCIÓN: Bloquear (falta completar anterior)`);
      } 
      // 2. Si ya pasaste el anterior, verificamos si tienes Premium
      // Como estamos dentro de index > 0, esto aplica a TODOS a partir del segundo módulo
      else if (!hasSubscription) {
        isLocked = true; 
        lockReason = 'subscription_required';
        console.log(`  -> 🔒 ACCIÓN: Bloquear (Requiere suscripción Premium)`);
      } else {
        console.log(`  -> 🔓 ACCIÓN: Desbloquear (Tienes Premium)`);
      }
    } else {
      // Index 0 (El primer módulo siempre entra aquí)
      console.log(`  -> 🔓 ACCIÓN: Desbloquear (Es el primer módulo gratis)`);
    }

    return {
      ...module,
      isLocked,
      lockReason,
      userProgress: userProgress || null 
    };
  });
}