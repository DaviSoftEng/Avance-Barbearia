# 💈 Barbearia Avance

Sistema de **agendamento online** da Barbearia Avance (Ryann França). Os clientes
escolhem o serviço, a data e o horário pelo site; o barbeiro gerencia tudo por um
painel administrativo — agenda, clientes, serviços, fotos e configurações.

> Site público + painel do barbeiro, em uma aplicação React + Node, pronta para
> produção (deploy de serviço único no Railway).

---

## ✨ Funcionalidades

### Cliente (público)
- Catálogo de serviços com fotos, preços e duração (carrossel + galeria)
- Agendamento em 4 passos (serviço → data/horário → dados → confirmação)
- Horários gerados automaticamente de **1 em 1 hora**, respeitando:
  - horário de funcionamento por dia da semana
  - **horário de almoço** (12h–13h, seg a sex)
  - duração real dos serviços e conflitos com outros agendamentos
  - **janela de agendamento** configurável (ex.: só os próximos 7 dias)
- Consulta e cancelamento do próprio horário pelo telefone

### Painel do barbeiro (autenticado)
- **Dashboard** com faturamento (dia/semana/mês), ticket médio e serviços mais pedidos
- **Agenda** em linha do tempo: resumo do dia, cliente, serviços, duração, valor,
  botão de WhatsApp, espaços livres e ações rápidas (concluir / faltou / cancelar / editar)
- **Clientes**: histórico, total gasto e visitas
- **Serviços**: criar/editar/ativar, com **upload de foto pelo celular**
- **Configurações**: horário de funcionamento, bloqueios de dia, clientes fixos
  (recorrentes) e janela de agendamento

### Segurança
- Autenticação JWT, senhas com bcrypt
- Rate limiting (login e rotas públicas), Helmet (cabeçalhos HTTP + CSP)
- Validação de entrada, limite de payload, log de auditoria das ações administrativas

---

## 🧱 Stack

| Camada | Tecnologias |
|---|---|
| Frontend | React 18, React Router, Vite, Tailwind CSS, Axios |
| Backend | Node.js, Express, Prisma ORM |
| Banco | SQLite (arquivo, em volume persistente) |
| Auth | JWT + bcryptjs |
| Deploy | Railway (serviço único: API serve a API **e** o site buildado) |

---

## 🚀 Rodando localmente

Pré-requisitos: **Node.js 18+**.

```bash
# 1. Instalar dependências (server + client)
npm run setup

# 2. Configurar variáveis de ambiente
#    copie server/.env.example para server/.env e preencha
#    (JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD, etc.)

# 3. Criar o banco e popular com dados iniciais
npm run db:setup

# 4. Subir em modo desenvolvimento (API + site juntos)
npm run dev
```

- Site: http://localhost:5173
- API:  http://localhost:3001/api
- Painel: http://localhost:5173/login

> Para acessar pelo celular na mesma Wi-Fi, o Vite já sobe com `--host`; use o IP
> da sua máquina (ex.: `http://192.168.1.9:5173`).

---

## 🔑 Variáveis de ambiente (server)

| Variável | Descrição |
|---|---|
| `DATABASE_URL` | Caminho do banco. Local: `file:./dev.db` · Prod: `file:/data/dev.db` |
| `JWT_SECRET` | Chave de assinatura dos tokens (≥ 32 caracteres) |
| `ADMIN_NAME` / `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Admin inicial (usado pelo seed) |
| `UPLOADS_DIR` | Pasta das fotos enviadas (prod: `/data/uploads`) |
| `CLIENT_URL` | Origem(ns) liberada(s) no CORS (separadas por vírgula) — opcional |
| `PORT` / `HOST` | Porta/host do servidor (definidos automaticamente no Railway) |

Gerar um `JWT_SECRET`:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

---

## 📜 Scripts principais

| Comando | O que faz |
|---|---|
| `npm run dev` | Sobe API + site em desenvolvimento |
| `npm run build` | Instala tudo, gera o Prisma e builda o site (usado no deploy) |
| `npm start` | Modo produção: aplica o schema, roda o seed e sobe o servidor |
| `npm run db:setup` | Cria as tabelas e popula os dados iniciais |
| `npm run db:reset-admin --prefix server` | Recria/atualiza a senha do admin a partir do `.env` |

---

## 📁 Estrutura

```
.
├── client/            # Frontend React (Vite + Tailwind)
│   ├── public/        # imagens (logo, fundo, fotos dos cortes)
│   └── src/
│       ├── pages/     # Home, Booking, Admin, Login, MeuAgendamento
│       ├── components/ # Navbar, ProtectedRoute
│       └── services/  # api.js (cliente axios)
├── server/            # Backend Express + Prisma
│   ├── prisma/        # schema, seed e scripts de banco
│   └── src/
│       ├── controllers/  # regras de cada recurso
│       ├── routes/       # rotas da API
│       ├── middleware/   # auth, rate limit, upload, validação
│       └── utils/        # auditoria, regras de negócio, settings
├── railway.json       # configuração de build/deploy do Railway
└── DEPLOY.md          # passo a passo do deploy em produção
```

---

## ☁️ Deploy

Roda como **um único serviço** no Railway (o Express serve a API e o site buildado),
com banco e fotos em um **volume persistente**. O passo a passo completo está em
**[DEPLOY.md](DEPLOY.md)**.

---

<p align="center">Feito com ✂️ para a Barbearia Avance · Ryann França</p>