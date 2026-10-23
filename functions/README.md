# Firebase Functions

Projeto de funções de backend do Broadcast.

## Status atual

Este diretório não está sendo usado em produção. A ativação do plano Blaze não foi concluída porque, no momento da configuração, o Google Cloud solicitou um pré-pagamento de R$ 150,00 para habilitar o faturamento.

Por esse motivo, a função agendada abaixo permanece apenas como uma opção futura e não foi publicada. Atualmente, as mensagens agendadas são processadas pelo aplicativo web enquanto existe um usuário autenticado. Consulte [configuracao-envio-agendado.md](../docs/configuracao-envio-agendado.md) para entender o funcionamento e suas limitações.

## Função agendada

`sendScheduledMessages` executa a cada minuto e procura documentos da coleção
`messages` cujo `status` seja `scheduled` e cujo `scheduledAt` já tenha chegado.
A consulta lê páginas de até 500 documentos, grava cada página em um batch e
repete o processo até não existirem mais mensagens vencidas. Ao final, registra
as quantidades encontradas, processadas e com falha.

## Desenvolvimento

```bash
npm install
npm run build
npm run serve
```

## Deploy

Execute a partir da raiz do projeto, depois de configurar o Firebase CLI:

```powershell
npm.cmd --prefix functions run build
npx.cmd firebase-tools deploy --only functions:sendScheduledMessages --project saas-mensagens
```

Esse comando é somente uma referência e não deve ser executado enquanto o
frontend estiver no modo padrão `browser`. O modo `cloud` exige plano Blaze,
faturamento ativo e a Function publicada antes de definir
`VITE_SCHEDULER_MODE=cloud` no build do frontend.
