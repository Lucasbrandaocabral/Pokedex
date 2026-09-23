// ====================================================
// Trocas com bots: novas ofertas a cada 2 minutos
// ====================================================
import { CARTA_POR_ID, RARIDADES, cartasDaRaridade } from "./cards.js";
import { estado, quantidade, cartasUnicas, adicionarCarta, removerCarta, registrarProgresso, salvar } from "./state.js";
import { sortearPeso } from "./packs.js";

export const INTERVALO_TROCAS = 2 * 60 * 1000;
const OFERTAS_POR_RODADA = 6;

const BOTS = [
    { nome: "Treinadora Luna", avatar: 36, fala: "Troco rapidinho, bora?" },
    { nome: "Capitão Rafa", avatar: 130, fala: "Meu barco tá cheio de cartas!" },
    { nome: "Vovó Zezé", avatar: 113, fala: "Essas cartas eram do meu neto..." },
    { nome: "Kaio_Mestre", avatar: 68, fala: "Só aceito troca justa, beleza?" },
    { nome: "Ninja Pokébola", avatar: 94, fala: "Negócio feito nas sombras..." },
    { nome: "Dra. Carvalho", avatar: 133, fala: "É para a minha pesquisa!" },
    { nome: "Robô Treinador 3000", avatar: 81, fala: "BIP BOP. TROCA ÓTIMA DETECTADA." },
    { nome: "Bia Surfista", avatar: 131, fala: "Peguei essa na onda!" },
    { nome: "Tio Rocket", avatar: 52, fala: "Preparem-se para uma oferta!" },
    { nome: "Duda Elétrica", avatar: 26, fala: "Essa troca vai dar choque!" },
    { nome: "Léo Fogaréu", avatar: 58, fala: "Oferta pegando fogo!" },
    { nome: "Mila Psíquica", avatar: 65, fala: "Eu previ que você viria..." },
    { nome: "Bruno Pedreira", avatar: 95, fala: "Firme como uma rocha." },
    { nome: "Nina Floral", avatar: 45, fala: "Minhas cartas cheiram a flor!" },
];

// Gerador pseudoaleatório com semente (mulberry32)
const criarRng = (semente) => () => {
    semente |= 0;
    semente = (semente + 0x6d2b79f5) | 0;
    let t = Math.imul(semente ^ (semente >>> 15), 1 | semente);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const escolher = (lista, rnd) => lista[Math.floor(rnd() * lista.length)];

export const slotAtual = () => Math.floor(Date.now() / INTERVALO_TROCAS);
export const tempoProximaRodada = () => INTERVALO_TROCAS - (Date.now() % INTERVALO_TROCAS);

// Carta que o bot oferece: prefere as que o jogador ainda não tem
const cartaOferecida = (raridade, rnd, excluir = []) => {
    const pool = cartasDaRaridade(raridade).filter((c) => !excluir.includes(c.id));
    const faltando = pool.filter((c) => !quantidade(c.id));
    return (faltando.length && rnd() < 0.65 ? escolher(faltando, rnd) : escolher(pool, rnd)).id;
};

// Cópias extras (repetidas) que o jogador possui, uma entrada por cópia
const copiasExtras = (filtro = () => true) =>
    Object.entries(estado.colecao).flatMap(([id, q]) =>
        CARTA_POR_ID[id] && filtro(CARTA_POR_ID[id]) ? Array(Math.max(q - 1, 0)).fill(id) : []
    );

const cartaDesejada = (raridade, rnd, excluir) => {
    const repetidas = [...new Set(copiasExtras((c) => c.raridade === raridade))].filter((id) => id !== excluir);
    if (repetidas.length) return escolher(repetidas, rnd);
    const tenho = cartasDaRaridade(raridade).filter((c) => quantidade(c.id) && c.id !== excluir);
    if (tenho.length && rnd() < 0.5) return escolher(tenho, rnd).id;
    return escolher(cartasDaRaridade(raridade).filter((c) => c.id !== excluir), rnd).id;
};

const gerarOferta = (rnd, indice) => {
    const bot = BOTS[Math.floor(rnd() * BOTS.length)];
    const tipo = sortearPeso({ 1: 50, 2: 20, 3: 15, 4: 15 }, rnd);
    const base = { indice, bot };

    if (tipo === 2) {
        // 3 repetidas de uma raridade por 1 carta da raridade seguinte
        const raridade = sortearPeso({ 1: 55, 2: 30, 3: 15 }, rnd);
        const extras = copiasExtras((c) => c.raridade === raridade);
        if (extras.length >= 3) {
            const quer = [];
            for (let i = 0; i < 3; i++) quer.push(extras.splice(Math.floor(rnd() * extras.length), 1)[0]);
            return { ...base, tipo: "pacotao", da: [cartaOferecida(raridade + 1, rnd)], quer, moedas: 0 };
        }
    }
    if (tipo === 3) {
        // Bot compra uma repetida sua pagando o dobro do preço de venda
        const extras = [...new Set(copiasExtras())];
        if (extras.length) {
            const id = escolher(extras, rnd);
            const preco = RARIDADES[CARTA_POR_ID[id].raridade].venda * 2;
            return { ...base, tipo: "compra", da: [], quer: [id], moedas: preco };
        }
    }
    if (tipo === 4 || tipo === 3) {
        // Bot vende uma carta por moedas
        const raridade = sortearPeso({ 2: 35, 3: 30, 4: 15, 5: 15, 6: 5 }, rnd);
        const id = cartaOferecida(raridade, rnd);
        return { ...base, tipo: "venda", da: [id], quer: [], moedas: -RARIDADES[raridade].venda * 4 };
    }
    // Troca 1 por 1 da mesma raridade
    const raridade = sortearPeso({ 1: 38, 2: 30, 3: 16, 4: 8, 5: 6, 6: 2 }, rnd);
    const da = cartaOferecida(raridade, rnd);
    return { ...base, tipo: "troca", da: [da], quer: [cartaDesejada(raridade, rnd, da)], moedas: 0 };
};

// Garante que as ofertas da rodada atual existem (geradas 1x por rodada)
export const sincronizarTrocas = () => {
    const slot = slotAtual();
    // Ofertas geradas com o álbum vazio são refeitas assim que o jogador tiver cartas
    const albumVazioAntes = estado.trocas.comCartas === false && cartasUnicas() > 0 && !estado.trocas.feitas.length;
    if (estado.trocas.slot === slot && !albumVazioAntes) return false;
    const rnd = criarRng((estado.semente ^ Math.imul(slot, 2654435761)) >>> 0);
    estado.trocas = {
        slot,
        ofertas: Array.from({ length: OFERTAS_POR_RODADA }, (_, i) => gerarOferta(rnd, i)),
        feitas: [],
        comCartas: cartasUnicas() > 0,
    };
    salvar();
    return true;
};

const contar = (ids) => ids.reduce((m, id) => ({ ...m, [id]: (m[id] || 0) + 1 }), {});

// Verifica se o jogador pode aceitar a oferta. Retorna { ok, motivo, ultimaCopia }
export const verificarOferta = (oferta) => {
    if (estado.trocas.feitas.includes(oferta.indice)) return { ok: false, motivo: "Troca concluída" };
    if (oferta.moedas < 0 && estado.moedas < -oferta.moedas) return { ok: false, motivo: "Moedas insuficientes" };
    let ultimaCopia = false;
    for (const [id, q] of Object.entries(contar(oferta.quer))) {
        if (quantidade(id) < q) return { ok: false, motivo: "Você não tem essa carta" };
        if (quantidade(id) === q) ultimaCopia = true;
    }
    return { ok: true, ultimaCopia };
};

export const aceitarOferta = (oferta) => {
    if (!verificarOferta(oferta).ok) return null;
    oferta.quer.forEach((id) => removerCarta(id));
    const recebidas = oferta.da.map((id) => ({ carta: CARTA_POR_ID[id], nova: adicionarCarta(id) }));
    estado.moedas += oferta.moedas;
    estado.trocas.feitas.push(oferta.indice);
    estado.stats.trocas++;
    registrarProgresso("trocar");
    salvar();
    return recebidas;
};
