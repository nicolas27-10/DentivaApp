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

    // 1. Obtener la respuesta correcta y la explicación en UNA sola consulta
    // Hacemos un JOIN implícito en Supabase usando la sintaxis de relaciones
    const { data: exerciseData, error: fetchError } = await supabase
      .from('exercises')
      .select(`
        id,
        explanation,
        lesson_id,
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

    // 3. Registrar el intento en la base de datos (¡Esto es lo que marca el ejercicio como "Completado"!)
    // Lo hacemos con un INSERT sin esperar (fire-and-forget) o lo esperamos rápido.
    const { error: insertError } = await supabase
      .from('user_attempts')
      .insert({
        user_id: userId,
        exercise_id: exerciseId,
        answer_text: optionId.toString(), // Guardamos el ID como texto por si luego hay fill_blank
        is_correct: isCorrect,
        points_earned: isCorrect ? 10 : 0 
      });

    if (insertError) {
      console.error('Error guardando el intento:', insertError);
      // No rompemos la ejecución, el usuario igual debe recibir su feedback en Modo Lernen
    }

    // 4. Responder al frontend rapidísimo (< 300ms)
    return new Response(JSON.stringify({
      correct: isCorrect,
      correctOptionId: correctOption?.id,
      explanation: exerciseData.explanation // 👈 Clave para el Modo Lernen
    }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('API Error:', error);
    return new Response(JSON.stringify({ error: 'Error del servidor' }), { status: 500 });
  }
};