// utils/fetchInvoice.js
import { supabase } from "../../config/supabaseClient.js";

export async function fetchInvoiceById(id, type = "baticom") {
  try {
    const table = type === "gts" ? "invoices_gts" : "invoices";
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error("Erreur fetchInvoiceById:", err);
    return null;
  }
}
