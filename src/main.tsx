import { createRoot } from "react-dom/client";
import App from "./App";
import { ErrorBoundary } from "./pages/ErrorBoundary";
import "./styles/index.css";

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary> 
    <App />
  </ErrorBoundary>
);