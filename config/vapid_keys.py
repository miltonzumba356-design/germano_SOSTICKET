# Configurações VAPID para Web Push no Django
# Este ficheiro pode ser importado das settings do Django ou definido diretamente.

# Chaves VAPID (gerar com: python -c "import ecc; ..." ou usar a biblioteca webpush)
# Estas chaves são públicas e podem ser distribuídas ao frontend.
# O private_key fica no servidor (settings/secrets).

VAPID_PRIVATE_KEY = None  # Defina aqui ou via environment variable VAPID_PRIVATE_KEY
VAPID_PUBLIC_KEY = None   # Defina aqui ou via environment variable VAPID_PUBLIC_KEY
VAPID_ADMIN_EMAIL = "admin@seu-dominio.com"  # Email do administrador do sistema

# Se não estiverem definidas nas settings, tentar ler do ambiente
import os
if not VAPID_PRIVATE_KEY:
    VAPID_PRIVATE_KEY = os.environ.get("VAPID_PRIVATE_KEY")
if not VAPID_PUBLIC_KEY:
    VAPID_PUBLIC_KEY = os.environ.get("VAPID_PUBLIC_KEY")