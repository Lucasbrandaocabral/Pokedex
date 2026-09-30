// ====================================================
// Treinadores em pixel art (clientes do Pokémart Tycoon).
// Cada treinador é sorteado a partir de um número: cabelo, boné, pele e roupa.
// A imagem é um SVG com 2 quadros lado a lado (parado / passo) para animar andando.
// ====================================================

// Cabeças (10 linhas x 14). K contorno, S pele, s sombra da pele, E olho,
// H cabelo, h sombra do cabelo, C boné, c aba do boné, W detalhe do boné
const CABECAS = {
    bone: [
        "....KKKKKK....",
        "...KCCCCCCK...",
        "..KCCCCWWCCK..",
        "..KCCCCCCCCK..",
        ".KcccccccccccK",
        "..KHSSSSSSHK..",
        "..KSSESSESSK..",
        "..KSSSSSSSSK..",
        "...KSSssSSK...",
        "....KKSSKK....",
    ],
    curto: [
        "...KK.KK.KK...",
        "..KHHKHHKHHK..",
        "..KHHHHHHHHK..",
        ".KHHHHHHHHHHK.",
        ".KHhHHHHHHhHK.",
        "..KHSSSSSSHK..",
        "..KSSESSESSK..",
        "..KSSSSSSSSK..",
        "...KSSssSSK...",
        "....KKSSKK....",
    ],
    longo: [
        "....KKKKKK....",
        "...KHHHHHHK...",
        "..KHHHHHHHHK..",
        ".KHHHHHHHHHHK.",
        ".KHHhSSSShHHK.",
        ".KHHSSSSSSHHK.",
        ".KHSSESSESSHK.",
        ".KHSSSSSSSSHK.",
        ".KHHKSssSKHHK.",
        ".KHHKKSSKKHHK.",
    ],
};

// Tronco (7 linhas). T camisa, t sombra, P calça/saia, a alça da mochila
const TRONCO = [
    "..KKTTTTTTKK..",
    ".KSTTTTTTTTSK.",
    ".KSTTTTTTTTSK.",
    ".KSKTTTTTTKSK.",
    ".KSKTTTTTTKSK.",
    "..KKttttttKK..",
    "...KPPPPPPK...",
];
const SAIA = "..KPPPPPPPPK..";

// Pernas: [parado, passo]. L = perna (calça ou pele), B = sapato
const PERNAS = [
    ["...KLLKKLLK...", "...KLLKKLLK...", "...KLLKKLLK...", "...KBBKKBBK...", "...KKK..KKK..."],
    ["...KLLKKLLK...", "..KLLK..KLLK..", "..KLLK..KLLK..", "..KBBK..KBBK..", "..KKKK..KKKK.."],
];

const PELES = [["#f8d4ae", "#e2b08a"], ["#eab48c", "#cf9670"], ["#c68a5e", "#a66f47"], ["#8d5a3b", "#6e432a"]];
const CABELOS = [["#3a2a1c", "#241810"], ["#6b3d1e", "#4a2912"], ["#e8c060", "#b8903a"], ["#c84a2a", "#96331c"],
    ["#2a2a3a", "#15151f"], ["#dcdce4", "#a8a8b4"], ["#5b3a8a", "#3e2560"]];
const CAMISAS = [["#dc2a3c", "#a5192b"], ["#2f5bd3", "#1f3f99"], ["#2e9e5b", "#1f7040"], ["#ffcb05", "#d19f00"],
    ["#f28ab0", "#c9658b"], ["#8a5cd6", "#6440a8"], ["#f07d2a", "#c25c14"], ["#f4f4f4", "#c8c8d0"], ["#35c6c0", "#23918d"]];
const CALCAS = ["#2b3a67", "#3d3d46", "#6b4a2f", "#1f5f8f", "#4f6b2f", "#8a2a3a"];
const BONES = [["#dc2a3c", "#f4f4f4"], ["#2f5bd3", "#ffcb05"], ["#2e9e5b", "#f4f4f4"], ["#1c1b22", "#dc2a3c"], ["#ffcb05", "#2f5bd3"]];

// Gerador simples a partir de um número (sempre o mesmo treinador para o mesmo número)
const aleatorio = (semente) => {
    let s = (semente * 2654435761) >>> 0 || 1;
    return (lista) => {
        s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0;
        return lista[s % lista.length];
    };
};

const montarGrade = (estilo, saia, mochila, rocket) => {
    const tronco = TRONCO.map((l, i) => {
        let linha = l;
        if (mochila && i >= 1 && i <= 4) linha = linha.slice(0, 4) + "a" + linha.slice(5, 9) + "a" + linha.slice(10);
        if (rocket && i >= 1 && i <= 3) linha = linha.slice(0, 6) + "RR" + linha.slice(8);
        return linha;
    });
    if (saia) tronco[6] = SAIA;
    return PERNAS.map((pernas) => [...CABECAS[estilo], ...tronco, ...pernas]);
};

const cache = new Map();

// Devolve a URL (data:) do SVG com os 2 quadros do treinador
export const spriteTreinador = (semente, { rocket = false } = {}) => {
    const chave = rocket ? "rocket" : semente;
    if (cache.has(chave)) return cache.get(chave);
    const r = aleatorio(semente + 7);
    const menina = r([0, 1]) === 1;
    const estilo = rocket ? "bone" : menina ? r(["longo", "longo", "bone"]) : r(["curto", "bone", "curto"]);
    const saia = !rocket && menina && r([0, 1, 1]) === 1;
    const mochila = !rocket && r([0, 1]) === 1;
    const [pele, peleSombra] = rocket ? PELES[0] : r(PELES);
    const [cabelo, cabeloSombra] = rocket ? CABELOS[4] : r(CABELOS);
    const [camisa, camisaSombra] = rocket ? ["#2a2a33", "#16161c"] : r(CAMISAS);
    const calca = rocket ? "#2a2a33" : r(CALCAS);
    const [bone, detalhe] = rocket ? ["#2a2a33", "#dc2a3c"] : r(BONES);
    const cores = {
        K: "#1c1b22", S: pele, s: peleSombra, E: "#1c1b22", H: cabelo, h: cabeloSombra, C: bone, c: bone, W: detalhe,
        T: camisa, t: camisaSombra, P: calca, L: saia ? pele : calca, B: rocket ? "#dc2a3c" : "#3a2a24", a: "#6b4a2f", R: "#dc2a3c",
    };
    const quadros = montarGrade(estilo, saia, mochila, rocket);
    const partes = [];
    quadros.forEach((grade, q) => grade.forEach((linha, y) => [...linha].forEach((ch, x) => {
        if (cores[ch]) partes.push(`<rect x="${x + q * 14}" y="${y}" width="1.02" height="1.02" fill="${cores[ch]}"/>`);
    })));
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 22" shape-rendering="crispEdges">${partes.join("")}</svg>`;
    const url = `data:image/svg+xml,${encodeURIComponent(svg)}`;
    cache.set(chave, url);
    return url;
};
