# victreina

App de academia que funciona no navegador e pode ser instalado no celular:

- plano semanal com cores por grupo muscular
- registro de carga, repetições e séries em cada máquina, com sugestão de quando subir a carga
- presença (check-in) e calendário de frequência
- gráfico de progressão de carga por exercício
- login com Google para salvar tudo na nuvem

Sem login, os dados ficam salvos no próprio celular e continuam lá quando você atualiza a página. Com login Google, também ficam na nuvem, então nada se perde se você limpar o navegador ou trocar de celular.

---

## 1. Publicar no GitHub Pages (grátis)

1. Crie uma conta em https://github.com, se ainda não tiver.
2. Clique em **New repository**, dê o nome `victreina`, deixe **Public** e clique em **Create repository**.
3. Na página do repositório, clique em **uploading an existing file** e arraste **todos os arquivos desta pasta** (menos a pasta `.git`, se aparecer). Clique em **Commit changes**.
4. Vá em **Settings → Pages**. Em *Branch*, escolha `main` e a pasta `/ (root)`, e clique em **Save**.
5. Depois de 1–2 minutos, o app fica disponível em `https://SEU-USUARIO.github.io/victreina/`.

Nesse ponto o app já funciona e salva no celular. Para salvar na nuvem com Google, siga o passo 2.

## 2. Ligar o login com Google (Firebase, grátis)

1. Acesse https://console.firebase.google.com e entre com sua conta Google.
2. Clique em **Criar um projeto** (ex.: `victreina`). O Google Analytics pode ficar desligado.
3. **Autenticação:** no menu, vá em **Criação → Authentication → Vamos começar → Google**, ative e salve.
4. Ainda em Authentication, abra **Configurações → Domínios autorizados → Adicionar domínio** e coloque `SEU-USUARIO.github.io`.
5. **Banco de dados:** vá em **Criação → Firestore Database → Criar banco de dados**. Escolha um local (ex.: `southamerica-east1`, São Paulo) e o **modo de produção**.
6. Na aba **Regras** do Firestore, apague o que estiver lá, cole o conteúdo do arquivo `firestore.rules` desta pasta e clique em **Publicar**. Essas regras garantem que só você acessa os seus treinos.
7. Vá em **⚙️ Configurações do projeto → Seus apps → ícone `</>` (Web)**, dê um apelido e clique em **Registrar app**. Vai aparecer um bloco `const firebaseConfig = { ... }`.
8. Abra o arquivo `firebase-config.js` e troque `window.FIREBASE_CONFIG = null;` pelos valores do seu projeto, assim:

   ```js
   window.FIREBASE_CONFIG = {
     apiKey: "...",
     authDomain: "...",
     projectId: "...",
     storageBucket: "...",
     messagingSenderId: "...",
     appId: "..."
   };
   ```

9. Suba o `firebase-config.js` atualizado no GitHub: abra o arquivo no repositório, clique no lápis ✏️, cole e clique em **Commit changes**.

Esses valores não são senha, é normal que fiquem públicos. Quem protege os seus dados são as regras do passo 6.

## 3. Instalar no celular

- **iPhone:** abra o link no **Safari → botão Compartilhar → Adicionar à Tela de Início**.
- **Android:** abra no **Chrome → menu ⋮ → Instalar app** (ou *Adicionar à tela inicial*).

Abra o app pelo ícone e toque em **Entrar com Google**. No iPhone, o app da tela de início guarda o login separado do Safari, então faça o login **dentro do app instalado**.

Se você já tiver registrado treinos antes de entrar, eles são enviados para a sua conta no primeiro login.

## Como mudar o plano

Tudo é feito dentro do app, na aba **Plano**:

- **Semana:** toque num dia para escolher qual treino fica nele (ou Descanso).
- **Treinos:** toque num treino para trocar máquinas, mudar séries, repetições e descanso, mudar a ordem, adicionar ou tirar exercícios. Também dá para criar treinos novos.
- Na aba **Hoje**, o botão **Trocar** muda o treino só daquele dia ou de toda semana.

## Arquivos

| Arquivo | Para que serve |
|---|---|
| `index.html` | o app inteiro |
| `firebase-config.js` | configuração do login Google (passo 2) |
| `firestore.rules` | regras de segurança para colar no Firebase |
| `manifest.webmanifest`, `icon-*.png`, `icon.svg` | nome e ícone ao instalar no celular |
| `sw.js` | faz o app abrir mesmo sem internet |
