/**
 * Reconhecimento facial 100% no navegador (client-side).
 * A foto/vetor do rosto NUNCA vai para nenhuma nuvem de reconhecimento de
 * terceiros — só a comparação matemática acontece aqui.
 *
 * IMPORTANTE: a biblioteca face-api só funciona no navegador. Por isso ela é
 * carregada de forma preguiçosa (dynamic import), evitando que o Next tente
 * avaliá-la no servidor (SSR) — o que quebraria a renderização.
 *
 * Os arquivos de modelo ficam em /public/models (baixados à parte — ver README).
 */

type FaceApi = typeof import("@vladmandic/face-api");

const MODELOS_URL = "/models";
let fa: FaceApi | null = null;
let carregando: Promise<void> | null = null;

/** Carrega a biblioteca e os modelos uma única vez (memoizado). */
export function carregarModelos(): Promise<void> {
  if (!carregando) {
    carregando = (async () => {
      const faceapi = await import("@vladmandic/face-api");
      await faceapi.nets.tinyFaceDetector.loadFromUri(MODELOS_URL);
      await faceapi.nets.faceLandmark68Net.loadFromUri(MODELOS_URL);
      await faceapi.nets.faceRecognitionNet.loadFromUri(MODELOS_URL);
      fa = faceapi;
    })();
  }
  return carregando;
}

type EntradaImagem = HTMLImageElement | HTMLVideoElement | HTMLCanvasElement;

/**
 * Extrai o descritor facial (vetor de 128 números) de uma imagem/vídeo.
 * Retorna null se nenhum rosto for detectado.
 */
export async function extrairDescritor(
  input: EntradaImagem
): Promise<number[] | null> {
  await carregarModelos();
  const faceapi = fa!;
  const deteccao = await faceapi
    .detectSingleFace(
      input,
      new faceapi.TinyFaceDetectorOptions({
        inputSize: 320,
        scoreThreshold: 0.4,
      })
    )
    .withFaceLandmarks()
    .withFaceDescriptor();

  if (!deteccao) return null;
  return Array.from(deteccao.descriptor);
}

/** Extrai o descritor a partir de um dataURL (foto de arquivo, no cadastro). */
export async function descritorDeDataUrl(
  dataUrl: string
): Promise<number[] | null> {
  const img = await carregarImagem(dataUrl);
  return extrairDescritor(img);
}

function carregarImagem(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Distância euclidiana entre dois descritores (0 = idêntico).
 * Só deve ser chamada depois de carregarModelos()/extrairDescritor().
 */
export function distancia(a: number[], b: number[]): number {
  if (!fa) {
    // Fallback puro caso a lib ainda não tenha carregado (não deve ocorrer no fluxo).
    let soma = 0;
    for (let i = 0; i < a.length; i++) soma += (a[i] - b[i]) ** 2;
    return Math.sqrt(soma);
  }
  return fa.euclideanDistance(a, b);
}

/**
 * Compara um rosto capturado com uma lista de candidatos e devolve o melhor.
 * Um "match" é aceito quando a distância <= limiar.
 */
export function melhorMatch(
  descritor: number[],
  candidatos: { id: string; face_descriptor: number[] | null }[],
  limiar: number
): { id: string; distancia: number } | null {
  let melhor: { id: string; distancia: number } | null = null;
  for (const c of candidatos) {
    if (!c.face_descriptor) continue;
    const d = distancia(descritor, c.face_descriptor);
    if (!melhor || d < melhor.distancia) melhor = { id: c.id, distancia: d };
  }
  if (melhor && melhor.distancia <= limiar) return melhor;
  return null;
}
