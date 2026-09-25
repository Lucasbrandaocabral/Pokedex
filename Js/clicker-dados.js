// ====================================================
// Pokéclicker: regras e números do mini game de clicar.
// Só funções puras (sem tela), para dar para testar e balancear.
// ====================================================

// ---------------- Números grandes ----------------
const SUFIXOS = ["", "mil", "mi", "bi", "tri", "quatri", "quint", "sext", "sept", "oct", "non", "dec"];
export function formatarGrande(n) {
    if (!Number.isFinite(n)) return "∞";
    if (n < 1000) {
        const casas = n < 10 && !Number.isInteger(n) ? 1 : 0;
        return n.toLocaleString("pt-BR", { maximumFractionDigits: casas });
    }
    const i = Math.floor(Math.log10(n) / 3);
    if (i >= SUFIXOS.length) return n.toExponential(2).replace(".", ",");
    const v = n / 1000 ** i;
    return `${v.toLocaleString("pt-BR", { maximumFractionDigits: v < 10 ? 2 : v < 100 ? 1 : 0 })} ${SUFIXOS[i]}`;
}

// ---------------- Ajudantes (produção automática) ----------------
export const AJUDANTES = [
    { id: "magnemite", nome: "Magnemite", plural: "Magnemites", pid: 81, custo: 15, prod: 0.1, cor: "#9aa3b5", desc: "Gera um pouquinho de eletricidade com seus ímãs." },
    { id: "voltorb", nome: "Voltorb", plural: "Voltorbs", pid: 100, custo: 100, prod: 1, cor: "#e3534a", desc: "Rola por aí acumulando carga estática." },
    { id: "electabuzz", nome: "Electabuzz", plural: "Electabuzz", pid: 125, custo: 1100, prod: 8, cor: "#f2c230", desc: "Bate ponto na usina de energia de Kanto." },
    { id: "raichu", nome: "Raichu", plural: "Raichus", pid: 26, custo: 12000, prod: 47, cor: "#e8913a", desc: "O Pikachu evoluído, com o dobro de faíscas." },
    { id: "magneton", nome: "Magneton", plural: "Magnetons", pid: 82, custo: 130000, prod: 260, cor: "#7d8aa6", desc: "Três Magnemites trabalhando em equipe." },
    { id: "electrode", nome: "Electrode", plural: "Electrodes", pid: 101, custo: 1.4e6, prod: 1400, cor: "#c93a3a", desc: "Explode de energia (com cuidado)." },
    { id: "jolteon", nome: "Jolteon", plural: "Jolteons", pid: 135, custo: 2e7, prod: 7800, cor: "#f5d547", desc: "Seus pelos soltam raios de alta voltagem." },
    { id: "zapdos", nome: "Zapdos", plural: "Zapdos", pid: 145, custo: 3.3e8, prod: 44000, cor: "#f0b429", desc: "O pássaro lendário que controla as tempestades." },
    { id: "porygon", nome: "Porygon", plural: "Porygons", pid: 137, custo: 5.1e9, prod: 260000, cor: "#f08aa8", desc: "Um Pokémon digital que gera energia dentro dos computadores." },
    { id: "dragonite", nome: "Dragonite", plural: "Dragonites", pid: 149, custo: 7.5e10, prod: 1.6e6, cor: "#f2a65a", desc: "Voa em volta do mundo trazendo energia dos ventos." },
    { id: "moltres", nome: "Moltres", plural: "Moltres", pid: 146, custo: 1e12, prod: 1e7, cor: "#ff7a2f", desc: "O pássaro de fogo que aquece as usinas com suas chamas." },
    { id: "mewtwo", nome: "Mewtwo", plural: "Mewtwos", pid: 150, custo: 1.4e13, prod: 6.5e7, cor: "#b58ad6", desc: "Seu poder psíquico converte pensamento em energia pura." },
    { id: "mew", nome: "Mew", plural: "Mews", pid: 151, custo: 1.7e14, prod: 4.3e8, cor: "#ff9fd0", desc: "O Pokémon mítico que carrega o DNA de todos os outros." },
];
export const AJUDANTE_POR_ID = Object.fromEntries(AJUDANTES.map((a) => [a.id, a]));
const CRESCIMENTO = 1.15; // cada compra deixa o próximo 15% mais caro

// ---------------- Melhorias da loja ----------------
// Cada ajudante tem 6 melhorias que dobram a produção dele,
// liberadas ao ter 1, 5, 25, 50, 100 e 150 unidades.
const NIVEIS = [
    { req: 1, mult: 10 }, { req: 5, mult: 50 }, { req: 25, mult: 500 },
    { req: 50, mult: 50000 }, { req: 100, mult: 5e6 }, { req: 150, mult: 5e8 },
];
const NOMES_NIVEIS = {
    magnemite: ["Parafusos Novos", "Ímã Reforçado", "Campo Magnético", "Polaridade Dupla", "Enxame Metálico", "Tempestade de Aço"],
    voltorb: ["Casca Polida", "Rolamento Rápido", "Carga Estática", "Autodestruição Controlada", "Pokébola Falsa", "Esfera de Plasma"],
    electabuzz: ["Luvas Isolantes", "Turno da Noite", "Soco Trovão", "Usina de Kanto", "Sobrecarga", "Gerador Humano"],
    raichu: ["Bochechas Carregadas", "Cauda Aterrada", "Megavolt", "Surfe Elétrico", "Raio Laranja", "Tempestade de Raichu"],
    magneton: ["Trio Sincronizado", "Tri-Ataque", "Interferência", "Rede Magnética", "Campo Unificado", "Supercondutor"],
    electrode: ["Brilho Intenso", "Explosão Contida", "Carga Máxima", "Rolagem Relâmpago", "Reação em Cadeia", "Big Bang"],
    jolteon: ["Pelos Eriçados", "Agulha de Trovão", "Velocidade Máxima", "Pedra do Trovão", "Choque Veloz", "Raio Absoluto"],
    zapdos: ["Pena Dourada", "Bico Broca", "Céu Carregado", "Olho da Tempestade", "Trovão Lendário", "Fúria dos Céus"],
    porygon: ["Atualização de Sistema", "Processador Duplo", "Conversão", "Realidade Virtual", "Rede Neural", "Singularidade Digital"],
    dragonite: ["Asas de Dragão", "Dança do Dragão", "Correntes de Vento", "Hiper-Raio", "Rota Global", "Rei dos Céus"],
    moltres: ["Pena Flamejante", "Asa de Fogo", "Calor Solar", "Fênix Renascida", "Sol de Kanto", "Chama Eterna"],
    mewtwo: ["Colher Dobrada", "Psicocinese", "Barreira Mental", "Onda Psíquica", "Clone Perfeito", "Mente Infinita"],
    mew: ["Bolha Rosa", "Metronomo", "Transformação", "DNA Ancestral", "Ilha Mítica", "Origem de Tudo"],
};
const ROMANOS = ["I", "II", "III", "IV", "V", "VI"];

export const MELHORIAS = [
    // Clique
    { id: "choque", tipo: "clique", nome: "Choque do Trovão", desc: "Clique ×2", custo: 100 },
    { id: "trovoada", tipo: "clique", nome: "Trovoada", desc: "Clique ×2", custo: 500 },
    { id: "faisca", tipo: "clique", nome: "Faísca", desc: "Cada clique ganha +1% da sua energia/s", custo: 10000 },
    { id: "relampago", tipo: "clique", nome: "Relâmpago", desc: "Cada clique ganha mais +1% da energia/s", custo: 1e6 },
    { id: "tempestade", tipo: "clique", nome: "Tempestade", desc: "Cada clique ganha mais +1% da energia/s", custo: 1e8 },
    { id: "supremo", tipo: "clique", nome: "Raio Supremo", desc: "Cada clique ganha mais +1% da energia/s", custo: 1e10 },
    { id: "milvolts", tipo: "clique", nome: "Mil Volts", desc: "Cada clique ganha mais +1% da energia/s", custo: 1e12 },
    // Produção geral
    { id: "carga", tipo: "global", nome: "Carga Total", desc: "Toda a produção +10%", custo: 1e6 },
    { id: "bateria", tipo: "global", nome: "Bateria Extra", desc: "Toda a produção +10%", custo: 1e8 },
    { id: "reator", tipo: "global", nome: "Reator de Cinnabar", desc: "Toda a produção +10%", custo: 1e10 },
    { id: "rede", tipo: "global", nome: "Rede Elétrica de Kanto", desc: "Toda a produção +10%", custo: 1e12 },
    // Amizade: deixa o bônus das conquistas mais forte
    { id: "amizade1", tipo: "amizade", nome: "Laço de Amizade", desc: "Cada conquista dá +1% de produção a mais", custo: 1e6, conquistas: 10 },
    { id: "amizade2", tipo: "amizade", nome: "Amigos para Sempre", desc: "Cada conquista dá +1% de produção a mais", custo: 1e9, conquistas: 25 },
    { id: "amizade3", tipo: "amizade", nome: "Melhores Amigos", desc: "Cada conquista dá +1% de produção a mais", custo: 1e12, conquistas: 50 },
    // Uma por nível de cada ajudante
    ...AJUDANTES.flatMap((a) => NIVEIS.map((n, i) => ({
        id: `${a.id}-${i + 1}`, tipo: "ajudante", ajudante: a.id, nivel: i + 1, req: n.req,
        nome: `${NOMES_NIVEIS[a.id][i]}`, desc: `Produção dos ${a.plural} ×2`, custo: a.custo * n.mult,
    }))),
];
export const MELHORIA_POR_ID = Object.fromEntries(MELHORIAS.map((m) => [m.id, m]));
export const romano = (n) => ROMANOS[n - 1];

// ---------------- Baús e itens (estilo "Click the Button") ----------------
// Cada clique enche a barra do baú. O baú solta energia e um item colecionável.
// Os itens ficam para sempre (até depois de evoluir) e cada cópia dá um bônus.
export const CLIQUES_POR_BAU = 100;
export const MAX_COPIAS = 10;
export const RARIDADES_ITEM = {
    comum: { nome: "Comum", peso: 70, cor: "#9aa3b5" },
    raro: { nome: "Raro", peso: 22, cor: "#3b82f6" },
    epico: { nome: "Épico", peso: 7, cor: "#a855f7" },
    lendario: { nome: "Lendário", peso: 1, cor: "#f59e0b" },
    // 0,01%: itens ligados aos Pokémon que controlam o tempo. Enchem a meta da evolução na hora.
    temporal: { nome: "Temporal", peso: 0.01, cor: "#22d3ee" },
};
export const ITENS = [
    { id: "pilha", nome: "Pilha", raridade: "comum", icone: "🔋", efeito: "clique", valor: 0.01, desc: "+1% de energia por clique" },
    { id: "fio", nome: "Fio de Cobre", raridade: "comum", icone: "🧵", efeito: "producao", valor: 0.005, desc: "+0,5% de produção" },
    { id: "parafuso", nome: "Parafuso", raridade: "comum", icone: "🔩", efeito: "ajudante", ajudantes: ["magnemite", "magneton"], valor: 0.02, desc: "+2% de produção de Magnemites e Magnetons" },
    { id: "lampada", nome: "Lâmpada", raridade: "comum", icone: "💡", efeito: "ajudante", ajudantes: ["voltorb", "electrode"], valor: 0.02, desc: "+2% de produção de Voltorbs e Electrodes" },
    { id: "ima", nome: "Ímã", raridade: "raro", icone: "🧲", efeito: "producao", valor: 0.015, desc: "+1,5% de produção" },
    { id: "luva", nome: "Luva de Borracha", raridade: "raro", icone: "🧤", efeito: "clique", valor: 0.04, desc: "+4% de energia por clique" },
    { id: "capacete", nome: "Capacete de Obra", raridade: "raro", icone: "⛑️", efeito: "ajudante", ajudantes: ["electabuzz", "raichu"], valor: 0.03, desc: "+3% de produção de Electabuzz e Raichus" },
    { id: "pedra", nome: "Pedra do Trovão", raridade: "epico", icone: "💎", efeito: "producao", valor: 0.04, desc: "+4% de produção" },
    { id: "bola-luz", nome: "Bola de Luz", raridade: "epico", icone: "🟡", efeito: "clique", valor: 0.1, desc: "+10% de energia por clique" },
    { id: "pena", nome: "Pena de Zapdos", raridade: "lendario", icone: "🪶", efeito: "producao", valor: 0.08, desc: "+8% de produção" },
    { id: "pedra-lunar", nome: "Pedra Lunar", raridade: "comum", icone: "🌙", efeito: "producao", valor: 0.005, desc: "+0,5% de produção" },
    { id: "upgrade", nome: "Disco de Upgrade", raridade: "raro", icone: "💾", efeito: "ajudante", ajudantes: ["porygon", "magneton"], valor: 0.05, desc: "+5% de produção de Porygons e Magnetons" },
    { id: "escama", nome: "Escama de Dragão", raridade: "raro", icone: "🐉", efeito: "ajudante", ajudantes: ["dragonite", "moltres"], valor: 0.05, desc: "+5% de produção de Dragonites e Moltres" },
    { id: "colher", nome: "Colher Torta", raridade: "epico", icone: "🥄", efeito: "ajudante", ajudantes: ["mewtwo", "mew"], valor: 0.08, desc: "+8% de produção de Mewtwos e Mews" },
    { id: "gene", nome: "Gene Mítico", raridade: "lendario", icone: "🧬", efeito: "clique", valor: 0.15, desc: "+15% de energia por clique" },
    { id: "orbe", nome: "Orbe Adamante", raridade: "temporal", icone: "💠", efeito: "producao", valor: 0.25, desc: "+25% de produção. Brilha com o poder de Dialga, o senhor do tempo" },
    { id: "sino", nome: "Sino de Celebi", raridade: "temporal", icone: "🔔", efeito: "clique", valor: 0.5, desc: "+50% de energia por clique. Celebi viaja pelo tempo" },
    { id: "cristal", nome: "Cristal de Energia", raridade: "lendario", icone: "🔮", efeito: "bau", valor: 0.03, desc: "Baús chegam 3% mais rápido" },
];
export const ITEM_POR_ID = Object.fromEntries(ITENS.map((i) => [i.id, i]));

// ---------------- Conquistas (cada uma dá +1% de produção) ----------------
const potencias = (valores, nomes, campo, texto) => valores.map((v, i) => ({ id: `${campo}-${v}`, nome: nomes[i], campo, meta: v, desc: texto(v) }));
export const CONQUISTAS = [
    ...potencias([1e3, 1e5, 1e6, 1e7, 1e8, 1e9, 1e10, 1e11, 1e12, 1e14, 1e16, 1e18],
        ["Pequena Faísca", "Bateria Cheia", "Megawatt", "Usina Particular", "Cidade Iluminada", "Kanto Energizada", "Gigawatt", "Terawatt", "Energia Infinita?", "Além do Infinito", "Petawatt", "Energia Cósmica"],
        "total", (v) => `Junte ${formatarGrande(v)} de energia no total`),
    ...potencias([1, 10, 100, 1e3, 1e4, 1e5, 1e6, 1e7, 1e8, 1e9, 1e10],
        ["Primeiro Ajudante", "Linha de Produção", "Fábrica de Raios", "Central Elétrica", "Rede Nacional", "Tempestade Eterna", "Sol Artificial", "Big Bang Elétrico", "Supernova", "Galáxia Elétrica", "Multiverso"],
        "eps", (v) => `Produza ${formatarGrande(v)} ⚡ por segundo`),
    ...potencias([100, 1000, 5000, 20000, 50000, 100000],
        ["Dedo Esperto", "Dedo Calejado", "Metralhadora", "Clique Lendário", "Dedo de Aço", "Dedo Supersônico"],
        "cliques", (v) => `Clique ${formatarGrande(v)} vezes no Pikachu`),
    ...AJUDANTES.flatMap((a) => [
        { id: `tem-${a.id}-1`, nome: `${a.nome} no Time`, campo: "ajudante", ajudante: a.id, meta: 1, desc: `Tenha 1 ${a.nome}` },
        { id: `tem-${a.id}-50`, nome: `Bando de ${a.plural}`, campo: "ajudante", ajudante: a.id, meta: 50, desc: `Tenha 50 ${a.plural}` },
        { id: `tem-${a.id}-100`, nome: `Mestre dos ${a.plural}`, campo: "ajudante", ajudante: a.id, meta: 100, desc: `Tenha 100 ${a.plural}` },
    ]),
    ...potencias([1, 7, 27, 77], ["Sortudo", "Caçador de Pokébolas", "Mestre Pokébola", "Pokébola de Ouro"], "pokebolas", (v) => `Pegue ${v} pokébola${v > 1 ? "s" : ""} especia${v > 1 ? "is" : "l"}`),
    ...potencias([1, 3, 10, 25], ["Primeira Evolução", "Evolução Constante", "Forma Final", "Evolução Infinita"], "reinicios", (v) => `Evolua ${v} vez${v > 1 ? "es" : ""}`),
    ...potencias([10, 25, 50, 75], ["Colecionador de Melhorias", "Engenheiro", "Cientista Maluco", "Gênio de Kanto"], "melhorias", (v) => `Compre ${v} melhorias numa partida`),
    ...potencias([1, 50, 250, 1000, 5000], ["Primeiro Baú", "Caçador de Tesouros", "Arqueólogo", "Rei dos Baús", "Tesouro Infinito"], "baus", (v) => `Abra ${formatarGrande(v)} baú${v > 1 ? "s" : ""}`),
    ...potencias([1, 5, 15], ["Achado Lendário", "Relíquias de Kanto", "Museu Lendário"], "lendarios", (v) => `Encontre ${v} ite${v > 1 ? "ns" : "m"} lendário${v > 1 ? "s" : ""}`),
    ...potencias([1], ["Viajante do Tempo"], "temporais", () => "Encontre um item Temporal (0,01% de chance!)"),
    ...potencias([10, 16], ["Mochila Arrumada", "Mochila Completa"], "itensDiferentes", (v) => v === 16 ? "Tenha todos os itens não temporais na mochila" : `Tenha ${v} itens diferentes na mochila`),
    ...potencias([13], ["Time Completo"], "tiposAjudantes", () => "Tenha pelo menos 1 de cada um dos 13 ajudantes"),
];
export const CONQUISTA_POR_ID = Object.fromEntries(CONQUISTAS.map((x) => [x.id, x]));

// ---------------- Árvore de evolução (custos em Pedras de Evolução) ----------------
export const ARVORE = [
    { id: "clique1", ramo: "clique", nome: "Dedo Treinado", desc: "Clique ×3", custo: 2, requer: [] },
    { id: "clique2", ramo: "clique", nome: "Golpe Crítico", desc: "10% de chance de um clique valer ×10", custo: 5, requer: ["clique1"] },
    { id: "clique3", ramo: "clique", nome: "Choque Estático", desc: "Cada clique ganha +5% da energia/s", custo: 12, requer: ["clique2"] },
    { id: "ajud1", ramo: "ajudantes", nome: "Treinador", desc: "Produção dos ajudantes +50%", custo: 2, requer: [] },
    { id: "ajud2", ramo: "ajudantes", nome: "Liga Pokémon", desc: "Ajudantes 10% mais baratos", custo: 6, requer: ["ajud1"] },
    { id: "ajud3", ramo: "ajudantes", nome: "Sinergia", desc: "+5% de produção para cada tipo de ajudante que você tem", custo: 15, requer: ["ajud2"] },
    { id: "tempo1", ramo: "tempo", nome: "Soneca", desc: "Com o jogo fechado, rende 100% (em vez de 50%)", custo: 3, requer: [] },
    { id: "tempo2", ramo: "tempo", nome: "Começo Rápido", desc: "Toda partida começa com 10 Magnemite e 5 Voltorb", custo: 5, requer: ["tempo1"] },
    { id: "tempo3", ramo: "tempo", nome: "Faro de Treinador", desc: "Pokébolas especiais aparecem com o dobro de frequência e ficam mais tempo", custo: 10, requer: ["tempo2"] },
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

// A meta para evoluir fica 8× maior a cada evolução (a árvore e os itens ajudam a alcançar)
export const META_INICIAL = 5e10;
export const CRESCIMENTO_META = 4;
export const metaEvolucao = (c) => META_INICIAL * CRESCIMENTO_META ** c.reinicios;
export const PACOTE_CUSTO_PEDRAS = 10;
export const PACOTES_POR_DIA = 5;
export const OFFLINE_MAX_SEGUNDOS = 8 * 60 * 60;

// ---------------- Pokébolas especiais (como o "biscoito dourado") ----------------
export const POKEBOLAS = {
    frenesi: { nome: "Frenesi", desc: "Produção ×7 por 77 segundos", peso: 45 },
    sorte: { nome: "Sorte Grande", desc: "Energia instantânea", peso: 50 },
    cadeia: { nome: "Choque em Cadeia", desc: "Clique ×777 por 13 segundos", peso: 5 },
};
export const FRENESI_MULT = 7;
export const FRENESI_DURACAO = 77 * 1000;
export const CADEIA_MULT = 777;
export const CADEIA_DURACAO = 13 * 1000;
// Intervalo entre pokébolas (ms) e quanto tempo ficam na tela
export const intervaloPokebola = (c) => (tem(c, "tempo3") ? [90e3, 180e3] : [180e3, 360e3]);
export const duracaoPokebola = (c) => (tem(c, "tempo3") ? 20e3 : 13e3);

export const clickerInicial = () => ({
    energia: 0,
    totalPartida: 0, // energia ganha desde o último "Evoluir"
    totalGeral: 0,
    cliques: 0,
    ajudantes: {},
    melhorias: [],
    conquistas: [],
    pokebolas: 0,
    tempoJogado: 0, // segundos com o clicker aberto
    pedras: 0,
    pedrasTotal: 0,
    arvore: [],
    reinicios: 0,
    recorde: 0, // maior energia de uma partida
    ultimoTick: Date.now(),
    douradaAte: 0, // fim do Frenesi
    cadeiaAte: 0, // fim do Choque em Cadeia
    bauProgresso: 0, // cliques desde o último baú
    baus: 0,
    lendarios: 0,
    temporais: 0,
    conquistasPagas: 0, // quantas conquistas já deram pacote no jogo de cartas
    itens: {}, // { id: cópias } — ficam depois de evoluir
    pacotesHoje: { dia: "", qtd: 0 },
});

// Completa campos que faltam (saves antigos) sem perder o que já existe
export const normalizarClicker = (c) => {
    const base = clickerInicial();
    const x = c && typeof c === "object" ? { ...base, ...c } : base;
    x.ajudantes = { ...(x.ajudantes || {}) };
    x.itens = x.itens && typeof x.itens === "object" ? { ...x.itens } : {};
    for (const k of ["melhorias", "arvore", "conquistas"]) x[k] = Array.isArray(x[k]) ? [...x[k]] : [];
    x.pacotesHoje = x.pacotesHoje && typeof x.pacotesHoje === "object" ? x.pacotesHoje : { dia: "", qtd: 0 };
    for (const k of ["energia", "totalPartida", "totalGeral", "cliques", "pedras", "pedrasTotal", "reinicios", "recorde", "douradaAte", "cadeiaAte", "pokebolas", "tempoJogado", "bauProgresso", "baus", "lendarios", "temporais", "conquistasPagas"]) {
        x[k] = Number.isFinite(x[k]) && x[k] > 0 ? x[k] : 0;
    }
    if (!Number.isFinite(x.ultimoTick)) x.ultimoTick = Date.now();
    return x;
};

export const tem = (c, id) => c.arvore.includes(id);
export const temMelhoria = (c, id) => c.melhorias.includes(id);
// Quanto do "leite" de energia aparece no palco (0 a 1), pela porcentagem de conquistas
export const nivelLeite = (c) => c.conquistas.length / CONQUISTAS.length;
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

// Uma melhoria aparece na loja quando o jogador chega perto dela
export const melhoriaVisivel = (c, m) => {
    if (temMelhoria(c, m.id)) return false;
    if (m.tipo === "ajudante") return quantos(c, m.ajudante) >= m.req;
    if (m.tipo === "amizade") return c.conquistas.length >= m.conquistas;
    return c.totalPartida >= m.custo * 0.25;
};

export const melhoriasNaLoja = (c) => MELHORIAS.filter((m) => melhoriaVisivel(c, m)).sort((a, b) => a.custo - b.custo);

export const comprarMelhoria = (c, id) => {
    const m = MELHORIA_POR_ID[id];
    if (!m || !melhoriaVisivel(c, m) || c.energia < m.custo) return false;
    c.energia -= m.custo;
    c.melhorias.push(id);
    return true;
};

// ---------------- Produção ----------------
const contar = (c, filtro) => c.melhorias.filter((id) => MELHORIA_POR_ID[id] && filtro(MELHORIA_POR_ID[id])).length;

export const copias = (c, id) => Math.min(c.itens[id] || 0, MAX_COPIAS);
// Soma dos bônus dos itens de um tipo (cada cópia soma o valor do item)
export const bonusItens = (c, efeito, ajudante) =>
    ITENS.filter((i) => i.efeito === efeito && (!ajudante || i.ajudantes.includes(ajudante)))
        .reduce((s, i) => s + i.valor * copias(c, i.id), 0);

export const producaoAjudante = (c, a) => {
    const niveis = contar(c, (m) => m.ajudante === a.id);
    return a.prod * quantos(c, a.id) * 2 ** niveis * (1 + bonusItens(c, "ajudante", a.id));
};

// Bônus das conquistas: +1% cada, e mais +1% por melhoria de amizade
export const bonusConquistas = (c) => c.conquistas.length * 0.01 * (1 + contar(c, (m) => m.tipo === "amizade"));

export const frenesiAtivo = (c, agora = Date.now()) => c.douradaAte > agora;
export const cadeiaAtiva = (c, agora = Date.now()) => c.cadeiaAte > agora;

export const multiplicador = (c, agora = Date.now()) => {
    let m = 1 + 0.1 * contar(c, (x) => x.tipo === "global") + bonusItens(c, "producao");
    m *= 1 + bonusConquistas(c);
    if (tem(c, "ajud1")) m *= 1.5;
    if (tem(c, "ajud3")) m *= 1 + 0.05 * AJUDANTES.filter((a) => quantos(c, a.id) > 0).length;
    if (tem(c, "topo2")) m *= 3;
    if (frenesiAtivo(c, agora)) m *= FRENESI_MULT;
    return m;
};

export const energiaPorSegundo = (c, agora = Date.now()) =>
    AJUDANTES.reduce((s, a) => s + producaoAjudante(c, a), 0) * multiplicador(c, agora);

export const energiaPorClique = (c, agora = Date.now()) => {
    let base = 1;
    if (temMelhoria(c, "choque")) base *= 2;
    if (temMelhoria(c, "trovoada")) base *= 2;
    if (tem(c, "clique1")) base *= 3;
    const fracao = 0.01 * contar(c, (m) => m.tipo === "clique" && !["choque", "trovoada"].includes(m.id)) + (tem(c, "clique3") ? 0.05 : 0);
    const valor = (base + energiaPorSegundo(c, agora) * fracao) * (1 + bonusItens(c, "clique"));
    return valor * (cadeiaAtiva(c, agora) ? CADEIA_MULT : 1);
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
    c.bauProgresso++;
    return { valor, critico, bau: c.bauProgresso >= cliquesPorBau(c) };
};

// ---------------- Baús ----------------
export const cliquesPorBau = (c) => Math.ceil(CLIQUES_POR_BAU * (1 - bonusItens(c, "bau")));

export const sortearRaridadeItem = (rnd = Math.random) => {
    const itens = Object.entries(RARIDADES_ITEM);
    let alvo = rnd() * itens.reduce((s, [, r]) => s + r.peso, 0);
    for (const [id, r] of itens) {
        alvo -= r.peso;
        if (alvo <= 0) return id;
    }
    return "comum";
};

// Abre o baú: energia (15s de produção ou 10 cliques, o que for maior) + um item
export const abrirBau = (c, agora = Date.now(), rnd = Math.random) => {
    c.bauProgresso = 0;
    c.baus++;
    const raridade = sortearRaridadeItem(rnd);
    const opcoes = ITENS.filter((i) => i.raridade === raridade);
    const item = opcoes[Math.floor(rnd() * opcoes.length)];
    const repetido = copias(c, item.id) >= MAX_COPIAS;
    // Item no máximo vira energia extra
    let energia = Math.max(energiaPorSegundo({ ...c, douradaAte: 0 }, agora) * 15, energiaPorClique({ ...c, cadeiaAte: 0 }, agora) * 10)
        * (repetido ? 3 : 1);
    // Temporal: o tempo avança de uma vez e dá a energia inteira da meta de evolução
    if (raridade === "temporal") energia = Math.max(energia, metaEvolucao(c));
    ganhar(c, energia);
    if (!repetido) c.itens[item.id] = (c.itens[item.id] || 0) + 1;
    if (raridade === "lendario") c.lendarios++;
    if (raridade === "temporal") c.temporais++;
    return { item, energia, repetido };
};

// Avança o tempo com o jogo aberto
export const avancar = (c, agora = Date.now()) => {
    const dt = Math.max(0, Math.min(agora - c.ultimoTick, 60 * 1000)) / 1000;
    c.ultimoTick = agora;
    if (dt > 0) ganhar(c, energiaPorSegundo(c, agora) * dt);
    return dt;
};

// Ganho enquanto o jogo estava fechado (até 8h; 50% sem a Soneca)
export const aplicarOffline = (c, agora = Date.now()) => {
    const segundos = Math.min(Math.max(0, (agora - c.ultimoTick) / 1000), OFFLINE_MAX_SEGUNDOS);
    c.ultimoTick = agora;
    if (segundos < 60) return { segundos: 0, ganho: 0 };
    const semEfeitos = { ...c, douradaAte: 0 };
    const ganho = energiaPorSegundo(semEfeitos, agora) * segundos * (tem(c, "tempo1") ? 1 : 0.5);
    ganhar(c, ganho);
    return { segundos, ganho };
};

// ---------------- Pokébolas especiais ----------------
export const sortearPokebola = (rnd = Math.random) => {
    const itens = Object.entries(POKEBOLAS);
    let alvo = rnd() * itens.reduce((s, [, p]) => s + p.peso, 0);
    for (const [id, p] of itens) {
        alvo -= p.peso;
        if (alvo <= 0) return id;
    }
    return "sorte";
};

// Aplica o efeito da pokébola e devolve um texto para o aviso
export const pegarPokebola = (c, tipo, agora = Date.now()) => {
    c.pokebolas++;
    if (tipo === "frenesi") {
        c.douradaAte = agora + FRENESI_DURACAO;
        return { titulo: "Frenesi!", texto: `Produção ×${FRENESI_MULT} por 77 segundos` };
    }
    if (tipo === "cadeia") {
        c.cadeiaAte = agora + CADEIA_DURACAO;
        return { titulo: "Choque em Cadeia!", texto: `Cliques ×${CADEIA_MULT} por 13 segundos. Clique sem parar!` };
    }
    const eps = energiaPorSegundo({ ...c, douradaAte: 0 }, agora);
    const ganho = Math.min(c.energia * 0.15, eps * 900) + 13;
    ganhar(c, ganho);
    return { titulo: "Sorte Grande!", texto: `+${formatarGrande(ganho)} de energia`, ganho };
};

// ---------------- Conquistas ----------------
const valorConquista = (c, q, agora) => {
    if (q.campo === "total") return c.totalGeral;
    if (q.campo === "eps") return energiaPorSegundo({ ...c, douradaAte: 0 }, agora);
    if (q.campo === "ajudante") return quantos(c, q.ajudante);
    if (q.campo === "melhorias") return c.melhorias.length;
    if (q.campo === "itensDiferentes") return ITENS.filter((i) => i.raridade !== "temporal" && copias(c, i.id) > 0).length;
    if (q.campo === "tiposAjudantes") return AJUDANTES.filter((a) => quantos(c, a.id) > 0).length;
    return c[q.campo] || 0;
};

// Marca as conquistas novas e devolve a lista delas
export const verificarConquistas = (c, agora = Date.now()) => {
    const novas = CONQUISTAS.filter((q) => !c.conquistas.includes(q.id) && valorConquista(c, q, agora) >= q.meta);
    novas.forEach((q) => c.conquistas.push(q.id));
    return novas;
};

// ---------------- Evoluir (reiniciar) ----------------
export const podeEvoluir = (c) => c.totalPartida >= metaEvolucao(c);

// Na meta são 10 pedras; esperar mais rende mais (8× a meta = 20 pedras)
export const pedrasDoReinicio = (c) =>
    Math.floor(10 * Math.cbrt(c.totalPartida / metaEvolucao(c)) * (tem(c, "topo1") ? 1.25 : 1));

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
    c.cadeiaAte = 0;
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

// ---------------- Notícias (letreiro) ----------------
export const NOTICIAS = [
    { texto: "Um Pikachu selvagem apareceu! Ele parece querer ser clicado.", se: (c) => c.cliques < 200 },
    { texto: "Cientistas de Kanto estudam o misterioso poder dos cliques.", se: () => true },
    { texto: "Professor Carvalho: \"Isso não é bem o que eu quis dizer com pesquisa de campo.\"", se: () => true },
    { texto: "Magnemites estão grudando em todas as geladeiras de Pallet Town.", se: (c) => quantos(c, "magnemite") > 0 },
    { texto: "Moradores confundem Voltorbs com Pokébolas. De novo.", se: (c) => quantos(c, "voltorb") >= 5 },
    { texto: "Usina de Kanto contrata Electabuzz como segurança do turno da noite.", se: (c) => quantos(c, "electabuzz") > 0 },
    { texto: "Raichu reclama que ninguém lembra dele por causa do Pikachu.", se: (c) => quantos(c, "raichu") > 0 },
    { texto: "Magnetons causam interferência em todas as TVs de Celadon.", se: (c) => quantos(c, "magneton") > 0 },
    { texto: "Electrode explode de alegria. Literalmente. Todos estão bem.", se: (c) => quantos(c, "electrode") > 0 },
    { texto: "Jolteon bate o recorde de velocidade na Rota 7.", se: (c) => quantos(c, "jolteon") > 0 },
    { texto: "Tempestades em Kanto! Especialistas culpam um tal de Zapdos.", se: (c) => quantos(c, "zapdos") > 0 },
    { texto: "A conta de luz de Pallet Town nunca esteve tão alta.", se: (c) => energiaPorSegundo(c) >= 1000 },
    { texto: "Pikachu pede férias. Pedido negado.", se: (c) => c.cliques >= 1000 },
    { texto: "Enfermeira Joy avisa: \"clicar demais dá tendinite\".", se: (c) => c.cliques >= 5000 },
    { texto: "Pokébolas brilhantes avistadas perto do laboratório!", se: (c) => c.pokebolas > 0 },
    { texto: "Treinador evolui e começa tudo de novo. \"Vale a pena\", diz ele.", se: (c) => c.reinicios > 0 },
    { texto: "Equipe Rocket tenta roubar sua energia. Pikachu dá um choque neles.", se: (c) => c.totalGeral >= 1e7 },
    { texto: "Kanto agora exporta energia para Johto.", se: (c) => c.totalGeral >= 1e10 },
    { texto: "\"Nunca vi tanta energia na minha vida\", diz o Professor Carvalho.", se: (c) => c.totalGeral >= 1e12 },
    { texto: "Porygon entra na internet e sai com o dobro de energia.", se: (c) => quantos(c, "porygon") > 0 },
    { texto: "Dragonite entrega energia para o mundo todo em menos de 16 horas.", se: (c) => quantos(c, "dragonite") > 0 },
    { texto: "Onda de calor em Kanto! Moltres jura que não foi ele.", se: (c) => quantos(c, "moltres") > 0 },
    { texto: "Mewtwo dobra uma colher e a usina triplica a produção.", se: (c) => quantos(c, "mewtwo") > 0 },
    { texto: "Mew foi visto brincando dentro da bola do Pikachu.", se: (c) => quantos(c, "mew") > 0 },
    { texto: "Dizem que um Celebi deixou um sino perdido num baú... e que ele volta no tempo.", se: (c) => c.baus >= 50 },
    { texto: "Cientistas detectam uma distorção temporal: Dialga estaria de olho na sua usina.", se: (c) => c.temporais > 0 },
];
export const noticiasDisponiveis = (c) => NOTICIAS.filter((n) => n.se(c));
