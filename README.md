# Broadcast — aplicação web

Frontend de um SaaS multiusuário para gerenciar conexões, contatos e mensagens simuladas. O sistema não envia mensagens para serviços externos: um envio imediato ou agendado apenas cria e atualiza documentos no Cloud Firestore.

## O que o sistema faz

- cadastro, login, recuperação de sessão e logout com Firebase Authentication;
- CRUD de conexões;
- CRUD de contatos vinculados a uma conexão;
- criação de uma mensagem individual para cada contato selecionado;
- envio simulado imediato ou agendado;
- edição e exclusão de mensagens agendadas;
- filtro de mensagens entre todas, agendadas e enviadas;
- atualização das listas em tempo real pelo Firestore;
- isolamento dos dados de cada cliente por `clientId` e pelas regras do Firestore.

## Fluxo resumido

1. O usuário cria uma conta ou entra com e-mail e senha.
2. No dashboard, cria e administra suas conexões.
3. Ao abrir uma conexão, acessa as abas de contatos e mensagens.
4. Na aba de contatos, cadastra nome e telefone. A edição permite alterar somente esses dois campos.
5. Na aba de mensagens, seleciona um ou mais contatos, escreve o conteúdo e escolhe entre enviar agora ou agendar.
6. Para cada contato selecionado é criado um documento de mensagem separado, com um único destinatário.
7. Mensagens imediatas já são registradas como `sent`. Mensagens futuras começam como `scheduled`.
8. Enquanto houver um usuário autenticado, o navegador procura mensagens vencidas ao iniciar a sessão, a cada minuto e quando a aba volta a ficar visível. As mensagens encontradas passam para `sent`.

O nome e o telefone do destinatário ficam gravados na mensagem como histórico. Enquanto o contato existir, seu nome atual é exibido; se o telefone mudar, o número usado na mensagem é identificado como antigo. Se o contato for excluído, o nome e o telefone históricos continuam visíveis e são identificados como pertencentes a um contato excluído.

O estado da aba selecionada e o filtro de mensagens são mantidos na URL, portanto não são perdidos ao atualizar a página.

## Agendamento sem Blaze

O processamento ativo ocorre no navegador porque a Cloud Function agendada não está publicada. Isso evita a dependência do plano Blaze, mas significa que uma mensagem não muda de estado enquanto nenhum usuário estiver autenticado no aplicativo.

Se o horário vencer com o sistema fechado, a mensagem será processada no próximo acesso. O campo `sentAt` registra o momento em que esse processamento realmente aconteceu.

## Tecnologias e dependências principais

- **React 19:** construção da interface com componentes funcionais.
- **TypeScript:** tipagem do código e dos modelos da aplicação.
- **Vite:** servidor de desenvolvimento e geração do build de produção.
- **React Router:** rotas públicas, rotas protegidas e parâmetros mantidos na URL.
- **Firebase Authentication:** cadastro, autenticação e persistência da sessão.
- **Cloud Firestore:** armazenamento, consultas, transações e atualizações em tempo real.
- **Material UI:** componentes visuais e controles de interface.
- **Tailwind CSS:** estilos utilitários e composição dos layouts.
- **Emotion:** mecanismo de estilos utilizado pelo Material UI.
- **ESLint:** análise estática e padronização do código.

## Estrutura dos dados

O Firestore utiliza coleções de primeiro nível, sem subcoleções:

- `connections`: conexões pertencentes ao cliente autenticado;
- `contacts`: contatos relacionados por `clientId` e `connectionId`;
- `messages`: mensagens relacionadas ao cliente e à conexão, com destinatário único, conteúdo, status e datas.

O `uid` do Firebase Authentication é usado como `clientId`. As regras do Firestore impedem que um cliente acesse os documentos de outro.

## Requisitos

- Node.js 22;
- npm;
- um projeto Firebase com Authentication, Firestore e Hosting configurados;
- Firebase CLI para publicação.

## Configuração

Instale as dependências dentro da pasta `web`:

```bash
npm install
```

Crie o arquivo `.env.local` com as configurações do aplicativo web do Firebase:

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

## Comandos disponíveis

```bash
# Iniciar o ambiente de desenvolvimento
npm run dev

# Validar o código com o ESLint
npm run lint

# Compilar o TypeScript e gerar web/dist
npm run build

# Visualizar localmente o build de produção
npm run preview
```

## Publicação

Na raiz do projeto, gere o build e publique o frontend, as regras e os índices:

```powershell
npm.cmd --prefix web run build
npx.cmd firebase-tools deploy --only hosting,firestore:rules,firestore:indexes --project saas-mensagens
```

Esse comando não publica a Cloud Function reservada para uma possível implementação futura com o plano Blaze.
