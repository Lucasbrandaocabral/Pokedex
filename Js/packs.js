// ====================================================
// Sorteio das cartas de um pacote (5 cartas, estilo TCG Pocket)
// ====================================================
import { cartasDaRaridade, PACOTES } from "./cards.js";
import { estado, adicionarCarta, gastarPacote, registrarProgresso, salvar, PONTOS_POR_PACOTE } from "./state.js";

// Chances (%) por raridade para as posições 4 e 5 do pacote.
// As posições 1 a 3 são sempre ◆.
export const CHANCES = {
    4: { 2: 89, 3: 5, 4: 1.7, 5: 3.4, 6: 0.6, 7: 0.25, 8: 0.05 },
    5: { 2: 56, 3: 19, 4: 7, 5: 13, 6: 3.4, 7: 1.2, 8: 0.4 },
};
export const CHANCE_GOD_PACK = 0.25; // % de vir um pacote só com cartas ☆ ou melhores
const CHANCES_GOD = { 5: 70, 6: 22, 7: 6, 8: 2 };

export const sortearPeso = (tabela, rnd = Math.random) => {
    const itens = Object.entries(tabela);
    const total = itens.reduce((s, [, p]) => s + p, 0);
    let alvo = rnd() * total;
    for (const [chave, peso] of itens) {
        alvo -= peso;
        if (alvo <= 0) return Number(chave);
    }
    return Number(itens[itens.length - 1][0]);
};

// Procura primeiro no pacote, depois no resto da mesma expansão.
// Se a expansão não tiver aquela raridade, desce para a mais próxima.
export const sortearCarta = (raridade, pacote, rnd = Math.random) => {
    const colecao = PACOTES[pacote]?.colecao;
    for (let r = raridade; r >= 1; r--) {
        let pool = cartasDaRaridade(r, pacote);
        if (!pool.length) pool = cartasDaRaridade(r, null, colecao);
        if (pool.length) return pool[Math.floor(rnd() * pool.length)];
    }
    return cartasDaRaridade(1, null, colecao)[0];
};

export const sortearPacote = (pacote) => {
    const god = Math.random() * 100 < CHANCE_GOD_PACK;
    const raridades = god
        ? Array.from({ length: 5 }, () => sortearPeso(CHANCES_GOD))
        : [1, 1, 1, sortearPeso(CHANCES[4]), sortearPeso(CHANCES[5])];
    return { god, cartas: raridades.map((r) => sortearCarta(r, pacote)) };
};

// Abre `qtd` pacotes, gastando o saldo do jogador. Retorna a lista de pacotes abertos.
export const abrirPacotes = (pacote, qtd = 1) => {
    const abertos = [];
    for (let i = 0; i < qtd; i++) {
        if (!gastarPacote()) break;
        const { god, cartas } = sortearPacote(pacote);
        const resultado = cartas.map((carta) => ({ carta, nova: adicionarCarta(carta.id) }));
        estado.pontos += PONTOS_POR_PACOTE;
        estado.stats.pacotes++;
        if (god) estado.stats.godPacks++;
        abertos.push({ god, cartas: resultado });
    }
    if (abertos.length) {
        registrarProgresso("abrir", abertos.length);
        salvar();
    }
    return abertos;
};
