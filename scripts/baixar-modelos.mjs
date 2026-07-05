// Baixa os modelos do reconhecimento facial (face-api) para /public/models.
// Rode uma vez, depois de instalar as dependências:
//   npm run modelos
//
// São ~7 MB no total. Precisa de internet só nesta etapa; depois o
// reconhecimento roda 100% offline no navegador.

import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const BASE =
  "https://raw.githubusercontent.com/vladmandic/face-api/master/model/";

const ARQUIVOS = [
  "tiny_face_detector_model-weights_manifest.json",
  "tiny_face_detector_model.bin",
  "face_landmark_68_model-weights_manifest.json",
  "face_landmark_68_model.bin",
  "face_recognition_model-weights_manifest.json",
  "face_recognition_model.bin",
];

const __dirname = dirname(fileURLToPath(import.meta.url));
const destino = join(__dirname, "..", "public", "models");

async function baixar(nome) {
  const url = BASE + nome;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Falha ao baixar ${nome}: HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(join(destino, nome), buf);
  console.log(`  ✓ ${nome} (${(buf.length / 1024).toFixed(0)} KB)`);
}

async function main() {
  if (!existsSync(destino)) await mkdir(destino, { recursive: true });
  console.log("Baixando modelos do reconhecimento facial para public/models…");
  for (const nome of ARQUIVOS) {
    await baixar(nome);
  }
  console.log("Pronto! Os modelos estão em public/models.");
}

main().catch((e) => {
  console.error("\nERRO:", e.message);
  console.error(
    "Verifique a internet e tente de novo: npm run modelos"
  );
  process.exit(1);
});
