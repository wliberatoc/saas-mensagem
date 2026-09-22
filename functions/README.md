# Firebase Functions

Projeto de funções de backend do Broadcast.

## Função agendada

`sendScheduledMessages` executa a cada minuto e procura documentos da coleção
`messages` cujo `status` seja `scheduled` e cujo `scheduledAt` já tenha chegado.
Essas mensagens são atualizadas para `sent` em lotes de até 500 documentos.

## Desenvolvimento

```bash
npm install
npm run build
npm run serve
```

## Deploy

Execute a partir da raiz do projeto, depois de configurar o Firebase CLI:

```bash
firebase deploy --only functions
```
