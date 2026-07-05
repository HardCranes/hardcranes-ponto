"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import CameraSelfie from "@/components/quiosque/CameraSelfie";
import { extrairDescritor, descritorDeDataUrl } from "@/lib/face";
import { criarColaborador } from "@/app/admin/colaboradores/actions";
import { TERMO_LGPD } from "@/lib/lgpd";

type FonteFoto = "nenhuma" | "camera";

/** Converte "35,50" ou "35.50" em número; vazio -> null. */
function parseValor(txt: string): number | null {
  const limpo = txt.replace(/\./g, "").replace(",", ".").trim();
  if (!limpo) return null;
  const n = Number(limpo);
  return Number.isFinite(n) ? n : null;
}

export default function ColaboradorForm() {
  const router = useRouter();

  const [nome, setNome] = useState("");
  const [valorHora, setValorHora] = useState("");
  const [valorHoraFDS, setValorHoraFDS] = useState("");
  const [pin, setPin] = useState("");
  const [pin2, setPin2] = useState("");
  const [consent, setConsent] = useState(false);

  const [fonte, setFonte] = useState<FonteFoto>("nenhuma");
  const [foto, setFoto] = useState<string | null>(null);
  const [descriptor, setDescriptor] = useState<number[] | null>(null);
  const [faceStatus, setFaceStatus] = useState<string | null>(null);
  const [processandoFace, setProcessandoFace] = useState(false);

  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function processarFoto(dataUrl: string, canvas?: HTMLCanvasElement) {
    setFoto(dataUrl);
    setDescriptor(null);
    setProcessandoFace(true);
    setFaceStatus("Analisando o rosto…");
    try {
      const desc = canvas
        ? await extrairDescritor(canvas)
        : await descritorDeDataUrl(dataUrl);
      if (desc) {
        setDescriptor(desc);
        setFaceStatus("✓ Rosto detectado e pronto para reconhecimento.");
      } else {
        setFaceStatus(
          "⚠ Não achei um rosto nítido. A foto foi salva, mas o reconhecimento pode falhar — tente outra."
        );
      }
    } catch {
      setFaceStatus("⚠ Erro ao analisar o rosto. Tente outra foto.");
    } finally {
      setProcessandoFace(false);
    }
  }

  async function aoEnviarArquivo(e: React.ChangeEvent<HTMLInputElement>) {
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
    if (!/^\d{4}$/.test(pin)) return setErro("O PIN deve ter 4 dígitos.");
    if (pin !== pin2) return setErro("Os dois PINs não conferem.");
    if (descriptor && !consent)
      return setErro(
        "Para usar reconhecimento facial é obrigatório marcar o consentimento LGPD. Sem ele, o colaborador usará só o PIN."
      );

    setSalvando(true);
    try {
      const res = await criarColaborador({
        nome,
        valor_hora: parseValor(valorHora),
        valor_hora_fim_semana: parseValor(valorHoraFDS),
        pin,
        consentimento_lgpd: consent,
        // Só guarda o descritor biométrico COM consentimento (LGPD).
        face_descriptor: consent ? descriptor : null,
        foto,
      });
      if (!res.ok) {
        setErro(res.erro ?? "Falha ao cadastrar.");
        return;
      }
      router.push("/admin/colaboradores");
      router.refresh();
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={salvar} className="flex max-w-2xl flex-col gap-6">
      {/* Foto de referência */}
      <section className="rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="font-bold">Foto de referência</h2>
        <p className="mb-3 text-sm text-gray-500">
          Uma foto de rosto com boa luz. Dela é gerado o código facial usado no
          reconhecimento (a foto crua não é o reconhecimento).
        </p>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setFonte("camera")}
            className="rounded-xl bg-hard-green px-4 py-2 font-semibold text-white"
          >
            Usar câmera
          </button>
          <label className="cursor-pointer rounded-xl border border-gray-300 px-4 py-2 font-semibold">
            Enviar arquivo
            <input
              type="file"
              accept="image/*"
              onChange={aoEnviarArquivo}
              className="hidden"
            />
          </label>
        </div>

        {fonte === "camera" && !foto && (
          <div className="mt-4">
            <CameraSelfie
              onCapturar={({ dataUrl, canvas }) => processarFoto(dataUrl, canvas)}
              capturando={processandoFace}
            />
          </div>
        )}

        {foto && (
          <div className="mt-4 flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={foto}
              alt="Prévia"
              className="h-28 w-28 rounded-xl object-cover"
            />
            <div className="flex flex-col gap-2">
              {faceStatus && (
                <span
                  className={`text-sm ${
                    descriptor ? "text-hard-green-dark" : "text-alert-amber"
                  }`}
                >
                  {faceStatus}
                </span>
              )}
              <button
                type="button"
                onClick={() => {
                  setFoto(null);
                  setDescriptor(null);
                  setFaceStatus(null);
                  setFonte("nenhuma");
                }}
                className="w-fit text-sm text-gray-500 underline"
              >
                Trocar foto
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Dados */}
      <section className="grid gap-4 rounded-2xl border border-gray-200 bg-white p-5 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-semibold">Nome</span>
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="rounded-xl border border-gray-300 px-3 py-2"
            placeholder="Nome do colaborador"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-semibold">Valor por hora (R$)</span>
          <input
            value={valorHora}
            onChange={(e) => setValorHora(e.target.value)}
            inputMode="decimal"
            className="rounded-xl border border-gray-300 px-3 py-2"
            placeholder="Ex.: 35,00 (pode preencher depois)"
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
          <span className="text-sm font-semibold">PIN (4 dígitos)</span>
          <input
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
            inputMode="numeric"
            type="password"
            className="rounded-xl border border-gray-300 px-3 py-2"
            placeholder="Definido pelo colaborador"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-semibold">Repita o PIN</span>
          <input
            value={pin2}
            onChange={(e) => setPin2(e.target.value.replace(/\D/g, "").slice(0, 4))}
            inputMode="numeric"
            type="password"
            className="rounded-xl border border-gray-300 px-3 py-2"
          />
        </label>
      </section>

      {/* Consentimento LGPD */}
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
          {salvando ? "Salvando…" : "Cadastrar colaborador"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/colaboradores")}
          className="rounded-2xl border border-gray-300 px-6 py-3 font-semibold"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
