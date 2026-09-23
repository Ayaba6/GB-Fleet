import React, { useState, useEffect } from "react";
import { supabase } from "./config/supabaseClient.js";
import AuthPage from "./components/Auth.jsx";
import RoleBasedRouting from "./components/RoleBasedRouting.jsx";

function App() {
  const [session, setSession] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session ?? null);
      console.log("Test rendu App ✅");
      console.log("Session actuelle :", session ? "Connectée" : "Non connectée");
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session ?? null);
      console.log("Session changée :", session ? "Connectée" : "Non connectée");
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <>
      {!session ? <AuthPage /> : <RoleBasedRouting session={session} />}
    </>
  );
}

export default App;
