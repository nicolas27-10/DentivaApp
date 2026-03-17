import { supabase } from "./supabaseClient";

export async function getModules() {
  const { data, error } = await supabase
    .from("modules")
    .select("*")
    .order("order_index", { ascending: true });

  if (error) {
    console.error(error);
    return [];
  }

  return data;
}