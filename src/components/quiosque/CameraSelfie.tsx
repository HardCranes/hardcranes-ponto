"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Câmera frontal do quiosque. Mostra o vídeo ao vivo e um botão grande para
 * capturar. Devolve a foto (dataURL JPEG) e um canvas pronto para o
 * reconhecimento facial.
 */
export default function CameraSelfie({
  onCapturar,
  capturando,
}: {
  onCapturar: (foto: { dataUrl: string; canvas: HTMLCanvasElement }) => void;
  capturando: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [erroCamera, setErroCamera] = useState<string | null>(null);
  const [pronta, setPronta] = useState(false);

  useEffect(() => {
    let cancelado = false;
    async function iniciar() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });
        if (cancelado) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
          setPronta(true);
        }
      } catch {
        setErroCamera(
          "Não consegui abrir a câmera. Verifique a permissão da câmera neste celular."
        );
      }
    }
    iniciar();
    return () => {
      cancelado = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  const capturar = useCallback(() => {
    const video = videoRef.current;
    if (!video || !pronta) return;
    const w = video.videoWidth || 640;
    const h = video.videoHeight || 480;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, w, h);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
    onCapturar({ dataUrl, canvas });
  }, [onCapturar, pronta]);

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="relative overflow-hidden rounded-3xl bg-black">
        <video
          ref={videoRef}
          playsInline
          muted
          className="h-[46vh] w-auto max-w-full -scale-x-100"
        />
      </div>

      {erroCamera && (
        <p className="max-w-sm text-center text-lg font-semibold text-alert-red">
          {erroCamera}
        </p>
      )}

      <button
        onClick={capturar}
        disabled={!pronta || capturando}
        className="flex min-h-touch w-full max-w-sm items-center justify-center rounded-2xl bg-hard-green px-6 py-6 text-2xl font-bold text-white shadow-lg transition active:bg-hard-green-dark disabled:opacity-50"
      >
        {capturando ? "Conferindo…" : "Tirar foto"}
      </button>
    </div>
  );
}
