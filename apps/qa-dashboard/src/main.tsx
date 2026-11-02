import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./style.css";

// Keep the entry point separate so component edits use React Fast Refresh without creating a second root.
createRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>);
