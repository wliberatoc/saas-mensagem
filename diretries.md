## Projeto prático Broadcast

O projeto deve ser feito com react e typescript e com o firebase auth, firestore e funções.

---

### O projeto deve conter:

- login/cadastro com o firebase auth
- lista de conexões
    - Uma conexão tem apenas o nome dela
    - fazer o CRUD
- lista de contatos
    - Um contato possui nome e telefone
    - fazer o CRUD
- tela para enviar mensagens para contatos específicos
    - precisa poder selecionar os contatos que desejam enviar uma mensagem
    - não precisa disparar mensagem de fato, é apenas fake
    - deve ser possível agendar uma mensagem
    - deve ser possível filtrar mensagens enviadas e agendadas
    - mensagens agendadas devem mudar para o status enviado no horário do disparo (use as funções para isso)    
    - fazer o CRUD

----

### Importante

1. O sistema precisa ser do tipo SAAS, cada cliente tem sua área de conexões, cada conexão tem sua área de contatos e mensagens.
2. Um cliente não pode acessar dados de outro cliente.
3. Usar material UI para componentes e tailwindcs para estilização.
4. Aplique código limpo para um código limpo e bem estruturado.
5. Não utilize orientação a objeto, o código deve seguir o **paradigma funcional**
6. O projeto deve usar o recurso de tempo real do firestore.
7. Usar o Vite, não usar o React Script.
8. Não use subcoleções no firestore.
9. Separe as funções em uma pasta e o frontend em outra chamada web.