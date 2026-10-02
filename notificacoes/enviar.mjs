// Envia as notificações do KOVA. Roda sozinho no GitHub a cada 30 minutos (.github/workflows/notificacoes.yml).
// Lê users/<uid>/meta/push (que o app escreve) e os grupos, e guarda o que já mandou em users/<uid>/meta/sent.
// Precisa do segredo FIREBASE_SERVICE_ACCOUNT no GitHub (a chave da conta de serviço do Firebase).
import admin from 'firebase-admin';

// Lê a chave mesmo se ela foi colada com o começo ou o fim cortados (só precisa destes 3 campos).
function chave(txt = '') {
  try { return JSON.parse(txt); } catch (e) {}
  const campo = n => (txt.match(new RegExp(`"?${n}"?\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`)) || [])[1];
  const k = { project_id: campo('project_id'), client_email: campo('client_email'), private_key: (campo('private_key') || '').replace(/\\n/g, '\n') };
  if (!k.project_id || !k.client_email || !k.private_key.includes('PRIVATE KEY')) {
    console.error('A chave FIREBASE_SERVICE_ACCOUNT está incompleta. Cole o arquivo .json inteiro, do { até o }.');
    process.exit(1);
  }
  return k;
}
admin.initializeApp({ credential: admin.credential.cert(chave(process.env.FIREBASE_SERVICE_ACCOUNT)) });
const db = admin.firestore();
const now = Date.now();
const HORA = 3600e3;

// Horário de cada pessoa (o app manda o fuso; Brasil = 180 minutos atrás do UTC).
function local(tz) {
  const d = new Date(now - (tz ?? 180) * 60e3);
  const key = d.toISOString().slice(0, 10);
  return { key, hour: d.getUTCHours(), wd: d.getUTCDay() };
}
const diasEntre = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 864e5);
const primeiro = n => (n || '').trim().split(/\s+/)[0] || 'Alguém';
function nomes(lista) {
  const n = lista.map(primeiro);
  if (n.length === 1) return `${n[0]} já treinou hoje.`;
  if (n.length === 2) return `${n[0]} e ${n[1]} já treinaram hoje.`;
  return `${n[0]}, ${n[1]} e mais ${n.length - 2} já treinaram hoje.`;
}

const metas = {}, sents = {};
for (const doc of (await db.collectionGroup('meta').get()).docs) {
  const uid = doc.ref.parent.parent.id;
  if (doc.id === 'push') metas[uid] = doc.data();
  if (doc.id === 'sent') sents[uid] = doc.data();
}
// Bom dia com o treino do dia: uma frase por tipo de treino, variando de dia pra dia.
const FRASES = {
  gluteos: ['Bora! Hoje é dia de deixar o bumbum da Graciane Barbosa no chinelo 🍑', 'Dia de glúteo: a escada do metrô que se prepare 🍑', 'Hoje é dia de glúteo. Calça jeans, aguenta firme 🍑'],
  pernas: ['Hoje é dia de perna. Amanhã sentar no vaso vai ser um evento 🦵', 'Dia de perna, e pular o dia de perna não é uma opção 🦵', 'Hoje tem perna. Bora construir as colunas que sustentam esse corpinho 🦵'],
  bracos: ['Hoje é dia de treinar pra conseguir trocar o galão de água do filtro sem pedir ajuda. Força nos braços 💪', 'Dia de braço: a manga da camiseta que lute 💪', 'Hoje tem braço. Pote de azeitona difícil de abrir, seus dias estão contados 💪'],
  costas: ['Dia de costas: postura de quem manda na reunião 😎', 'Hoje é dia de costas. Mochila pesada? Nunca mais 🎒', 'Costas hoje. Bora ficar com aquele V de respeito 😎'],
  cardio: ['Hoje é dia de cardio. Correr atrás do ônibus vai virar aquecimento 🏃', 'Cardio hoje: seu coração agradece e sua playlist também 🎧', 'Dia de suar a camisa. Bora gastar essa energia toda 🔥'],
  descanso: ['Hoje é dia de descanso. Músculo também cresce no sofá, pode confiar 🛋️', 'Dia de descanso: hoje o único peso que você levanta é o controle da TV 📺', 'Descanso hoje. Seus músculos pediram folga e o KOVA aprovou 😴', 'Hoje é folga! Aproveita pra beber água, dormir bem e voltar com tudo amanhã 💧'],
  todo: ['Hoje é treino de corpo inteiro. Nenhum músculo vai sair ileso 🔥', 'Corpo todo hoje: é o combo completo, sem pular nada 🔥', 'Hoje trabalha tudo. Bora fazer valer o café da manhã ☕'],
};
const LOW = ['Glúteos', 'Quadríceps', 'Posterior', 'Panturrilha'], UP = ['Peito', 'Ombros', 'Bíceps', 'Tríceps'];
function tipoTreino(titulo, grupos = []) {
  const g = grupos.filter(x => x !== 'Abdômen'), t = (titulo || '').toLowerCase();
  const low = g.filter(x => LOW.includes(x)).length, up = g.filter(x => UP.includes(x)).length, back = g.includes('Costas');
  if (!g.length || g.every(x => x === 'Cardio' || x === 'Alongamento' || x === 'Funcional')) return 'cardio';
  if (low && (up || back)) return 'todo';
  if (g[0] === 'Glúteos' || t.includes('glúte') || t.includes('glute')) return 'gluteos';
  if (low) return 'pernas';
  if (back && !up) return 'costas';
  if (back && g[0] === 'Costas') return 'costas';
  return 'bracos';
}
function bomDia(m, L) {
  const tipo = m.plan[L.wd] ? tipoTreino(m.plan[L.wd], (m.planG || {})[L.wd]) : 'descanso', lista = FRASES[tipo];
  const dia = Math.floor(Date.parse(L.key) / 864e5), frase = lista[dia % lista.length];
  const nome = (m.name || '').trim().split(/\s+/)[0];
  return `Bom dia${nome ? ', ' + nome : ''}! ${frase}`;
}

const amigos = {};
for (const g of (await db.collection('groups').get()).docs) {
  const ms = g.get('members') || [];
  for (const a of ms) for (const b of ms) if (a !== b) (amigos[a] ||= new Set()).add(b);
}

let enviadas = 0;
for (const [uid, m] of Object.entries(metas)) {
  const tokens = m.tokens || [];
  if (!tokens.length) continue;
  const L = local(m.tz);
  if (L.hour < 7 || L.hour >= 22) continue; // não incomoda de madrugada
  const P = { bomdia: true, amigos: true, lembrete: true, xp: true, ...(m.prefs || {}) };
  const pausado = m.pausedUntil && m.pausedUntil >= L.key;
  const treinou = m.lastDay === L.key;
  let s = sents[uid];
  if (!s || s.day !== L.key) s = { day: L.key, friends: [], nFriends: 0, lastFriendAt: 0, reminder: false, xp: false, morning: false };
  let msg = null;
  const treinoHoje = m.plan && m.plan[L.wd];

  // 0. Bom dia (7h–11h): o treino de hoje ou, no dia de descanso, uma frase de folga. Só pra quem tem plano montado.
  if (P.bomdia && !pausado && !treinou && !s.morning && m.plan && Object.keys(m.plan).length && L.hour < 11) {
    msg = { body: bomDia(m, L), tag: 'bomdia' };
    s.morning = true;
  }
  if (!msg && L.hour < 8) continue; // antes das 8h só o bom dia

  // 1. "Ana já treinou hoje. E você?" — no máximo 2 por dia, com 2 horas entre elas.
  if (!msg && P.amigos && !treinou && s.nFriends < 2 && now - s.lastFriendAt >= 2 * HORA) {
    const novos = [...(amigos[uid] || [])].filter(f => metas[f] && metas[f].lastDay === L.key
      && (metas[f].prefs || {}).share !== false && !s.friends.includes(f));
    if (novos.length) {
      msg = { body: `${nomes(novos.map(f => metas[f].name))} E você? 💪`, tag: 'amigos' };
      s.friends.push(...novos); s.nFriends++; s.lastFriendAt = now;
    }
  }
  // 2. Lembrete às 18h nos dias com treino no plano.
  if (!msg && P.lembrete && !treinou && !pausado && !s.reminder && L.hour >= 18 && treinoHoje) {
    msg = { body: `Hoje é dia de ${treinoHoje}. Ainda dá tempo! 🔥`, tag: 'lembrete' };
    s.reminder = true;
  }
  // 3. Aviso 2 dias antes do XP começar a cair (no 5º dia sem treino).
  if (!msg && P.xp && m.xpOn && !pausado && !s.xp && L.hour >= 12 && m.lastDay && diasEntre(m.lastDay, L.key) === 5) {
    msg = { body: 'Faz 5 dias sem treino. Em 2 dias seu XP começa a cair. Qualquer atividade conta!', tag: 'xp' };
    s.xp = true;
  }
  if (!msg) continue;

  const r = await admin.messaging().sendEachForMulticast({
    tokens,
    data: { title: 'KOVA', body: msg.body, tag: msg.tag, url: './' },
    webpush: { headers: { Urgency: 'high', TTL: String(4 * 3600) } },
  });
  const mortos = tokens.filter((t, i) => {
    const c = r.responses[i].error?.code;
    return c === 'messaging/registration-token-not-registered' || c === 'messaging/invalid-registration-token' || c === 'messaging/invalid-argument';
  });
  const ref = db.collection('users').doc(uid).collection('meta');
  if (mortos.length) await ref.doc('push').update({ tokens: admin.firestore.FieldValue.arrayRemove(...mortos) });
  await ref.doc('sent').set(s);
  enviadas += r.successCount;
}
console.log(`${Object.keys(metas).length} pessoas lidas, ${enviadas} notificações enviadas.`);
