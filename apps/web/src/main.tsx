import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./index.css";
import { OpsProvider } from "./store/OpsContext";
import { SessionProvider } from "./store/SessionContext";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <SessionProvider>
      <OpsProvider>
        <App />
      </OpsProvider>
    </SessionProvider>
  </StrictMode>,
);
