"use client";

import { useState } from "react";

/**
 * Teclado numérico grande para o PIN de 4 dígitos (fallback do quiosque).
 * Botões enormes, alto contraste — uso com luva no chão de fábrica.
 */
export default function TecladoNumerico({
  titulo,
  onConfirmar,
  onCancelar,
  erro,
}: {
  titulo: string;
  onConfirmar: (pin: string) => void;
  onCancelar: () => void;
  erro?: string | null;
}) {
  const [pin, setPin] = useState("");

  function digitar(d: string) {
    if (pin.length >= 4) return;
    const novo = pin + d;
    setPin(novo);
    if (novo.length === 4) {
      // pequeno atraso para o usuário ver o 4º ponto preencher
      setTimeout(() => onConfirmar(novo), 150);
    }
  }

  function apagar() {
    setPin((p) => p.slice(0, -1));
  }

  const teclas = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

  return (
    <div className="flex flex-col items-center gap-6">
      <h2 className="text-center text-2xl font-bold text-white">{titulo}</h2>

      <div className="flex gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-6 w-6 rounded-full border-2 ${
              i < pin.length
                ? "border-hard-green bg-hard-green"
                : "border-white/40"
            }`}
          />
        ))}
      </div>

      {erro && <p className="text-lg font-semibold text-alert-red">{erro}</p>}

      <div className="grid grid-cols-3 gap-3">
        {teclas.map((t) => (
          <button
            key={t}
            onClick={() => digitar(t)}
            className="h-20 w-20 rounded-2xl bg-white text-3xl font-bold text-hard-coal active:bg-hard-green-light"
          >
            {t}
          </button>
        ))}
        <button
          onClick={onCancelar}
          className="h-20 w-20 rounded-2xl bg-hard-coal-soft text-base font-semibold text-white active:bg-hard-coal"
        >
          Voltar
        </button>
        <button
          onClick={() => digitar("0")}
          className="h-20 w-20 rounded-2xl bg-white text-3xl font-bold text-hard-coal active:bg-hard-green-light"
        >
          0
        </button>
        <button
          onClick={apagar}
          className="h-20 w-20 rounded-2xl bg-hard-coal-soft text-2xl font-semibold text-white active:bg-hard-coal"
        >
          ⌫
        </button>
      </div>
    </div>
  );
}
