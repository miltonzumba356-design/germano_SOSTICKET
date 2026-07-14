
  import { createRoot } from "react-dom/client";
  import App from "./app/App.tsx";
  import "./styles/index.css";
  import "./styles/role-themes.css";

  const originalRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function patchedRemoveChild<T extends Node>(child: T): T {
    if (child.parentNode !== this) return child;
    return originalRemoveChild.call(this, child) as T;
  };

  createRoot(document.getElementById("root")!).render(<App />);

  // Nota: o registo do Service Worker é injetado automaticamente pelo vite-plugin-pwa
  // (registerSW.js) durante o build — um registo manual aqui duplicaria a subscrição.
