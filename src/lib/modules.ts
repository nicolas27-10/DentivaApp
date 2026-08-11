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

  // 👇 LÓGICA DE SUSCRIPCIÓN
  let hasSubscription = false;
  if (userId) {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("is_premium")
      .eq("id", userId)
      .single()
      .setHeader('Authorization', `Bearer ${token}`);
      
    if (!profileError && profile) {
      hasSubscription = profile.is_premium === true || profile.is_premium === 'true';
    }
  }

  // 🔍 NUEVO: OBTENER TOTALES DE EJERCICIOS PARA EL DASHBOARD
  // Con esto el backend calcula los ejercicios totales y completados reales de cada módulo.
  const { data: allLessons } = await supabase.from("lessons").select("id, module_id").setHeader('Authorization', `Bearer ${token}`);
  const { data: allExercises } = await supabase.from("exercises").select("id, lesson_id").neq("type", "multiple_choice").setHeader('Authorization', `Bearer ${token}`);
  const { data: allAttempts } = await supabase.from("user_attempts").select("exercise_id").eq("user_id", userId).setHeader('Authorization', `Bearer ${token}`);
  
  const attemptedSet = new Set(allAttempts?.map(a => a.exercise_id) || []);

  console.log("--- INICIANDO REVISIÓN DE MÓDULOS ---");

  return modules.map((module, index) => {
    
    // 🧮 CÁLCULO DE EJERCICIOS DEL MÓDULO
    const moduleLessonIds = allLessons?.filter(l => l.module_id === module.id).map(l => l.id) || [];
    const moduleExercises = allExercises?.filter(e => moduleLessonIds.includes(e.lesson_id)) || [];
    
    const total_exercises = moduleExercises.length;
    const completed_exercises = moduleExercises.filter(e => attemptedSet.has(e.id)).length;
    
    // Calculamos el porcentaje real para apoyar a la tabla user_progress
    const actualPercentage = total_exercises > 0 ? Math.round((completed_exercises / total_exercises) * 100) : 0;

    let userProgress = progress?.find((p) => p.module_id === module.id);
    
    // Si no hay registro o está en 0, usamos el porcentaje real recién calculado
    if (!userProgress) {
        userProgress = { progress_percentage: actualPercentage } as any;
    } else if ((userProgress.progress_percentage === 0 || !userProgress.progress_percentage) && actualPercentage > 0) {
        userProgress.progress_percentage = actualPercentage;
    }

    let isLocked = false;
    let lockReason = null; 

    console.log(`\nEvaluando Módulo: [${index}] ${module.title}`);
    console.log(` -> DB Total: ${total_exercises} | DB Completados: ${completed_exercises}`);

    // Si index > 0 significa: "A partir del SEGUNDO módulo"
    if (index > 0) {
      const previousModule = modules[index - 1];
      const previousProgress = progress?.find((p) => p.module_id === previousModule.id);
      
      // Cálculo robusto del progreso anterior por si la base de datos está retrasada
      const prevLessonIds = allLessons?.filter(l => l.module_id === previousModule.id).map(l => l.id) || [];
      const prevExercises = allExercises?.filter(e => prevLessonIds.includes(e.lesson_id)) || [];
      const prevCompleted = prevExercises.filter(e => attemptedSet.has(e.id)).length;
      const realPrevPercentage = prevExercises.length > 0 ? Math.round((prevCompleted / prevExercises.length) * 100) : 0;

      const prevPercentage = Math.max(Number(previousProgress?.progress_percentage) || 0, realPrevPercentage);
      
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
      else if (!hasSubscription) {
        isLocked = true; 
        lockReason = 'subscription_required';
        console.log(`  -> 🔒 ACCIÓN: Bloquear (Requiere suscripción Premium)`);
      } else {
        console.log(`  -> 🔓 ACCIÓN: Desbloquear (Tienes Premium)`);
      }
    } else {
      console.log(`  -> 🔓 ACCIÓN: Desbloquear (Es el primer módulo gratis)`);
    }

    return {
      ...module,
      isLocked,
      lockReason,
      userProgress, 
      total_exercises,       // 👈 AQUÍ ENVIAMOS LOS DATOS AL FRONTEND
      completed_exercises    // 👈 AQUÍ ENVIAMOS LOS DATOS AL FRONTEND
    };
  });
}