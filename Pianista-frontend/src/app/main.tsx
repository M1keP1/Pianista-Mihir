/**
 * Browser entrypoint that mounts React with routing and theming providers so
 * feature modules can assume those contexts are available.
 */
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import App from "@/app/App";
import { ThemeProvider } from "@/app/providers/ThemeProvider";
import "@/app/styles/index.css";
import "@/app/styles/theme.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>
);
