// ====================================================
// Cartas do jogo: Origem Genética, as outras expansões da Série A e a Série B,
// a partir dos dados base dos Pokémon
// ====================================================
import { POKEMON } from "./pokemon-data.js";

const SPRITES = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon";

export const RARIDADES = {
    1: { simbolo: "◆", nome: "Comum", venda: 5, pontos: 80 },
    2: { simbolo: "◆◆", nome: "Incomum", venda: 15, pontos: 150 },
    3: { simbolo: "◆◆◆", nome: "Rara", venda: 40, pontos: 300 },
    4: { simbolo: "◆◆◆◆", nome: "Dupla Rara (ex)", venda: 100, pontos: 600 },
    5: { simbolo: "☆", nome: "Arte Rara", venda: 150, pontos: 800 },
    6: { simbolo: "☆☆", nome: "Super Rara", venda: 400, pontos: 1000 },
    7: { simbolo: "☆☆☆", nome: "Arte Imersiva", venda: 800, pontos: 1400 },
    8: { simbolo: "♛", nome: "Coroa", venda: 2000, pontos: 1800 },
};

export const TIPOS = {
    normal: { nome: "Normal", cor: "#a8a77a", icone: "⭐", fraqueza: "fighting" },
    fire: { nome: "Fogo", cor: "#ee8130", icone: "🔥", fraqueza: "water" },
    water: { nome: "Água", cor: "#6390f0", icone: "💧", fraqueza: "electric" },
    electric: { nome: "Elétrico", cor: "#f7d02c", icone: "⚡", fraqueza: "ground" },
    grass: { nome: "Planta", cor: "#7ac74c", icone: "🌿", fraqueza: "fire" },
    ice: { nome: "Gelo", cor: "#96d9d6", icone: "❄️", fraqueza: "fire" },
    fighting: { nome: "Lutador", cor: "#c22e28", icone: "👊", fraqueza: "psychic" },
    poison: { nome: "Venenoso", cor: "#a33ea1", icone: "☠️", fraqueza: "psychic" },
    ground: { nome: "Terra", cor: "#e2bf65", icone: "⛰️", fraqueza: "water" },
    flying: { nome: "Voador", cor: "#a98ff3", icone: "🪶", fraqueza: "electric" },
    psychic: { nome: "Psíquico", cor: "#f95587", icone: "🔮", fraqueza: "ghost" },
    bug: { nome: "Inseto", cor: "#a6b91a", icone: "🐛", fraqueza: "fire" },
    rock: { nome: "Pedra", cor: "#b6a136", icone: "🪨", fraqueza: "grass" },
    ghost: { nome: "Fantasma", cor: "#735797", icone: "👻", fraqueza: "ghost" },
    dragon: { nome: "Dragão", cor: "#6f35fc", icone: "🐉", fraqueza: "ice" },
    dark: { nome: "Sombrio", cor: "#705746", icone: "🌙", fraqueza: "fighting" },
    steel: { nome: "Aço", cor: "#b7b7ce", icone: "⚙️", fraqueza: "fire" },
    fairy: { nome: "Fada", cor: "#d685ad", icone: "🧚", fraqueza: "poison" },
};

const ATAQUES = {
    normal: ["Investida", "Pancada", "Hiper Raio", "Golpe Final"],
    fire: ["Brasa", "Lança-Chamas", "Rajada de Fogo", "Explosão Infernal"],
    water: ["Jato d'Água", "Bolhas", "Hidro Bomba", "Surf Colossal"],
    electric: ["Choque do Trovão", "Faísca", "Trovoada", "Relâmpago Supremo"],
    grass: ["Chicote de Vinha", "Folha Navalha", "Raio Solar", "Tempestade Floral"],
    ice: ["Pó de Neve", "Raio de Gelo", "Nevasca", "Era Glacial"],
    fighting: ["Golpe de Karatê", "Chute Baixo", "Soco Dinâmico", "Punho Titânico"],
    poison: ["Ferrão Venenoso", "Ácido", "Bomba de Lodo", "Névoa Tóxica"],
    ground: ["Ataque de Areia", "Ossada", "Terremoto", "Grande Fissura"],
    flying: ["Rajada de Vento", "Ataque de Asa", "Ataque Aéreo", "Furacão"],
    psychic: ["Confusão", "Psicorraio", "Psíquico", "Mente Absoluta"],
    bug: ["Picada", "Fio de Seda", "Tesoura X", "Enxame Voraz"],
    rock: ["Lançar Pedras", "Deslizamento", "Pedra Afiada", "Avalanche"],
    ghost: ["Lambida", "Sombra Noturna", "Bola Sombria", "Pesadelo Eterno"],
    dragon: ["Fúria do Dragão", "Garra de Dragão", "Ultraje", "Cometa Draconiano"],
    dark: ["Mordida", "Trituração", "Pulso Sombrio", "Noite Sem Fim"],
    steel: ["Garra de Metal", "Cauda de Ferro", "Canhão de Flash", "Meteoro Metálico"],
    fairy: ["Voz Encantadora", "Beijo Drenante", "Luz da Lua", "Explosão Feérica"],
};

const NOMES_ESPECIAIS = {
    "nidoran-f": "Nidoran♀",
    "nidoran-m": "Nidoran♂",
    "mr-mime": "Mr. Mime",
    farfetchd: "Farfetch'd",
    "ho-oh": "Ho-Oh",
};

export const nomeBonito = (id) =>
    NOMES_ESPECIAIS[id] || id.charAt(0).toUpperCase() + id.slice(1);

const arred10 = (n) => Math.round(n / 10) * 10;
const limitar = (n, min, max) => Math.max(min, Math.min(max, n));

const pacoteDoPokemon = (p) => {
    const tipo = p.tipos[0];
    if (["fire", "fighting", "rock", "ground"].includes(tipo)) return "charizard";
    if (["psychic", "poison", "ghost", "fairy", "grass", "bug"].includes(tipo)) return "mewtwo";
    if (tipo === "normal") return p.id % 2 ? "charizard" : "pikachu";
    return "pikachu";
};

const raridadeBase = (p) => {
    if (p.lendario || p.estagio === 2) return 3;
    if (p.estagio === 1) return 2;
    if (!p.evolui && p.total >= 450) return 2;
    return 1;
};

const imagem = {
    arte: (id) => `${SPRITES}/other/official-artwork/${id}.png`,
    arteShiny: (id) => `${SPRITES}/other/official-artwork/shiny/${id}.png`,
    home: (id) => `${SPRITES}/other/home/${id}.png`,
    homeShiny: (id) => `${SPRITES}/other/home/shiny/${id}.png`,
    sprite: (id) => `${SPRITES}/${id}.png`,
    pixel: (id) => `${SPRITES}/versions/generation-v/black-white/animated/${id}.gif`,
};
export const imagemSprite = imagem.sprite;
export const imagemArte = imagem.arte;
export const imagemPixel = imagem.pixel;

// "variacao" troca os nomes dos ataques entre as coleções
const gerarAtaques = (p, bonus = 0, variacao = 0) => {
    const nomes = ATAQUES[p.tipos[0]] || ATAQUES.normal;
    const danoPrincipal = limitar(arred10(p.ataque * 0.55 + p.estagio * 20 + 10 + bonus), 10, 250);
    const tier = Math.min(p.estagio + (p.lendario ? 1 : 0), 2) + (bonus ? 1 : 0);
    const principal = Math.min(tier + (variacao % 2), 3);
    const ataques = [];
    if (p.estagio > 0 || p.total >= 450 || bonus) {
        const nomesSec = ATAQUES[p.tipos[1]] || nomes;
        let sec = (Math.max(tier - 2, 0) + variacao) % 2;
        if (nomesSec === nomes && sec === principal) sec = 1 - sec; // não repete o mesmo ataque
        ataques.push({ nome: nomesSec[sec], dano: limitar(arred10(danoPrincipal * 0.4), 10, 120) });
    }
    ataques.push({ nome: nomes[principal], dano: danoPrincipal });
    return ataques;
};

// Pokémon base já organizados
const BASE = POKEMON.map(([id, nome, tipos, hp, ataque, defesa, total, estagio, lendario, evolui, altura, peso, evoluiDe]) => ({
    id, nome, tipos, hp, ataque, defesa, total, estagio, lendario: !!lendario, evolui: !!evolui, altura, peso, evoluiDe,
}));
export const POKEMON_POR_ID = Object.fromEntries(BASE.map((p) => [p.id, p]));

const criarCarta = (numero, p, variante, raridade, extra = {}, ajuste = 0) => {
    const ex = ["ex", "sr", "im", "coroa"].includes(variante);
    const hpBase = arred10(p.hp * 0.6 + 30 + p.estagio * 20 + (p.total - 300) * 0.1) + ajuste * 10;
    return {
        id: String(numero).padStart(3, "0"),
        numero,
        pid: p.id,
        nome: (p.nomeCarta || nomeBonito(p.nome)) + (ex ? " ex" : ""),
        tipos: p.tipos,
        tipo: p.tipos[0],
        estagio: p.estagio,
        hp: limitar(hpBase + (ex ? 60 : 0), 30, 280),
        raridade,
        variante,
        pacote: pacoteDoPokemon(p),
        colecao: "A1",
        ataques: gerarAtaques(p, ex ? 40 : 0, ajuste),
        fraqueza: TIPOS[p.tipos[0]].fraqueza,
        altura: p.altura / 10, // metros
        peso: p.peso / 10, // quilos
        evoluiDe: p.evoluiDe ? nomeBonito(POKEMON_POR_ID[p.evoluiDe].nome) : null,
        recuo: limitar(p.estagio + (p.total >= 500 ? 1 : 0) + (p.defesa >= 100 ? 1 : 0), 0, 4),
        ...(p.dex ? { dex: p.dex } : {}),
        ...extra,
    };
};

const ESPECIAIS = [
    // ex (◆◆◆◆)
    ...[6, 3, 9, 25, 150, 94, 65, 149, 130, 144, 145, 146, 59, 68, 121, 151].map((pid) => ["ex", 4, pid]),
    // Arte Rara (☆)
    ...[25, 1, 4, 7, 133, 54, 143, 39, 52, 129, 132, 79, 131, 35, 104, 37, 92, 58].map((pid) => ["arte", 5, pid]),
    // Super Rara (☆☆)
    ...[6, 25, 150, 94, 149, 151, 144, 145, 146].map((pid) => ["sr", 6, pid]),
    // Arte Imersiva (☆☆☆)
    ...[6, 25, 150].map((pid) => ["im", 7, pid]),
    // Coroa (♛)
    ...[6, 25, 150].map((pid) => ["coroa", 8, pid]),
];

const IMAGEM_VARIANTE = {
    base: imagem.arte,
    ex: imagem.arte,
    arte: imagem.home,
    sr: imagem.arte,
    im: imagem.homeShiny,
    coroa: imagem.arteShiny,
};

// ---------------- Expansões da Série A ----------------
// Por enquanto só com Pokémon da 1ª geração.
// Nas listas, "A19" quer dizer a forma de Alola do Pokémon 19 (Rattata).
const FORMAS_ALOLA = {
    19: [10091, ["dark", "normal"]],
    20: [10092, ["dark", "normal"]],
    26: [10100, ["electric", "psychic"]],
    27: [10101, ["ice", "steel"]],
    28: [10102, ["ice", "steel"]],
    37: [10103, ["ice"]],
    38: [10104, ["ice", "fairy"]],
    50: [10105, ["ground", "steel"]],
    51: [10106, ["ground", "steel"]],
    52: [10107, ["dark"]],
    53: [10108, ["dark"]],
    74: [10109, ["rock", "electric"]],
    75: [10110, ["rock", "electric"]],
    76: [10111, ["rock", "electric"]],
    88: [10112, ["poison", "dark"]],
    89: [10113, ["poison", "dark"]],
    103: [10114, ["grass", "dragon"]],
    105: [10115, ["fire", "ghost"]],
};

// Série B: Megaevoluções ("M6X" = Mega Charizard X), formas de Paldea ("P194") e Pokémon Paradoxo ("X984").
// [imagem, tipos, espécie base, nome na carta, selo, [PS, ataque, defesa, total, altura, peso], nº na Pokédex]
const FORMAS = {
    M3: [10033, ["grass","poison"], 3, null, "Mega", [80, 100, 123, 625, 24, 1555]],
    M6X: [10034, ["fire","dragon"], 6, null, "Mega", [78, 130, 111, 634, 17, 1105]],
    M6Y: [10035, ["fire","flying"], 6, null, "Mega", [78, 104, 78, 634, 17, 1005]],
    M9: [10036, ["water"], 9, null, "Mega", [79, 103, 120, 630, 16, 1011]],
    M15: [10090, ["bug","poison"], 15, null, "Mega", [65, 150, 40, 495, 14, 405]],
    M18: [10073, ["normal","flying"], 18, null, "Mega", [83, 80, 80, 579, 22, 505]],
    M26X: [10304, ["electric"], 26, null, "Mega", [60, 135, 95, 585, 12, 380]],
    M26Y: [10305, ["electric"], 26, null, "Mega", [60, 100, 55, 585, 10, 260]],
    M36: [10278, ["fairy","flying"], 36, null, "Mega", [95, 80, 93, 583, 17, 423]],
    M65: [10037, ["psychic"], 65, null, "Mega", [55, 50, 65, 600, 12, 480]],
    M71: [10279, ["grass","poison"], 71, null, "Mega", [80, 125, 85, 590, 45, 1255]],
    M80: [10071, ["water","psychic"], 80, null, "Mega", [95, 75, 180, 590, 20, 1200]],
    M94: [10038, ["ghost","poison"], 94, null, "Mega", [60, 65, 80, 600, 14, 405]],
    M115: [10039, ["normal"], 115, null, "Mega", [105, 125, 100, 590, 22, 1000]],
    M121: [10280, ["water","psychic"], 121, null, "Mega", [60, 100, 105, 620, 23, 800]],
    M127: [10040, ["bug","flying"], 127, null, "Mega", [65, 155, 120, 600, 17, 590]],
    M130: [10041, ["water","dark"], 130, null, "Mega", [95, 155, 109, 640, 65, 3050]],
    M142: [10042, ["rock","flying"], 142, null, "Mega", [80, 135, 85, 615, 21, 790]],
    M149: [10281, ["dragon","flying"], 149, null, "Mega", [91, 124, 115, 700, 22, 2900]],
    M150X: [10043, ["psychic","fighting"], 150, null, "Mega", [106, 190, 100, 780, 23, 1270]],
    M150Y: [10044, ["psychic"], 150, null, "Mega", [106, 150, 70, 780, 15, 330]],
    M154: [10282, ["grass","fairy"], 154, null, "Mega", [80, 92, 115, 625, 24, 2010]],
    M160: [10283, ["water","dragon"], 160, null, "Mega", [85, 160, 125, 630, 23, 1088]],
    M181: [10045, ["electric","dragon"], 181, null, "Mega", [90, 95, 105, 610, 14, 615]],
    M208: [10072, ["steel","ground"], 208, null, "Mega", [75, 125, 230, 610, 105, 7400]],
    M212: [10046, ["bug","steel"], 212, null, "Mega", [70, 150, 140, 600, 20, 1250]],
    M214: [10047, ["bug","fighting"], 214, null, "Mega", [80, 185, 115, 600, 17, 625]],
    M227: [10284, ["steel","flying"], 227, null, "Mega", [65, 140, 110, 565, 17, 404]],
    M229: [10048, ["dark","fire"], 229, null, "Mega", [75, 90, 90, 600, 19, 495]],
    M248: [10049, ["rock","dark"], 248, null, "Mega", [100, 164, 150, 700, 25, 2550]],
    P194: [10253, ["poison","ground"], 194, "Wooper de Paldea", "Paldea", [55, 45, 45, 210, 4, 110]],
    P128C: [10250, ["fighting"], 128, "Tauros de Paldea", "Paldea Combate", [75, 110, 105, 490, 14, 1150]],
    P128F: [10251, ["fighting","fire"], 128, "Tauros de Paldea", "Paldea Chamas", [75, 110, 105, 490, 14, 850]],
    P128A: [10252, ["fighting","water"], 128, "Tauros de Paldea", "Paldea Aquática", [75, 110, 105, 490, 14, 1100]],
    X984: [984, ["ground","fighting"], 232, "Great Tusk", "Antigo", [115, 131, 131, 570, 22, 3200], 984],
    X985: [985, ["fairy","psychic"], 39, "Scream Tail", "Antigo", [115, 65, 99, 570, 12, 80], 985],
    X987: [987, ["ghost","fairy"], 200, "Flutter Mane", "Antigo", [55, 55, 55, 570, 14, 40], 987],
    X989: [989, ["electric","ground"], 82, "Sandy Shocks", "Antigo", [85, 81, 97, 570, 23, 600], 989],
    X990: [990, ["ground","steel"], 232, "Iron Treads", "Futuro", [90, 112, 120, 570, 9, 2400], 990],
    X991: [991, ["ice","water"], 225, "Iron Bundle", "Futuro", [56, 80, 114, 570, 6, 110], 991],
    X995: [995, ["rock","electric"], 248, "Iron Thorns", "Futuro", [100, 134, 110, 570, 16, 3030], 995],
    X1009: [1009, ["water","dragon"], 245, "Walking Wake", "Antigo", [99, 83, 91, 590, 35, 2800], 1009],
    X1020: [1020, ["fire","dragon"], 244, "Gouging Fire", "Antigo", [105, 115, 121, 590, 35, 5900], 1020],
    X1021: [1021, ["electric","dragon"], 243, "Raging Bolt", "Antigo", [125, 73, 91, 590, 52, 4800], 1021],
};

const pokemonDaLista = (ref) => {
    if (typeof ref === "number") return { ...POKEMON_POR_ID[ref], imagemId: ref };
    if (FORMAS[ref]) {
        const [imagemId, tipos, base, nome, forma, [hp, ataque, defesa, total, altura, peso], dex] = FORMAS[ref];
        const b = POKEMON_POR_ID[base];
        const p = { ...b, tipos, hp, ataque, defesa, total, altura, peso, imagemId, forma };
        if (ref[0] === "M") return { ...p, mega: true, nomeCarta: `Mega ${nomeBonito(b.nome)}${/[XY]$/.test(ref) ? ` ${ref.slice(-1)}` : ""}` };
        if (ref[0] === "P") return { ...p, nomeCarta: nome, regional: true };
        // Paradoxo: espécie própria, só parente do Pokémon base
        return { ...p, nomeCarta: nome, dex, estagio: 0, evolui: false, evoluiDe: 0, lendario: false };
    }
    const pid = Number(ref.slice(1));
    const [imagemId, tipos] = FORMAS_ALOLA[pid];
    const p = POKEMON_POR_ID[pid];
    return { ...p, tipos, imagemId, nomeCarta: `${nomeBonito(p.nome)} de Alola`, forma: "Alola", regional: true };
};

// Cada estilo usa uma fonte de imagem diferente para a mesma variante
const ESTILOS = {
    arte: IMAGEM_VARIANTE,
    home: { ...IMAGEM_VARIANTE, base: imagem.home, ex: imagem.home, arte: imagem.arte },
    sonho: { ...IMAGEM_VARIANTE, base: (id) => `${SPRITES}/other/dream-world/${id}.svg`, ex: imagem.home },
    brilho: { base: imagem.arteShiny, ex: imagem.arteShiny, arte: imagem.homeShiny, sr: imagem.arteShiny, im: imagem.homeShiny, coroa: imagem.arteShiny },
};

// Especiais de cada pacote: [ex], [arte rara], [super rara], [arte imersiva], [coroa]
const VARIANTES_ESPECIAIS = [["ex", 4], ["arte", 5], ["sr", 6], ["im", 7], ["coroa", 8]];

const EXPANSOES = [
    {
        codigo: "A1a", nome: "Ilha Mítica", estilo: "home",
        pacotes: [{
            id: "mew", nome: "Mew", mascote: 151, cores: ["#ffc2e2", "#e0609f", "#4a0b2c"],
            base: [102, 103, 114, 46, 47, 43, 44, 45, 48, 49, 16, 17, 18, 21, 22, 63, 64, 65, 79, 80, 96, 97, 122, 124,
                128, 129, 130, 134, 138, 139, 140, 141, 142, 151],
            especiais: [[151, 18, 142, 65], [102, 16, 138, 140, 79, 129], [151, 18, 142], [151], [151]],
        }],
    },
    {
        codigo: "A2", nome: "Embate Espaço-Tempo", estilo: "sonho",
        pacotes: [{
            id: "dragonite", nome: "Dragonite", mascote: 149, cores: ["#ffd98a", "#e08a1e", "#4a2400"],
            base: [147, 148, 149, 81, 82, 95, 74, 75, 76, 111, 112, 104, 105, 27, 28, 100, 101, 125, 126, 77, 78, 58, 59, 137, 132],
            especiais: [[149, 82, 112, 125], [147, 81, 104, 95, 137], [149, 112], [149], [149]],
        }, {
            id: "lapras", nome: "Lapras", mascote: 131, cores: ["#9fe0ff", "#2f86c9", "#08223f"],
            base: [131, 86, 87, 90, 91, 124, 116, 117, 98, 99, 120, 121, 118, 119, 72, 73, 54, 55, 60, 61, 62, 7, 8, 9, 144],
            especiais: [[131, 91, 121, 144], [86, 116, 54, 60, 98], [131, 144], [131], [131]],
        }],
    },
    {
        codigo: "A2a", nome: "Luz Triunfante", estilo: "home",
        pacotes: [{
            id: "snorlax", nome: "Snorlax", mascote: 143, cores: ["#fff4c2", "#d9b95b", "#3d3212"],
            base: [143, 35, 36, 39, 40, 113, 115, 108, 133, 135, 25, 26, 19, 20, 52, 53, 83, 84, 85, 127, 123, 106, 107, 66, 67, 68, 145],
            especiais: [[143, 36, 68, 145], [113, 39, 52, 83, 133, 25], [143, 145], [143], [143]],
        }],
    },
    {
        codigo: "A2b", nome: "Revelação Brilhante", estilo: "brilho",
        pacotes: [{
            id: "gyarados", nome: "Gyarados", mascote: 130, cores: ["#ffb3b3", "#d7263d", "#3a0610"],
            base: [129, 130, 4, 5, 6, 1, 2, 3, 10, 11, 12, 13, 14, 15, 41, 42, 23, 24, 29, 30, 31, 32, 33, 34, 37, 38,
                56, 57, 88, 89, 92, 93, 94, 109, 110, 150],
            especiais: [[130, 6, 94, 34, 150], [129, 37, 41, 92, 10, 29], [130, 6], [130], [130]],
        }],
    },
    {
        codigo: "A3", nome: "Guardiões Celestiais", estilo: "arte",
        pacotes: [{
            id: "arcanine", nome: "Arcanine", mascote: 59, cores: ["#ffcf9e", "#e2572b", "#3c0f02"],
            base: ["A19", "A20", 25, "A26", "A50", "A51", "A52", "A53", "A74", "A75", "A76", 104, "A105", 102, "A103",
                58, 59, 77, 78, 126, 146],
            especiais: [[59, "A26", "A76", "A105"], ["A19", "A50", "A52", "A103", 58], [59, "A26"], ["A26"], [59]],
        }, {
            id: "clefable", nome: "Clefable", mascote: 36, cores: ["#e6d4ff", "#6f5bd6", "#140b3d"],
            base: ["A27", "A28", "A37", "A38", "A88", "A89", 35, 36, 63, 64, 65, 92, 93, 94, 122, 124, 120, 121, 96, 97, 150],
            especiais: [[36, "A38", "A89", 65], ["A37", "A27", "A88", 35, 63], [36, "A38"], ["A38"], [36]],
        }],
    },
    {
        codigo: "A3a", nome: "Crise Extradimensional", estilo: "home",
        pacotes: [{
            id: "gengar", nome: "Gengar", mascote: 94, cores: ["#b6f0e0", "#3f2a6e", "#0b0718"],
            base: [92, 93, 94, 23, 24, 41, 42, 88, 89, 109, 110, 66, 67, 68, 56, 57, 106, 107, 72, 73, 48, 49, 32, 33, 34],
            especiais: [[94, 68, 110, 34], [92, 109, 41, 56, 107], [94, 68], [94], [94]],
        }],
    },
    {
        codigo: "A3b", nome: "Bosque de Eevee", estilo: "sonho",
        pacotes: [{
            id: "eevee", nome: "Eevee", mascote: 133, cores: ["#f3dcb4", "#b9773f", "#3a1f08"],
            base: [133, 134, 135, 136, 16, 17, 18, 19, 20, 21, 22, 39, 40, 35, 36, 113, 132, 137, 43, 44, 45, 69, 70, 71, 46, 47],
            especiais: [[133, 134, 135, 136], [133, 39, 35, 43, 132], [133, 134, 136], [133], [133]],
        }],
    },
    {
        codigo: "A4", nome: "Sabedoria do Mar e do Céu", estilo: "arte",
        pacotes: [{
            id: "moltres", nome: "Moltres", mascote: 146, cores: ["#ffe08a", "#ff6a13", "#5a0d00"],
            base: [146, 16, 17, 18, 21, 22, 84, 85, 83, 41, 42, 142, 4, 5, 6, 37, 38, 77, 78, 123, 10, 11, 12],
            especiais: [[146, 6, 18, 142], [4, 16, 37, 77, 83], [146, 6], [146], [146]],
        }, {
            id: "blastoise", nome: "Blastoise", mascote: 9, cores: ["#bfe3ff", "#1f5fb8", "#061a3a"],
            base: [7, 8, 9, 54, 55, 60, 61, 62, 72, 73, 79, 80, 90, 91, 98, 99, 118, 119, 129, 130, 131, 138, 139, 140, 141, 144],
            especiais: [[9, 130, 141, 144], [7, 54, 79, 118, 131], [9, 144], [9], [9]],
        }],
    },
    {
        codigo: "A4a", nome: "Fontes Secretas", estilo: "home",
        pacotes: [{
            id: "slowbro", nome: "Slowbro", mascote: 80, cores: ["#c6f5ec", "#2aa198", "#073b36"],
            base: [79, 80, 54, 55, 60, 61, 62, 86, 87, 116, 117, 120, 121, 50, 51, 27, 28, 74, 75, 76, 95, 104, 105, 111, 112, 96, 97],
            especiais: [[80, 62, 76, 121], [79, 54, 60, 50, 104], [80, 62], [80], [80]],
        }],
    },
    {
        codigo: "A4b", nome: "Pacote Deluxe ex", estilo: "home",
        pacotes: [{
            id: "zapdos", nome: "Zapdos", mascote: 145, cores: ["#ffe98a", "#3a3a3a", "#0a0a0a"],
            base: [25, 26, 4, 7, 1, 133, 129, 147, 92, 93, 63, 66, 74, 100, 145, 151, 150],
            especiais: [[145, 25, 6, 3, 9, 150, 151, 149, 94, 65, 68, 130, 143, 146, 144, 133], [25, 133, 129, 147, 151, 92],
                [145, 150, 151, 149], [145, 25], [145, 151]],
        }],
    },
    // ---------------- Série B: 2ª geração e Megaevoluções ----------------
    {
        codigo: "B1", nome: "Ascensão Mega", estilo: "arte", serie: "B",
        pacotes: [{
            id: "mega-charizard", nome: "Mega Charizard", mascote: 6, cores: ["#ffb36b", "#d9420b", "#2a0a02"],
            base: [4, 5, 6, 155, 156, 157, 37, 38, 58, 59, 77, 78, 126, 240, 218, 219, 228, 229, 1, 2, 3, 152, 153, 154, 13, 14, 15, 127],
            especiais: [["M6X", "M6Y", "M3", "M15", 157], [4, 155, 152, 240, 37], ["M6X", "M6Y"], ["M6X"], ["M6Y"]],
        }, {
            id: "mega-gyarados", nome: "Mega Gyarados", mascote: 130, cores: ["#9fd4ff", "#1f5fb8", "#051a3a"],
            base: [129, 130, 7, 8, 9, 158, 159, 160, 54, 55, 183, 184, 170, 171, 223, 224, 222, 226, 116, 117, 230, 120, 121, 90, 91, 211, 86, 87],
            especiais: [["M130", "M9", "M160", 230, "M121"], [129, 158, 183, 170, 226], ["M130", "M9"], ["M130"], ["M130"]],
        }, {
            id: "mega-ampharos", nome: "Mega Ampharos", mascote: 181, cores: ["#fff08a", "#e9a800", "#3a2700"],
            base: [179, 180, 181, 172, 25, 26, 100, 101, 81, 82, 239, 125, 241, 63, 64, 65, 177, 178, 203, 79, 80, 199, 96, 97, 122],
            especiais: [["M181", "M65", "M80", "M26X", "M26Y"], [179, 172, 239, 177, 203], ["M181", "M65"], ["M181"], ["M181"]],
        }],
    },
    {
        codigo: "B1a", nome: "Chama Carmesim", estilo: "home", serie: "B",
        pacotes: [{
            id: "entei", nome: "Entei", mascote: 244, cores: ["#ffb0a0", "#c21e1e", "#330404"],
            base: [228, 229, 218, 219, 240, 126, 58, 59, 37, 38, 77, 78, 133, 136, 155, 156, 157, 4, 5, 6, 74, 75, 76, 207, 244, 146],
            especiais: [["M229", 244, 157, 146], [228, 218, 240, 133, 37], ["M229", 244], ["M229"], [244]],
        }],
    },
    {
        codigo: "B2", nome: "Desfile Fantástico", estilo: "sonho", serie: "B",
        pacotes: [{
            id: "mega-clefable", nome: "Mega Clefable", mascote: 36, cores: ["#ffd6ec", "#e0609f", "#40102a"],
            base: [173, 35, 36, 174, 39, 40, 175, 176, 209, 210, 183, 184, 113, 242, 122, 238, 124, 187, 188, 189, 182, 43, 44, 45, 191, 192],
            especiais: [["M36", 176, 242, 210], [173, 174, 175, 238, 187], ["M36", 176], ["M36"], ["M36"]],
        }, {
            id: "espeon", nome: "Espeon", mascote: 196, cores: ["#f1d6ff", "#a24fd6", "#2a0b40"],
            base: [133, 196, 197, 134, 135, 136, 177, 178, 203, 63, 64, 65, 96, 97, 79, 80, 199, 102, 103, 201, 202, 251, 151],
            especiais: [[196, 197, "M65", 251], [133, 201, 202, 177, 79], [196, 197, 251], [196], [196]],
        }, {
            id: "mega-gengar", nome: "Mega Gengar", mascote: 94, cores: ["#d6c2ff", "#5a2e9e", "#12061f"],
            base: [92, 93, 94, 200, 198, 215, 216, 217, 41, 42, 169, 167, 168, 204, 205, 88, 89, 109, 110, 211, 236, 237, 106, 107],
            especiais: [["M94", 169, 200, 237], [92, 200, 198, 215, 216], ["M94", 169], ["M94"], ["M94"]],
        }],
    },
    {
        codigo: "B2a", nome: "Maravilhas de Paldea", estilo: "arte", serie: "B",
        pacotes: [{
            id: "wooper-paldea", nome: "Wooper", mascote: 194, cores: ["#d9c2a8", "#7a4f36", "#241308"],
            base: ["P194", 195, "P128C", "P128F", "P128A", 128, 194, 203, 206, 198, 200, 204, 205, 211, 215, 225, 231, 232, 246, 247, 248,
                147, 148, 149, 133, 58, 59, 54, 55],
            especiais: [["P128F", "P128A", 248, 149], ["P194", 194, 206, 225, 231], ["P194", "P128C"], ["P194"], ["P194"]],
        }],
    },
    {
        codigo: "B2b", nome: "Brilho Mega", estilo: "brilho", serie: "B",
        pacotes: [{
            id: "mega-scizor", nome: "Mega Scizor", mascote: 212, cores: ["#ffd0d0", "#b3122a", "#26040a"],
            base: [212, 123, 213, 214, 127, 208, 95, 227, 205, 204, 201, 235, 222, 241, 234, 206, 190, 3, 6, 9, 130, 94, 65, 248, 181],
            especiais: [["M212", "M214", "M208", "M227", "M127"], [123, 213, 235, 201, 190], ["M212", "M208", "M6X", "M150Y"], ["M212"], ["M212"]],
        }],
    },
    {
        codigo: "B3", nome: "Aura Pulsante", estilo: "home", serie: "B",
        pacotes: [{
            id: "suicune", nome: "Suicune", mascote: 245, cores: ["#c2f0ff", "#2f8fc9", "#062a3f"],
            base: [245, 158, 159, 160, 183, 184, 186, 60, 61, 62, 194, 195, 220, 221, 86, 87, 131, 138, 139, 140, 141, 147, 148, 230, 226],
            especiais: [[245, 160, 186, 131], [158, 60, 220, 226, 138], [245, 160], [245], [245]],
        }, {
            id: "raikou", nome: "Raikou", mascote: 243, cores: ["#fff2a0", "#e0a800", "#2e2200"],
            base: [243, 172, 25, 26, 179, 180, 181, 239, 125, 100, 101, 81, 82, 170, 171, 135, 145, 137, 233, 202, 234, 241],
            especiais: [[243, "M26Y", 233, 145], [172, 239, 137, 234, 135], [243, 233], [243], [243]],
        }, {
            id: "mega-tyranitar", nome: "Mega Tyranitar", mascote: 248, cores: ["#cfe8b8", "#4d7a2a", "#12200a"],
            base: [246, 247, 248, 95, 208, 214, 127, 236, 106, 107, 237, 66, 67, 68, 56, 57, 207, 74, 75, 76, 111, 112, 185, 213],
            especiais: [["M248", "M208", "M214", 68], [246, 236, 185, 207, 56], ["M248", "M214"], ["M248"], ["M248"]],
        }],
    },
    {
        codigo: "B3a", nome: "Impulso Paradoxo", estilo: "arte", serie: "B",
        pacotes: [{
            id: "walking-wake", nome: "Walking Wake", mascote: 245, cores: ["#b8ffe6", "#1b7f7a", "#04201e"],
            base: ["X984", "X990", 231, 232, "X985", 39, 40, "X987", 200, "X989", 81, 82, "X991", 225, "X995", 246, 247, 248,
                "X1009", "X1020", "X1021", 245, 244, 243, 138, 139, 140, 141, 142, 251],
            especiais: [["X1009", "X1020", "X1021", "X984", "X990", "X995"], ["X985", "X987", "X989", "X991", 251],
                ["X1009", "X1021", "X984"], ["X1009"], ["X1009"]],
        }],
    },
    {
        codigo: "B3b", nome: "Encantos Cotidianos", estilo: "sonho", serie: "B",
        pacotes: [{
            id: "togepi", nome: "Togepi", mascote: 175, cores: ["#fff6de", "#e8b04a", "#3a2608"],
            base: [161, 162, 163, 164, 165, 166, 167, 168, 187, 188, 189, 190, 191, 192, 193, 206, 209, 210, 216, 217, 234, 235, 241, 242,
                113, 52, 53, 19, 20, 16, 17, 18, 175, 176, 183],
            especiais: [[176, 242, 241, 217], [175, 161, 163, 235, 190, 206], [176, 242], [175], [175]],
        }],
    },
    {
        codigo: "B4", nome: "Mestre dos Céus", estilo: "arte", serie: "B",
        pacotes: [{
            id: "lugia", nome: "Lugia", mascote: 249, cores: ["#e8f2ff", "#5b7fb8", "#0b1a33"],
            base: [249, 16, 17, 18, 163, 164, 177, 178, 226, 223, 224, 72, 73, 116, 117, 230, 144, 131, 187, 188, 189, 90, 91],
            especiais: [[249, "M18", 230, 144], [16, 163, 226, 177, 131], [249, "M18"], [249], [249]],
        }, {
            id: "ho-oh", nome: "Ho-Oh", mascote: 250, cores: ["#ffe08a", "#d6331e", "#360a02"],
            base: [250, 21, 22, 83, 84, 85, 198, 227, 207, 41, 42, 169, 193, 165, 166, 12, 123, 146, 145, 142, 176, 58, 59],
            especiais: [[250, "M227", "M142", 146], [21, 198, 193, 165, 176], [250, "M142"], [250], [250]],
        }, {
            id: "mega-dragonite", nome: "Mega Dragonite", mascote: 149, cores: ["#ffd9a0", "#e07a1e", "#3a1c00"],
            base: [147, 148, 149, 129, 130, 116, 117, 4, 5, 6, 115, 128, 203, 206, 234, 211, 222, 190, 235, 143],
            especiais: [["M149", "M6Y", "M130", 143], [147, 129, 115, 206, 143], ["M149", "M6Y"], ["M149"], ["M149"]],
        }],
    },
    {
        codigo: "B4a", nome: "Ambição da Equipe Rocket", estilo: "home", serie: "B",
        pacotes: [{
            id: "mewtwo-rocket", nome: "Mewtwo", mascote: 150, cores: ["#ffc2c2", "#8a0f1e", "#12020a"],
            base: [23, 24, 109, 110, 52, 53, 41, 42, 169, 96, 97, 88, 89, 228, 229, 198, 215, 202, 246, 247, 248, 129, 130, 100, 101, 81, 82, 150],
            especiais: [["M150X", "M150Y", 130, 24, 110], [52, 23, 109, 202, 198], ["M150X", "M150Y", "M229"], ["M150Y"], ["M150X"]],
        }],
    },
];

const montarExpansao = (exp, indice) => {
    const imagens = ESTILOS[exp.estilo];
    const lista = [];
    for (const pacote of exp.pacotes) {
        for (const ref of pacote.base) lista.push({ ref, variante: "base", pacote: pacote.id });
    }
    VARIANTES_ESPECIAIS.forEach(([variante, raridade], i) => {
        for (const pacote of exp.pacotes) {
            for (const ref of pacote.especiais[i]) lista.push({ ref, variante, raridade, pacote: pacote.id });
        }
    });
    return lista.map(({ ref, variante, raridade, pacote }, i) => {
        const p = pokemonDaLista(ref);
        const numero = i + 1;
        const extra = { pacote, colecao: exp.codigo };
        // Na carta, a forma aparece num selo; nas formas regionais o nome fica curto
        if (p.forma) Object.assign(extra, { forma: p.forma });
        if (p.regional) extra.nomeFace = nomeBonito(p.nome) + (variante === "base" ? "" : " ex");
        // Mega: o selo já diz "Mega", então o nome na carta fica curto ("Charizard X ex")
        if (p.mega) extra.nomeFace = p.nomeCarta.replace(/^Mega /, "") + " ex";
        return {
            ...criarCarta(numero, p, variante, raridade ?? raridadeBase(p), extra, (indice % 3) + 1),
            id: `${exp.codigo}-${String(numero).padStart(3, "0")}`,
            imagem: imagens[variante](p.imagemId),
        };
    });
};

const CARTAS_A1 = [
    // Origem Genética é só da 1ª geração
    ...BASE.filter((p) => p.id <= 151).map((p) => criarCarta(p.id, p, "base", raridadeBase(p))),
    ...ESPECIAIS.map(([variante, raridade, pid], i) => criarCarta(152 + i, POKEMON_POR_ID[pid], variante, raridade)),
].map((c) => ({ ...c, imagem: IMAGEM_VARIANTE[c.variante](c.pid) }));

export const CARTAS = [...CARTAS_A1, ...EXPANSOES.flatMap(montarExpansao)];

export const TOTAL_CARTAS = CARTAS.length;
export const CARTA_POR_ID = Object.fromEntries(CARTAS.map((c) => [c.id, c]));

// Coleções (expansões) e pacotes
// Quebra o nome em duas linhas do tamanho mais parecido possível
const logo = (nome) => {
    const palavras = nome.toUpperCase().split(" ");
    let melhor = [palavras.join(" ")];
    for (let i = 1; i < palavras.length; i++) {
        const linhas = [palavras.slice(0, i).join(" "), palavras.slice(i).join(" ")];
        if (Math.max(...linhas.map((l) => l.length)) < Math.max(...melhor.map((l) => l.length))) melhor = linhas;
    }
    return melhor;
};
export const COLECOES = [
    {
        codigo: "A1", nome: "Origem Genética",
        pacotes: [
            { id: "charizard", nome: "Charizard", mascote: 6, cores: ["#ff9a3c", "#b3260b", "#3b0a02"] },
            { id: "mewtwo", nome: "Mewtwo", mascote: 150, cores: ["#d79bff", "#7433c4", "#1d0842"] },
            { id: "pikachu", nome: "Pikachu", mascote: 25, cores: ["#fff27a", "#f0a500", "#4a2c00"] },
        ],
    },
    ...EXPANSOES,
].map((c) => {
    const cartas = CARTAS.filter((x) => x.colecao === c.codigo);
    return {
        codigo: c.codigo,
        nome: c.nome,
        serie: c.serie || "A",
        logo: logo(c.nome),
        total: cartas.length,
        cartas,
        pacotes: c.pacotes.map(({ id, nome, mascote, cores }) => ({ id, nome, mascote, cores, colecao: c.codigo })),
    };
});
export const COLECAO_POR_CODIGO = Object.fromEntries(COLECOES.map((c) => [c.codigo, c]));
export const PACOTES = Object.fromEntries(COLECOES.flatMap((c) => c.pacotes).map((p) => [p.id, p]));

// Número que aparece na carta: "012/200" (Origem Genética) ou "A1a 012/049"
export const numeroCarta = (c) => {
    const col = COLECAO_POR_CODIGO[c.colecao];
    const num = `${String(c.numero).padStart(3, "0")}/${String(col.total).padStart(3, "0")}`;
    return c.colecao === "A1" ? num : `${c.colecao} ${num}`;
};

export const cartasDaColecao = (codigo) => COLECAO_POR_CODIGO[codigo]?.cartas || [];
export const cartasDoPacote = (pacote) => CARTAS.filter((c) => c.pacote === pacote);
export const cartasDaRaridade = (raridade, pacote, colecao) =>
    CARTAS.filter((c) => c.raridade === raridade && (!pacote || c.pacote === pacote) && (!colecao || c.colecao === colecao));
