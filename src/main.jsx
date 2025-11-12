import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./styles/global.css";
import "./index.css";
import { BrowserRouter } from "react-router-dom";
import { ToastProvider } from "./components/ui/use-toast.jsx"; // ⭐ Ajouter

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <ToastProvider> {/* ⭐ Encapsuler App dans ToastProvider */}
        <App />
      </ToastProvider>
    </BrowserRouter>
  </React.StrictMode>
);
