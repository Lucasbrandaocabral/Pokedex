// ====================================================
// Arte dos móveis e produtos do Pokémart Tycoon.
// Móveis em pixel art feitos aqui mesmo (SVG) e produtos com as imagens de itens da PokeAPI.
// ====================================================
const ITENS = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items";

// Transforma uma grade de letras em SVG (cada letra é uma cor, "." é transparente)
const pixel = (linhas, cores) => {
    const partes = [];
    linhas.forEach((linha, y) => [...linha].forEach((ch, x) => {
        if (cores[ch]) partes.push(`<rect x="${x}" y="${y}" width="1.02" height="1.02" fill="${cores[ch]}"/>`);
    }));
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${linhas[0].length} ${linhas.length}" shape-rendering="crispEdges">${partes.join("")}</svg>`;
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
};
const K = "#1c1b22";

const REGISTRADORA = pixel([
    "....KKKKKKKK....",
    "....KGGGGGGK....",
    "....KGgGGgGK....",
    "....KKKKKKKK....",
    "...KMMMMMMMMK...",
    "..KMWMWMWMWMMK..",
    "..KMMMMMMMMMMK..",
    "..KMWMWMWMWMMK..",
    ".KMMMMMMMMMMMMK.",
    ".KDDDDDDDDDDDDK.",
    ".KDDDDDYYDDDDDK.",
    ".KDDDDDDDDDDDDK.",
    ".KKKKKKKKKKKKKK.",
], { K, G: "#7fe0a0", g: "#2e9e5b", M: "#b8bcc8", W: "#f4f4f4", D: "#6b7390", Y: "#ffcb05" });

const PLANTA = pixel([
    "......KK......",
    ".....KLLK.....",
    "..KK.KLLK.KK..",
    ".KLLKKLlLKLLK.",
    ".KLlLKLLLKlLK.",
    "..KLLKLlLKLLK.",
    "KK.KLLLLLLK.KK",
    "KLKKLlLLLlLKLK",
    ".KLLLLKLKLLLK.",
    "..KKKKLLLKKK..",
    "...KKKKKKKK...",
    "..KOOOOOOOOK..",
    "..KooooooooK..",
    "...KOOOOOOK...",
    "...KOOOOOOK...",
    "....KOOOOK....",
    "....KKKKKK....",
], { K, L: "#4caf50", l: "#2e7d32", O: "#e07a3a", o: "#b5582a" });

const MAQUINA = pixel([
    "KKKKKKKKKKKKKK",
    "KRRRRRRRRRRRRK",
    "KRYYYYYYYYYYRK",
    "KRRRRRRRRRRRRK",
    "KRKKKKKKKRRRRK",
    "KRKGbObPKRNRRK",
    "KRKGbObPKRRRRK",
    "KRKbbbbbKRNRRK",
    "KRKYbGbOKRRRRK",
    "KRKYbGbOKRNRRK",
    "KRKbbbbbKRRRRK",
    "KRKPbYbGKRKKRK",
    "KRKPbYbGKRRRRK",
    "KRKKKKKKKRRRRK",
    "KRRRRRRRRRRRRK",
    "KRKKKKKKKKKKRK",
    "KRKDDDDDDDDKRK",
    "KRKKKKKKKKKKRK",
    "KrrrrrrrrrrrrK",
    "KKKKKKKKKKKKKK",
    ".KK........KK.",
], { K, R: "#dc2a3c", r: "#a5192b", Y: "#ffcb05", b: "#bfe8ff", G: "#2e9e5b", O: "#f07d2a", P: "#8a5cd6", N: "#f4f4f4", D: "#3a2a24" });

const PACOTE = pixel([
    ".KKKKKK.",
    "KWWWWWWK",
    "KRRRRRRK",
    "KRYYYYRK",
    "KRYRRYRK",
    "KRRYYRRK",
    "KRRRRRRK",
    "KRWWWWRK",
    "KRRRRRRK",
    "KWWWWWWK",
    ".KKKKKK.",
], { K, W: "#e6e6ee", R: "#dc2a3c", Y: "#ffcb05" });

const ESTANTE = pixel([
    "KKKKKKKKKKKKKK",
    "KWWWWWWWWWWWWK",
    "KWbbbbbbbbbbWK",
    "KWbRbGbRbGbbWK",
    "KWbRbGbRbGbbWK",
    "KWWWWWWWWWWWWK",
    "KWbbbbbbbbbbWK",
    "KWbYbBbYbBbbWK",
    "KWbYbBbYbBbbWK",
    "KWWWWWWWWWWWWK",
    "KKKKKKKKKKKKKK",
], { K, W: "#c98b55", b: "#7a4f2e", R: "#dc2a3c", G: "#2e9e5b", Y: "#ffcb05", B: "#2f5bd3" });

const VITRINE = pixel([
    "KKKKKKKKKKKK",
    "KggggggggggK",
    "KgKKKKKKKKgK",
    "KgKYYYYYYKgK",
    "KgKYppppYKgK",
    "KgKYppppYKgK",
    "KgKYppppYKgK",
    "KgKYYYYYYKgK",
    "KgKKKKKKKKgK",
    "KggggggggggK",
    "KKKKKKKKKKKK",
    "KWWWWWWWWWWK",
    "KwwwwwwwwwwK",
    "KKKKKKKKKKKK",
], { K, g: "#cdeeff", Y: "#ffcb05", p: "#f28ab0", W: "#c98b55", w: "#8a5a34" });

// Imagem de cada produto (a do pacote de cartas é desenhada aqui)
export const IMAGEM_PRODUTO = {
    pocao: `${ITENS}/potion.png`,
    pokebola: `${ITENS}/poke-ball.png`,
    pacote: PACOTE,
    isca: `${ITENS}/old-rod.png`,
    reviver: `${ITENS}/revive.png`,
    ultraball: `${ITENS}/ultra-ball.png`,
};

// Arte de cada móvel (na loja e na paleta de construção)
export const ARTE_MOVEL = { caixa: REGISTRADORA, planta: PLANTA, maquina: MAQUINA, prateleira: ESTANTE, vitrine: VITRINE };

// Quantos itens aparecem na estante
export const ITENS_NA_ESTANTE = 9;
