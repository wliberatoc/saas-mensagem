# Firebase Functions

Projeto de funções de backend do Broadcast.

## Status atual

Este diretório não está sendo usado em produção. A ativação do plano Blaze não foi concluída porque, no momento da configuração, o Google Cloud solicitou um pré-pagamento de R$ 150,00 para habilitar o faturamento.

Por esse motivo, a função agendada abaixo permanece apenas como uma opção futura e não foi publicada. Atualmente, as mensagens agendadas são processadas pelo aplicativo web enquanto existe um usuário autenticado. Consulte [configuracao-envio-agendado.md](../docs/configuracao-envio-agendado.md) para entender o funcionamento e suas limitações.

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
