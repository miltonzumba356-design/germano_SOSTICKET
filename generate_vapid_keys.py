import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.core.management.utils import get_random_secret_key
key = get_random_secret_key()
print('VAPID_PRIVATE_KEY =', repr(key))

# Also print a public key format - we need to generate a pair
# For VAPID, we need a private key and derive public key
# Using the webpush library approach:
try:
    from cryptography.hazmat.primitives.asymmetric import ec
    from cryptography.hazmat.primitives import serialization
    from cryptography.hazmat.backends import default_backend

    # Generate ECDSA key (P-256)
    private_key = ec.generate_private_key(ec.SECP256R1(), default_backend())
    private_pem = private_key.private_bytes(
        serialization.Encoding.PEM,
        serialization.PrivateFormat.PKCS8,
        serialization.NoEncryption(),
    )
    print('VAPID_PRIVATE_KEY_PEM =', repr(private_pem.decode()))

    # Derive public key
    public_key = private_key.public_key()
    public_pem = public_key.public_bytes(
        serialization.Encoding.PEM,
        serialization.PublicFormat.SPKI,
    )
    print('VAPID_PUBLIC_KEY =', repr(public_pem.decode()))

except ImportError:
    print("cryptography not installed, skipping key pair generation")
    print("Install with: pip install cryptography")