import { useEffect, useState, useRef } from 'react';

/**
 * Hook para gerenciar Web Push Notifications no cliente.
 * Retorna:
 * - permission: 'granted' | 'denied' | 'default'
 * - subscription: objeto da subscrição ou null
 * - register: função para registrar/pedir permissão manualmente
 * - isSupported: boolean se o browser suporta push
 */
export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>(
    Notification.permission
  );
  const [subscription, setSubscription] = useState<
    | {
        endpoint: string;
        keys: { p256dh: string; auth: string };
      }
    | null
  >(null);
  const [isSupported, setIsSupported] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    // Verificar suporte
    const isSupported =
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;
    setIsSupported(isSupported);

    if (!isSupported) {
      console.log("Web Push não suportado neste browser.");
      return;
    }

    // Solicitar permissão na montagem (ou pode ser acionado por ação do usuário)
    if (ref.current) {
      // Nota: em produção, chamar o registro após o usuário interagir com a page
      // ex: ao clicar em "Permitir notificações" botão.
      // Aqui apenas configuramos o listener.
      Notification.requestPermission().then(setPermission);
    }

    // Listener para mudanças de permissão
    const handlePermissionChange = (newPermission: NotificationPermission) => {
      setPermission(newPermission);
    };
    Notification.onpermissionchange = handlePermissionChange;

    // Verificar subscrição existente ao carregar
    if (isSupported && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .getRegistration()
        .then((registration) => {
          if (!registration) return;
          return registration.pushManager.getSubscription();
        })
        .then((existingSubscription) => {
          if (existingSubscription) {
            setSubscription({
              endpoint: existingSubscription.endpoint,
              keys: {
                p256dh: btoa(
                  String.fromCharCode(
                    ...new Uint8Array(existingSubscription.getKey("p256dh"))
                  )
                ),
                auth: btoa(
                  String.fromCharCode(
                    ...new Uint8Array(existingSubscription.getKey("auth"))
                  )
                ),
              },
            });
          }
        })
        .catch((err) => {
          console.error("Erro ao verificar subscrição:", err);
        });
    }

    // Limpeza
    return () => {
      Notification.onpermissionchange = handlePermissionChange;
    };
  }, []);

  // Função para registrar manualmente (chamar após ação do usuário)
  const register = async () => {
    if (!isSupported) return false;

    try {
      const registration = await navigator.serviceWorker.ready;

      // Se já tiver permissão granted, tentar criar subscrição
      if (permission === "granted") {
        // Placeholder - a key real viria de config
        const applicationServerKey = urlBase64ToUint8Array(""); // TODO: inserir VAPID_PUBLIC_KEY

        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: applicationServerKey,
        });

        setSubscription({
          endpoint: subscription.endpoint,
          keys: {
            p256dh: "",
            auth: "",
          },
        });

        // Enviar ao backend
        // await fetch('/api/push/subscribe/', { method: 'POST', body: JSON.stringify(subscription) });
        return true;
      }

      // Se permissão não granted, solicitar
      if (permission === "default") {
        const result = await Notification.requestPermission();
        setPermission(result);
        if (result === "granted") {
          return await register(); // tentar novamente
        }
      }

      return false;
    } catch (error) {
      console.error("Erro ao registrar push:", error);
      return false;
    }
  };

  return {
    permission,
    subscription,
    isSupported,
    register,
  };
}

/**
 * Função auxiliar para converter public key base64 -> Uint8Array
 * (idêntica ao do service worker)
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}