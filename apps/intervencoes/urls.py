from django.urls import path
from . import views

urlpatterns = [
    # Endpoints Web Push
    path("push/subscribe/", views.push_subscribe, name="push_subscribe"),
    path("push/enviar/", views.push_enviar, name="push_enviar"),

    # Sistema de Solicitação de Acesso a Tickets
    path("intervencoes/<int:intervencao_id>/request-access/", views.ticket_request_access, name="ticket_request_access"),
    path("intervencoes/pending-requests/", views.ticket_pending_requests, name="ticket_pending_requests"),
    path("intervencoes/<int:intervencao_id>/approve-access/", views.ticket_approve_access, name="ticket_approve_access"),
    path("intervencoes/<int:intervencao_id>/reject-access/", views.ticket_reject_access, name="ticket_reject_access"),

    # Tickets Gerais/Livres
    path("intervencoes/general/", views.ticket_create_general, name="ticket_create_general"),
    path("intervencoes/<int:intervencao_id>/assume/", views.ticket_assume_general, name="ticket_assume_general"),
]