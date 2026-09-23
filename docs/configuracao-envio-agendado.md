# Configuração do envio simulado de mensagens agendadas

## Objetivo

O envio agendado deste projeto não envia mensagens para um serviço externo. Quando o horário de uma mensagem chega, o sistema deve apenas atualizar o documento no Firestore:

- `status`: de `scheduled` para `sent`;
- `sentAt`: data e hora do processamento;
- `updatedAt`: data e hora do processamento.

A função responsável por isso é `sendScheduledMessages`, definida em `functions/src/index.ts`. Ela consulta mensagens vencidas a cada minuto e faz as atualizações em lotes de até 500 documentos.

## Estado atual

- O código da função está implementado e compila com Node.js 22.
- Foram adicionados logs com as quantidades de mensagens encontradas e atualizadas, sem conteúdo ou dados dos destinatários.
- O índice composto de `messages.status` e `messages.scheduledAt` foi publicado e está no estado `READY`.
- A Cloud Functions API foi habilitada durante a tentativa de deploy.
- Nenhuma Function foi publicada e nenhum job do Cloud Scheduler foi criado.
- A mensagem vencida continuará como `scheduled` até existir um processador ativo.

## Bloqueio encontrado

O deploy exige que o projeto Firebase `saas-mensagens` esteja no plano Blaze e vinculado a uma conta de faturamento do Google Cloud com status `OPEN`.

Na última tentativa, o Google Cloud retornou:

```text
Billing account for project '522994311645' is not open.
```

Por isso, as APIs `cloudbuild.googleapis.com`, `artifactregistry.googleapis.com` e `containerregistry.googleapis.com` não puderam ser ativadas. A conta não ter sido elegível ao teste sem custos não impede tecnicamente o uso do Blaze, mas será necessária uma conta de faturamento válida e cobranças poderão ocorrer.

## Como retomar quando o faturamento estiver resolvido

1. No Google Cloud Billing, criar ou reativar uma conta de faturamento com forma de pagamento válida.
2. Confirmar que a conta aparece com status `OPEN` e vinculá-la ao projeto `saas-mensagens` (`522994311645`).
3. No Firebase, confirmar que o projeto aparece no plano Blaze.
4. É recomendado configurar alertas de orçamento antes do deploy.
5. Na raiz do repositório, validar o build:

```bash
cd functions
npm run build
cd ..
```

6. Publicar novamente o índice, caso seja necessário ou para confirmar a configuração declarada no repositório:

```bash
npx firebase-tools deploy --only firestore:indexes --project saas-mensagens
```

7. Publicar somente a função agendada:

```bash
npx firebase-tools deploy --only functions:sendScheduledMessages --project saas-mensagens
```

O Firebase CLI deverá ativar as APIs restantes e criar automaticamente a Function de segunda geração e o respectivo job do Cloud Scheduler na região `southamerica-east1`.

## Verificação após o deploy

Listar as funções publicadas:

```bash
npx firebase-tools functions:list --project saas-mensagens
```

Consultar os logs:

```bash
npx firebase-tools functions:log --only sendScheduledMessages --project saas-mensagens
```

Critérios para considerar a configuração concluída:

- `sendScheduledMessages` aparece publicada em `southamerica-east1`;
- o job correspondente aparece ativo no Cloud Scheduler;
- os logs registram a varredura a cada minuto sem erros de índice ou permissão;
- uma mensagem com `status == "scheduled"` e `scheduledAt <= agora` muda para `sent`;
- `sentAt` e `updatedAt` são preenchidos;
- mensagens com horário futuro e mensagens já enviadas não são modificadas.

## Alternativa sem Blaze

Como o envio é apenas simulado, existe uma alternativa que funciona no plano gratuito: processar mensagens vencidas no próprio aplicativo web.

Nessa solução, ao abrir a tela de mensagens ou receber uma atualização do Firestore, o frontend identifica documentos vencidos e solicita a mudança para `sent`. Também seria necessário ajustar cuidadosamente as regras do Firestore para permitir apenas ao proprietário a transição de uma mensagem própria de `scheduled` para `sent`, sem permitir alterações indevidas em outros campos.

Limitações dessa alternativa:

- mensagens não são processadas enquanto ninguém estiver com o aplicativo aberto;
- o horário registrado pode ser posterior ao agendamento;
- o cliente passa a participar de uma transição que seria mais confiável no backend.

Essa opção pode ser implementada provisoriamente se não for possível ativar uma conta de faturamento válida.
