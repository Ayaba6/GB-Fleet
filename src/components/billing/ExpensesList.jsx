import React, { useState, useEffect } from "react";
import { supabase } from "../../config/supabaseClient.js";
import ExpensesList from "./ExpensesList.jsx";
import ExpenseForm from "./ExpenseForm.jsx";

export default function ExpensesPage() {
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenses, setExpenses] = useState([]);
  const [camions, setCamions] = useState([]);

  const fetchExpenses = async () => {
    const { data, error } = await supabase.from("expenses").select("*");
    if (!error) setExpenses(data || []);
  };

  const fetchCamions = async () => {
    const { data, error } = await supabase.from("camions").select("*");
    if (!error) setCamions(data || []);
  };

  useEffect(() => {
    fetchExpenses();
    fetchCamions();
  }, []);

  const refresh = () => {
    fetchExpenses();
    fetchCamions();
  };

  return (
    <div className="p-6">
      <ExpensesList
        expenses={expenses}
        camions={camions}
        refresh={refresh}
        onAdd={() => setIsExpenseModalOpen(true)}
      />

      <ExpenseForm
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        refresh={refresh}
      />
    </div>
  );
}
