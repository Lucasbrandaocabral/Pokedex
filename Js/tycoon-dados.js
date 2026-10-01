// ====================================================
// Pokémart Tycoon: regras, números e a simulação da loja.
// Só funções puras (sem tela), para dar para testar e balancear.
// ====================================================

// ---------------- Produtos ----------------
export const PRODUTOS = {
    pocao: { nome: "Poção", icone: "🧪", custo: 10, preco: 18, demanda: 30 },
    pokebola: { nome: "Pokébola", icone: "🔴", custo: 16, preco: 28, demanda: 30 },
    pacote: { nome: "Pacote de cartas", icone: "🎴", custo: 35, preco: 60, demanda: 20 },
    isca: { nome: "Isca de pesca", icone: "🎣", custo: 8, preco: 15, demanda: 25, cidade: 3 },
    reviver: { nome: "Reviver", icone: "💎", custo: 60, preco: 110, demanda: 12, cidade: 4 },
    ultraball: { nome: "Ultra Ball", icone: "🟡", custo: 90, preco: 170, demanda: 10, cidade: 5 },
};
// Preço escolhido pelo jogador: mais caro dá mais lucro mas mais gente desiste
export const PRECOS = {
    barato: { nome: "Barato", mult: 0.85, compra: 1 },
    normal: { nome: "Normal", mult: 1, compra: 0.9 },
    caro: { nome: "Caro", mult: 1.3, compra: 0.62 },
};

// ---------------- Móveis ----------------
export const MOVEIS = {
    caixa: { nome: "Caixa", icone: "🧾", custo: 150, desc: "Onde os clientes pagam. Precisa de pelo menos 1." },
    prateleira: { nome: "Prateleira", icone: "🗄️", custo: 120, desc: "Guarda um produto. Clique nela para escolher qual." },
    vitrine: { nome: "Vitrine de carta", icone: "🖼️", custo: 400, desc: "Mostra uma carta do seu álbum. Quanto mais rara, mais clientes." },
    planta: { nome: "Planta", icone: "🪴", custo: 60, desc: "Deixa a loja mais bonita: +2% de clientes." },
    maquina: { nome: "Máquina de venda", icone: "🥤", custo: 900, desc: "Vende sozinha: +1 ₽ por segundo." },
};
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
});

export const normalizarTycoon = (t) => {
    const base = tycoonInicial();
    const x = t && typeof t === "object" ? { ...base, ...t } : base;
    x.moveis = Array.isArray(x.moveis) ? x.moveis.filter((m) => m && MOVEIS[m.tipo]) : base.moveis;
    for (const m of x.moveis) {
        if (!(Number.isInteger(m.rot) && m.rot >= 0 && m.rot < 4)) delete m.rot;
        if (!ACABAMENTOS[m.acabamento]) delete m.acabamento;
    }
    x.equipe = x.equipe && typeof x.equipe === "object" ? { ...x.equipe } : {};
    x.precos = x.precos && typeof x.precos === "object" ? { ...x.precos } : {};
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
export const estoqueMax = (t) => ESTOQUE_BASE + 5 * nivelEquipe(t, "kangaskhan");
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

export const construir = (t, x, y, tipo, extra = {}) => {
    const m = MOVEIS[tipo];
    if (!m || t.dinheiro < m.custo || !podeConstruir(t, x, y)) return false;
    t.dinheiro -= m.custo;
    const novo = { x, y, tipo, ...extra };
    if (tipo === "prateleira") Object.assign(novo, { produto: novo.produto || "pocao", estoque: 0 });
    t.moveis.push(novo);
    return true;
};

// Vender um móvel devolve metade do preço
export const remover = (t, x, y) => {
    const m = movelEm(t, x, y);
    if (!m) return false;
    if (m.tipo === "caixa" && t.moveis.filter((o) => o.tipo === "caixa").length === 1) return false;
    t.moveis = t.moveis.filter((o) => o !== m);
    t.dinheiro += Math.floor(MOVEIS[m.tipo].custo / 2);
    return true;
};

// Trocar o produto de uma prateleira (o estoque antigo volta como dinheiro, pelo custo)
export const trocarProduto = (t, m, produto) => {
    if (!PRODUTOS[produto] || !produtoLiberado(t, produto) || m.tipo !== "prateleira") return false;
    t.dinheiro += (m.estoque || 0) * PRODUTOS[m.produto].custo;
    m.produto = produto;
    m.estoque = 0;
    return true;
};

// ---------------- Estoque ----------------
export const custoRepor = (t, m) => (estoqueMax(t) - (m.estoque || 0)) * PRODUTOS[m.produto].custo;

export const repor = (t, m) => {
    if (m.tipo !== "prateleira") return 0;
    const falta = estoqueMax(t) - (m.estoque || 0);
    const possivel = Math.min(falta, Math.floor(t.dinheiro / PRODUTOS[m.produto].custo));
    if (possivel <= 0) return 0;
    t.dinheiro -= possivel * PRODUTOS[m.produto].custo;
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
    for (const m of t.moveis) {
        if (m.tipo === "planta") a += 0.02;
        if (m.tipo === "vitrine" && m.carta && cartas[m.carta]) a += ATRACAO_RARIDADE[cartas[m.carta]] || 0;
    }
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
    return Math.round(p.preco * PRECOS[t.precos[produto] || "normal"].mult * CIDADES[t.cidade].gasto);
};

// Chance de o cliente aceitar o preço
export const chanceCompra = (t, produto) => {
    const nivelPreco = PRECOS[t.precos[produto] || "normal"];
    const meowth = nivelEquipe(t, "meowth") * 0.05;
    return Math.min(1, nivelPreco.compra + (nivelPreco.mult > 1 ? meowth : meowth / 2));
};

export const tempoCaixa = (t) => 2.6 * 0.85 ** nivelEquipe(t, "chansey"); // segundos por cliente
export const pacienciaFila = (t) => 14 * (1 + 0.2 * nivelEquipe(t, "alakazam")); // segundos
export const intervaloMachamp = (t) => (nivelEquipe(t, "machamp") ? 12 / nivelEquipe(t, "machamp") : Infinity);

const VELOCIDADE = 2.2; // espaços por segundo

// ---------------- Simulação ----------------
// "mundo" guarda o que não precisa ir para o save (clientes andando, fila...)
export const novoMundo = () => ({ clientes: [], proximoId: 1, acumulado: 0, relogioMachamp: 0, caixas: {}, eventos: [], proximoCliente: 2 });

const escolherPrateleira = (t, rnd) => {
    const opcoes = t.moveis.filter((m) => m.tipo === "prateleira" && ladoLivre(t, m));
    if (!opcoes.length) return null;
    const pesos = opcoes.map((m) => PRODUTOS[m.produto].demanda);
    let alvo = rnd() * pesos.reduce((a, b) => a + b, 0);
    for (let i = 0; i < opcoes.length; i++) {
        alvo -= pesos[i];
        if (alvo <= 0) return opcoes[i];
    }
    return opcoes[opcoes.length - 1];
};

const caixaMaisVazio = (t, mundo) => {
    const caixas = t.moveis.filter((m) => m.tipo === "caixa" && ladoLivre(t, m));
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
        const alvo = escolherPrateleira(t, rnd);
        if (!alvo) {
            cliente.estado = "saindo";
            cliente.humor = "triste";
            eventos.push({ tipo: "sem-produto", cliente });
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
            const vazia = t.moveis.filter((m) => m.tipo === "prateleira" && m.estoque < estoqueMax(t) * 0.5)
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
                    eventos.push({ tipo: "roubo", cliente: c, qtd: m.estoque, produto: m.produto });
                    m.estoque = 0;
                }
                c.estado = "saindo";
                c.humor = "rocket";
                andarAte(t, c, p);
                continue;
            }
            if (!m || !m.estoque) {
                c.estado = "saindo";
                c.humor = "triste";
                t.perdidos++;
                t.reputacao = Math.max(0, t.reputacao - 0.04);
                eventos.push({ tipo: "sem-estoque", cliente: c, movel: m });
                andarAte(t, c, p);
                continue;
            }
            if (rnd() > chanceCompra(t, m.produto)) {
                c.estado = "saindo";
                c.humor = "caro";
                eventos.push({ tipo: "caro", cliente: c });
                andarAte(t, c, p);
                continue;
            }
            const qtd = Math.min(m.estoque, 1 + (rnd() < 0.3 ? 1 : 0));
            m.estoque -= qtd;
            c.itens.push({ produto: m.produto, qtd });
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
                if (cx.tempo >= tempoCaixa(t)) {
                    cx.atendendo = null;
                    cx.tempo = 0;
                    let valor = c.itens.reduce((s, i) => s + precoVenda(t, i.produto) * i.qtd, 0);
                    const custo = c.itens.reduce((s, i) => s + PRODUTOS[i.produto].custo * i.qtd, 0);
                    if (evento === "carvalho") valor *= 3;
                    const gorjeta = rnd() < nivelEquipe(t, "meowth") * 0.06 ? Math.ceil(valor * 0.2) : 0;
                    t.dinheiro += valor + gorjeta;
                    t.lucroTotal += Math.max(0, valor + gorjeta - custo);
                    mundo.acumulado += Math.max(0, valor + gorjeta - custo);
                    t.atendidos++;
                    t.reputacao = Math.min(5, t.reputacao + 0.008);
                    eventos.push({ tipo: "venda", cliente: c, valor: valor + gorjeta, gorjeta });
                    c.estado = "saindo";
                    c.humor = "feliz";
                    andarAte(t, c, p);
                }
            } else if (c.espera > pacienciaFila(t)) {
                // Cansou de esperar: devolve os itens e vai embora bravo
                for (const i of c.itens) {
                    const prat = t.moveis.find((m) => m.tipo === "prateleira" && m.produto === i.produto);
                    if (prat) prat.estoque = Math.min(estoqueMax(t), prat.estoque + i.qtd);
                }
                c.itens = [];
                c.estado = "saindo";
                c.humor = "bravo";
                t.perdidos++;
                t.reputacao = Math.max(0, t.reputacao - 0.06);
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
    const maquinas = t.moveis.filter((m) => m.tipo === "maquina").length;
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
    const valorEstoque = t.moveis.reduce((s, m) => s + (m.tipo === "prateleira" ? m.estoque * (precoVenda(t, m.produto) - PRODUTOS[m.produto].custo) : 0), 0);
    const maquinas = t.moveis.filter((m) => m.tipo === "maquina").length * segundos * CIDADES[t.cidade].gasto;
    const ganho = Math.floor(Math.min((t.taxaMin / 60) * segundos * 0.4, valorEstoque * 0.8) + maquinas * 0.4);
    // As prateleiras esvaziam na proporção do que foi vendido
    const fracao = valorEstoque ? Math.min(1, (ganho - maquinas * 0.4) / valorEstoque) : 0;
    for (const m of t.moveis) if (m.tipo === "prateleira") m.estoque = Math.floor(m.estoque * (1 - fracao));
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
    const alvo = t.moveis.filter((m) => m.tipo === "prateleira" && m.estoque && ladoLivre(t, m)).sort((a, b) => b.estoque - a.estoque)[0];
    if (!alvo) return null;
    const p = porta(t);
    const c = { id: mundo.proximoId++, x: p.x, y: p.y, estado: "entrando", espera: 0, itens: [], rota: [], rocket: true, alvo: `${alvo.x},${alvo.y}` };
    c.rota = caminho(t, p, ladoLivre(t, alvo)) || [];
    mundo.clientes.push(c);
    return c;
};
