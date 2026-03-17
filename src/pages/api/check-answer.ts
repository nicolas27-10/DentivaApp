import type { APIRoute } from "astro";
import { supabase } from "../../lib/supabaseClient";

export const POST: APIRoute = async ({ request }) => {

  const { answerId } = await request.json();

  if (!answerId) {
    return new Response(
      JSON.stringify({ error: "No answer provided" }),
      { status: 400 }
    );
  }

  // obtener opción seleccionada
  const { data: selectedOption, error } = await supabase
    .from("exercise_options")
    .select("is_correct, exercise_id")
    .eq("id", answerId)
    .single();

  if (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500 }
    );
  }

  // obtener la opción correcta del ejercicio
  const { data: correctOption } = await supabase
    .from("exercise_options")
    .select("id")
    .eq("exercise_id", selectedOption.exercise_id)
    .eq("is_correct", true)
    .single();

  return new Response(
    JSON.stringify({
      correct: selectedOption.is_correct,
      correctOptionId: correctOption?.id
    }),
    { status: 200 }
  );
};