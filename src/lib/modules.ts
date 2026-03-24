import { supabase } from "./supabaseClient";

export async function getModulesWithProgress(userId: string | undefined) {
  // 1. Traemos los módulos ordenados
  const { data: modules, error: modError } = await supabase
    .from("modules")
    .select("*")
    .order("order_index", { ascending: true });

  if (modError) {
    console.error("Error cargando módulos:", modError);
    return [];
  }

  // 2. Traemos el progreso específico de ESTE usuario
  const { data: progress, error: progError } = await supabase
    .from("user_progress")
    .select("*")
    .eq("user_id", userId);

  if (progError) {
    console.error("Error cargando progreso:", progError);
    return [];
  }

  // 3. Cruzamos los datos para saber qué está bloqueado
  return modules.map((module, index) => {
    // Buscamos si el usuario tiene registro de progreso para este módulo
    const userProgress = progress.find((p) => p.module_id === module.id);
    
    // LÓGICA DE BLOQUEO:
    let isLocked = false;
    if (index > 1) {
      // Si no es el primer módulo, revisamos el módulo anterior
      const previousModule = modules[index - 1];
      const previousProgress = progress.find((p) => p.module_id === previousModule.id);
      
      // Si el módulo anterior NO está completado, este se bloquea
      isLocked = !previousProgress?.completed; 
    }

    return {
      ...module,
      isLocked, // ¡Esta es nuestra nueva variable mágica!
      userProgress: userProgress || null // Guardamos el progreso por si lo necesitas en la Card
    };
  });
}