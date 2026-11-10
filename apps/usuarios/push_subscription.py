import json

from django.db import models


def push_subscription_path(instance, filename):
    """Caminho único para o ficheiro de subscrição (se usarmos ficheiro em vez de JSONField)."""


class PushSubscription(models.Model):
    """
    Modelo para armazenar as subscrições Web Push de cada utilizador.
    Cada utilizador pode ter múltiplas subscrições (diferentes browsers/devices).
    """
    usuario = models.ForeignKey(
        "usuarios.Usuario",
        on_delete=models.CASCADE,
        related_name="push_subscriptions",
        verbose_name="Utilizador",
    )
    # Endpoint fornecido pelo browser (ex: https://fcm.googleapis.com/fcm/s/...)
    endpoint = models.TextField(verbose_name="Endpoint")
    # Chaves P256DH e auth criptografadas (base64)
    p256dh = models.TextField(verbose_name="P256DH", blank=True)
    auth = models.TextField(verbose_name="Auth", blank=True)
    # Metadados opcionais
    user_agent = models.CharField(max_length=255, blank=True, verbose_name="User Agent")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Criado em")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Atualizado em")

    class Meta:
        verbose_name = "Inscrição Push"
        verbose_name_plural = "Inscrições Push"
        unique_together = ("usuario", "endpoint")  # evita duplicados

    def __str__(self):
        return f"PushSubscription {self.endpoint[:40]}... para {self.usuario.email}"

    def to_dict(self):
        """Converte para dicionário (JSON) para enviar ao frontend ou backend."""
        return {
            "endpoint": self.endpoint,
            "keys": {
                "p256dh": self.p256dh,
                "auth": self.auth,
            }
            if self.p256dh and self.auth
            else {},
        }

    @classmethod
    def from_dict(cls, usuario, data):
        """Cria ou atualiza a partir de um dicionário (payload do frontend)."""
        esp = data.get("endpoint", "")
        keys = data.get("keys", {})
        sub, created = cls.objects.update_or_create(
            usuario=usuario,
            endpoint=esp,
            defaults={
                "p256dh": keys.get("p256dh", ""),
                "auth": keys.get("auth", ""),
            },
        )
        return sub, created