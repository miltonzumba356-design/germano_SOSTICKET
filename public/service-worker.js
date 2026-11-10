// service-worker.js - Registo de Service Worker para Web Push
// Este ficheiro deve estar na raíz do projeto Vite (public/) ou ser importado via module type "import { register } from 'react/webkit' // or manual registration

const VAPID_PUBLIC_KEY = '<YOUR_VAPID_PUBLIC_KEY_HERE>'; // Substituir na build ou via env
const VAPID_ADMIN_EMAIL = 'admin@seu-dominio.com';

// Converter a public key de base64 para o formato que o browser espera
function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; i++) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

// Verificar se o Service Worker já está registado
let isRegistered = false;

function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) {
        console.log('Service Workers não suportados neste browser.');
        return;
    }

    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
            .then(registration => {
                console.log('Service Worker registado:', registration.scope);

                // Solicitar permissão de notificação
                return registration.showNotification ? registration : null;
            })
            .then(registration => {
                if (!registration) return;

                // Verificar permissão
                return Notification.permission;
            })
            .then(permission => {
                if (permission === 'denied') {
                    console.log('Permissão de notificação negada pelo utilizador.');
                    return;
                }

                if (permission !== 'granted') {
                    // Solicitar permissão ao utilizador
                    return Notification.requestPermission();
                }

                // Utilizador já concedeu permissão - obter subscrição
                return navigator.serviceWorker.getRegistration();
            })
            .then(registration => {
                if (!registration) return;

                return registration.pushManager.getSubscription();
            })
            .then(subscription => {
                if (subscription) {
                    // Já tem subscrição - enviar ao backend
                    console.log('Subscrição existente:', subscription.endpoint);
                    sendSubscriptionToBackend(subscription);
                } else {
                    // Criar nova subscrição
                    createNewSubscription(registration);
                }
            })
            .catch(err => {
                console.error('Erro no registration:', err);
            });
    });
}

// Criar nova subscrição
function createNewSubscription(registration) {
    const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);

    registration.pushManager.subscribe({
        userVisibleOnly: true, // importante para que a notificação apareça mesmo com a aba fechada
        applicationServerKey: applicationServerKey,
    })
    .then(subscription => {
        console.log('Nova subscrição criada:', subscription.endpoint);
        sendSubscriptionToBackend(subscription);
    })
    .then(() => {
        // Mostrar mensagem para o utilizador
        if (Notification.permission === 'granted') {
            new Notification('Permissão concedida', {
                body: 'Você permitirá receber notificações do sistema?',
                icon: '/static/icons/logo192.png',
            });
        }
    })
    .catch(err => {
        console.error('Erro ao criar subscrição:', err);
        // O usuário pode ter negado a permissão
        if (Notification.permission === 'denied') {
            console.log('O usuário bloqueou notificações.');
        }
    });
}

// Enviar subscrição ao backend
async function sendSubscriptionToBackend(subscription) {
    try {
        const response = await fetch('/api/push/subscribe/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                endpoint: subscription.endpoint,
                keys: {
                    p256dh: btoa(String.fromCharCode.apply(null, new Uint8Array(subscription.getKey('p256dh')))),
                    auth: btoa(String.fromCharCode.apply(null, new Uint8Array(subscription.getKey('auth')))),
                },
            }),
        });

        if (response.ok) {
            console.log('Subscrição enviada ao backend com sucesso.');
        } else {
            console.error('Falha ao enviar subscrição:', response.status);
        }
    } catch (error) {
        console.error('Erro ao enviar subscrição:', error);
    }
}

// Exportar para uso externo (se o framework exigir)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { registerServiceWorker, urlBase64ToUint8Array };
}

// Auto-registrar quando o DOM estiver pronto (opcional)
// document.addEventListener('DOMContentLoaded', registerServiceWorker);