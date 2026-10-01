// Envia as notificações do KOVA. Roda sozinho no GitHub a cada 30 minutos (.github/workflows/notificacoes.yml).
// Lê users/<uid>/meta/push (que o app escreve) e os grupos, e guarda o que já mandou em users/<uid>/meta/sent.
// Precisa do segredo FIREBASE_SERVICE_ACCOUNT no GitHub (a chave da conta de serviço do Firebase).
import admin from 'firebase-admin';

admin.initializeApp({ credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
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
  if (L.hour < 8 || L.hour >= 22) continue; // não incomoda de madrugada
  const P = { amigos: true, lembrete: true, xp: true, ...(m.prefs || {}) };
  const pausado = m.pausedUntil && m.pausedUntil >= L.key;
  const treinou = m.lastDay === L.key;
  let s = sents[uid];
  if (!s || s.day !== L.key) s = { day: L.key, friends: [], nFriends: 0, lastFriendAt: 0, reminder: false, xp: false };
  let msg = null;

  // 1. "Ana já treinou hoje. E você?" — no máximo 2 por dia, com 2 horas entre elas.
  if (P.amigos && !treinou && s.nFriends < 2 && now - s.lastFriendAt >= 2 * HORA) {
    const novos = [...(amigos[uid] || [])].filter(f => metas[f] && metas[f].lastDay === L.key
      && (metas[f].prefs || {}).share !== false && !s.friends.includes(f));
    if (novos.length) {
      msg = { body: `${nomes(novos.map(f => metas[f].name))} E você? 💪`, tag: 'amigos' };
      s.friends.push(...novos); s.nFriends++; s.lastFriendAt = now;
    }
  }
  // 2. Lembrete às 18h nos dias com treino no plano.
  const treinoHoje = m.plan && m.plan[L.wd];
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
