/** Tipos de domínio — espelham as tabelas ponto_* do banco. */

export type TipoBatida = "entrada" | "saida";
export type MetodoBatida = "facial" | "pin_fallback";
export type OrigemBatida = "quiosque" | "ajuste_manual";

export type Colaborador = {
  id: string;
  nome: string;
  foto_cadastro_url: string | null;
  face_descriptor: number[] | null;
  pin_hash: string | null;
  valor_hora: number | null;
  valor_hora_fim_semana: number | null;
  ativo: boolean;
  consentimento_lgpd: boolean;
  criado_em: string;
};

/** Versão "pública" do colaborador enviada ao quiosque (sem pin_hash). */
export type ColaboradorQuiosque = {
  id: string;
  nome: string;
  foto_url: string | null; // URL assinada, temporária
  face_descriptor: number[] | null;
  consentimento_lgpd: boolean;
};

export type Registro = {
  id: string;
  colaborador_id: string;
  tipo: TipoBatida;
  data_hora: string;
  foto_url: string;
  metodo: MetodoBatida;
  match_confianca: number | null;
  dispositivo: string | null;
  origem: OrigemBatida;
  latitude: number | null;
  longitude: number | null;
  precisao_m: number | null;
  criado_em: string;
};

export type Acerto = {
  id: string;
  colaborador_id: string;
  mes_referencia: string; // 'YYYY-MM'
  descricao: string;
  valor: number;
  criado_em: string;
};

export const TIPO_LABEL: Record<TipoBatida, string> = {
  entrada: "Entrada",
  saida: "Saída",
};

export const METODO_LABEL: Record<MetodoBatida, string> = {
  facial: "Rosto",
  pin_fallback: "PIN",
};
