// ====================================================
// Cartas do jogo: Origem Genética e as outras expansões da Série A,
// a partir dos dados base dos Pokémon
// ====================================================
import { POKEMON } from "./pokemon-data.js";

const SPRITES = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon";

export const RARIDADES = {
    1: { simbolo: "◆", nome: "Comum", venda: 5, pontos: 35 },
    2: { simbolo: "◆◆", nome: "Incomum", venda: 15, pontos: 70 },
    3: { simbolo: "◆◆◆", nome: "Rara", venda: 40, pontos: 150 },
    4: { simbolo: "◆◆◆◆", nome: "Dupla Rara (ex)", venda: 100, pontos: 500 },
    5: { simbolo: "☆", nome: "Arte Rara", venda: 150, pontos: 400 },
    6: { simbolo: "☆☆", nome: "Super Rara", venda: 400, pontos: 1250 },
    7: { simbolo: "☆☆☆", nome: "Arte Imersiva", venda: 800, pontos: 1500 },
    8: { simbolo: "♛", nome: "Coroa", venda: 2000, pontos: 2500 },
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
const BASE = POKEMON.map(([id, nome, tipos, hp, ataque, defesa, total, estagio, lendario, evolui]) => ({
    id, nome, tipos, hp, ataque, defesa, total, estagio, lendario: !!lendario, evolui: !!evolui,
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
        recuo: limitar(p.estagio + (p.total >= 500 ? 1 : 0) + (p.defesa >= 100 ? 1 : 0), 0, 4),
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

const pokemonDaLista = (ref) => {
    if (typeof ref === "number") return { ...POKEMON_POR_ID[ref], imagemId: ref };
    const pid = Number(ref.slice(1));
    const [imagemId, tipos] = FORMAS_ALOLA[pid];
    const p = POKEMON_POR_ID[pid];
    return { ...p, tipos, imagemId, nomeCarta: `${nomeBonito(p.nome)} de Alola`, forma: "Alola" };
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
        // Na carta, a forma regional aparece num selo e o nome fica curto
        if (p.forma) Object.assign(extra, { forma: p.forma, nomeFace: nomeBonito(p.nome) + (variante === "base" ? "" : " ex") });
        return {
            ...criarCarta(numero, p, variante, raridade ?? raridadeBase(p), extra, (indice % 3) + 1),
            id: `${exp.codigo}-${String(numero).padStart(3, "0")}`,
            imagem: imagens[variante](p.imagemId),
        };
    });
};

const CARTAS_A1 = [
    ...BASE.map((p) => criarCarta(p.id, p, "base", raridadeBase(p))),
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
        serie: "A",
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
