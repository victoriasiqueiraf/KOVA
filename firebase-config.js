// Marca que o app está rodando hospedado (GitHub Pages), não dentro do Claude.
window.TREINO_HOSTED = true;

// Configuração do projeto Firebase "victreina" (login com Google + banco de dados).
// Esses valores não são senha: quem protege seus dados são as regras do firestore.rules.
window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyBXpl9IlTrBzpkb83DtGYo1QNseuKeW5MQ",
  authDomain: "victreina.firebaseapp.com",
  projectId: "victreina",
  storageBucket: "victreina.firebasestorage.app",
  messagingSenderId: "821889110598",
  appId: "1:821889110598:web:4778264fc0e5ee303e7047"
};

// Chave das notificações (Firebase › Configurações do projeto › Cloud Messaging › Certificados push da Web).
// Enquanto estiver vazia, o app não mostra a opção de notificações.
window.FIREBASE_VAPID_KEY = "BEv01ZjMmkK18FC-048wsn535dz4iJ-zHqQPJicNAWFazVvxqBNXyNHHtW48hPjEV6ODdaO6L7BpZYK25LyS_FE";
