import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, Languages, Loader2, Mic } from 'lucide-react';
import { transcricaoEmCache, transcreverAnexo } from '../services/transcricao';

interface AnexoTranscritivel {
  id: string;
  transcricao?: string;
  idioma_transcricao?: string;
}

interface TranscricaoAudioProps {
  intervencaoId: string;
  anexo: AnexoTranscritivel;
  /** Tradução automática ligada no chat (botão ON/OFF). */
  autoTranslate: boolean;
  /** Idioma escolhido pelo utilizador. */
  targetLanguage: string;
  /** Tradução Deepseek do hook useRealtimeTranslation. */
  translateText: (texto: string, de: string, para: string) => Promise<string>;
}

type Estado = 'idle' | 'a-transcrever' | 'erro';

/**
 * Mostra a transcrição (Whisper local) e a tradução (Deepseek) de uma nota
 * de voz, por baixo do leitor de áudio.
 */
export function TranscricaoAudio({
  intervencaoId,
  anexo,
  autoTranslate,
  targetLanguage,
  translateText,
}: TranscricaoAudioProps) {
  const [texto, setTexto] = useState(anexo.transcricao?.trim() || '');
  const [idioma, setIdioma] = useState(anexo.idioma_transcricao || '');
  const [estado, setEstado] = useState<Estado>('idle');
  const [erro, setErro] = useState('');
  const [traducao, setTraducao] = useState('');
  const [aTraduzir, setATraduzir] = useState(false);
  const pedidoFeitoRef = useRef(false);

  // Aproveita uma transcrição já feita nesta sessão (ex.: componente remontado).
  useEffect(() => {
    if (texto) return;
    const guardado = transcricaoEmCache(intervencaoId, anexo.id);
    if (guardado?.texto) {
      setTexto(guardado.texto);
      setIdioma(guardado.idioma || '');
      pedidoFeitoRef.current = true;
    }
  }, [anexo.id, intervencaoId, texto]);

  const transcrever = useCallback(async () => {
    if (pedidoFeitoRef.current && estado === 'a-transcrever') return;
    pedidoFeitoRef.current = true;
    setEstado('a-transcrever');
    setErro('');

    try {
      const resultado = await transcreverAnexo(intervencaoId, anexo.id);
      setTexto(resultado.texto);
      setIdioma(resultado.idioma || '');
      setEstado('idle');

      if (!resultado.texto) {
        setErro('Não foi detetada fala neste áudio.');
      }
    } catch (e: any) {
      setEstado('erro');
      setErro(e?.message || 'Não foi possível transcrever o áudio.');
      pedidoFeitoRef.current = false;
    }
  }, [anexo.id, estado, intervencaoId]);

  // Com a tradução automática ligada, transcreve sozinho.
  useEffect(() => {
    if (!autoTranslate || texto || estado !== 'idle' || pedidoFeitoRef.current) return;
    void transcrever();
  }, [autoTranslate, estado, texto, transcrever]);

  // Traduz a transcrição para o idioma escolhido (Deepseek).
  useEffect(() => {
    let cancelado = false;

    if (!autoTranslate || !texto) {
      setTraducao('');
      setATraduzir(false);
      return;
    }

    // Se o áudio já está no idioma de destino, não há nada a traduzir.
    if (targetLanguage && idioma && targetLanguage === idioma) {
      setTraducao('');
      setATraduzir(false);
      return;
    }

    setATraduzir(true);
    translateText(texto, idioma || 'auto', targetLanguage)
      .then((resultado) => {
        if (cancelado) return;
        const limpo = (resultado || '').trim();
        setTraducao(limpo && limpo !== texto ? limpo : '');
      })
      .catch(() => {
        if (!cancelado) setTraducao('');
      })
      .finally(() => {
        if (!cancelado) setATraduzir(false);
      });

    return () => {
      cancelado = true;
    };
  }, [autoTranslate, idioma, targetLanguage, texto, translateText]);

  if (!texto && estado === 'idle' && !autoTranslate) {
    return (
      <button
        type="button"
        onClick={() => void transcrever()}
        className="mt-1.5 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-violet-600 hover:text-violet-700"
      >
        <Mic className="w-3 h-3" />
        Transcrever
      </button>
    );
  }

  if (estado === 'a-transcrever') {
    return (
      <div className="mt-1.5 flex items-center gap-1.5 text-[10px] font-medium text-gray-500">
        <Loader2 className="w-3 h-3 animate-spin" />
        A transcrever áudio…
      </div>
    );
  }

  if (estado === 'erro') {
    return (
      <div className="mt-1.5 flex items-start gap-1.5 text-[10px] text-red-600">
        <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
        <div className="min-w-0">
          <p className="leading-snug">{erro}</p>
          <button
            type="button"
            onClick={() => void transcrever()}
            className="mt-1 font-bold uppercase tracking-wide underline"
          >
            Tentar de novo
          </button>
        </div>
      </div>
    );
  }

  if (!texto) {
    return erro ? (
      <p className="mt-1.5 text-[10px] text-gray-400">{erro}</p>
    ) : null;
  }

  return (
    <div className="mt-1.5 space-y-1.5">
      <div className="rounded-lg bg-gray-50 border border-gray-100 px-2 py-1.5">
        <p className="text-[9px] font-bold uppercase tracking-wide text-gray-400 mb-0.5">
          Transcrição · Whisper
        </p>
        <p className="text-[11px] leading-snug text-gray-700 whitespace-pre-wrap break-words">
          {texto}
        </p>
      </div>

      {aTraduzir && (
        <div className="flex items-center gap-1.5 text-[10px] font-medium text-violet-600">
          <Loader2 className="w-3 h-3 animate-spin" />
          A traduzir…
        </div>
      )}

      {!aTraduzir && traducao && (
        <div className="rounded-lg bg-violet-50 border border-violet-100 px-2 py-1.5">
          <p className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wide text-violet-500 mb-0.5">
            <Languages className="w-3 h-3" />
            Tradução · Deepseek
          </p>
          <p className="text-[11px] leading-snug text-violet-900 whitespace-pre-wrap break-words">
            {traducao}
          </p>
        </div>
      )}
    </div>
  );
}
