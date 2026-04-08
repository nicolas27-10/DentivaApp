import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

export const POST: APIRoute = async ({ request }) => {
  try {
    // 1. INICIALIZAMOS ADENTRO DE LA PETICIÓN
    // Leemos de import.meta.env (Astro) y si falla, de process.env (Node)
    const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL;
    const serviceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("🚨 Faltan credenciales de Supabase al intentar guardar la lección");
      return new Response(JSON.stringify({ error: 'Falta configuración en el servidor' }), { status: 500 });
    }

    // Creamos el cliente de forma segura porque ya verificamos que las llaves existen
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // 2. PROCESAMOS LOS DATOS
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

    // OBTENEMOS EL MÓDULO PARA ACTUALIZAR EL PROGRESO
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
    return new Response(JSON.stringify({ error: 'Error interno del servidor' }), { status: 500 });
  }
};