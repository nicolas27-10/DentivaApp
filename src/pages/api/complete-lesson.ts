import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

// 1. Creamos el "Cliente Administrador" con la llave maestra
const supabaseAdmin = createClient(
  import.meta.env.PUBLIC_SUPABASE_URL,
  import.meta.env.SUPABASE_SERVICE_ROLE_KEY // 👈 La nueva llave
);

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { userId, lessonId, answers } = body;

    if (!userId || !lessonId || !answers) {
      return new Response(JSON.stringify({ error: 'Faltan datos' }), { status: 400 });
    }

    // FORMATEAR LOS DATOS
    const attemptsToInsert = Object.entries(answers).map(([exerciseId, answerVal]) => ({
      user_id: userId,
      exercise_id: Number(exerciseId),
      answer_text: String(answerVal),
      is_correct: true,
      points_earned: 10
    }));

    const exerciseIds = attemptsToInsert.map(a => a.exercise_id);
    
    if (exerciseIds.length > 0) {
      // 👇 USAMOS supabaseAdmin EN LUGAR DE supabase
      await supabaseAdmin
        .from('user_attempts')
        .delete()
        .eq('user_id', userId)
        .in('exercise_id', exerciseIds);

      const { error: insertError } = await supabaseAdmin
        .from('user_attempts')
        .insert(attemptsToInsert);

      if (insertError) throw insertError;
    }

    // OBTENEMOS EL MÓDULO
    const { data: lessonData } = await supabaseAdmin
      .from('lessons')
      .select('module_id')
      .eq('id', lessonId)
      .single();

    if (lessonData?.module_id) {
      const moduleId = lessonData.module_id;

      const { data: moduleExercises } = await supabaseAdmin
        .from('exercises')
        .select('id, lessons!inner(module_id)')
        .eq('lessons.module_id', moduleId);

      if (moduleExercises && moduleExercises.length > 0) {
        const totalEx = moduleExercises.length;
        const exIds = moduleExercises.map(e => e.id);

        const { data: userAttempts } = await supabaseAdmin
          .from('user_attempts')
          .select('exercise_id')
          .eq('user_id', userId)
          .in('exercise_id', exIds);

        const uniqueCompleted = new Set(userAttempts?.map(a => a.exercise_id)).size;
        const percentage = Math.round((uniqueCompleted / totalEx) * 100);
        const isCompleted = percentage >= 100;

        const { data: existingProgress } = await supabaseAdmin
          .from('user_progress')
          .select('id')
          .eq('user_id', userId)
          .eq('module_id', moduleId)
          .single();

        if (existingProgress) {
          await supabaseAdmin
            .from('user_progress')
            .update({ progress_percentage: percentage, completed: isCompleted })
            .eq('id', existingProgress.id);
        } else {
          await supabaseAdmin
            .from('user_progress')
            .insert({ user_id: userId, module_id: moduleId, progress_percentage: percentage, completed: isCompleted });
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });

  } catch (error) {
    console.error('API Error:', error);
    return new Response(JSON.stringify({ error: 'Error del servidor' }), { status: 500 });
  }
};