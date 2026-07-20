
  import { createRoot } from "react-dom/client";
  import App from "./app/App.tsx";
  import { ErrorBoundary } from "./app/components/ErrorBoundary.tsx";
  import "./styles/index.css";
  import "./styles/role-themes.css";

  const originalRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function patchedRemoveChild<T extends Node>(child: T): T {
    if (child.parentNode !== this) return child;
    return originalRemoveChild.call(this, child) as T;
  };

  createRoot(document.getElementById("root")!).render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );

  // Nota: o registo do Service Worker é injetado automaticamente pelo vite-plugin-pwa
  // (registerSW.js) durante o build — um registo manual aqui duplicaria a subscrição.
  // Como o SW usa skipWaiting+clientsClaim, força reload quando um novo SW assume o
  // controlo, para a PWA instalada nunca ficar presa a executar JS de um build antigo.
  if ('serviceWorker' in navigator) {
    let recarregando = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (recarregando) return;
      recarregando = true;
      window.location.reload();
    });
  }
