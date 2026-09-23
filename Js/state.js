// ====================================================
// Estado do jogador: salvo no localStorage do navegador
// ====================================================
import { CARTA_POR_ID, RARIDADES } from "./cards.js";

const CHAVE = "pokepocket_save_v1";

export const PACOTES_GRATIS_MAX = 5;
// 5 pacotes grátis distribuídos ao longo de 24 horas (1 a cada 4h48)
export const INTERVALO_GRATIS = (24 * 60 * 60 * 1000) / PACOTES_GRATIS_MAX;
export const PONTOS_POR_PACOTE = 5;
export const BONUS_DIARIO = 100;

export const MISSOES = [
    { id: "abrir3", texto: "Abra 3 pacotes", campo: "abrir", meta: 3, premio: 150 },
    { id: "abrir10", texto: "Abra 10 pacotes", campo: "abrir", meta: 10, premio: 300 },
    { id: "trocar1", texto: "Faça 1 troca com um bot", campo: "trocar", meta: 1, premio: 100 },
    { id: "trocar3", texto: "Faça 3 trocas com bots", campo: "trocar", meta: 3, premio: 250 },
    { id: "vender5", texto: "Venda 5 cartas repetidas", campo: "vender", meta: 5, premio: 50 },
];

export const CONQUISTAS = [
    { id: "c25", meta: 25, premio: 200 },
    { id: "c50", meta: 50, premio: 400 },
    { id: "c100", meta: 100, premio: 800 },
    { id: "c150", meta: 150, premio: 1500 },
    { id: "c200", meta: 200, premio: 5000 },
];

const hoje = () => {
    const d = new Date();
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
};

const diarioNovo = () => ({ dia: hoje(), bonus: false, progresso: { abrir: 0, trocar: 0, vender: 0 }, resgatadas: [] });

const estadoInicial = () => {
    let favoritosAntigos = [];
    try {
        favoritosAntigos = JSON.parse(localStorage.getItem("favoritos")) || [];
    } catch (e) { /* sem favoritos antigos */ }
    return {
        v: 1,
        semente: (Math.random() * 2 ** 32) >>> 0,
        moedas: 500,
        pontos: 0,
        gratis: { qtd: PACOTES_GRATIS_MAX, ultimo: Date.now() },
        comprados: 0,
        colecao: {},
        novas: {},
        stats: { pacotes: 0, trocas: 0, vendidas: 0, godPacks: 0 },
        diario: diarioNovo(),
        conquistas: [],
        trocas: { slot: -1, ofertas: [], feitas: [] },
        missoesVistas: 0,
        favoritos: favoritosAntigos,
        som: true,
    };
};

const carregar = () => {
    try {
        const salvo = JSON.parse(localStorage.getItem(CHAVE));
        if (salvo && salvo.v === 1) return { ...estadoInicial(), ...salvo };
    } catch (e) { /* save corrompido: começa do zero */ }
    return estadoInicial();
};

export const estado = carregar();

const ouvintes = new Set();
export const aoMudar = (fn) => ouvintes.add(fn);

export const salvar = (notificar = true) => {
    try {
        localStorage.setItem(CHAVE, JSON.stringify(estado));
    } catch (e) { /* armazenamento indisponível */ }
    if (notificar) ouvintes.forEach((fn) => fn());
};

export const resetar = () => {
    localStorage.removeItem(CHAVE);
    location.reload();
};

// ---------------- Diário ----------------
export const sincronizarDiario = () => {
    if (estado.diario.dia !== hoje()) {
        estado.diario = diarioNovo();
        salvar();
    }
};

export const registrarProgresso = (campo, qtd = 1) => {
    sincronizarDiario();
    estado.diario.progresso[campo] = (estado.diario.progresso[campo] || 0) + qtd;
};

export const resgatarMissao = (id) => {
    const missao = MISSOES.find((m) => m.id === id);
    if (!missao || estado.diario.resgatadas.includes(id)) return false;
    if ((estado.diario.progresso[missao.campo] || 0) < missao.meta) return false;
    estado.diario.resgatadas.push(id);
    estado.moedas += missao.premio;
    salvar();
    return missao.premio;
};

export const resgatarBonusDiario = () => {
    sincronizarDiario();
    if (estado.diario.bonus) return false;
    estado.diario.bonus = true;
    estado.moedas += BONUS_DIARIO;
    salvar();
    return BONUS_DIARIO;
};

export const resgatarConquista = (id) => {
    const c = CONQUISTAS.find((x) => x.id === id);
    if (!c || estado.conquistas.includes(id) || cartasUnicas() < c.meta) return false;
    estado.conquistas.push(id);
    estado.moedas += c.premio;
    salvar();
    return c.premio;
};

// ---------------- Pacotes grátis ----------------
export const sincronizarGratis = () => {
    const agora = Date.now();
    const g = estado.gratis;
    if (g.qtd >= PACOTES_GRATIS_MAX) {
        g.ultimo = agora;
        return;
    }
    const ganhos = Math.floor((agora - g.ultimo) / INTERVALO_GRATIS);
    if (ganhos > 0) {
        g.qtd = Math.min(PACOTES_GRATIS_MAX, g.qtd + ganhos);
        g.ultimo += ganhos * INTERVALO_GRATIS;
        if (g.qtd >= PACOTES_GRATIS_MAX) g.ultimo = agora;
        salvar();
    }
};

export const tempoProximoGratis = () => {
    if (estado.gratis.qtd >= PACOTES_GRATIS_MAX) return 0;
    return Math.max(0, INTERVALO_GRATIS - (Date.now() - estado.gratis.ultimo));
};

export const pacotesDisponiveis = () => estado.gratis.qtd + estado.comprados;

// Gasta um pacote (grátis primeiro). Retorna false se não houver.
export const gastarPacote = () => {
    sincronizarGratis();
    if (estado.gratis.qtd > 0) {
        if (estado.gratis.qtd === PACOTES_GRATIS_MAX) estado.gratis.ultimo = Date.now();
        estado.gratis.qtd--;
        return true;
    }
    if (estado.comprados > 0) {
        estado.comprados--;
        return true;
    }
    return false;
};

// ---------------- Coleção ----------------
export const quantidade = (id) => estado.colecao[id] || 0;
export const cartasUnicas = () => Object.values(estado.colecao).filter((q) => q > 0).length;

export const adicionarCarta = (id, qtd = 1) => {
    const nova = !quantidade(id);
    estado.colecao[id] = quantidade(id) + qtd;
    if (nova) estado.novas[id] = true;
    return nova;
};

export const removerCarta = (id, qtd = 1) => {
    if (quantidade(id) < qtd) return false;
    estado.colecao[id] -= qtd;
    if (!estado.colecao[id]) delete estado.colecao[id];
    return true;
};

export const venderCarta = (id, qtd = 1) => {
    if (!removerCarta(id, qtd)) return 0;
    const valor = RARIDADES[CARTA_POR_ID[id].raridade].venda * qtd;
    estado.moedas += valor;
    estado.stats.vendidas += qtd;
    registrarProgresso("vender", qtd);
    salvar();
    return valor;
};

// Lista repetidas vendáveis: mantém `manter` cópias de cada
export const listarRepetidas = (manter = 1, raridadeMax = 4) =>
    Object.entries(estado.colecao)
        .map(([id, q]) => ({ carta: CARTA_POR_ID[id], qtd: q - manter }))
        .filter((x) => x.carta && x.qtd > 0 && x.carta.raridade <= raridadeMax);

export const venderRepetidas = (manter = 1, raridadeMax = 4) => {
    let total = 0;
    let qtdTotal = 0;
    for (const { carta, qtd } of listarRepetidas(manter, raridadeMax)) {
        removerCarta(carta.id, qtd);
        total += RARIDADES[carta.raridade].venda * qtd;
        qtdTotal += qtd;
    }
    if (!qtdTotal) return { total: 0, qtd: 0 };
    estado.moedas += total;
    estado.stats.vendidas += qtdTotal;
    registrarProgresso("vender", qtdTotal);
    salvar();
    return { total, qtd: qtdTotal };
};

export const resgatarComPontos = (id) => {
    const custo = RARIDADES[CARTA_POR_ID[id].raridade].pontos;
    if (estado.pontos < custo) return false;
    estado.pontos -= custo;
    adicionarCarta(id);
    salvar();
    return true;
};

export const comprar = (preco, pacotes) => {
    if (estado.moedas < preco) return false;
    estado.moedas -= preco;
    estado.comprados += pacotes;
    salvar();
    return true;
};

export const alternarFavorito = (nome) => {
    const i = estado.favoritos.indexOf(nome);
    if (i >= 0) estado.favoritos.splice(i, 1);
    else estado.favoritos.push(nome);
    salvar();
    return i < 0;
};
