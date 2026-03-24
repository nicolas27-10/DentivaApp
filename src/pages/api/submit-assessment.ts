import type { APIRoute } from 'astro';
// Asegúrate de importar tu cliente de Supabase configurado
import { supabase } from '../../lib/supabaseClient'; 

export const POST: APIRoute = async ({ request }) => {
  try {
    // 1. Recibir los datos del frontend
    // Esperamos un payload así: { userId: 'uuid', moduleId: 1, answers: [{ exerciseId: 1, optionId: 4 }, ...] }
    const body = await request.json();
    const { userId, moduleId, answers } = body;

    if (!userId || !moduleId || !answers || answers.length === 0) {
      return new Response(JSON.stringify({ error: 'Faltan datos requeridos' }), { status: 400 });
    }

    // 2. Obtener las respuestas correctas de la base de datos
    // Extraemos solo los IDs de los ejercicios que el usuario respondió
    const exerciseIds = answers.map((a: any) => a.exerciseId);

    // Consultamos las opciones correctas de esos ejercicios
    const { data: correctOptions, error: fetchError } = await supabase
      .from('exercise_options')
      .select('exercise_id, id')
      .in('exercise_id', exerciseIds)
      .eq('is_correct', true);

    if (fetchError) throw fetchError;

    // 3. Evaluar las respuestas y calcular el puntaje
    let correctCount = 0;
    const totalQuestions = answers.length;

    answers.forEach((userAnswer: any) => {
      // Buscamos cuál era la opción correcta para este ejercicio
      const correctOption = correctOptions.find(opt => opt.exercise_id === userAnswer.exerciseId);
      
      // Si la opción que envió el usuario coincide con el ID de la correcta, sumamos un punto
      if (correctOption && correctOption.id === userAnswer.optionId) {
        correctCount++;
      }
    });

    // Calculamos el porcentaje (ej: 4 buenas de 5 = 80)
    const score = Math.round((correctCount / totalQuestions) * 100);
    const passed = score >= 70; // Nuestra regla de negocio para desbloquear

    // 4. Actualizar el progreso del usuario (UPSERT)
    // Usamos upsert por si el usuario está repitiendo el assessment para mejorar nota
    const { error: upsertError } = await supabase
      .from('user_progress')
      .upsert({
        user_id: userId,
        module_id: moduleId,
        assessment_score: score,
        is_unlocked: passed,
        completed: passed, // Podríamos marcar el módulo como completado aquí también
        // created_at / unlocked_at se pueden manejar con defaults en Supabase
      }, { onConflict: 'user_id, module_id' }); // IMPORTANTE: Necesitas una llave única compuesta en DB para esto

    if (upsertError) throw upsertError;

    // 5. Responder al frontend con los resultados
    return new Response(JSON.stringify({
      success: true,
      score,
      passed,
      message: passed ? '¡Assessment aprobado! Ejercicios desbloqueados.' : 'No alcanzaste el mínimo. ¡Inténtalo de nuevo!'
    }), { status: 200 });

  } catch (error: any) {
    console.error('Error en submit-assessment:', error);
    return new Response(JSON.stringify({ error: 'Error interno del servidor' }), { status: 500 });
  }
};