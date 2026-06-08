# Deploy no Railway (passo a passo)

O projeto vai pro ar como **um serviço só**: o servidor Express serve a API **e** o site
(build do React). Banco SQLite e fotos enviadas ficam num **Volume** persistente.

## 1. Criar o projeto
1. Acesse https://railway.app e faça login com o GitHub.
2. **New Project → Deploy from GitHub repo** → escolha `Avance-Barbearia`.
3. O Railway detecta o `railway.json` e usa:
   - build: `npm run build` (instala server+client, gera Prisma, builda o site)
   - start: `npm run start` (cria/atualiza tabelas, roda o seed e sobe o servidor)

## 2. Criar o Volume (disco persistente)
No serviço criado: **Settings → Volumes → New Volume**
- Mount path: `/data`

> É aqui que ficam o banco e as fotos. Sem isso, os dados somem a cada deploy.

## 3. Variáveis de ambiente
Em **Variables**, adicione:

| Variável | Valor | Observação |
|---|---|---|
| `DATABASE_URL` | `file:/data/dev.db` | banco no volume |
| `UPLOADS_DIR` | `/data/uploads` | fotos no volume |
| `JWT_SECRET` | (gere — ver abaixo) | chave forte, ≥ 32 caracteres |
| `ADMIN_EMAIL` | ex: `ryann` | login do admin |
| `ADMIN_PASSWORD` | (senha forte, ≥ 8) | senha do admin |
| `ADMIN_NAME` | `Ryann França` | nome exibido |
| `NODE_ENV` | `production` | opcional |

Gerar o `JWT_SECRET` (rode no seu PC e cole o resultado):
```
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

> `PORT` é definido pelo Railway automaticamente — não precisa setar.
> `CLIENT_URL` é opcional: o domínio público do Railway já é liberado sozinho.

## 4. Deploy e domínio
1. O deploy roda automaticamente após salvar as variáveis (ou clique em **Deploy**).
2. **Settings → Networking → Generate Domain** → gera a URL pública (ex:
   `avance-barbearia.up.railway.app`).
3. Abra a URL — o site já nasce com os serviços, fotos e horários (vêm do seed).
   Painel em `/login` com `ADMIN_EMAIL` / `ADMIN_PASSWORD`.

## 5. Controlar o custo (teto de $5)
Em **Usage / Billing** do Railway, defina um **spend limit** (ex: `$5`). Se o uso
chegar no limite, o Railway pausa o serviço em vez de cobrar a mais.

## 6. (Opcional) Domínio próprio
**Settings → Networking → Custom Domain** → adicione `barbeariaavance.com.br` e
configure o CNAME que o Railway indicar no seu provedor de domínio.

---

## Notas
- **Seed é idempotente**: serviços e horários só são criados se o banco estiver vazio.
  Em deploys seguintes, ele só garante o admin (atualiza a senha conforme as variáveis).
- **Trocar a senha do admin** depois: mude `ADMIN_PASSWORD` e faça um novo deploy
  (ou rode `npm run db:reset-admin --prefix server` apontando para o banco de produção).
- **Backup**: o banco é o arquivo `/data/dev.db` no volume. Dá pra baixar pelo
  shell do Railway se quiser guardar uma cópia.
