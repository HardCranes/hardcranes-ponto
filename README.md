# Controle de Presença — Hard Cranes

Apontamento de presença por **selfie** (reconhecimento facial + PIN de reserva),
para acerto de pagamento dos colaboradores. Um celular fica fixo na parede em
modo quiosque; no fim do mês o dono soma as horas e exporta a planilha.

> **Importante:** isto é um **apontamento de presença**, não um relógio de
> ponto/jornada. Antes de usar com a equipe, leia a seção
> [⚠ Antes de ligar pra valer](#-antes-de-ligar-pra-valer).

---

## O que este sistema faz

- **Quiosque (celular da parede):** o colaborador toca no nome, tira uma selfie,
  o sistema reconhece o rosto (ou pede o PIN de 4 dígitos se não reconhecer) e
  ele marca **ENTRADA** ou **SAÍDA**. Cada batida guarda foto, horário e um ponto
  de GPS.
- **Administração (só você, com login):** cadastrar colaboradores, ver e corrigir
  as batidas com foto, lançar acertos (extras/descontos) e fazer o **fechamento
  do mês** com exportação em planilha `.xlsx`.

---

## Passo a passo para colocar no ar

Você vai precisar de: uma conta **Supabase** (o banco de dados) e uma conta
**Vercel** (onde o site fica hospedado). As duas já existem na Hard Cranes.

### 1. Baixar os modelos do reconhecimento facial (uma vez)

Dentro da pasta do projeto, no terminal:

```bash
npm install
npm run modelos
```

O segundo comando baixa (~7 MB) os arquivos do reconhecimento para
`public/models`. Precisa de internet só nessa hora; depois roda offline no
celular.

### 2. Criar as tabelas no Supabase

1. Abra o Supabase → seu projeto.
2. Menu lateral: **SQL Editor** → **New query**.
3. Abra o arquivo [`supabase/schema.sql`](supabase/schema.sql), copie **tudo** e
   cole ali.
4. Clique em **Run**. Pode rodar de novo sem medo se precisar.

Isso cria as tabelas (todas começam com `ponto_`, para não misturar com os
outros sistemas da Hard) e os dois "baldes" de fotos **privados**.

### 3. Preencher as chaves (arquivo `.env.local`)

1. Copie o arquivo `.env.local.example` para um novo chamado `.env.local`.
2. No Supabase → **Settings** → **API**, você encontra:
   - **Project URL** → cole em `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** → cole em `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** (secreta) → cole em `SUPABASE_SERVICE_ROLE_KEY`
3. Em `KIOSK_DEVICE_TOKEN`, invente uma **senha do celular da parede** (ex.:
   `hard-parede-2026`). É ela que você vai digitar ao configurar o celular.

> Nunca mande o `.env.local` por WhatsApp nem suba para o Git. São as chaves da
> empresa.

### 4. Criar seu login de administrador

No Supabase → **Authentication** → **Users** → **Add user**: crie um usuário com
seu **e-mail e senha**. É com ele que você entra na tela de Administração.

### 5. Rodar na sua máquina para testar

```bash
npm run dev
```

Abra `http://localhost:3000`. Você verá dois caminhos: **Quiosque** e
**Administração**.

### 6. Publicar na Vercel

1. Suba o projeto para o GitHub (ou conecte a pasta na Vercel).
2. Na Vercel → **New Project** → selecione o repositório.
3. Em **Environment Variables**, cadastre **as mesmas 4 variáveis** do
   `.env.local` (URL, anon, service_role e `KIOSK_DEVICE_TOKEN`). Opcionalmente
   `NEXT_PUBLIC_FACE_MATCH_THRESHOLD`.
4. Clique em **Deploy**. Ao final você recebe um endereço (ex.:
   `presenca-hardcranes.vercel.app`).

> A câmera só funciona em **HTTPS** — o endereço da Vercel já é HTTPS, então o
> reconhecimento facial funciona no celular da parede. Em `localhost` também
> funciona para testes.

---

## Como usar no dia a dia

### Cadastrar um colaborador

Administração → **Colaboradores** → **+ Cadastrar**:

1. Tire a foto de referência (câmera) ou envie um arquivo. O sistema avisa se
   achou o rosto.
2. Preencha nome, valor por hora e um **PIN de 4 dígitos** (definido pelo próprio
   colaborador — não use CPF nem data de nascimento).
3. Marque o **consentimento LGPD** (obrigatório para usar o rosto; sem ele, a
   pessoa entra só pelo PIN).

### Configurar o celular da parede

1. No celular, abra o endereço da Vercel e vá em **Abrir Quiosque**.
2. Na primeira vez, ele pede o **código do dispositivo** — digite o
   `KIOSK_DEVICE_TOKEN` que você definiu. Dê um nome ao aparelho (ex.:
   "Parede Produção").
3. Toque em **Adicionar à tela inicial** (menu do navegador) para virar um
   atalho em tela cheia.
4. Pronto: aparece a grade com os colaboradores. Para trocar o código depois,
   mude a variável na Vercel e reconfigure o celular.

### Corrigir batidas

Administração → **Registros** → escolha o colaborador e o mês. Dá para
**adicionar** uma batida que faltou, **editar** tipo/horário e **apagar**
duplicadas. Toda correção fica marcada como *ajuste manual*.

### Fechar o mês e pagar

Administração → **Fechamento** → escolha o mês:

- Linhas em **vermelho** = erro de batida (falta uma entrada/saída). Resolva em
  Registros antes de fechar — o sistema **não inventa** horário.
- Linhas em **amarelo** = reconhecimento facial com baixa confiança. Confira a
  foto.
- Botão **Exportar planilha (.xlsx)** gera o arquivo com uma linha por
  colaborador (horas, valor/hora, subtotal, acertos e **total a pagar**).

---

## ⚠ Antes de ligar pra valer

Este sistema usa **biometria facial + entrada/saída + geolocalização**. Para uma
equipe de MEIs, esse conjunto pode ser interpretado como indício de subordinação
numa eventual discussão trabalhista. **Antes de usar com a equipe:**

- [ ] Advogado trabalhista revisou o desenho do sistema.
- [ ] Contratos de prestação de serviço dos MEIs revisados/ajustados.
- [ ] Termo de consentimento LGPD (rosto + localização) assinado por cada um.
- [ ] Só então: cadastro real da equipe e uso em produção.

Testar internamente você mesmo, sozinho, pode desde já.

---

## Privacidade (LGPD)

- As fotos ficam em baldes **privados** no Supabase; nunca há link público.
- O código facial só é guardado **com consentimento** marcado.
- O quiosque nunca acessa o banco direto: ele passa por um servidor que confere o
  código do dispositivo. Sem esse código, ninguém registra presença de casa.
- Para apagar fotos antigas (retenção), veja a função
  `ponto_fotos_a_expurgar` em `supabase/schema.sql`.

---

## Detalhes técnicos (para quem for dar manutenção)

- **Next.js 14** (App Router) + **TypeScript** + **Tailwind**, mesma stack do app
  de Ferramentas.
- Reconhecimento facial com `@vladmandic/face-api`, 100% no navegador.
- Tabelas: `ponto_colaboradores`, `ponto_registros`, `ponto_acertos` (mesmo
  Supabase dos outros apps, isoladas pelo prefixo `ponto_`).
- Cálculo de horas em `src/lib/horas.ts` (pareia entrada→saída e sinaliza batida
  ímpar). Fuso fixo `America/Sao_Paulo` em `src/lib/datas.ts`.
