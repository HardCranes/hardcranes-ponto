import Quiosque from "@/components/quiosque/Quiosque";

// A tela do quiosque é 100% client-side (câmera + reconhecimento facial).
export const dynamic = "force-dynamic";

export default function QuiosquePage() {
  return <Quiosque />;
}
