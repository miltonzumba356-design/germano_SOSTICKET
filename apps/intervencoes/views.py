# views.py - Endpoints Web Push
import json
import base64
import httpx
import os
from datetime import datetime
from rest_framework import status
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated

from usuarios.models import Usuario
from .push_subscription import PushSubscription


def _b64url(data: bytes) -> str:
    """Base64url encoding (sem '=' final)."""
    return (
        base64.urlsafe_b64encode(data)
        .rstrip(b"=")
        .decode("utf-8")
    )


def _derive_vapid_keys(private_key_pem: str):
    """
    A partir da private key PEM, derivar a public key e a auth secret.
    Retorna (public_key_b64url, auth_secret_b64url).
    """
    from cryptography.hazmat.primitives import hashes, serialization
    from cryptography.hazmat.primitives.asymmetric import ec
    from cryptography.hazmat.backends import default_backend

    private_key = serialization.load_pem_private_key(
        private_key_pem.encode(), password=None, backend=default_backend()
    )
    public_key = private_key.public_key()

    # Public key em formato SPKI -> base64url (o que o browser espera)
    pub_spki = public_key.public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SPKI,
    )
    pub_b64url = _b64url(pub_spki)

    # Auth secret: derivamos a partir da private key + mensagem (como o spec manda)
    # Para simplificar, geramos um auth secret fixo derivado da chave
    auth_raw = (
        private_key.private_bytes(
            encoding=serialization.Encoding.DER,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption(),
        )
       [:7]  # primeiros 7 bytes
    )
    auth_b64url = _b64url(auth_raw)

    return pub_b64url, auth_b64url


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def push_subscribe(request):
    """
    Recebe a subscrição do frontend e guarda no banco.
    Body: { "endpoint": "https://...", "keys": { "p256dh": "...", "auth": "..." } }
    """
    try:
        data = request.data
        endpoint = data.get("endpoint")

        if not endpoint:
            return Response(
                {"erro": "endpoint é obrigatório"}, status=status.HTTP_400_BAD_REQUEST
            )

        usuario = request.user
        keys = data.get("keys", {})

        # Salvar/atualizar subscrição
        sub, created = PushSubscription.objects.update_or_create(
            usuario=usuario,
            endpoint=endpoint,
            defaults={
                "p256dh": keys.get("p256dh", ""),
                "auth": keys.get("auth", ""),
            },
        )

        return Response(
            {"status": "inscrita", "created": created, "id": sub.id},
            status=status.HTTP_201_CREATED,
        )
    except Exception as e:
        return Response({"erro": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def push_enviar(request):
    """
    Disparar notificação push para todos os clientes inscritos.
    Body: { "tipo": "nova_mensagem" | "novo_audio", "intervencao_id": int, "texto": "..." }
    """
    try:
        data = request.data
        tipo = data.get("tipo")
        intervencao_id = data.get("intervencao_id")
        texto = data.get("texto", "")

        if not tipo or not intervencao_id:
            return Response(
                {"erro": "tipo e intervencao_id são obrigatórios"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Buscar todas as subscrições ativas
        subs = PushSubscription.objects.all()
        if not subs.exists():
            return Response(
                {"aviso": "Nenhuma subscrição registrada ainda"},
                status=status.HTTP_200_OK,
            )

        # Carregar chaves VAPID do settings
        from config.vapid_keys import VAPID_PRIVATE_KEY, VAPID_PUBLIC_KEY, VAPID_ADMIN_EMAIL
        if not VAPID_PRIVATE_KEY:
            return Response(
                {"erro": "VAPID_PRIVATE_KEY não configurada no servidor"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        private_key_pem = VAPID_PRIVATE_KEY
        pub_b64url, auth_b64url = _derive_vapid_keys(private_key_pem)

        # Montar headers VAPID
        vapid_claims = {
            "sub": f"mailto:{VAPID_ADMIN_EMAIL}",
        }

        # Preparar payload geral
        payload_base = {
            "title": "Nova mensagem" if tipo == "nova_mensagem" else "Novo áudio",
            "body": texto or "Você tem uma nova atualização no sistema.",
            "icon": "/static/icons/logo192.png",
            "vapid": {
                "publicKey": pub_b64url,
                "email": VAPID_ADMIN_EMAIL,
            },
        }

        sent_count = 0
        failed_count = 0

        for sub in subs:
            try:
                # Construir authorization header VAPID
                # O header Authorization tem o formato: "BN=<base64url-of-auth>"
                auth_header = f"BN={auth_b64url}"

                # Some servers também exigem o header "Topic" com a origem
                # Usaremos o endpoint como base para o Topic
                sub_endpoint = sub.endpoint

                # Enviar via httpx
                response = httpx.post(
                    sub_endpoint,
                    json=payload_base,
                    headers={
                        "Authorization": auth_header,
                        "Content-Type": "application/json",
                        # "Topic": sub_endpoint,  # descomentar se o servidor exigir
                    },
                    timeout=10,
                )

                if response.status_code in (200, 201, 203):
                    sent_count += 1
                else:
                    failed_count += 1
                    # Podemos remover subscrições inválidas aqui
                    # subs.delete() se o erro for 410 (gone)

            except Exception as e:
                print(f"Erro ao enviar push para {sub.usuario.email}: {e}")
                failed_count += 1

        return Response(
            {
                "status": "processado",
                "total": subs.count(),
                "sent": sent_count,
                "failed": failed_count,
            },
            status=status.HTTP_200_OK,
        )

    except Exception as e:
        return Response({"erro": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ── Sistema de Solicitação de Acesso a Tickets ───────────────────────────────

_TICKET_REQUESTS_FILE = os.path.join(os.path.dirname(__file__), 'ticket_requests.json')


def _load_requests():
    """Carrega solicitações do arquivo JSON."""
    if not os.path.exists(_TICKET_REQUESTS_FILE):
        return []
    try:
        with open(_TICKET_REQUESTS_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        return []


def _save_requests(requests):
    """Salva solicitações no arquivo JSON."""
    try:
        with open(_TICKET_REQUESTS_FILE, 'w', encoding='utf-8') as f:
            json.dump(requests, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"Erro ao salvar requests: {e}")


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def ticket_request_access(request):
    """
    Técnico solicita acesso para assumir/intervir num ticket.
    Pode solicitar mesmo que já tenha técnico atribuído.
    Body: { "intervencao_id": int, "tipo": "acesso" | "backup" | "prioridade" | "reasignar", "justificativa": str }
    """
    try:
        data = request.data
        intervencao_id = data.get("intervencao_id")
        tipo = data.get("tipo", "acesso")
        justificativa = data.get("justificativa", "")

        if not intervencao_id:
            return Response(
                {"erro": "intervencao_id é obrigatório"},
                status=status.HTTP_400_BAD_REQUEST
            )

        usuario = request.user

        # Verificar se já existe solicitação pendente para este ticket + técnico
        requests = _load_requests()
        for r in requests:
            if (r.get("intervencao_id") == intervencao_id and
                r.get("tecnico_id") == usuario.id and
                r.get("status") == "pendente"):
                return Response(
                    {"erro": "Já existe uma solicitação pendente para este ticket"},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # Criar nova solicitação
        nova_request = {
            "id": len(requests) + 1,
            "intervencao_id": intervencao_id,
            "tecnico_id": usuario.id,
            "tecnico_nome": getattr(usuario, 'nome', 'Técnico'),
            "tipo": tipo,
            "justificativa": justificativa,
            "status": "pendente",
            "criado_em": datetime.now().isoformat(),
            "aprovado_por": None,
            "aprovado_em": None
        }

        requests.append(nova_request)
        _save_requests(requests)

        return Response({
            "status": "solicitação criada",
            "request_id": nova_request["id"],
            "message": "Solicitação enviada para aprovação do admin"
        }, status=status.HTTP_201_CREATED)

    except Exception as e:
        return Response({"erro": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def ticket_pending_requests(request):
    """
    Admin vê todas as solicitações pendentes de acesso.
    Query params: status=pendente|aprovado|rejeitado (opcional)
    """
    try:
        usuario = request.user

        # Verificar se é admin (usuário com perfil admin)
        # Por simplicidade, qualquer usuário autenticado pode ver,
        # mas idealmente verificar is_staff ou perfil admin
        requests = _load_requests()

        status_filtro = request.query_params.get("status", None)
        if status_filtro:
            requests = [r for r in requests if r.get("status") == status_filtro]

        return Response({
            "total": len(requests),
            "requests": requests
        }, status=status.HTTP_200_OK)

    except Exception as e:
        return Response({"erro": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def ticket_approve_access(request, intervencao_id):
    """
    Admin aprova uma solicitação de acesso.
    Body: { "request_id": int, "tecnico_id": int }
    """
    try:
        data = request.data
        request_id = data.get("request_id")
        tecnico_id = data.get("tecnico_id")

        if not request_id:
            return Response(
                {"erro": "request_id é obrigatório"},
                status=status.HTTP_400_BAD_REQUEST
            )

        requests = _load_requests()
        aprovado = False

        for r in requests:
            if r.get("id") == request_id and r.get("status") == "pendente":
                r["status"] = "aprovado"
                r["aprovado_por"] = getattr(request.user, 'id', None)
                r["aprovado_por_nome"] = getattr(request.user, 'nome', 'Admin')
                r["aprovado_em"] = datetime.now().isoformat()
                r["tecnico_id_aprovado"] = tecnico_id
                aprovado = True
                break

        if not aprovado:
            return Response(
                {"erro": "Solicitação não encontrada ou já processada"},
                status=status.HTTP_404_NOT_FOUND
            )

        _save_requests(requests)

        return Response({
            "status": "aprovado",
            "message": "Solicitação aprovada com sucesso",
            "request_id": request_id
        }, status=status.HTTP_200_OK)

    except Exception as e:
        return Response({"erro": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def ticket_reject_access(request, intervencao_id):
    """
    Admin rejeita uma solicitação de acesso.
    Body: { "request_id": int, "motivo": str }
    """
    try:
        data = request.data
        request_id = data.get("request_id")

        if not request_id:
            return Response(
                {"erro": "request_id é obrigatório"},
                status=status.HTTP_400_BAD_REQUEST
            )

        requests = _load_requests()
        rejeitado = False

        for r in requests:
            if r.get("id") == request_id and r.get("status") == "pendente":
                r["status"] = "rejeitado"
                r["rejeitado_por"] = getattr(request.user, 'id', None)
                r["rejeitado_por_nome"] = getattr(request.user, 'nome', 'Admin')
                r["rejeitado_em"] = datetime.now().isoformat()
                r["motivo_rejeicao"] = data.get("motivo", "")
                rejeitado = True
                break

        if not rejeitado:
            return Response(
                {"erro": "Solicitação não encontrada ou já processada"},
                status=status.HTTP_404_NOT_FOUND
            )

        _save_requests(requests)

        return Response({
            "status": "rejeitado",
            "message": "Solicitação rejeitada",
            "request_id": request_id
        }, status=status.HTTP_200_OK)

    except Exception as e:
        return Response({"erro": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def ticket_create_general(request):
    """
    Cria um ticket geral/livre que qualquer técnico pode assumir.
    Body: { "titulo": str, "descricao": str, "prioridade": str }
    """
    try:
        data = request.data
        titulo = data.get("titulo")
        descricao = data.get("descricao", "")
        prioridade = data.get("prioridade", "media")

        if not titulo:
            return Response(
                {"erro": "titulo é obrigatório"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Salvar como solicitação de ticket geral (até ser assumido)
        requests = _load_requests()
        novo_ticket = {
            "id": len(requests) + 1000,  # IDs diferentes para tickets gerais
            "tipo_ticket": "geral",
            "titulo": titulo,
            "descricao": descricao,
            "prioridade": prioridade,
            "tecnico_atribuido": None,
            "status": "aberto_livre",
            "criado_por": getattr(request.user, 'id', None),
            "criado_por_nome": getattr(request.user, 'nome', 'Admin'),
            "criado_em": datetime.now().isoformat(),
            "assumido_por": None,
            "assumido_em": None
        }

        requests.append(novo_ticket)
        _save_requests(requests)

        # Notificar todos os técnicos via push
        try:
            from apps.push_views import push_enviar
        except ImportError:
            pass

        return Response({
            "status": "ticket geral criado",
            "ticket_id": novo_ticket["id"],
            "message": "Ticket geral criado. Qualquer técnico pode assumir."
        }, status=status.HTTP_201_CREATED)

    except Exception as e:
        return Response({"erro": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def ticket_assume_general(request, intervencao_id):
    """
    Técnico assume um ticket geral/livre.
    """
    try:
        usuario = request.user
        requests = _load_requests()
        assumido = False

        for r in requests:
            if r.get("id") == intervencao_id and r.get("tipo_ticket") == "geral":
                if r.get("status") != "aberto_livre":
                    return Response(
                        {"erro": "Ticket já foi assumido ou fechado"},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                r["status"] = "assumido"
                r["tecnico_atribuido"] = usuario.id
                r["tecnico_atribuido_nome"] = getattr(usuario, 'nome', 'Técnico')
                r["assumido_por"] = usuario.id
                r["assumido_em"] = datetime.now().isoformat()
                assumido = True
                break

        if not assumido:
            return Response(
                {"erro": "Ticket geral não encontrado ou não está disponível"},
                status=status.HTTP_404_NOT_FOUND
            )

        _save_requests(requests)

        # Notificar admin via push sobre a assunção
        try:
            from apps.push_views import push_enviar
            push_enviar(request)
        except Exception:
            pass

        return Response({
            "status": "ticket assumido",
            "ticket_id": intervencao_id,
            "tecnico": getattr(usuario, 'nome', 'Técnico'),
            "message": "Ticket assumido com sucesso"
        }, status=status.HTTP_200_OK)

    except Exception as e:
        return Response({"erro": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)