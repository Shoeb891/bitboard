// App entry point — mounts the React tree into the #root div in index.html.
// BrowserRouter is placed here so the entire app has access to React Router.
// globals.css is imported here so design tokens and bb-* classes are available globally.
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";        // Tailwind base styles (@import "tailwindcss")
import "./styles/globals.css"; // Bitboard design tokens, bb-* component classes, fonts
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);
