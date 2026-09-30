// Marca que o app está rodando hospedado (GitHub Pages), não dentro do Claude.
window.TREINO_HOSTED = true;

// Cole aqui a configuração do seu projeto Firebase (passo a passo no README.md).
// Enquanto estiver null, o app funciona normalmente, mas salva só neste aparelho.
// Esses valores não são senha: quem protege seus dados são as regras do firestore.rules.
window.FIREBASE_CONFIG = null;
/* Exemplo de como fica depois de preenchido:
window.FIREBASE_CONFIG = {
  apiKey: "AIza...",
  authDomain: "victreina-xxxx.firebaseapp.com",
  projectId: "victreina-xxxx",
  storageBucket: "victreina-xxxx.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abc123"
};
*/
