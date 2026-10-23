# Processamento de mensagens agendadas

## Modos disponíveis

O envio deste projeto é simulado: quando o horário agendado chega, nenhum serviço externo é chamado. O documento da mensagem é atualizado no Firestore com:

- `status: "sent"`;
- `sentAt`: momento real do processamento;
- `updatedAt`: momento real do processamento.

O frontend lê `VITE_SCHEDULER_MODE` durante o build:

- `browser`: modo padrão, inclusive quando a variável está ausente ou inválida;
- `cloud`: desativa o processador local e pressupõe que a Cloud Function esteja publicada.

Como o projeto ainda não utiliza o plano Blaze, o modo ativo deve permanecer `browser`.

## Quando o processamento acontece

No modo `browser`, o componente global `ScheduledMessagesProcessor` mantém uma consulta compartilhada que observa somente a mensagem `scheduled` mais próxima do usuário. Um timer RxJS aguarda `scheduledAt`; alterações de horário ou exclusões substituem ou cancelam o timer anterior. Quando a mensagem passa para `sent`, o listener revela a próxima automaticamente.

Se uma mensagem vencer enquanto o aplicativo estiver fechado, ela permanecerá como `scheduled` até o próximo acesso. Nesse acesso, será processada imediatamente e `sentAt` representará o momento do processamento, não o horário originalmente agendado.

## Segurança e concorrência

A consulta considera apenas documentos que pertencem ao usuário autenticado, possuem `status == "scheduled"` e já alcançaram `scheduledAt`.

Cada mensagem é atualizada em uma transação. Isso permite que duas abas ou dispositivos encontrem a mesma mensagem sem processá-la duas vezes. As regras do Firestore autorizam a transição apenas quando:

- o documento pertence ao usuário autenticado;
- o estado atual é `scheduled`;
- `scheduledAt <= request.time`;
- somente `status`, `sentAt` e `updatedAt` são alterados;
- `sentAt` e `updatedAt` usam o horário do servidor.

Conteúdo, destinatário, conexão, proprietário, data de criação e data agendada não podem ser alterados durante essa transição.

## Índices

O processamento no navegador utiliza o índice composto:

```text
messages: clientId ASC, status ASC, scheduledAt ASC
```

O índice anterior de `status + scheduledAt` continua declarado para permitir uma futura migração para processamento administrativo.

## Limitações

- Não há processamento enquanto nenhum usuário estiver com o aplicativo aberto e autenticado.
- Navegadores podem desacelerar temporizadores de abas em segundo plano; timers vencidos são executados quando a aba volta a receber tempo de processamento.
- Falhas são registradas no console; uma nova emissão do listener permite nova tentativa.
- O horário de atualização pode ser posterior ao agendamento.

Essas limitações são aceitas porque o envio atual é apenas uma simulação de mudança de status.

## Opção cloud preparada e desativada

A função `sendScheduledMessages` permanece em `functions/src/index.ts`, mas não está publicada. Ela consulta mensagens vencidas em páginas de até 500 documentos, grava cada página em um batch e repete até a consulta ficar vazia. Os logs registram quantidades encontradas, processadas e com falha.

Antes desse deploy será necessário vincular o projeto `saas-mensagens` a uma conta de faturamento do Google Cloud com status `OPEN` e ativar o plano Blaze.

Somente depois de publicar e validar a Function, configure o frontend:

```env
VITE_SCHEDULER_MODE=cloud
```

O comando de deploy, mantido apenas como referência, é:

```powershell
npm.cmd --prefix functions run build
npx.cmd firebase-tools deploy --only functions:sendScheduledMessages --project saas-mensagens
```

O deploy não faz parte das fases deste roteiro e não deve ser executado automaticamente.

## Verificações recomendadas

1. Criar uma mensagem para alguns minutos no futuro e confirmar que permanece `scheduled` antes do horário.
2. Manter o app aberto e confirmar a mudança para `sent` ao chegar o horário.
3. Fechar o app, deixar outra mensagem vencer e confirmar o processamento ao entrar ou atualizar a página.
4. Confirmar que mensagens de outras conexões do mesmo usuário também são processadas.
5. Confirmar que mensagens imediatas e mensagens já enviadas não são alteradas novamente.
