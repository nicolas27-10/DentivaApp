import type { APIRoute } from 'astro';
import { supabase } from '../../lib/supabaseClient';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { exerciseId, optionId, userId } = body;

    // Validación temprana
    if (!exerciseId || !optionId || !userId) {
      return new Response(JSON.stringify({ error: 'Faltan datos' }), { status: 400 });
    }

    // 1. Obtener respuesta, explicación Y EL MODULE_ID (Hacemos un join extra a 'lessons')
    const { data: exerciseData, error: fetchError } = await supabase
      .from('exercises')
      .select(`
        id,
        explanation,
        lesson_id,
        lessons ( module_id ), 
        exercise_options ( id, is_correct )
      `)
      .eq('id', exerciseId)
      .single();

    if (fetchError || !exerciseData) {
      throw new Error('No se pudo obtener el ejercicio');
    }

    // 2. Lógica de validación
    const correctOption = exerciseData.exercise_options.find((opt: any) => opt.is_correct);
    const isCorrect = correctOption?.id === Number(optionId);

    // 3. Registrar el intento
    const { error: insertError } = await supabase
      .from('user_attempts')
      .insert({
        user_id: userId,
        exercise_id: exerciseId,
        answer_text: optionId.toString(),
        is_correct: isCorrect,
        points_earned: isCorrect ? 10 : 0 
      });

    if (insertError) {
      console.error('Error guardando el intento:', insertError);
    } else {
      // --- PASO 3.5: ACTUALIZACIÓN AUTOMÁTICA DEL MÓDULO ---
      // Lo envolvemos en un try/catch independiente para que, si falla, 
      // el usuario siga recibiendo su respuesta correctamente.
      try {
        // Dependiendo de tu Supabase, 'lessons' puede venir como objeto o array
        const moduleId = Array.isArray(exerciseData.lessons) 
          ? exerciseData.lessons[0]?.module_id 
          : (exerciseData.lessons as any)?.module_id;

        if (moduleId) {
          // A. ¿Cuántos ejercicios tiene este módulo en total?
          const { data: moduleExercises } = await supabase
            .from('exercises')
            .select('id, lessons!inner(module_id)')
            .eq('lessons.module_id', moduleId);

            if (moduleExercises && moduleExercises.length > 0) {
              const totalEx = moduleExercises.length;
              const exIds = moduleExercises.map(e => e.id);

            // B. ¿Cuántos de esos ha hecho el usuario?
            const { data: userAttempts } = await supabase
              .from('user_attempts')
              .select('exercise_id')
              .eq('user_id', userId)
              .in('exercise_id', exIds);

            // Filtramos para contar solo ejercicios únicos (sin importar cuántas veces lo intentó)
            const uniqueCompleted = new Set(userAttempts?.map(a => a.exercise_id)).size;
            const percentage = Math.round((uniqueCompleted / totalEx) * 100);
            const isCompleted = percentage >= 100;

            // C. Guardamos el cálculo en user_progress
            // Primero revisamos si ya existe la fila para no duplicarla
            const { data: existingProgress } = await supabase
              .from('user_progress')
              .select('id')
              .eq('user_id', userId)
              .eq('module_id', moduleId)
              .single();

            if (existingProgress) {
              await supabase
                .from('user_progress')
                .update({ progress_percentage: percentage, completed: isCompleted })
                .eq('id', existingProgress.id);
            } else {
              await supabase
                .from('user_progress')
                .insert({ user_id: userId, module_id: moduleId, progress_percentage: percentage, completed: isCompleted });
            }
          }
        }
      } catch (progressError) {
        console.error('Error actualizando el progreso global del módulo:', progressError);
      }
      // --- FIN PASO 3.5 ---
    }

    // 4. Responder al frontend rapidísimo
    return new Response(JSON.stringify({
      correct: isCorrect,
      correctOptionId: correctOption?.id,
      explanation: exerciseData.explanation 
    }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('API Error:', error);
    return new Response(JSON.stringify({ error: 'Error del servidor' }), { status: 500 });
  }
};