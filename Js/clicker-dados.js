// ====================================================
// Pokéclicker: regras e números do mini game de clicar.
// Só funções puras (sem tela), para dar para testar e balancear.
// ====================================================

export const AJUDANTES = [
    { id: "magnemite", nome: "Magnemite", pid: 81, custo: 15, prod: 0.1 },
    { id: "voltorb", nome: "Voltorb", pid: 100, custo: 100, prod: 1 },
    { id: "electabuzz", nome: "Electabuzz", pid: 125, custo: 1100, prod: 8 },
    { id: "raichu", nome: "Raichu", pid: 26, custo: 12000, prod: 47 },
    { id: "magneton", nome: "Magneton", pid: 82, custo: 130000, prod: 260 },
    { id: "electrode", nome: "Electrode", pid: 101, custo: 1.4e6, prod: 1400 },
    { id: "jolteon", nome: "Jolteon", pid: 135, custo: 2e7, prod: 7800 },
    { id: "zapdos", nome: "Zapdos", pid: 145, custo: 3.3e8, prod: 44000 },
];
export const AJUDANTE_POR_ID = Object.fromEntries(AJUDANTES.map((a) => [a.id, a]));
const CRESCIMENTO = 1.15; // cada compra deixa o próximo 15% mais caro
export const MARCOS = [25, 50, 100, 150, 200]; // a produção do ajudante dobra em cada marco

export const MELHORIAS = [
    { id: "choque", nome: "Choque do Trovão", desc: "Clique ×2", custo: 100 },
    { id: "faisca", nome: "Faísca", desc: "Cada clique ganha +1% da sua energia/s", custo: 5000 },
    { id: "trovoada", nome: "Trovoada", desc: "Clique ×2", custo: 50000 },
    { id: "relampago", nome: "Relâmpago", desc: "Cada clique ganha mais +2% da energia/s", custo: 5e6 },
    { id: "carga", nome: "Carga Total", desc: "Toda a produção ×1,5", custo: 5e7 },
];
export const MELHORIA_POR_ID = Object.fromEntries(MELHORIAS.map((m) => [m.id, m]));

// Árvore de evolução (custos em Pedras de Evolução)
export const ARVORE = [
    { id: "clique1", ramo: "clique", nome: "Dedo Treinado", desc: "Clique ×3", custo: 2, requer: [] },
    { id: "clique2", ramo: "clique", nome: "Golpe Crítico", desc: "10% de chance de um clique valer ×10", custo: 5, requer: ["clique1"] },
    { id: "clique3", ramo: "clique", nome: "Choque Estático", desc: "Cada clique ganha +5% da energia/s", custo: 12, requer: ["clique2"] },
    { id: "ajud1", ramo: "ajudantes", nome: "Treinador", desc: "Produção dos ajudantes +50%", custo: 2, requer: [] },
    { id: "ajud2", ramo: "ajudantes", nome: "Liga Pokémon", desc: "Ajudantes 10% mais baratos", custo: 6, requer: ["ajud1"] },
    { id: "ajud3", ramo: "ajudantes", nome: "Sinergia", desc: "+5% de produção para cada tipo de ajudante que você tem", custo: 15, requer: ["ajud2"] },
    { id: "tempo1", ramo: "tempo", nome: "Soneca", desc: "Com o jogo fechado, rende 100% (em vez de 50%)", custo: 3, requer: [] },
    { id: "tempo2", ramo: "tempo", nome: "Começo Rápido", desc: "Toda partida começa com 10 Magnemite e 5 Voltorb", custo: 5, requer: ["tempo1"] },
    { id: "tempo3", ramo: "tempo", nome: "Pokébola Dourada", desc: "De vez em quando aparece uma pokébola: clique nela para produção ×7 por 30s", custo: 10, requer: ["tempo2"] },
    { id: "topo1", ramo: "topo", nome: "Pedra do Trovão", desc: "+25% de pedras ao evoluir", custo: 20, requer: ["clique3", "ajud3", "tempo3"] },
    { id: "topo2", ramo: "topo", nome: "Mega Energia", desc: "Toda a produção ×3", custo: 40, requer: ["topo1"] },
];
// O mercado só abre com a árvore inteira completa
export const MERCADO = {
    id: "mercado", ramo: "mercado", nome: "Mercado de Pacotes", desc: "Troque pedras por pacotes do jogo de cartas",
    custo: 30, requer: ARVORE.map((n) => n.id),
};
export const NOS = [...ARVORE, MERCADO];
export const NO_POR_ID = Object.fromEntries(NOS.map((n) => [n.id, n]));

export const ENERGIA_PARA_EVOLUIR = 1e8;
const DIVISOR_PEDRAS = 1e6; // 100 mi de energia na partida = 10 pedras
export const PACOTE_CUSTO_PEDRAS = 10;
export const PACOTES_POR_DIA = 5;
export const OFFLINE_MAX_SEGUNDOS = 8 * 60 * 60;
export const DOURADA_MULT = 7;
export const DOURADA_DURACAO = 30 * 1000;

export const clickerInicial = () => ({
    energia: 0,
    totalPartida: 0, // energia ganha desde o último "Evoluir"
    totalGeral: 0,
    cliques: 0,
    ajudantes: {},
    melhorias: [],
    pedras: 0,
    pedrasTotal: 0,
    arvore: [],
    reinicios: 0,
    recorde: 0, // maior energia de uma partida
    ultimoTick: Date.now(),
    douradaAte: 0,
    pacotesHoje: { dia: "", qtd: 0 },
});

// Completa campos que faltam (saves antigos) sem perder o que já existe
export const normalizarClicker = (c) => {
    const base = clickerInicial();
    const x = c && typeof c === "object" ? { ...base, ...c } : base;
    x.ajudantes = { ...(x.ajudantes || {}) };
    x.melhorias = Array.isArray(x.melhorias) ? x.melhorias : [];
    x.arvore = Array.isArray(x.arvore) ? x.arvore : [];
    x.pacotesHoje = x.pacotesHoje && typeof x.pacotesHoje === "object" ? x.pacotesHoje : { dia: "", qtd: 0 };
    for (const k of ["energia", "totalPartida", "totalGeral", "cliques", "pedras", "pedrasTotal", "reinicios", "recorde", "douradaAte"]) {
        x[k] = Number.isFinite(x[k]) && x[k] > 0 ? x[k] : 0;
    }
    if (!Number.isFinite(x.ultimoTick)) x.ultimoTick = Date.now();
    return x;
};

export const tem = (c, id) => c.arvore.includes(id);
const temMelhoria = (c, id) => c.melhorias.includes(id);
export const quantos = (c, id) => c.ajudantes[id] || 0;

// ---------------- Compras de ajudantes ----------------
const desconto = (c) => (tem(c, "ajud2") ? 0.9 : 1);

// Custo de comprar `n` unidades seguidas (soma da progressão geométrica)
export const custoAjudante = (c, a, n = 1) => {
    const q = quantos(c, a.id);
    const primeiro = a.custo * CRESCIMENTO ** q;
    return Math.ceil(primeiro * ((CRESCIMENTO ** n - 1) / (CRESCIMENTO - 1)) * desconto(c));
};

// Quantas unidades dá para comprar com a energia atual
export const maximoCompravel = (c, a) => {
    const primeiro = a.custo * CRESCIMENTO ** quantos(c, a.id) * desconto(c);
    if (c.energia < primeiro) return 0;
    let n = Math.floor(Math.log((c.energia * (CRESCIMENTO - 1)) / primeiro + 1) / Math.log(CRESCIMENTO));
    while (n > 0 && custoAjudante(c, a, n) > c.energia) n--;
    return n;
};

export const comprarAjudante = (c, id, n = 1) => {
    const a = AJUDANTE_POR_ID[id];
    if (!a || n < 1) return false;
    const custo = custoAjudante(c, a, n);
    if (custo > c.energia) return false;
    c.energia -= custo;
    c.ajudantes[id] = quantos(c, id) + n;
    return true;
};

export const comprarMelhoria = (c, id) => {
    const m = MELHORIA_POR_ID[id];
    if (!m || temMelhoria(c, id) || c.energia < m.custo) return false;
    c.energia -= m.custo;
    c.melhorias.push(id);
    return true;
};

// ---------------- Produção ----------------
export const marcosAtingidos = (n) => MARCOS.filter((m) => n >= m).length;

export const producaoAjudante = (c, a) => {
    const n = quantos(c, a.id);
    return a.prod * n * 2 ** marcosAtingidos(n);
};

export const douradaAtiva = (c, agora = Date.now()) => c.douradaAte > agora;

export const multiplicador = (c, agora = Date.now()) => {
    let m = 1;
    if (temMelhoria(c, "carga")) m *= 1.5;
    if (tem(c, "ajud1")) m *= 1.5;
    if (tem(c, "ajud3")) m *= 1 + 0.05 * AJUDANTES.filter((a) => quantos(c, a.id) > 0).length;
    if (tem(c, "topo2")) m *= 3;
    if (douradaAtiva(c, agora)) m *= DOURADA_MULT;
    return m;
};

export const energiaPorSegundo = (c, agora = Date.now()) =>
    AJUDANTES.reduce((s, a) => s + producaoAjudante(c, a), 0) * multiplicador(c, agora);

export const energiaPorClique = (c, agora = Date.now()) => {
    let base = 1;
    if (temMelhoria(c, "choque")) base *= 2;
    if (temMelhoria(c, "trovoada")) base *= 2;
    if (tem(c, "clique1")) base *= 3;
    const fracao = (temMelhoria(c, "faisca") ? 0.01 : 0) + (temMelhoria(c, "relampago") ? 0.02 : 0) + (tem(c, "clique3") ? 0.05 : 0);
    return base + energiaPorSegundo(c, agora) * fracao;
};

const ganhar = (c, v) => {
    c.energia += v;
    c.totalPartida += v;
    c.totalGeral += v;
    if (c.totalPartida > c.recorde) c.recorde = c.totalPartida;
};

// Um clique. Retorna quanto rendeu e se foi crítico.
export const clicar = (c, agora = Date.now(), rnd = Math.random) => {
    const critico = tem(c, "clique2") && rnd() < 0.1;
    const valor = energiaPorClique(c, agora) * (critico ? 10 : 1);
    ganhar(c, valor);
    c.cliques++;
    return { valor, critico };
};

// Avança o tempo com o jogo aberto
export const avancar = (c, agora = Date.now()) => {
    const dt = Math.max(0, Math.min(agora - c.ultimoTick, 60 * 1000)) / 1000;
    c.ultimoTick = agora;
    if (dt > 0) ganhar(c, energiaPorSegundo(c, agora) * dt);
};

// Ganho enquanto o jogo estava fechado (até 8h; 50% sem a Soneca)
export const aplicarOffline = (c, agora = Date.now()) => {
    const segundos = Math.min(Math.max(0, (agora - c.ultimoTick) / 1000), OFFLINE_MAX_SEGUNDOS);
    c.ultimoTick = agora;
    if (segundos < 60) return { segundos: 0, ganho: 0 };
    const semDourada = { ...c, douradaAte: 0 };
    const ganho = energiaPorSegundo(semDourada, agora) * segundos * (tem(c, "tempo1") ? 1 : 0.5);
    ganhar(c, ganho);
    return { segundos, ganho };
};

// ---------------- Evoluir (reiniciar) ----------------
export const podeEvoluir = (c) => c.totalPartida >= ENERGIA_PARA_EVOLUIR;

export const pedrasDoReinicio = (c) =>
    Math.floor(Math.sqrt(c.totalPartida / DIVISOR_PEDRAS) * (tem(c, "topo1") ? 1.25 : 1));

export const evoluir = (c, agora = Date.now()) => {
    if (!podeEvoluir(c)) return 0;
    const ganhas = pedrasDoReinicio(c);
    c.pedras += ganhas;
    c.pedrasTotal += ganhas;
    c.reinicios++;
    c.energia = 0;
    c.totalPartida = 0;
    c.melhorias = [];
    c.douradaAte = 0;
    c.ajudantes = tem(c, "tempo2") ? { magnemite: 10, voltorb: 5 } : {};
    c.ultimoTick = agora;
    return ganhas;
};

// ---------------- Árvore ----------------
export const noDisponivel = (c, no) => !tem(c, no.id) && no.requer.every((r) => tem(c, r));

export const comprarNo = (c, id) => {
    const no = NO_POR_ID[id];
    if (!no || !noDisponivel(c, no) || c.pedras < no.custo) return false;
    c.pedras -= no.custo;
    c.arvore.push(id);
    return true;
};

export const arvoreCompleta = (c) => ARVORE.every((n) => tem(c, n.id));

// ---------------- Mercado de pacotes ----------------
export const pacotesRestantesHoje = (c, dia) => (c.pacotesHoje.dia === dia ? Math.max(0, PACOTES_POR_DIA - c.pacotesHoje.qtd) : PACOTES_POR_DIA);

// Gasta as pedras de 1 pacote. Quem chama soma o pacote no jogo de cartas.
export const trocarPorPacote = (c, dia) => {
    if (!tem(c, "mercado") || c.pedras < PACOTE_CUSTO_PEDRAS || pacotesRestantesHoje(c, dia) < 1) return false;
    if (c.pacotesHoje.dia !== dia) c.pacotesHoje = { dia, qtd: 0 };
    c.pedras -= PACOTE_CUSTO_PEDRAS;
    c.pacotesHoje.qtd++;
    return true;
};

// ---------------- Números grandes ----------------
const SUFIXOS = ["", "mil", "mi", "bi", "tri", "quatri", "quint", "sext", "sept", "oct", "non", "dec"];
export const formatarGrande = (n) => {
    if (!Number.isFinite(n)) return "∞";
    if (n < 1000) {
        const casas = n < 10 && !Number.isInteger(n) ? 1 : 0;
        return n.toLocaleString("pt-BR", { maximumFractionDigits: casas });
    }
    const i = Math.floor(Math.log10(n) / 3);
    if (i >= SUFIXOS.length) return n.toExponential(2).replace(".", ",");
    const v = n / 1000 ** i;
    return `${v.toLocaleString("pt-BR", { maximumFractionDigits: v < 10 ? 2 : v < 100 ? 1 : 0 })} ${SUFIXOS[i]}`;
};
