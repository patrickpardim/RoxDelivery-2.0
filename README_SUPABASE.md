# Configuração do Banco de Dados (Supabase)

Para ativar seu login de administrador, siga estes passos:

1. Acesse seu projeto no [Supabase](https://supabase.com).
2. Vá até o **SQL Editor** (ícone de terminal na barra lateral).
3. Copie todo o conteúdo do arquivo `SUPABASE_SETUP.sql` deste projeto.
4. Cole no editor e clique em **Run**.

Isso fará o seguinte:
- Criará todas as tabelas necessárias (`profiles`, `categories`, `products`).
- Criará um **usuário administrador** automaticamente com:
  - **Email:** `acaicachoeiro@gmail.com`
  - **Senha:** `CachoeiroAçaí@2026`
- Configurará o perfil da loja como "Rox Delivery".

Após rodar o script, você poderá fazer login imediatamente no aplicativo.
