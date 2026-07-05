"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import CameraSelfie from "@/components/quiosque/CameraSelfie";
import { extrairDescritor, descritorDeDataUrl } from "@/lib/face";
import { atualizarColaborador } from "@/app/admin/colaboradores/actions";
import { TERMO_LGPD } from "@/lib/lgpd";

function parseValor(txt: string): number | null {
  const limpo = txt.replace(/\./g, "").replace(",", ".").trim();
  if (!limpo) return null;
  const n = Number(limpo);
  return Number.isFinite(n) ? n : null;
}

export default function EditColaboradorForm({
  colaborador,
  fotoUrl,
}: {
  colaborador: {
    id: string;
    nome: string;
    valor_hora: number | null;
    valor_hora_fim_semana: number | null;
    ativo: boolean;
    consentimento_lgpd: boolean;
    temDescriptor: boolean;
  };
  fotoUrl: string | null;
}) {
  const router = useRouter();

  const [nome, setNome] = useState(colaborador.nome);
  const [valorHora, setValorHora] = useState(
    colaborador.valor_hora != null
      ? String(colaborador.valor_hora).replace(".", ",")
      : ""
  );
  const [valorHoraFDS, setValorHoraFDS] = useState(
    colaborador.valor_hora_fim_semana != null
      ? String(colaborador.valor_hora_fim_semana).replace(".", ",")
      : ""
  );
  const [ativo, setAtivo] = useState(colaborador.ativo);
  const [consent, setConsent] = useState(colaborador.consentimento_lgpd);
  const [pin, setPin] = useState("");

  const [trocarFoto, setTrocarFoto] = useState(false);
  const [fonteCamera, setFonteCamera] = useState(false);
  const [novaFoto, setNovaFoto] = useState<string | null>(null);
  const [descriptor, setDescriptor] = useState<number[] | null>(null);
  const [faceStatus, setFaceStatus] = useState<string | null>(null);
  const [processando, setProcessando] = useState(false);

  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function processarFoto(dataUrl: string, canvas?: HTMLCanvasElement) {
    setNovaFoto(dataUrl);
    setDescriptor(null);
    setProcessando(true);
    setFaceStatus("Analisando o rosto…");
    try {
      const desc = canvas
        ? await extrairDescritor(canvas)
        : await descritorDeDataUrl(dataUrl);
      setDescriptor(desc);
      setFaceStatus(
        desc ? "✓ Rosto detectado." : "⚠ Não achei um rosto nítido. Tente outra."
      );
    } finally {
      setProcessando(false);
    }
  }

  function aoEnviarArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => processarFoto(String(reader.result));
    reader.readAsDataURL(file);
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (!nome.trim()) return setErro("Informe o nome.");
    if (pin && !/^\d{4}$/.test(pin))
      return setErro("O PIN deve ter 4 dígitos (ou deixe em branco).");

    setSalvando(true);
    try {
      const res = await atualizarColaborador(colaborador.id, {
        nome,
        valor_hora: parseValor(valorHora),
        valor_hora_fim_semana: parseValor(valorHoraFDS),
        ativo,
        consentimento_lgpd: consent,
        pin: pin || undefined,
        // Se tirou nova foto, atualiza descritor respeitando o consentimento.
        ...(novaFoto
          ? { foto: novaFoto, face_descriptor: consent ? descriptor : null }
          : !consent
          ? { face_descriptor: null } // retirou consentimento -> remove biometria
          : {}),
      });
      if (!res.ok) return setErro(res.erro ?? "Falha ao salvar.");
      router.push("/admin/colaboradores");
      router.refresh();
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={salvar} className="flex max-w-2xl flex-col gap-6">
      <section className="rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="mb-3 font-bold">Foto de referência</h2>
        <div className="flex items-center gap-4">
          <div className="h-24 w-24 overflow-hidden rounded-xl bg-gray-200">
            {(novaFoto || fotoUrl) && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={novaFoto || fotoUrl || ""}
                alt={nome}
                className="h-full w-full object-cover"
              />
            )}
          </div>
          {!trocarFoto ? (
            <button
              type="button"
              onClick={() => setTrocarFoto(true)}
              className="rounded-xl border border-gray-300 px-4 py-2 font-semibold"
            >
              Trocar foto
            </button>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setFonteCamera(true)}
                  className="rounded-xl bg-hard-green px-3 py-2 text-sm font-semibold text-white"
                >
                  Câmera
                </button>
                <label className="cursor-pointer rounded-xl border border-gray-300 px-3 py-2 text-sm font-semibold">
                  Arquivo
                  <input
                    type="file"
                    accept="image/*"
                    onChange={aoEnviarArquivo}
                    className="hidden"
                  />
                </label>
              </div>
              {faceStatus && (
                <span
                  className={`text-sm ${
                    descriptor ? "text-hard-green-dark" : "text-alert-amber"
                  }`}
                >
                  {faceStatus}
                </span>
              )}
            </div>
          )}
        </div>
        {trocarFoto && fonteCamera && !novaFoto && (
          <div className="mt-4">
            <CameraSelfie
              onCapturar={({ dataUrl, canvas }) => processarFoto(dataUrl, canvas)}
              capturando={processando}
            />
          </div>
        )}
      </section>

      <section className="grid gap-4 rounded-2xl border border-gray-200 bg-white p-5 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-semibold">Nome</span>
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="rounded-xl border border-gray-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-semibold">Valor por hora (R$)</span>
          <input
            value={valorHora}
            onChange={(e) => setValorHora(e.target.value)}
            inputMode="decimal"
            className="rounded-xl border border-gray-300 px-3 py-2"
            placeholder="Ex.: 35,00"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-semibold">
            Valor/hora — fim de semana/feriado (R$)
          </span>
          <input
            value={valorHoraFDS}
            onChange={(e) => setValorHoraFDS(e.target.value)}
            inputMode="decimal"
            className="rounded-xl border border-gray-300 px-3 py-2"
            placeholder="Opcional — vazio usa o valor normal"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-semibold">
            Redefinir PIN (opcional)
          </span>
          <input
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
            inputMode="numeric"
            type="password"
            placeholder="Deixe em branco para manter"
            className="rounded-xl border border-gray-300 px-3 py-2"
          />
        </label>
        <label className="flex items-center gap-3 self-end">
          <input
            type="checkbox"
            checked={ativo}
            onChange={(e) => setAtivo(e.target.checked)}
            className="h-5 w-5"
          />
          <span className="text-sm font-semibold">Ativo</span>
        </label>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5">
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-1 h-5 w-5"
          />
          <span className="text-sm text-gray-700">{TERMO_LGPD}</span>
        </label>
        {!consent && colaborador.temDescriptor && (
          <p className="mt-2 text-sm text-alert-amber">
            Ao salvar sem consentimento, o código facial será removido e o
            colaborador passará a usar apenas o PIN.
          </p>
        )}
      </section>

      {erro && (
        <p className="rounded-xl bg-alert-red-bg p-3 font-semibold text-alert-red">
          {erro}
        </p>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={salvando}
          className="min-h-touch rounded-2xl bg-hard-green px-6 py-3 text-lg font-bold text-white active:bg-hard-green-dark disabled:opacity-50"
        >
          {salvando ? "Salvando…" : "Salvar alterações"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/colaboradores")}
          className="rounded-2xl border border-gray-300 px-6 py-3 font-semibold"
        >
          Voltar
        </button>
      </div>
    </form>
  );
}
