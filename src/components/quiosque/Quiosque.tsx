"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  lerToken,
  lerNomeDispositivo,
  KIOSK_TOKEN_HEADER,
} from "@/lib/kiosk-token";
import { carregarModelos, extrairDescritor, distancia } from "@/lib/face";
import type { ColaboradorQuiosque, TipoBatida } from "@/lib/types";
import ConfigDispositivo from "./ConfigDispositivo";
import CameraSelfie from "./CameraSelfie";
import TecladoNumerico from "./TecladoNumerico";
import { Brand } from "@/components/Brand";

const LIMIAR = Number(process.env.NEXT_PUBLIC_FACE_MATCH_THRESHOLD ?? "0.5");
const MAX_TENTATIVAS_FACIAL = 2;

type Fase =
  | "config"
  | "carregando"
  | "erro"
  | "grade"
  | "captura"
  | "pin"
  | "tipo"
  | "enviando"
  | "sucesso";

type Geo = { latitude: number; longitude: number; precisao_m: number } | null;

export default function Quiosque() {
  const [fase, setFase] = useState<Fase>("carregando");
  const [colaboradores, setColaboradores] = useState<ColaboradorQuiosque[]>([]);
  const [erroGeral, setErroGeral] = useState<string | null>(null);

  const [selecionado, setSelecionado] = useState<ColaboradorQuiosque | null>(null);
  const [foto, setFoto] = useState<string | null>(null);
  const [metodo, setMetodo] = useState<"facial" | "pin_fallback">("facial");
  const [matchConfianca, setMatchConfianca] = useState<number | null>(null);
  const [pinConfirmado, setPinConfirmado] = useState<string | null>(null);

  const [tentativas, setTentativas] = useState(0);
  const [conferindo, setConferindo] = useState(false);
  const [msgCaptura, setMsgCaptura] = useState<string | null>(null);
  const [erroPin, setErroPin] = useState<string | null>(null);

  const [confirmacao, setConfirmacao] = useState<{
    nome: string;
    tipo: TipoBatida;
    hora: string;
  } | null>(null);

  const geoRef = useRef<Geo>(null);
  const tokenRef = useRef<string | null>(null);
  const dispositivoRef = useRef<string>("quiosque");

  // -------- carregamento inicial --------
  const carregar = useCallback(async () => {
    const token = lerToken();
    if (!token) {
      setFase("config");
      return;
    }
    tokenRef.current = token;
    dispositivoRef.current = lerNomeDispositivo();
    setFase("carregando");
    setErroGeral(null);
    try {
      // Modelos de reconhecimento + lista de colaboradores em paralelo.
      const [, res] = await Promise.all([
        carregarModelos().catch(() => null),
        fetch("/api/quiosque/colaboradores", {
          headers: { [KIOSK_TOKEN_HEADER]: token },
        }),
      ]);
      if (res.status === 401) {
        setErroGeral("Este celular não está mais autorizado.");
        setFase("erro");
        return;
      }
      if (!res.ok) throw new Error("falha");
      const json = await res.json();
      setColaboradores(json.colaboradores ?? []);
      setFase("grade");
    } catch {
      setErroGeral("Não consegui carregar a lista. Verifique a internet.");
      setFase("erro");
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // -------- seleção de colaborador --------
  function escolher(c: ColaboradorQuiosque) {
    setSelecionado(c);
    setFoto(null);
    setMetodo("facial");
    setMatchConfianca(null);
    setPinConfirmado(null);
    setTentativas(0);
    setErroPin(null);
    setMsgCaptura(
      c.face_descriptor
        ? "Olhe para a câmera e toque em Tirar foto."
        : "Tire a foto e digite seu código de 4 dígitos."
    );
    // Captura um ponto de GPS (não bloqueia o fluxo se negar/demorar).
    geoRef.current = null;
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          geoRef.current = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            precisao_m: pos.coords.accuracy,
          };
        },
        () => {},
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
      );
    }
    setFase("captura");
  }

  // -------- captura + reconhecimento --------
  const aoCapturar = useCallback(
    async ({ dataUrl, canvas }: { dataUrl: string; canvas: HTMLCanvasElement }) => {
      if (!selecionado) return;
      setFoto(dataUrl);

      // Sem descritor (sem consentimento ou sem cadastro facial) => vai direto ao PIN.
      if (!selecionado.face_descriptor) {
        setMetodo("pin_fallback");
        setErroPin(null);
        setFase("pin");
        return;
      }

      setConferindo(true);
      try {
        const desc = await extrairDescritor(canvas);
        if (!desc) {
          registrarFalhaFacial("Não achei um rosto na foto. Tente de novo.");
          return;
        }
        const d = distancia(desc, selecionado.face_descriptor);
        if (d <= LIMIAR) {
          setMetodo("facial");
          setMatchConfianca(Number(d.toFixed(4)));
          setFase("tipo");
        } else {
          registrarFalhaFacial("Não reconheci o rosto. Tente de novo.");
        }
      } catch {
        registrarFalhaFacial("Erro ao conferir o rosto. Tente de novo.");
      } finally {
        setConferindo(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selecionado]
  );

  function registrarFalhaFacial(msg: string) {
    setTentativas((t) => {
      const nova = t + 1;
      if (nova >= MAX_TENTATIVAS_FACIAL) {
        setMsgCaptura(
          "Não reconheceu? Toque em “Digitar meu código”. Sua foto já foi tirada."
        );
      } else {
        setMsgCaptura(`${msg} (tentativa ${nova} de ${MAX_TENTATIVAS_FACIAL})`);
      }
      return nova;
    });
  }

  // -------- PIN --------
  async function confirmarPin(pin: string) {
    if (!selecionado) return;
    setErroPin(null);
    try {
      const res = await fetch("/api/quiosque/verificar-pin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          [KIOSK_TOKEN_HEADER]: tokenRef.current ?? "",
        },
        body: JSON.stringify({ colaborador_id: selecionado.id, pin }),
      });
      const json = await res.json();
      if (json.ok) {
        setMetodo("pin_fallback");
        setPinConfirmado(pin);
        setMatchConfianca(null);
        setFase("tipo");
      } else {
        setErroPin("Código incorreto. Tente de novo.");
      }
    } catch {
      setErroPin("Sem conexão. Tente de novo.");
    }
  }

  // -------- gravar batida --------
  async function registrar(tipo: TipoBatida) {
    if (!selecionado || !foto) return;
    setFase("enviando");
    setErroGeral(null);
    try {
      const res = await fetch("/api/quiosque/registrar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          [KIOSK_TOKEN_HEADER]: tokenRef.current ?? "",
        },
        body: JSON.stringify({
          colaborador_id: selecionado.id,
          tipo,
          metodo,
          match_confianca: matchConfianca,
          foto,
          pin: pinConfirmado,
          dispositivo: dispositivoRef.current,
          latitude: geoRef.current?.latitude ?? null,
          longitude: geoRef.current?.longitude ?? null,
          precisao_m: geoRef.current?.precisao_m ?? null,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setErroGeral(json.erro ?? "Não consegui gravar. Tente de novo.");
        setFase("tipo");
        return;
      }
      setConfirmacao({ nome: json.nome, tipo: json.tipo, hora: json.hora });
      setFase("sucesso");
      setTimeout(voltarGrade, 3500);
    } catch {
      setErroGeral("Sem conexão. A batida NÃO foi gravada. Tente de novo.");
      setFase("tipo");
    }
  }

  function voltarGrade() {
    setSelecionado(null);
    setFoto(null);
    setConfirmacao(null);
    setErroGeral(null);
    setFase("grade");
  }

  // ======================= RENDER =======================

  if (fase === "config") {
    return <ConfigDispositivo onPronto={carregar} />;
  }

  if (fase === "carregando") {
    return (
      <Tela>
        <p className="text-xl text-white/80">Carregando…</p>
      </Tela>
    );
  }

  if (fase === "erro") {
    return (
      <Tela>
        <p className="max-w-sm text-center text-xl font-semibold text-alert-red">
          {erroGeral}
        </p>
        <button
          onClick={carregar}
          className="min-h-touch rounded-2xl bg-hard-green px-8 py-4 text-xl font-bold text-white"
        >
          Tentar de novo
        </button>
      </Tela>
    );
  }

  if (fase === "grade") {
    return (
      <main className="kiosk min-h-screen bg-hard-coal px-4 py-5">
        <header className="mb-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-lg font-semibold text-white">
              Registro de Presença
            </p>
            <p className="text-sm text-white/50">
              Toque no seu nome — {dispositivoRef.current}
            </p>
          </div>
          <Brand invert size="md" />
        </header>

        {colaboradores.length === 0 ? (
          <p className="mt-10 text-center text-lg text-white/70">
            Nenhum colaborador cadastrado ainda.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {colaboradores.map((c) => (
              <button
                key={c.id}
                onClick={() => escolher(c)}
                className="flex min-h-kiosk flex-col items-center justify-center gap-3 rounded-3xl bg-white p-4 shadow-lg active:bg-hard-green-light"
              >
                <div className="h-24 w-24 overflow-hidden rounded-full bg-hard-coal-soft">
                  {c.foto_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={c.foto_url}
                      alt={c.nome}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-3xl font-bold text-white">
                      {c.nome.charAt(0)}
                    </div>
                  )}
                </div>
                <span className="text-center text-lg font-bold text-hard-coal">
                  {c.nome}
                </span>
              </button>
            ))}
          </div>
        )}
      </main>
    );
  }

  if (fase === "captura") {
    return (
      <Tela>
        <CabecalhoColab nome={selecionado?.nome} onVoltar={voltarGrade} />
        {msgCaptura && (
          <p className="max-w-sm text-center text-lg text-white/80">{msgCaptura}</p>
        )}
        <CameraSelfie onCapturar={aoCapturar} capturando={conferindo} />
        {tentativas >= MAX_TENTATIVAS_FACIAL && (
          <button
            onClick={() => {
              setMetodo("pin_fallback");
              setErroPin(null);
              setFase("pin");
            }}
            className="min-h-touch rounded-2xl bg-white px-6 py-4 text-lg font-bold text-hard-coal"
          >
            Digitar meu código
          </button>
        )}
      </Tela>
    );
  }

  if (fase === "pin") {
    return (
      <Tela>
        <TecladoNumerico
          titulo={`${selecionado?.nome ?? ""} — digite seu código`}
          onConfirmar={confirmarPin}
          onCancelar={voltarGrade}
          erro={erroPin}
        />
      </Tela>
    );
  }

  if (fase === "tipo") {
    return (
      <Tela>
        <CabecalhoColab nome={selecionado?.nome} onVoltar={voltarGrade} />
        <p className="text-xl text-white/80">Você está marcando:</p>
        {erroGeral && (
          <p className="max-w-sm text-center text-lg font-semibold text-alert-red">
            {erroGeral}
          </p>
        )}
        <div className="flex w-full max-w-md flex-col gap-4 sm:flex-row">
          <button
            onClick={() => registrar("entrada")}
            className="min-h-kiosk flex-1 rounded-3xl bg-hard-green px-6 py-8 text-3xl font-bold text-white active:bg-hard-green-dark"
          >
            ENTRADA
          </button>
          <button
            onClick={() => registrar("saida")}
            className="min-h-kiosk flex-1 rounded-3xl bg-hard-coal-soft px-6 py-8 text-3xl font-bold text-white ring-2 ring-white/20 active:bg-hard-coal"
          >
            SAÍDA
          </button>
        </div>
      </Tela>
    );
  }

  if (fase === "enviando") {
    return (
      <Tela>
        <p className="text-2xl font-semibold text-white/90">Gravando…</p>
      </Tela>
    );
  }

  if (fase === "sucesso" && confirmacao) {
    return (
      <Tela>
        <div className="flex h-28 w-28 items-center justify-center rounded-full bg-hard-green text-6xl text-white">
          ✓
        </div>
        <h2 className="text-3xl font-bold text-white">{confirmacao.nome}</h2>
        <p className="text-2xl font-semibold text-hard-green">
          {confirmacao.tipo === "entrada" ? "ENTRADA" : "SAÍDA"} às{" "}
          {confirmacao.hora}
        </p>
        <button
          onClick={voltarGrade}
          className="mt-2 text-white/60 underline"
        >
          Voltar agora
        </button>
      </Tela>
    );
  }

  return null;
}

function Tela({ children }: { children: React.ReactNode }) {
  return (
    <main className="kiosk flex min-h-screen flex-col items-center justify-center gap-6 bg-hard-coal px-5 py-6">
      {children}
    </main>
  );
}

function CabecalhoColab({
  nome,
  onVoltar,
}: {
  nome?: string;
  onVoltar: () => void;
}) {
  return (
    <div className="flex w-full max-w-md items-center justify-between">
      <button onClick={onVoltar} className="text-white/60 underline">
        ← Voltar
      </button>
      <span className="text-xl font-bold text-hard-green">{nome}</span>
    </div>
  );
}
