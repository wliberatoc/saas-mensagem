# Processamento de mensagens agendadas sem Blaze

## Solução ativa

O envio deste projeto é simulado: quando o horário agendado chega, nenhum serviço externo é chamado. O documento da mensagem é atualizado no Firestore com:

- `status: "sent"`;
- `sentAt`: momento real do processamento;
- `updatedAt`: momento real do processamento.

Como o projeto não utiliza o plano Blaze, o processamento é executado pelo aplicativo web enquanto existe um usuário autenticado.

## Quando o processamento acontece

O componente global `ScheduledMessagesProcessor` verifica todas as conexões do usuário:

- assim que a autenticação é restaurada, inclusive após atualizar a página;
- a cada 60 segundos enquanto o aplicativo permanece aberto;
- quando o usuário volta para uma aba que estava em segundo plano.

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
- Navegadores podem desacelerar temporizadores de abas em segundo plano; ao retornar à aba, o aplicativo faz uma nova verificação.
- Falhas são registradas no console e tentadas novamente no próximo ciclo.
- O horário de atualização pode ser posterior ao agendamento.

Essas limitações são aceitas porque o envio atual é apenas uma simulação de mudança de status.

## Opção futura com backend

A função `sendScheduledMessages` permanece em `functions/src/index.ts`, mas não está publicada. Se futuramente houver uma conta de faturamento válida, ela poderá ser implantada com Cloud Functions e Cloud Scheduler para processar mensagens mesmo sem usuários conectados.

Antes desse deploy será necessário vincular o projeto `saas-mensagens` a uma conta de faturamento do Google Cloud com status `OPEN` e ativar o plano Blaze.

## Verificações recomendadas

1. Criar uma mensagem para alguns minutos no futuro e confirmar que permanece `scheduled` antes do horário.
2. Manter o app aberto e confirmar a mudança para `sent` em até aproximadamente um minuto após o horário.
3. Fechar o app, deixar outra mensagem vencer e confirmar o processamento ao entrar ou atualizar a página.
4. Confirmar que mensagens de outras conexões do mesmo usuário também são processadas.
5. Confirmar que mensagens imediatas e mensagens já enviadas não são alteradas novamente.
