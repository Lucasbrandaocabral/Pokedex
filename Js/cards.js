// ====================================================
// Coleção "Origem Genética": monta todas as cartas do jogo
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

export const PACOTES = {
    charizard: { id: "charizard", nome: "Charizard", mascote: 6, cores: ["#ff9a3c", "#b3260b", "#3b0a02"] },
    mewtwo: { id: "mewtwo", nome: "Mewtwo", mascote: 150, cores: ["#d79bff", "#7433c4", "#1d0842"] },
    pikachu: { id: "pikachu", nome: "Pikachu", mascote: 25, cores: ["#fff27a", "#f0a500", "#4a2c00"] },
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

const gerarAtaques = (p, bonus = 0) => {
    const nomes = ATAQUES[p.tipos[0]] || ATAQUES.normal;
    const danoPrincipal = limitar(arred10(p.ataque * 0.55 + p.estagio * 20 + 10 + bonus), 10, 250);
    const tier = Math.min(p.estagio + (p.lendario ? 1 : 0), 2) + (bonus ? 1 : 0);
    const ataques = [];
    if (p.estagio > 0 || p.total >= 450 || bonus) {
        const nomesSec = ATAQUES[p.tipos[1]] || nomes;
        ataques.push({ nome: nomesSec[Math.max(tier - 2, 0)], dano: limitar(arred10(danoPrincipal * 0.4), 10, 120) });
    }
    ataques.push({ nome: nomes[Math.min(tier, 3)], dano: danoPrincipal });
    return ataques;
};

// Pokémon base já organizados
const BASE = POKEMON.map(([id, nome, tipos, hp, ataque, defesa, total, estagio, lendario, evolui]) => ({
    id, nome, tipos, hp, ataque, defesa, total, estagio, lendario: !!lendario, evolui: !!evolui,
}));
export const POKEMON_POR_ID = Object.fromEntries(BASE.map((p) => [p.id, p]));

const criarCarta = (numero, p, variante, raridade, extra = {}) => {
    const ex = ["ex", "sr", "im", "coroa"].includes(variante);
    const hpBase = arred10(p.hp * 0.6 + 30 + p.estagio * 20 + (p.total - 300) * 0.1);
    return {
        id: String(numero).padStart(3, "0"),
        numero,
        pid: p.id,
        nome: nomeBonito(p.nome) + (ex ? " ex" : ""),
        tipos: p.tipos,
        tipo: p.tipos[0],
        estagio: p.estagio,
        hp: limitar(hpBase + (ex ? 60 : 0), 30, 280),
        raridade,
        variante,
        pacote: pacoteDoPokemon(p),
        ataques: gerarAtaques(p, ex ? 40 : 0),
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

export const CARTAS = [
    ...BASE.map((p) => criarCarta(p.id, p, "base", raridadeBase(p))),
    ...ESPECIAIS.map(([variante, raridade, pid], i) => criarCarta(152 + i, POKEMON_POR_ID[pid], variante, raridade)),
].map((c) => ({ ...c, imagem: IMAGEM_VARIANTE[c.variante](c.pid) }));

export const TOTAL_CARTAS = CARTAS.length;
export const CARTA_POR_ID = Object.fromEntries(CARTAS.map((c) => [c.id, c]));

export const cartasDoPacote = (pacote) => CARTAS.filter((c) => c.pacote === pacote);
export const cartasDaRaridade = (raridade, pacote) =>
    CARTAS.filter((c) => c.raridade === raridade && (!pacote || c.pacote === pacote));
