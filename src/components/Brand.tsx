/**
 * Marca Hard Cranes (logo oficial).
 * - invert=true  -> fundo escuro (chumbo): logo claro (branco + verde).
 * - invert=false -> fundo claro (card): logo colorido (preto + verde).
 * O próprio logo já traz o slogan "Made to Endure".
 */
export function Brand({
  invert = false,
  size = "md",
}: {
  invert?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const altura = size === "lg" ? "h-14" : size === "sm" ? "h-6" : "h-8";
  const src = invert ? "/logo-light.png" : "/logo-color.png";

  return (
    // eslint-disable-next-line @next/next/no-img-element -- logo estático em /public
    <img
      src={src}
      alt="Hard Cranes — Made to Endure"
      className={`${altura} w-auto select-none`}
      draggable={false}
    />
  );
}
