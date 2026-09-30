// Simula um jogador dedicado (joga todo dia) para conferir o ritmo da economia.
// Uso: node scripts/simular-economia.mjs [dias] [sementes]
const armazenamento = {};
globalThis.localStorage = { getItem: (k) => armazenamento[k] ?? null, setItem: (k, v) => { armazenamento[k] = v; }, removeItem: (k) => { delete armazenamento[k]; } };

let agora = Date.UTC(2026, 0, 1, 12);
const DateReal = Date;
globalThis.Date = class extends DateReal {
    constructor(...a) { super(...(a.length ? a : [agora])); }
    static now() { return agora; }
};

const { TOTAL_CARTAS, RARIDADES, CARTAS } = await import("../Js/cards.js");
const S = await import("../Js/state.js");
const { abrirPacotes } = await import("../Js/packs.js");
const T = await import("../Js/trades.js");
const { estado } = S;

const DIAS = Number(process.argv[2] || 120);
// Pacotes extras por dia vindos do Pokéclicker (conquistas no começo, mercado depois)
const pacotesClicker = (dia) => (dia < 30 ? 1 : 2);

const { PACOTES, cartasDoPacote } = await import("../Js/cards.js");
const melhorPacote = () => Object.keys(PACOTES).map((id) => [id, cartasDoPacote(id).filter((c) => !S.quantidade(c.id)).reduce((s, c) => s + c.raridade ** 2, 0)])
    .sort((a, b) => b[1] - a[1])[0][0];
const marcos = {};
for (let dia = 1; dia <= DIAS; dia++) {
    // Manhã: pega os grátis acumulados, bônus e abre tudo
    S.sincronizarDiario();
    S.resgatarBonusDiario();
    estado.comprados += pacotesClicker(dia);
    for (let hora = 0; hora < 24; hora += 4.8) {
        agora += 4.8 * 3600 * 1000;
        S.sincronizarGratis();
        // Como um jogador atento: abre o pacote com mais cartas raras faltando
        while (S.pacotesDisponiveis() > 0) abrirPacotes(melhorPacote(), 1);
        // Trocas com bots: aceita as que dão carta nova, até o limite
        T.sincronizarTrocas();
        for (const o of estado.trocas.ofertas) {
            if (T.trocasHoje() >= T.LIMITE_TROCAS_DIA) break;
            const nova = o.da.some((id) => !S.quantidade(id));
            const custoOk = o.quer.every((id) => S.quantidade(id) > 1) && o.moedas >= -estado.moedas * 0.5;
            if (nova && custoOk && T.verificarOferta(o).ok) T.aceitarOferta(o);
        }
    }
    for (const m of S.MISSOES) S.resgatarMissao(m.id);
    for (const q of S.CONQUISTAS) S.resgatarConquista(q.id);
    // Vende repetidas (guarda 2 para trocar) e compra pacotes
    S.venderRepetidas(2, 8);
    while (estado.moedas >= 5300) S.comprar(5300, 25);
    while (estado.moedas >= 250) S.comprar(250, 1);
    // Pontos: pega a carta que falta mais barata
    const faltam = CARTAS.filter((c) => !S.quantidade(c.id)).sort((a, b) => a.raridade - b.raridade);
    for (const c of faltam) if (!S.resgatarComPontos(c.id)) break;

    const pct = S.cartasUnicas() / TOTAL_CARTAS;
    for (const alvo of [0.25, 0.5, 0.75, 0.9, 0.97, 1]) if (pct >= alvo && !marcos[alvo]) marcos[alvo] = dia;
    if (dia === 14) marcos.dia14 = `${Math.round(pct * 100)}%`;
}
const faltando = CARTAS.filter((c) => !S.quantidade(c.id)).reduce((m, c) => ({ ...m, [c.raridade]: (m[c.raridade] || 0) + 1 }), {});
console.log(JSON.stringify({ faltando, pontos: estado.pontos, marcos, final: `${S.cartasUnicas()}/${TOTAL_CARTAS}`, pacotes: estado.stats.pacotes }));
