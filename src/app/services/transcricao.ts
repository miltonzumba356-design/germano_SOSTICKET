import { fetchAPI } from './api';

/**
 * Transcrição de notas de voz.
 *
 * O Whisper corre no backend (faster-whisper). Este serviço:
 *  - guarda o resultado em cache para não repetir pedidos;
 *  - junta pedidos do mesmo áudio (evita duplicados);
 *  - serializa as transcrições, porque o modelo é pesado e não deve
 *    correr em paralelo no servidor.
 */

export interface ResultadoTranscricao {
  texto: string;
  idioma: string;
  cache?: boolean;
}

const cache = new Map<string, ResultadoTranscricao>();
const emAndamento = new Map<string, Promise<ResultadoTranscricao>>();

let fila: Promise<unknown> = Promise.resolve();

function chave(intervencaoId: string, anexoId: string) {
  return `${intervencaoId}:${anexoId}`;
}

/** Devolve uma transcrição já obtida nesta sessão, se existir. */
export function transcricaoEmCache(intervencaoId: string, anexoId: string) {
  return cache.get(chave(intervencaoId, anexoId));
}

export function transcreverAnexo(
  intervencaoId: string,
  anexoId: string,
  idioma?: string
): Promise<ResultadoTranscricao> {
  const k = chave(intervencaoId, anexoId);

  const guardado = cache.get(k);
  if (guardado) return Promise.resolve(guardado);

  const aCorrer = emAndamento.get(k);
  if (aCorrer) return aCorrer;

  const tarefa = fila
    .then(async () => {
      const data = await fetchAPI<ResultadoTranscricao>(
        `/intervencoes/${intervencaoId}/anexos/${anexoId}/transcrever/`,
        {
          method: 'POST',
          body: JSON.stringify(idioma ? { idioma } : {}),
        }
      );

      const resultado: ResultadoTranscricao = {
        texto: String(data?.texto || '').trim(),
        idioma: String(data?.idioma || '').trim(),
        cache: Boolean(data?.cache),
      };

      cache.set(k, resultado);
      return resultado;
    })
    .finally(() => {
      emAndamento.delete(k);
    });

  emAndamento.set(k, tarefa);
  fila = tarefa.catch(() => undefined);

  return tarefa;
}
