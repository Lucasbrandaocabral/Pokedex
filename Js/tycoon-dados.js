// ====================================================
// Pokémart Tycoon: regras, números e a simulação da loja.
// Só funções puras (sem tela), para dar para testar e balancear.
// ====================================================

// ---------------- Produtos ----------------
// "cat": em que móvel o produto é vendido (geral = estante, bebida = geladeira)
// "cidade": a partir de qual cidade o fornecedor entrega
export const PRODUTOS = {
    pocao: { nome: "Poção", icone: "🧪", custo: 10, preco: 18, demanda: 30, cat: "geral" },
    pokebola: { nome: "Pokébola", icone: "🔴", custo: 16, preco: 28, demanda: 30, cat: "geral" },
    pacote: { nome: "Pacote de cartas", icone: "🎴", custo: 35, preco: 60, demanda: 20, cat: "geral" },
    antidoto: { nome: "Antídoto", icone: "💊", custo: 6, preco: 12, demanda: 18, cat: "geral", cidade: 1 },
    superpocao: { nome: "Super Poção", icone: "🧪", custo: 25, preco: 45, demanda: 18, cat: "geral", cidade: 1 },
    grandeball: { nome: "Grande Bola", icone: "🔵", custo: 40, preco: 75, demanda: 16, cat: "geral", cidade: 2 },
    repelente: { nome: "Repelente", icone: "🧴", custo: 18, preco: 34, demanda: 16, cat: "geral", cidade: 2 },
    isca: { nome: "Isca de pesca", icone: "🎣", custo: 8, preco: 15, demanda: 25, cat: "geral", cidade: 3 },
    reviver: { nome: "Reviver", icone: "💎", custo: 60, preco: 110, demanda: 12, cat: "geral", cidade: 4 },
    hiperpocao: { nome: "Hiper Poção", icone: "🧪", custo: 70, preco: 130, demanda: 10, cat: "geral", cidade: 4 },
    pedra: { nome: "Pedra do Trovão", icone: "⚡", custo: 150, preco: 270, demanda: 6, cat: "geral", cidade: 5 },
    ultraball: { nome: "Ultra Ball", icone: "🟡", custo: 90, preco: 170, demanda: 10, cat: "geral", cidade: 5 },
    docerara: { nome: "Doce Raro", icone: "🍬", custo: 300, preco: 520, demanda: 4, cat: "geral", cidade: 6 },
    agua: { nome: "Água Fresca", icone: "💧", custo: 8, preco: 15, demanda: 26, cat: "bebida" },
    refrigerante: { nome: "Refrigerante", icone: "🥤", custo: 12, preco: 22, demanda: 22, cat: "bebida", cidade: 1 },
    limonada: { nome: "Limonada", icone: "🍋", custo: 18, preco: 35, demanda: 16, cat: "bebida", cidade: 3 },
    leite: { nome: "Leite MooMoo", icone: "🥛", custo: 30, preco: 55, demanda: 12, cat: "bebida", cidade: 4 },
};
// Preço escolhido pelo jogador: mais caro dá mais lucro mas mais gente desiste
export const PRECOS = {
    barato: { nome: "Barato", mult: 0.85, compra: 1 },
    normal: { nome: "Normal", mult: 1, compra: 0.9 },
    caro: { nome: "Caro", mult: 1.3, compra: 0.62 },
};

// ---------------- Móveis ----------------
// vende: categoria de produto que o móvel vende. niveis: melhorias (nível 2 e 3).
// limite: quantos dá para ter na loja. cidade: a partir de qual cidade aparece.
export const MOVEIS = {
    caixa: {
        nome: "Caixa", icone: "🧾", custo: 150, desc: "Onde os clientes pagam. Precisa de pelo menos 1.",
        niveis: [
            { nome: "Esteira rolante", custo: 500, desc: "Atende 20% mais rápido" },
            { nome: "Maquininha de cartão", custo: 2000, desc: "Mais 20% mais rápido e clientes deixam mais gorjeta" },
        ],
    },
    prateleira: {
        nome: "Prateleira", icone: "🗄️", custo: 120, vende: "geral", desc: "Vende um produto. Clique nela para escolher qual.",
        niveis: [
            { nome: "Estante reforçada", custo: 300, desc: "+50% de estoque" },
            { nome: "Estante premium", custo: 1200, desc: "Dobro do estoque e iluminada: clientes levam mais itens" },
        ],
    },
    geladeira: {
        nome: "Geladeira", icone: "🧊", custo: 350, vende: "bebida", desc: "Vende bebidas geladas (Água Fresca, Refrigerante...).",
        niveis: [
            { nome: "Geladeira dupla", custo: 400, desc: "+50% de estoque" },
            { nome: "Geladeira de vidro", custo: 1500, desc: "Dobro do estoque e clientes levam mais bebidas" },
        ],
    },
    vitrine: {
        nome: "Vitrine de carta", icone: "🖼️", custo: 400, desc: "Mostra uma carta do seu álbum. Quanto mais rara, mais clientes.",
        niveis: [
            { nome: "Holofote", custo: 800, desc: "A carta atrai 50% mais" },
            { nome: "Base giratória", custo: 3000, desc: "A carta atrai o dobro" },
        ],
    },
    planta: { nome: "Planta", icone: "🪴", custo: 60, desc: "Deixa a loja mais bonita: +2% de clientes." },
    banco: { nome: "Banco", icone: "🪑", custo: 80, limite: 3, desc: "Clientes esperam 15% mais na fila (até 3)." },
    lixeira: { nome: "Lixeira", icone: "🗑️", custo: 40, limite: 2, desc: "Loja limpa: a reputação cai 15% mais devagar (até 2)." },
    totem: { nome: "Totem de promoção", icone: "📣", custo: 250, limite: 3, cidade: 1, desc: "+6% de clientes e +3% de chance de compra (até 3)." },
    maquina: {
        nome: "Máquina de venda", icone: "🥤", custo: 900, desc: "Vende sozinha: +1 ₽ por segundo.",
        niveis: [
            { nome: "Mais sabores", custo: 1500, desc: "Rende o dobro" },
            { nome: "Máquina dupla", custo: 5000, desc: "Rende o triplo" },
        ],
    },
    caixarapido: { nome: "Caixa automático", icone: "🖥️", custo: 700, cidade: 2, desc: "Um caixa sem fila longa: atende 35% mais rápido." },
    estatua: { nome: "Estátua de Snorlax", icone: "🗿", custo: 2500, limite: 2, cidade: 3, desc: "+12% de clientes e a reputação sobe 25% mais rápido (até 2)." },
};
export const ehCaixa = (m) => m && (m.tipo === "caixa" || m.tipo === "caixarapido");
export const vende = (m) => !!(m && MOVEIS[m.tipo]?.vende);
export const nivelMovel = (m) => Math.min(Math.max(m?.nivel || 1, 1), 3);
const contar = (t, tipo) => t.moveis.filter((m) => m.tipo === tipo).length;
export const ESTOQUE_BASE = 10;

// ---------------- Equipe (Pokémon funcionários) ----------------
export const EQUIPE = [
    { id: "chansey", nome: "Chansey", pid: 113, papel: "Caixa", desc: "Atende no caixa 15% mais rápido por nível", custo: 500 },
    { id: "machamp", nome: "Machamp", pid: 68, papel: "Estoquista", desc: "Repõe as prateleiras sozinho (mais rápido a cada nível)", custo: 900 },
    { id: "pikachu", nome: "Pikachu", pid: 25, papel: "Mascote", desc: "Atrai 10% mais clientes por nível", custo: 1200 },
    { id: "alakazam", nome: "Alakazam", pid: 65, papel: "Organizador", desc: "Clientes esperam 20% mais na fila por nível", custo: 1500 },
    { id: "meowth", nome: "Meowth", pid: 52, papel: "Vendedor", desc: "Clientes aceitam preço caro com mais facilidade e deixam gorjeta", custo: 2500 },
    { id: "kangaskhan", nome: "Kangaskhan", pid: 115, papel: "Almoxarife", desc: "+5 de estoque em cada prateleira por nível", custo: 3000 },
];
export const EQUIPE_POR_ID = Object.fromEntries(EQUIPE.map((e) => [e.id, e]));
export const NIVEL_MAX = 5;
export const custoEquipe = (e, nivel) => Math.round(e.custo * 2.2 ** nivel);

// ---------------- Cidades (a loja cresce ao mudar de cidade) ----------------
export const CIDADES = [
    { nome: "Pallet Town", w: 6, h: 5, clientes: 1, gasto: 1, custo: 0, lucroMin: 0 },
    { nome: "Viridian City", w: 7, h: 6, clientes: 1.3, gasto: 1.1, custo: 3000, lucroMin: 4000 },
    { nome: "Pewter City", w: 8, h: 6, clientes: 1.6, gasto: 1.2, custo: 12000, lucroMin: 20000 },
    { nome: "Cerulean City", w: 8, h: 7, clientes: 2, gasto: 1.35, custo: 40000, lucroMin: 80000 },
    { nome: "Vermilion City", w: 9, h: 7, clientes: 2.4, gasto: 1.5, custo: 120000, lucroMin: 250000 },
    { nome: "Celadon City", w: 10, h: 8, clientes: 2.9, gasto: 1.8, custo: 350000, lucroMin: 800000 },
    { nome: "Saffron City", w: 11, h: 8, clientes: 3.5, gasto: 2.2, custo: 1000000, lucroMin: 2500000 },
];

// ---------------- Recompensa no jogo de cartas ----------------
export const LUCRO_POR_PACOTE = 25000;
export const PACOTES_POR_DIA = 2;

// ---------------- Melhorias da loja (compradas uma vez) ----------------
export const MELHORIAS_LOJA = [
    { id: "musica", nome: "Música ambiente", desc: "+8% de clientes", custo: 1200, cidade: 0 },
    { id: "cestinhas", nome: "Cestinhas de compras", desc: "Clientes levam mais produtos diferentes de uma vez", custo: 1500, cidade: 0 },
    { id: "ar", nome: "Ar-condicionado", desc: "Clientes esperam 25% mais na fila", custo: 2500, cidade: 1 },
    { id: "seguranca", nome: "Câmeras de segurança", desc: "A Equipe Rocket só consegue roubar metade", custo: 3500, cidade: 1 },
    { id: "deposito", nome: "Depósito nos fundos", desc: "+5 de estoque em todas as estantes e geladeiras", custo: 4000, cidade: 1 },
    { id: "fidelidade", nome: "Cartão fidelidade", desc: "+6% de chance de compra em tudo", custo: 6000, cidade: 2 },
    { id: "fornecedor", nome: "Fornecedor expresso", desc: "Repor o estoque fica 10% mais barato", custo: 8000, cidade: 2 },
    { id: "radio", nome: "Comercial na rádio", desc: "+15% de clientes", custo: 15000, cidade: 3 },
    { id: "vitrinerua", nome: "Vitrine para a rua", desc: "As vitrines de carta atraem 50% mais", custo: 20000, cidade: 3 },
    { id: "torneios", nome: "Patrocínio de torneios", desc: "Dias de torneio acontecem mais e duram o dobro", custo: 30000, cidade: 4 },
    { id: "tv", nome: "Propaganda na TV", desc: "+25% de clientes", custo: 120000, cidade: 5 },
    { id: "selo", nome: "Selo Pokémart Oficial", desc: "Clientes pagam 15% mais em tudo", custo: 400000, cidade: 6 },
];
export const MELHORIA_POR_ID = Object.fromEntries(MELHORIAS_LOJA.map((m) => [m.id, m]));
export const temMelhoria = (t, id) => t.melhorias.includes(id);
export const comprarMelhoria = (t, id) => {
    const m = MELHORIA_POR_ID[id];
    if (!m || temMelhoria(t, id) || m.cidade > t.cidade || t.dinheiro < m.custo) return false;
    t.dinheiro -= m.custo;
    t.melhorias.push(id);
    return true;
};

// ---------------- Qualidade dos produtos (0 a 5) ----------------
export const QUALIDADE_MAX = 5;
export const qualidade = (t, id) => Math.min(t.qualidade[id] || 0, QUALIDADE_MAX);
export const custoQualidade = (id, q) => Math.round(PRODUTOS[id].custo * 120 * 2.6 ** q);
export const melhorarQualidade = (t, id) => {
    const q = qualidade(t, id);
    if (!PRODUTOS[id] || q >= QUALIDADE_MAX || !produtoLiberado(t, id) || t.dinheiro < custoQualidade(id, q)) return false;
    t.dinheiro -= custoQualidade(id, q);
    t.qualidade[id] = q + 1;
    return true;
};

// ---------------- Metas (cada uma paga uma vez) ----------------
const somaVendidos = (t, filtro) => Object.entries(t.vendidos).reduce((s, [id, n]) => s + (PRODUTOS[id] && filtro(PRODUTOS[id], id) ? n : 0), 0);
export const METAS = [
    { id: "atender10", texto: "Atenda 10 clientes", valor: (t) => t.atendidos, alvo: 10, premio: 200 },
    { id: "variedade4", texto: "Venda 4 produtos diferentes", valor: (t) => Object.values(t.vendidos).filter((n) => n > 0).length, alvo: 4, premio: 600 },
    { id: "bebidas50", texto: "Venda 50 bebidas", valor: (t) => somaVendidos(t, (p) => p.cat === "bebida"), alvo: 50, premio: 1500 },
    { id: "atender100", texto: "Atenda 100 clientes", valor: (t) => t.atendidos, alvo: 100, premio: 1000 },
    { id: "nivel2", texto: "Melhore um móvel até o nível 2", valor: (t) => Math.max(1, ...t.moveis.map(nivelMovel)), alvo: 2, premio: 800 },
    { id: "qualidade1", texto: "Melhore a qualidade de um produto", valor: (t) => Math.max(0, ...Object.values(t.qualidade)), alvo: 1, premio: 700 },
    { id: "melhoria1", texto: "Compre uma melhoria da loja", valor: (t) => t.melhorias.length, alvo: 1, premio: 800 },
    { id: "pacotes100", texto: "Venda 100 pacotes de cartas", valor: (t) => t.vendidos.pacote || 0, alvo: 100, premio: 4000 },
    { id: "rocket5", texto: "Expulse a Equipe Rocket 5 vezes", valor: (t) => t.rocketsExpulsos, alvo: 5, premio: 3000 },
    { id: "atender500", texto: "Atenda 500 clientes", valor: (t) => t.atendidos, alvo: 500, premio: 5000 },
    { id: "variedade8", texto: "Venda 8 produtos diferentes", valor: (t) => Object.values(t.vendidos).filter((n) => n > 0).length, alvo: 8, premio: 6000 },
    { id: "premium", texto: "Tenha um móvel no nível 3", valor: (t) => Math.max(1, ...t.moveis.map(nivelMovel)), alvo: 3, premio: 3000 },
    { id: "estrelas5", texto: "Chegue a 5 estrelas de reputação", valor: (t) => (t.reputacao >= 4.95 ? 5 : Math.floor(t.reputacao * 10) / 10), alvo: 5, premio: 5000 },
    { id: "melhoria5", texto: "Compre 5 melhorias da loja", valor: (t) => t.melhorias.length, alvo: 5, premio: 12000 },
    { id: "qualidade5", texto: "Deixe um produto com qualidade máxima", valor: (t) => Math.max(0, ...Object.values(t.qualidade)), alvo: 5, premio: 15000 },
    { id: "lucro100k", texto: "Lucre ₽ 100.000 no total", valor: (t) => t.lucroTotal, alvo: 100000, premio: 10000 },
    { id: "atender2000", texto: "Atenda 2.000 clientes", valor: (t) => t.atendidos, alvo: 2000, premio: 25000 },
    { id: "variedade13", texto: "Venda 13 produtos diferentes", valor: (t) => Object.values(t.vendidos).filter((n) => n > 0).length, alvo: 13, premio: 60000 },
    { id: "lucro1m", texto: "Lucre ₽ 1.000.000 no total", valor: (t) => t.lucroTotal, alvo: 1000000, premio: 100000 },
];
export const METAS_POR_ID = Object.fromEntries(METAS.map((m) => [m.id, m]));
export const metaPronta = (t, meta) => !t.metas.includes(meta.id) && meta.valor(t) >= meta.alvo;
export const metasProntas = (t) => METAS.filter((m) => metaPronta(t, m)).length;
export const resgatarMeta = (t, id) => {
    const meta = METAS_POR_ID[id];
    if (!meta || !metaPronta(t, meta)) return false;
    t.metas.push(id);
    t.dinheiro += meta.premio;
    return true;
};

// Vitrine: atração pela raridade da carta exposta
export const ATRACAO_RARIDADE = { 1: 0.02, 2: 0.03, 3: 0.05, 4: 0.08, 5: 0.1, 6: 0.14, 7: 0.18, 8: 0.25 };

export const OFFLINE_MAX_SEGUNDOS = 8 * 3600;

// ---------------- Estado salvo ----------------
export const tycoonInicial = () => ({
    dinheiro: 600,
    lucroTotal: 0,
    reputacao: 2.5, // 0 a 5 estrelas
    cidade: 0,
    moveis: [
        { x: 1, y: 1, tipo: "prateleira", produto: "pocao", estoque: 10 },
        { x: 4, y: 1, tipo: "prateleira", produto: "pokebola", estoque: 10 },
        { x: 4, y: 3, tipo: "caixa" },
    ],
    equipe: {},
    precos: {},
    atendidos: 0,
    perdidos: 0,
    rocketsExpulsos: 0,
    taxaMin: 0, // lucro médio por minuto (para o tempo fora)
    ultimoTick: Date.now(),
    pacotesResgatados: 0,
    pacotesHoje: { dia: "", qtd: 0 },
    qualidade: {}, // nível de qualidade de cada produto
    melhorias: [], // melhorias da loja compradas
    metas: [], // metas já resgatadas
    vendidos: {}, // itens vendidos de cada produto
    procurados: {}, // produtos que clientes procuraram e a loja não vendia
});

export const normalizarTycoon = (t) => {
    const base = tycoonInicial();
    const x = t && typeof t === "object" ? { ...base, ...t } : base;
    x.moveis = Array.isArray(x.moveis) ? x.moveis.filter((m) => m && MOVEIS[m.tipo]) : base.moveis;
    for (const m of x.moveis) {
        if (!(Number.isInteger(m.rot) && m.rot >= 0 && m.rot < 4)) delete m.rot;
        if (!ACABAMENTOS[m.acabamento]) delete m.acabamento;
        if (!(Number.isInteger(m.nivel) && m.nivel > 1 && m.nivel <= 3)) delete m.nivel;
        if (vende(m) && PRODUTOS[m.produto]?.cat !== MOVEIS[m.tipo].vende) m.produto = MOVEIS[m.tipo].vende === "bebida" ? "agua" : "pocao";
    }
    x.equipe = x.equipe && typeof x.equipe === "object" ? { ...x.equipe } : {};
    x.precos = x.precos && typeof x.precos === "object" ? { ...x.precos } : {};
    for (const k of ["qualidade", "vendidos", "procurados"]) x[k] = x[k] && typeof x[k] === "object" && !Array.isArray(x[k]) ? { ...x[k] } : {};
    for (const k of ["melhorias", "metas"]) x[k] = Array.isArray(x[k]) ? x[k].filter((v) => typeof v === "string") : [];
    x.pacotesHoje = x.pacotesHoje && typeof x.pacotesHoje === "object" ? x.pacotesHoje : { dia: "", qtd: 0 };
    for (const k of ["dinheiro", "lucroTotal", "atendidos", "perdidos", "rocketsExpulsos", "taxaMin", "pacotesResgatados", "cidade"]) {
        x[k] = Number.isFinite(x[k]) && x[k] > 0 ? x[k] : 0;
    }
    x.cidade = Math.min(Math.floor(x.cidade), CIDADES.length - 1);
    x.reputacao = Number.isFinite(x.reputacao) ? Math.min(5, Math.max(0, x.reputacao)) : 2.5;
    if (!Number.isFinite(x.ultimoTick)) x.ultimoTick = Date.now();
    return x;
};

// ---------------- Mapa ----------------
export const tamanho = (t) => CIDADES[t.cidade];
// A porta fica no meio da parede de baixo
export const porta = (t) => ({ x: Math.floor(tamanho(t).w / 2), y: tamanho(t).h - 1 });
export const movelEm = (t, x, y) => t.moveis.find((m) => m.x === x && m.y === y);
export const dentro = (t, x, y) => x >= 0 && y >= 0 && x < tamanho(t).w && y < tamanho(t).h;
export const livre = (t, x, y) => dentro(t, x, y) && !movelEm(t, x, y);

export const nivelEquipe = (t, id) => Math.min(t.equipe[id] || 0, NIVEL_MAX);
// Estoque de uma estante/geladeira (sem móvel: o valor base)
export const estoqueMax = (t, m = null) => {
    const base = ESTOQUE_BASE + 5 * nivelEquipe(t, "kangaskhan") + (t.melhorias?.includes("deposito") ? 5 : 0);
    return Math.round(base * [1, 1.5, 2][nivelMovel(m) - 1]);
};
// Preço de custo (o fornecedor expresso dá 10% de desconto)
export const custoUnit = (t, id) => PRODUTOS[id].custo * (t.melhorias?.includes("fornecedor") ? 0.9 : 1);
export const produtoLiberado = (t, id) => (PRODUTOS[id].cidade || 0) <= t.cidade;

// Construir: não pode tapar a porta nem fechar o caminho até ela
export const podeConstruir = (t, x, y) => {
    const p = porta(t);
    if (!livre(t, x, y) || (x === p.x && y === p.y)) return false;
    // Testa se, com o móvel novo, todo espaço livre continua ligado à porta
    t.moveis.push({ x, y, tipo: "planta" });
    const ok = todosAlcancaveis(t);
    t.moveis.pop();
    return ok;
};

const vizinhos = (x, y) => [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]];

// Caminho mais curto (BFS) entre dois espaços livres
export const caminho = (t, de, para) => {
    const chave = (x, y) => `${x},${y}`;
    const veio = new Map([[chave(de.x, de.y), null]]);
    const fila = [[de.x, de.y]];
    while (fila.length) {
        const [x, y] = fila.shift();
        if (x === para.x && y === para.y) {
            const passos = [];
            for (let k = chave(x, y); k; k = veio.get(k)) passos.unshift(k.split(",").map(Number));
            return passos.map(([px, py]) => ({ x: px, y: py }));
        }
        for (const [nx, ny] of vizinhos(x, y)) {
            if (!livre(t, nx, ny) || veio.has(chave(nx, ny))) continue;
            veio.set(chave(nx, ny), chave(x, y));
            fila.push([nx, ny]);
        }
    }
    return null;
};

const todosAlcancaveis = (t) => {
    const p = porta(t);
    const vistos = new Set([`${p.x},${p.y}`]);
    const fila = [[p.x, p.y]];
    while (fila.length) {
        const [x, y] = fila.shift();
        for (const [nx, ny] of vizinhos(x, y)) {
            if (livre(t, nx, ny) && !vistos.has(`${nx},${ny}`)) {
                vistos.add(`${nx},${ny}`);
                fila.push([nx, ny]);
            }
        }
    }
    const livres = [];
    for (let y = 0; y < tamanho(t).h; y++) for (let x = 0; x < tamanho(t).w; x++) if (livre(t, x, y)) livres.push(`${x},${y}`);
    // Todo móvel precisa ter um lado livre alcançável
    const moveisOk = t.moveis.every((m) => vizinhos(m.x, m.y).some(([nx, ny]) => vistos.has(`${nx},${ny}`)));
    return livres.every((k) => vistos.has(k)) && moveisOk;
};

// Espaço livre ao lado de um móvel, o mais perto da porta
// Para onde a frente do móvel aponta (rot 0 = para baixo, depois gira no sentido horário)
export const FRENTES = [[0, 1], [1, 0], [0, -1], [-1, 0]];

export const ladoLivre = (t, m) => {
    // Os clientes usam a frente do móvel quando ela está livre
    const [fx, fy] = FRENTES[m.rot || 0];
    if (livre(t, m.x + fx, m.y + fy)) return { x: m.x + fx, y: m.y + fy };
    const opcoes = vizinhos(m.x, m.y).filter(([x, y]) => livre(t, x, y));
    if (!opcoes.length) return null;
    const p = porta(t);
    opcoes.sort((a, b) => Math.abs(a[0] - p.x) + Math.abs(a[1] - p.y) - (Math.abs(b[0] - p.x) + Math.abs(b[1] - p.y)));
    return { x: opcoes[0][0], y: opcoes[0][1] };
};

// ---------------- Editar móveis (mover, girar e pintar) ----------------
export const ACABAMENTOS = {
    madeira: { nome: "Madeira", cor: "#c98b55" },
    nogueira: { nome: "Nogueira", cor: "#7a4f2e" },
    branco: { nome: "Branco", cor: "#e9e9ef" },
    vermelho: { nome: "Vermelho Pokémart", cor: "#dc2a3c" },
    azul: { nome: "Azul", cor: "#2f5bd3" },
    verde: { nome: "Verde", cor: "#2e9e5b" },
};

// Dá para levar o móvel de (x,y) até (nx,ny)? Mesmas regras de construir.
export const podeMover = (t, x, y, nx, ny) => {
    const m = movelEm(t, x, y);
    if (!m || (x === nx && y === ny)) return false;
    t.moveis = t.moveis.filter((o) => o !== m);
    const ok = podeConstruir(t, nx, ny);
    t.moveis.push(m);
    return ok;
};
export const moverMovel = (t, x, y, nx, ny) => {
    if (!podeMover(t, x, y, nx, ny)) return false;
    const m = movelEm(t, x, y);
    m.x = nx;
    m.y = ny;
    return true;
};
export const girarMovel = (t, x, y) => {
    const m = movelEm(t, x, y);
    if (!m) return false;
    m.rot = ((m.rot || 0) + 1) % 4;
    return true;
};
export const pintarMovel = (t, x, y, acabamento) => {
    const m = movelEm(t, x, y);
    if (!m || !ACABAMENTOS[acabamento]) return false;
    m.acabamento = acabamento;
    return true;
};

// Por que não dá para construir (null = dá)
export const bloqueioConstruir = (t, tipo) => {
    const m = MOVEIS[tipo];
    if (!m) return "Móvel desconhecido";
    if ((m.cidade || 0) > t.cidade) return `Libera em ${CIDADES[m.cidade].nome}`;
    if (m.limite && contar(t, tipo) >= m.limite) return `Máximo de ${m.limite}`;
    if (t.dinheiro < m.custo) return "Dinheiro insuficiente";
    return null;
};

export const construir = (t, x, y, tipo, extra = {}) => {
    const m = MOVEIS[tipo];
    if (!m || bloqueioConstruir(t, tipo) || !podeConstruir(t, x, y)) return false;
    t.dinheiro -= m.custo;
    const novo = { x, y, tipo, ...extra };
    if (m.vende) Object.assign(novo, { produto: novo.produto || (m.vende === "bebida" ? "agua" : "pocao"), estoque: 0 });
    t.moveis.push(novo);
    return true;
};

// Quanto foi gasto no móvel (preço + melhorias)
export const valorMovel = (m) => MOVEIS[m.tipo].custo + (MOVEIS[m.tipo].niveis || []).slice(0, nivelMovel(m) - 1).reduce((s, n) => s + n.custo, 0);

// Melhorar o móvel para o próximo nível
export const proximoNivel = (m) => MOVEIS[m.tipo].niveis?.[nivelMovel(m) - 1] || null;
export const melhorarMovel = (t, x, y) => {
    const m = movelEm(t, x, y);
    const prox = m && proximoNivel(m);
    if (!prox || t.dinheiro < prox.custo) return false;
    t.dinheiro -= prox.custo;
    m.nivel = nivelMovel(m) + 1;
    return true;
};

// Vender um móvel devolve metade do que foi gasto nele
export const remover = (t, x, y) => {
    const m = movelEm(t, x, y);
    if (!m) return false;
    if (ehCaixa(m) && t.moveis.filter(ehCaixa).length === 1) return false;
    t.moveis = t.moveis.filter((o) => o !== m);
    t.dinheiro += Math.floor(valorMovel(m) / 2);
    return true;
};

// Trocar o produto de uma prateleira (o estoque antigo volta como dinheiro, pelo custo)
export const trocarProduto = (t, m, produto) => {
    if (!PRODUTOS[produto] || !produtoLiberado(t, produto) || !vende(m) || PRODUTOS[produto].cat !== MOVEIS[m.tipo].vende) return false;
    t.dinheiro += (m.estoque || 0) * custoUnit(t, m.produto);
    m.produto = produto;
    m.estoque = 0;
    return true;
};

// ---------------- Estoque ----------------
export const custoRepor = (t, m) => Math.ceil(Math.max(0, estoqueMax(t, m) - (m.estoque || 0)) * custoUnit(t, m.produto));

export const repor = (t, m) => {
    if (!vende(m)) return 0;
    const falta = estoqueMax(t, m) - (m.estoque || 0);
    const possivel = Math.min(falta, Math.floor(t.dinheiro / custoUnit(t, m.produto)));
    if (possivel <= 0) return 0;
    t.dinheiro -= possivel * custoUnit(t, m.produto);
    m.estoque = (m.estoque || 0) + possivel;
    return possivel;
};

export const reporTudo = (t) => t.moveis.reduce((s, m) => s + repor(t, m), 0);

// ---------------- Equipe ----------------
export const contratar = (t, id) => {
    const e = EQUIPE_POR_ID[id];
    const nivel = nivelEquipe(t, id);
    if (!e || nivel >= NIVEL_MAX) return false;
    const custo = custoEquipe(e, nivel);
    if (t.dinheiro < custo) return false;
    t.dinheiro -= custo;
    t.equipe[id] = nivel + 1;
    return true;
};

// ---------------- Cidades ----------------
export const podeMudar = (t) => {
    const prox = CIDADES[t.cidade + 1];
    return !!prox && t.lucroTotal >= prox.lucroMin && t.dinheiro >= prox.custo;
};

// A loja cresce para a direita e para cima; os móveis mantêm a posição em relação ao chão
export const mudarCidade = (t) => {
    if (!podeMudar(t)) return false;
    const antiga = tamanho(t);
    const nova = CIDADES[t.cidade + 1];
    t.dinheiro -= nova.custo;
    const dy = nova.h - antiga.h;
    t.cidade++;
    for (const m of t.moveis) m.y += dy;
    // Se algum móvel ficou na porta nova, ele é vendido
    const p = porta(t);
    const naPorta = movelEm(t, p.x, p.y);
    if (naPorta) {
        t.moveis = t.moveis.filter((m) => m !== naPorta);
        t.dinheiro += MOVEIS[naPorta.tipo].custo;
    }
    return true;
};

// ---------------- Atração e clientes ----------------
export const atracao = (t, cartas = {}) => {
    let a = 0;
    const rua = temMelhoria(t, "vitrinerua") ? 1.5 : 1;
    for (const m of t.moveis) {
        if (m.tipo === "planta") a += 0.02;
        if (m.tipo === "vitrine" && m.carta && cartas[m.carta]) a += (ATRACAO_RARIDADE[cartas[m.carta]] || 0) * nivelMovel(m) * rua;
    }
    a += Math.min(contar(t, "totem"), 3) * 0.06 + Math.min(contar(t, "estatua"), 2) * 0.12;
    for (const [id, bonus] of [["musica", 0.08], ["radio", 0.15], ["tv", 0.25]]) if (temMelhoria(t, id)) a += bonus;
    return a;
};

// Clientes por segundo
export const taxaClientes = (t, cartas = {}, evento = null) => {
    const base = 1 / 7;
    const rep = 0.4 + t.reputacao * 0.24; // 0,4× com 0 estrelas até 1,6× com 5
    const pikachu = 1 + 0.1 * nivelEquipe(t, "pikachu");
    const ev = evento === "torneio" ? 2 : 1;
    return base * rep * pikachu * CIDADES[t.cidade].clientes * (1 + atracao(t, cartas)) * ev;
};

export const precoVenda = (t, produto) => {
    const p = PRODUTOS[produto];
    const q = 1 + 0.1 * qualidade(t, produto);
    const selo = temMelhoria(t, "selo") ? 1.15 : 1;
    return Math.round(p.preco * PRECOS[t.precos[produto] || "normal"].mult * CIDADES[t.cidade].gasto * q * selo);
};

// Chance de o cliente aceitar o preço
export const chanceCompra = (t, produto) => {
    const nivelPreco = PRECOS[t.precos[produto] || "normal"];
    const meowth = nivelEquipe(t, "meowth") * 0.05;
    const extra = 0.03 * qualidade(t, produto) + 0.03 * Math.min(contar(t, "totem"), 3) + (temMelhoria(t, "fidelidade") ? 0.06 : 0);
    return Math.min(1, nivelPreco.compra + (nivelPreco.mult > 1 ? meowth : meowth / 2) + extra);
};

// Segundos para atender um cliente (no caixa m, se informado)
export const tempoCaixa = (t, m = null) => {
    let tempo = 2.6 * 0.85 ** nivelEquipe(t, "chansey");
    if (m?.tipo === "caixarapido") tempo *= 0.65;
    else if (m) tempo *= 0.8 ** (nivelMovel(m) - 1);
    return tempo;
};
export const pacienciaFila = (t) => 14 * (1 + 0.2 * nivelEquipe(t, "alakazam") + 0.15 * Math.min(contar(t, "banco"), 3) + (temMelhoria(t, "ar") ? 0.25 : 0)); // segundos
const perdaReputacao = (t, valor) => valor * (1 - 0.15 * Math.min(contar(t, "lixeira"), 2));
const ganhoReputacao = (t, valor) => valor * (1 + 0.25 * Math.min(contar(t, "estatua"), 2));
// Chance de, depois de pegar um produto, querer mais outro (máx. 3 produtos)
export const chanceLevarMais = (t, m) => 0.3 + (nivelMovel(m) === 3 ? 0.1 : 0) + (temMelhoria(t, "cestinhas") ? 0.15 : 0);
export const rendaMaquina = (m) => nivelMovel(m);
export const intervaloMachamp = (t) => (nivelEquipe(t, "machamp") ? 12 / nivelEquipe(t, "machamp") : Infinity);

const VELOCIDADE = 2.2; // espaços por segundo

// ---------------- Simulação ----------------
// "mundo" guarda o que não precisa ir para o save (clientes andando, fila...)
export const novoMundo = () => ({ clientes: [], proximoId: 1, acumulado: 0, relogioMachamp: 0, caixas: {}, eventos: [], proximoCliente: 2 });

const sortear = (lista, peso, rnd) => {
    const pesos = lista.map(peso);
    let alvo = rnd() * pesos.reduce((a, b) => a + b, 0);
    for (let i = 0; i < lista.length; i++) {
        alvo -= pesos[i];
        if (alvo <= 0) return lista[i];
    }
    return lista[lista.length - 1];
};
// Procura: quanto mais qualidade, mais gente procura o produto
export const procura = (t, id) => PRODUTOS[id].demanda * (1 + 0.1 * qualidade(t, id));

// O cliente chega querendo um produto (entre os que existem na cidade).
// Se a loja vende, vai até ele; se não vende, às vezes leva outra coisa, às vezes vai embora.
const escolherPrateleira = (t, rnd, jaLevou = [], substituir = true) => {
    const opcoes = t.moveis.filter((m) => vende(m) && ladoLivre(t, m) && !jaLevou.includes(m.produto));
    if (!opcoes.length) return { alvo: null, quer: null };
    const liberados = Object.keys(PRODUTOS).filter((id) => produtoLiberado(t, id) && !jaLevou.includes(id));
    const quer = sortear(liberados, (id) => procura(t, id), rnd);
    const com = opcoes.filter((m) => m.produto === quer);
    if (com.length) return { alvo: com.find((m) => m.estoque) || com[0], quer };
    if (substituir && rnd() < 0.5) return { alvo: sortear(opcoes, (m) => procura(t, m.produto), rnd), quer, trocou: true };
    return { alvo: null, quer };
};
const anotarProcura = (t, id) => {
    t.procurados[id] = (t.procurados[id] || 0) + 1;
    // Mantém só o "recente": quando passa de 200, todos caem pela metade
    if (t.procurados[id] > 200) for (const k of Object.keys(t.procurados)) t.procurados[k] = Math.floor(t.procurados[k] / 2);
};

const caixaMaisVazio = (t, mundo) => {
    const caixas = t.moveis.filter((m) => ehCaixa(m) && ladoLivre(t, m));
    if (!caixas.length) return null;
    const fila = (m) => mundo.clientes.filter((c) => c.caixa === `${m.x},${m.y}`).length;
    return caixas.sort((a, b) => fila(a) - fila(b))[0];
};

const andarAte = (t, c, destino) => {
    c.rota = caminho(t, { x: Math.round(c.x), y: Math.round(c.y) }, destino) || [destino];
};

// Avança o mundo em dt segundos. Devolve os acontecimentos (para a tela mostrar e tocar som).
export const simular = (t, mundo, dt, { rnd = Math.random, cartas = {}, evento = null, rocket = false } = {}) => {
    const eventos = [];
    const p = porta(t);
    // Chegada de clientes
    mundo.proximoCliente -= dt;
    if (mundo.proximoCliente <= 0 && mundo.clientes.length < 6 + t.cidade * 2) {
        mundo.proximoCliente = (-Math.log(1 - rnd()) / taxaClientes(t, cartas, evento));
        const cliente = { id: mundo.proximoId++, x: p.x, y: p.y, estado: "entrando", espera: 0, itens: [], rota: [], sprite: Math.floor(rnd() * 1e6) };
        if (rocket) cliente.rocket = true;
        const { alvo, quer } = rocket ? { alvo: null } : escolherPrateleira(t, rnd);
        if (rocket) {
            // (o agente da Rocket entra pelo entrarRocket)
            cliente.estado = "saindo";
        } else if (!alvo) {
            cliente.estado = "saindo";
            cliente.humor = "triste";
            if (quer) {
                anotarProcura(t, quer);
                eventos.push({ tipo: "nao-tem", cliente, produto: quer });
            } else eventos.push({ tipo: "sem-produto", cliente });
        } else {
            cliente.alvo = `${alvo.x},${alvo.y}`;
            andarAte(t, cliente, ladoLivre(t, alvo));
        }
        mundo.clientes.push(cliente);
    }
    // Machamp repõe sozinho
    if (Number.isFinite(intervaloMachamp(t))) {
        mundo.relogioMachamp += dt;
        if (mundo.relogioMachamp >= intervaloMachamp(t)) {
            mundo.relogioMachamp = 0;
            const vazia = t.moveis.filter((m) => vende(m) && m.estoque < estoqueMax(t, m) * 0.5)
                .sort((a, b) => a.estoque - b.estoque)[0];
            if (vazia && repor(t, vazia)) eventos.push({ tipo: "machamp", movel: vazia });
        }
    }
    // Cada cliente
    for (const c of mundo.clientes) {
        // Andando pela rota
        if (c.rota.length) {
            let passo = VELOCIDADE * dt;
            while (passo > 0 && c.rota.length) {
                const alvo = c.rota[0];
                const dx = alvo.x - c.x;
                const dy = alvo.y - c.y;
                const dist = Math.hypot(dx, dy);
                if (dist <= passo) {
                    c.x = alvo.x;
                    c.y = alvo.y;
                    c.rota.shift();
                    passo -= dist;
                } else {
                    c.x += (dx / dist) * passo;
                    c.y += (dy / dist) * passo;
                    passo = 0;
                }
            }
            continue;
        }
        if (c.estado === "entrando") {
            // Chegou na prateleira: pega o produto (se tiver e se aceitar o preço)
            const m = t.moveis.find((o) => `${o.x},${o.y}` === c.alvo);
            if (c.rocket) {
                // Equipe Rocket: rouba o estoque da prateleira e foge
                if (m && m.estoque) {
                    const qtd = temMelhoria(t, "seguranca") ? Math.ceil(m.estoque / 2) : m.estoque;
                    eventos.push({ tipo: "roubo", cliente: c, qtd, produto: m.produto });
                    m.estoque -= qtd;
                }
                c.estado = "saindo";
                c.humor = "rocket";
                andarAte(t, c, p);
                continue;
            }
            if (!m || !m.estoque) {
                if (!c.itens.length) {
                    c.estado = "saindo";
                    c.humor = "triste";
                    t.perdidos++;
                    t.reputacao = Math.max(0, t.reputacao - perdaReputacao(t, 0.04));
                    eventos.push({ tipo: "sem-estoque", cliente: c, movel: m });
                    andarAte(t, c, p);
                    continue;
                }
                eventos.push({ tipo: "sem-estoque", cliente: c, movel: m, leve: true });
            } else if (rnd() > chanceCompra(t, m.produto)) {
                if (!c.itens.length) {
                    c.estado = "saindo";
                    c.humor = "caro";
                    eventos.push({ tipo: "caro", cliente: c });
                    andarAte(t, c, p);
                    continue;
                }
            } else {
                const qtd = Math.min(m.estoque, 1 + (rnd() < 0.3 + (nivelMovel(m) === 3 ? 0.2 : 0) ? 1 : 0));
                m.estoque -= qtd;
                c.itens.push({ produto: m.produto, qtd });
                // Cesta: às vezes o cliente quer mais um produto diferente antes de pagar
                if (c.itens.length < 3 && rnd() < chanceLevarMais(t, m)) {
                    const prox = escolherPrateleira(t, rnd, c.itens.map((i) => i.produto), false);
                    if (prox.alvo) {
                        c.alvo = `${prox.alvo.x},${prox.alvo.y}`;
                        andarAte(t, c, ladoLivre(t, prox.alvo));
                        continue;
                    }
                    if (prox.quer) anotarProcura(t, prox.quer);
                }
            }
            const caixa = caixaMaisVazio(t, mundo);
            if (!caixa) {
                c.estado = "saindo";
                c.humor = "triste";
                andarAte(t, c, p);
                continue;
            }
            c.estado = "fila";
            c.caixa = `${caixa.x},${caixa.y}`;
            c.espera = 0;
            andarAte(t, c, ladoLivre(t, caixa));
        } else if (c.estado === "fila") {
            c.espera += dt;
            // O caixa atende um cliente por vez
            const cx = mundo.caixas[c.caixa] || (mundo.caixas[c.caixa] = { atendendo: null, tempo: 0 });
            if (!cx.atendendo) cx.atendendo = c.id;
            if (cx.atendendo === c.id) {
                cx.tempo += dt;
                const balcao = t.moveis.find((o) => `${o.x},${o.y}` === c.caixa);
                if (cx.tempo >= tempoCaixa(t, balcao)) {
                    cx.atendendo = null;
                    cx.tempo = 0;
                    let valor = c.itens.reduce((s, i) => s + precoVenda(t, i.produto) * i.qtd, 0);
                    const custo = c.itens.reduce((s, i) => s + custoUnit(t, i.produto) * i.qtd, 0);
                    if (evento === "carvalho") valor *= 3;
                    const chanceGorjeta = nivelEquipe(t, "meowth") * 0.06 + (balcao?.tipo === "caixa" && nivelMovel(balcao) === 3 ? 0.08 : 0);
                    const gorjeta = rnd() < chanceGorjeta ? Math.ceil(valor * 0.2) : 0;
                    for (const i of c.itens) t.vendidos[i.produto] = (t.vendidos[i.produto] || 0) + i.qtd;
                    t.dinheiro += valor + gorjeta;
                    t.lucroTotal += Math.max(0, valor + gorjeta - custo);
                    mundo.acumulado += Math.max(0, valor + gorjeta - custo);
                    t.atendidos++;
                    t.reputacao = Math.min(5, t.reputacao + ganhoReputacao(t, 0.008));
                    eventos.push({ tipo: "venda", cliente: c, valor: valor + gorjeta, gorjeta });
                    c.estado = "saindo";
                    c.humor = "feliz";
                    andarAte(t, c, p);
                }
            } else if (c.espera > pacienciaFila(t)) {
                // Cansou de esperar: devolve os itens e vai embora bravo
                for (const i of c.itens) {
                    const prat = t.moveis.find((m) => vende(m) && m.produto === i.produto);
                    if (prat) prat.estoque = Math.min(estoqueMax(t, prat), prat.estoque + i.qtd);
                }
                c.itens = [];
                c.estado = "saindo";
                c.humor = "bravo";
                t.perdidos++;
                t.reputacao = Math.max(0, t.reputacao - perdaReputacao(t, 0.06));
                eventos.push({ tipo: "desistiu", cliente: c });
                andarAte(t, c, p);
            }
        } else if (c.estado === "saindo") {
            c.foi = true;
            if (c.rocket && !c.expulso) eventos.push({ tipo: "rocket-fugiu", cliente: c });
        }
    }
    mundo.clientes = mundo.clientes.filter((c) => !c.foi);
    // Máquinas de venda
    const maquinas = t.moveis.reduce((s, m) => s + (m.tipo === "maquina" ? rendaMaquina(m) : 0), 0);
    if (maquinas) {
        const ganho = maquinas * dt * CIDADES[t.cidade].gasto;
        t.dinheiro += ganho;
        t.lucroTotal += ganho;
        mundo.acumulado += ganho;
    }
    return eventos;
};

// Expulsar o Rocket (clique nele) antes de ele roubar
export const expulsarRocket = (t, mundo, id) => {
    const c = mundo.clientes.find((x) => x.id === id && x.rocket && !x.expulso);
    if (!c) return false;
    c.expulso = true;
    c.rota = [];
    c.foi = true;
    t.rocketsExpulsos++;
    t.reputacao = Math.min(5, t.reputacao + 0.2);
    return true;
};

// Lucro por minuto (média móvel) usada para pagar o tempo fora
export const atualizarTaxa = (t, lucroNoMinuto) => {
    t.taxaMin = t.taxaMin ? t.taxaMin * 0.7 + lucroNoMinuto * 0.3 : lucroNoMinuto;
};

// Com o jogo fechado a loja rende 40% do ritmo normal, por até 8h, e gasta o estoque
export const aplicarOffline = (t, agora = Date.now()) => {
    const segundos = Math.min(Math.max(0, (agora - t.ultimoTick) / 1000), OFFLINE_MAX_SEGUNDOS);
    t.ultimoTick = agora;
    if (segundos < 60 || !t.taxaMin) return { segundos: 0, ganho: 0 };
    // Limitado pelo estoque que está nas prateleiras
    const valorEstoque = t.moveis.reduce((s, m) => s + (vende(m) ? m.estoque * (precoVenda(t, m.produto) - custoUnit(t, m.produto)) : 0), 0);
    const maquinas = t.moveis.reduce((s, m) => s + (m.tipo === "maquina" ? rendaMaquina(m) : 0), 0) * segundos * CIDADES[t.cidade].gasto;
    const ganho = Math.floor(Math.min((t.taxaMin / 60) * segundos * 0.4, valorEstoque * 0.8) + maquinas * 0.4);
    // As prateleiras esvaziam na proporção do que foi vendido
    const fracao = valorEstoque ? Math.min(1, (ganho - maquinas * 0.4) / valorEstoque) : 0;
    for (const m of t.moveis) if (vende(m)) m.estoque = Math.floor(m.estoque * (1 - fracao));
    t.dinheiro += ganho;
    t.lucroTotal += ganho;
    return { segundos, ganho };
};

// ---------------- Pacotes para o jogo de cartas ----------------
export const pacotesDisponiveis = (t, dia) => {
    const ganhos = Math.floor(t.lucroTotal / LUCRO_POR_PACOTE) - t.pacotesResgatados;
    const hoje = t.pacotesHoje.dia === dia ? t.pacotesHoje.qtd : 0;
    return Math.max(0, Math.min(ganhos, PACOTES_POR_DIA - hoje));
};

export const resgatarPacote = (t, dia) => {
    if (pacotesDisponiveis(t, dia) < 1) return false;
    if (t.pacotesHoje.dia !== dia) t.pacotesHoje = { dia, qtd: 0 };
    t.pacotesHoje.qtd++;
    t.pacotesResgatados++;
    return true;
};

// Evento: um agente da Equipe Rocket entra e vai direto para a prateleira mais cheia
export const entrarRocket = (t, mundo) => {
    const alvo = t.moveis.filter((m) => vende(m) && m.estoque && ladoLivre(t, m)).sort((a, b) => b.estoque - a.estoque)[0];
    if (!alvo) return null;
    const p = porta(t);
    const c = { id: mundo.proximoId++, x: p.x, y: p.y, estado: "entrando", espera: 0, itens: [], rota: [], rocket: true, alvo: `${alvo.x},${alvo.y}` };
    c.rota = caminho(t, p, ladoLivre(t, alvo)) || [];
    mundo.clientes.push(c);
    return c;
};
