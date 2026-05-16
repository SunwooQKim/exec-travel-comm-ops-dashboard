import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./index.css";
import { OpsProvider } from "./store/OpsContext";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <OpsProvider>
      <App />
    </OpsProvider>
  </StrictMode>,
);
