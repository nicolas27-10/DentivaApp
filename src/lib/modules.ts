import { supabase } from "./supabaseClient";

export async function getModulesWithProgress(userId: string | undefined, cookies: any) {
  // 1. Extraemos el token seguro de las cookies del usuario
  const token = cookies?.get('sb-access-token')?.value;

  // Si no hay ID o no hay token, cortamos de raíz
  if (!userId || !token) return [];

  // 2. Inyectamos el token en la petición de los módulos
  const { data: modules, error: modError } = await supabase
    .from("modules")
    .select("*")
    .order("order_index", { ascending: true })
    .setHeader('Authorization', `Bearer ${token}`); // 👈 Magia aquí

  if (modError) {
    console.error("Error al cargar módulos:", modError);
    return [];
  }

  // 3. Inyectamos el token en la petición del progreso
  const { data: progress, error: progError } = await supabase
    .from("user_progress")
    .select("*")
    .eq("user_id", userId)
    .setHeader('Authorization', `Bearer ${token}`); // 👈 Y magia acá

  if (progError) {
    console.error("Error al cargar progreso:", progError);
    return [];
  }

  // 💡 Tip: En el futuro, aquí podrías consultar la tabla 'profiles' 
  // o 'subscriptions' para ver si este booleano es true o false.
  const hasSubscription = false; 

  console.log("--- INICIANDO REVISIÓN DE MÓDULOS ---");

  return modules.map((module, index) => {
    const userProgress = progress.find((p) => p.module_id === module.id);
    let isLocked = false;
    let lockReason = null; 

    console.log(`\nEvaluando Módulo: [${index}] ${module.title}`);

    // Regla: Los primeros dos módulos (index 0 y 1) son siempre gratis
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

      // 1. Verificamos bloqueo por orden de estudio
      if (!isPreviousDone) {
        isLocked = true;
        lockReason = 'previous_incomplete';
        console.log(`  -> 🔒 ACCIÓN: Bloquear (falta completar anterior)`);
      } 
      // 2. Verificamos suscripción (A partir del tercer módulo, index 2)
      else if (index >= 2 && !hasSubscription) {
        isLocked = true; 
        lockReason = 'subscription_required';
        console.log(`  -> 🔒 ACCIÓN: Bloquear (Requiere suscripción Premium)`);
      } else {
        console.log(`  -> 🔓 ACCIÓN: Desbloquear`);
      }
    } else {
      console.log(`  -> 🔓 ACCIÓN: Desbloquear (Es el primer módulo)`);
    }

    return {
      ...module,
      isLocked,
      lockReason,
      userProgress: userProgress || null 
    };
  });
}