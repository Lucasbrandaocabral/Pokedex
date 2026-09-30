// ====================================================
// Pokémart Tycoon: telas do modo de gerenciar a loja
// (as regras e a simulação ficam em tycoon-dados.js)
// ====================================================
import { estado, salvar, quantidade } from "./state.js";
import { spriteTreinador } from "./treinadores.js";
import { IMAGEM_PRODUTO, ARTE_MOVEL, ITENS_NA_ESTANTE } from "./moveis-arte.js";
import { imagemPixel, CARTAS, CARTA_POR_ID, RARIDADES } from "./cards.js";
import { $, $$, aviso, abrirModal, fecharModal, confirmar, sons, htmlCarta, numero } from "./ui.js";
import {
    PRODUTOS, PRECOS, MOVEIS, EQUIPE, CIDADES, NIVEL_MAX, LUCRO_POR_PACOTE, PACOTES_POR_DIA, OFFLINE_MAX_SEGUNDOS, ATRACAO_RARIDADE,
    normalizarTycoon, novoMundo, simular, tamanho, porta, movelEm, podeConstruir, construir, remover, trocarProduto, repor, reporTudo,
    custoRepor, estoqueMax, produtoLiberado, contratar, custoEquipe, nivelEquipe, podeMudar, mudarCidade, taxaClientes, precoVenda,
    atracao, expulsarRocket, entrarRocket, atualizarTaxa, aplicarOffline, pacotesDisponiveis, resgatarPacote,
} from "./tycoon-dados.js";

const TICK = 100;
// Pokémon que acompanham os treinadores (clientes)
const CLIENTES_SPRITES = [152, 155, 158, 172, 175, 179, 183, 194, 196, 197, 209, 216, 228, 231, 246, 16, 19, 21, 29, 32, 39, 43, 52, 54, 60, 69, 74, 79, 81, 84, 92, 100, 104, 108, 113, 116, 118, 120, 129, 132, 133, 137, 143, 147, 7, 4, 1, 25, 35, 37, 58, 63, 77, 86, 96, 102, 111, 114];
const ROCKET_SPRITE = 109; // Koffing, da Equipe Rocket
const HUMOR = { feliz: "💛", triste: "😞", bravo: "💢", caro: "💸", rocket: "💨" };

let app = null;
let aba = "loja";
let ativo = false;
let objetoAtual = null;
let mundo = novoMundo();
let modoConstruir = false;
let paleta = null; // tipo de móvel escolhido para construir
let selecionado = null; // "x,y" do móvel selecionado
let eventoAtual = null; // { tipo, ate }
let proximoEvento = 0;
let lucroMinuto = { inicio: Date.now(), valor: 0 };
let ultimoSalvo = Date.now();
let offlinePendente = null;
let ultimaVendaSom = 0;
// Vista do mapa: 3D (padrão) ou 2D, lembrada só neste navegador
let vista3d = true;
try {
    vista3d = localStorage.getItem("tycoon_vista") !== "2d";
} catch (e) { /* sem armazenamento */ }

const t = () => estado.tycoon;
const hoje = () => {
    const d = new Date();
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
};
const fmt = (n) => numero(Math.floor(n));
const tempoTexto = (s) => (s >= 3600 ? `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}min` : `${Math.floor(s / 60)} min`);

const salvarTycoon = () => {
    ultimoSalvo = Date.now();
    salvar(false);
};

const sincronizarObjeto = () => {
    if (estado.tycoon === objetoAtual) return;
    estado.tycoon = normalizarTycoon(estado.tycoon);
    objetoAtual = estado.tycoon;
    mundo = novoMundo();
    const r = aplicarOffline(t());
    if (r.ganho > 0) offlinePendente = r;
};

// Cartas expostas nas vitrines: { id: raridade } (só as que o jogador ainda tem)
const cartasExpostas = () => Object.fromEntries(t().moveis
    .filter((m) => m.tipo === "vitrine" && m.carta && CARTA_POR_ID[m.carta] && quantidade(m.carta))
    .map((m) => [m.carta, CARTA_POR_ID[m.carta].raridade]));

// ---------------- Loop ----------------
const tick = () => {
    sincronizarObjeto();
    const agora = Date.now();
    if (!ativo) {
        // Fora do modo: conta como tempo fora (paga quando voltar)
        if (agora - ultimoSalvo > 60000) salvarTycoon();
        return;
    }
    const dt = Math.min((agora - t().ultimoTick) / 1000, 1);
    t().ultimoTick = agora;
    if (eventoAtual && agora > eventoAtual.ate) eventoAtual = null;
    sortearEvento(agora);
    const acontecimentos = simular(t(), mundo, dt, { cartas: cartasExpostas(), evento: eventoAtual?.tipo });
    acontecimentos.forEach(reagir);
    // Lucro por minuto (para o rendimento com o jogo fechado)
    if (agora - lucroMinuto.inicio >= 60000) {
        atualizarTaxa(t(), mundo.acumulado);
        mundo.acumulado = 0;
        lucroMinuto.inicio = agora;
    }
    if (aba === "loja") desenharMundo();
    atualizarHud();
    if (offlinePendente) mostrarOffline();
    if (agora - ultimoSalvo > 15000) salvarTycoon();
};

export const iniciarTycoon = () => {
    sincronizarObjeto();
    setInterval(tick, TICK);
    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") salvarTycoon();
    });
};

export const definirModoTycoon = (ligado) => {
    document.body.classList.toggle("modo-tycoon", ligado);
    if (ligado && !ativo) {
        sincronizarObjeto();
        const r = aplicarOffline(t());
        if (r.ganho > 0) offlinePendente = r;
        t().ultimoTick = Date.now();
        lucroMinuto = { inicio: Date.now(), valor: 0 };
    }
    if (ativo && !ligado) salvarTycoon();
    ativo = ligado;
};

// ---------------- Eventos ----------------
const EVENTOS = {
    torneio: { nome: "Dia de torneio!", desc: "O dobro de clientes por 60 segundos", dur: 60000 },
    carvalho: { nome: "Visita do Professor Carvalho", desc: "Quem pagar nos próximos 20 segundos paga o triplo (é pesquisa!)", dur: 20000 },
    rocket: { nome: "Equipe Rocket na loja!", desc: "Clique no Koffing antes que ele roube uma prateleira", dur: 15000 },
};

const sortearEvento = (agora) => {
    if (!proximoEvento) proximoEvento = agora + 90000 + Math.random() * 120000;
    if (agora < proximoEvento || eventoAtual) return;
    proximoEvento = agora + 150000 + Math.random() * 150000;
    const tipo = ["torneio", "torneio", "carvalho", "rocket"][Math.floor(Math.random() * 4)];
    if (tipo === "rocket" && !entrarRocket(t(), mundo)) return;
    eventoAtual = { tipo, ate: agora + EVENTOS[tipo].dur };
    sons.raro(tipo === "rocket" ? 2 : 4);
    aviso(`${tipo === "rocket" ? "🚨" : "🎉"} <b>${EVENTOS[tipo].nome}</b> ${EVENTOS[tipo].desc}`, tipo === "rocket" ? "erro" : "sucesso");
};

// ---------------- Reações da tela ----------------
const reagir = (ev) => {
    if (ev.tipo === "venda") {
        flutuar(ev.cliente, `+₽${fmt(ev.valor)}${ev.gorjeta ? " 🪙" : ""}`, "venda");
        const agora = performance.now();
        if (agora - ultimaVendaSom > 120) {
            ultimaVendaSom = agora;
            sons.moeda();
        }
    } else if (ev.tipo === "sem-estoque") {
        flutuar(ev.cliente, "Acabou!", "ruim");
    } else if (ev.tipo === "desistiu") {
        flutuar(ev.cliente, "Fila demorada!", "ruim");
    } else if (ev.tipo === "caro") {
        flutuar(ev.cliente, "Muito caro...", "ruim");
    } else if (ev.tipo === "roubo") {
        sons.erro();
        aviso(`🚨 A Equipe Rocket roubou <b>${ev.qtd} ${PRODUTOS[ev.produto].nome}</b>!`, "erro");
        t().reputacao = Math.max(0, t().reputacao - 0.2);
    } else if (ev.tipo === "machamp") {
        flutuar({ x: ev.movel.x, y: ev.movel.y }, "💪 Reposto!", "equipe");
    }
};

const flutuar = (pos, texto, classe) => {
    const mapa = $("#ty-mapa", app);
    if (!mapa || aba !== "loja") return;
    const el = document.createElement("span");
    el.className = `ty-flutuante ${classe}`;
    el.textContent = texto;
    el.style.left = `calc(${pos.x + 0.5} * var(--tile))`;
    el.style.top = `calc(${pos.y} * var(--tile))`;
    mapa.appendChild(el);
    setTimeout(() => el.remove(), 1300);
};

// ---------------- HUD ----------------
export const atualizarHud = () => {
    if (!t()) return;
    const d = $("#hud-pokedolares");
    if (d) d.textContent = fmt(t().dinheiro);
    const r = $("#hud-reputacao");
    if (r) r.textContent = t().reputacao.toFixed(1);
    const b = $("#badge-cidades");
    if (b) {
        const n = pacotesDisponiveis(t(), hoje()) + (podeMudar(t()) ? 1 : 0);
        b.textContent = n;
        b.hidden = !n || aba === "cidades";
    }
    if (!app || aba !== "loja") return;
    const set = (sel, v) => $$(`[data-ty="${sel}"]`, app).forEach((el) => { el.textContent = v; });
    set("dinheiro", fmt(t().dinheiro));
    set("reputacao", "★".repeat(Math.round(t().reputacao)) + "☆".repeat(5 - Math.round(t().reputacao)));
    set("taxa", fmt(t().taxaMin || (mundo.acumulado * 60000) / Math.max(20000, Date.now() - lucroMinuto.inicio)));
    set("clientes", mundo.clientes.length);
    const banner = $("#ty-evento", app);
    if (banner) {
        const html = eventoAtual ? `<b>${EVENTOS[eventoAtual.tipo].nome}</b> ${EVENTOS[eventoAtual.tipo].desc} • ${Math.ceil((eventoAtual.ate - Date.now()) / 1000)}s` : "";
        if (banner.dataset.html !== html) {
            banner.innerHTML = html;
            banner.dataset.html = html;
            banner.hidden = !html;
            banner.className = `ty-evento ${eventoAtual?.tipo || ""}`;
        }
    }
};

// ---------------- Telas ----------------
export const telaTycoon = (elemento, arg) => {
    app = elemento;
    aba = ["equipe", "cidades"].includes(arg) ? arg : "loja";
    sincronizarObjeto();
    $$("#nav-tycoon [data-tela-tycoon]").forEach((a) => a.classList.toggle("ativo", a.dataset.telaTycoon === aba));
    if (aba === "equipe") telaEquipe();
    else if (aba === "cidades") telaCidades();
    else telaLoja();
    atualizarHud();
};
const redesenhar = () => telaTycoon(app, aba);

// ---------- Loja (o mapa) ----------
// Imagens pequenas dos produtos e móveis (painéis e paleta)
const icoProduto = (id) => `<img class="ty-ico" src="${IMAGEM_PRODUTO[id]}" alt="" draggable="false">`;
const icoMovel = (tipo) => `<img class="ty-ico" src="${ARTE_MOVEL[tipo]}" alt="" draggable="false">`;
const itensVisiveis = (m) => Math.ceil((m.estoque / estoqueMax(t())) * ITENS_NA_ESTANTE);

const htmlMovel = (m) => {
    const info = MOVEIS[m.tipo];
    const sel = selecionado === `${m.x},${m.y}` ? " selecionado" : "";
    let dentro = `<img class="ty-arte" src="${ARTE_MOVEL[m.tipo]}" alt="" draggable="false">`;
    if (m.tipo === "prateleira") {
        // Estante de madeira com o produto nas tábuas; os itens somem conforme o estoque acaba
        const pct = (m.estoque / estoqueMax(t())) * 100;
        const vis = itensVisiveis(m);
        const itens = Array.from({ length: ITENS_NA_ESTANTE }, (_, i) =>
            `<img src="${IMAGEM_PRODUTO[m.produto]}" alt="" draggable="false" style="visibility:${i < vis ? "visible" : "hidden"}">`).join("");
        dentro = `<span class="ty-estante">${itens}</span><i class="ty-estoque ${pct < 30 ? "baixo" : ""}"><b style="width:${pct}%"></b></i>`;
    } else if (m.tipo === "vitrine") {
        const c = m.carta && CARTA_POR_ID[m.carta];
        dentro = `<span class="ty-vidro">${c ? `<img src="${c.imagem}" alt="" draggable="false"><i class="ty-raridade">${RARIDADES[c.raridade].simbolo}</i>` : "<em>vazia</em>"}</span>`;
    } else if (m.tipo === "caixa" && nivelEquipe(t(), "chansey")) {
        dentro += `<img class="ty-funcionario" src="${imagemPixel(113)}" alt="Chansey" draggable="false">`;
    }
    return `<button class="ty-movel ty-${m.tipo}${sel}" data-tycoon="movel" data-x="${m.x}" data-y="${m.y}"
        style="grid-column:${m.x + 1};grid-row:${m.y + 1}" title="${info.nome}">${dentro}</button>`;
};

const htmlChao = () => {
    const { w, h } = tamanho(t());
    const p = porta(t());
    const partes = [];
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            if (movelEm(t(), x, y)) continue;
            const ehPorta = x === p.x && y === p.y;
            const pode = modoConstruir && paleta && !ehPorta && podeConstruir(t(), x, y);
            partes.push(`<button class="ty-chao ${ehPorta ? "porta" : ""} ${pode ? "pode" : ""}" data-tycoon="chao" data-x="${x}" data-y="${y}"
                style="grid-column:${x + 1};grid-row:${y + 1}" ${modoConstruir ? "" : "tabindex=-1"}>${ehPorta ? "🚪" : ""}</button>`);
        }
    }
    return partes.join("");
};

const telaLoja = () => {
    const { w, h } = tamanho(t());
    const cidade = CIDADES[t().cidade];
    app.innerHTML = `
    <section class="ty-jogo">
        <div class="clicker-cabeca">
            <a class="btn secundario pequeno" href="#inicio">← Voltar para as cartas</a>
            <span class="etiqueta">Pokémart Tycoon • ${cidade.nome}</span>
        </div>
        <div class="ty-placar">
            <div><small>Dinheiro</small><b>₽ <span data-ty="dinheiro">0</span></b></div>
            <div><small>Reputação</small><b class="ty-estrelas" data-ty="reputacao"></b></div>
            <div><small>Lucro por minuto</small><b>₽ <span data-ty="taxa">0</span></b></div>
            <div><small>Clientes na loja</small><b data-ty="clientes">0</b></div>
        </div>
        <div class="ty-evento" id="ty-evento" hidden></div>
        <div class="ty-grade">
            <div class="ty-mapa-caixa ${vista3d ? "tres-d" : ""}" style="--w:${w};--h:${h}">
                <button class="ty-vista" data-tycoon="vista" title="Trocar a vista do mapa">${vista3d ? "▦ Ver em 2D" : "🧊 Ver em 3D"}</button>
                <div class="ty-mapa ${modoConstruir ? "construindo" : ""}" id="ty-mapa">
                    <div class="ty-piso"></div>
                    <div class="ty-parede fundo"></div>
                    <div class="ty-parede esquerda"></div>
                    ${htmlChao()}
                    ${t().moveis.map(htmlMovel).join("")}
                    ${nivelEquipe(t(), "pikachu") ? `<div class="ty-mascote" style="left:calc(${porta(t()).x + 1} * var(--tile));top:calc(${porta(t()).y} * var(--tile))"><img src="${imagemPixel(25)}" alt="Pikachu"></div>` : ""}
                    <div class="ty-clientes" id="ty-clientes"></div>
                </div>
            </div>
            <aside class="ty-lado">
                <div class="ty-modos">
                    <button class="${modoConstruir ? "" : "ativo"}" data-tycoon="modo" data-modo="jogar">🛒 Gerenciar</button>
                    <button class="${modoConstruir ? "ativo" : ""}" data-tycoon="modo" data-modo="construir">🔨 Construir</button>
                </div>
                <div id="ty-painel">${modoConstruir ? htmlPaleta() : htmlGerenciar()}</div>
            </aside>
        </div>
    </section>`;
    desenharMundo(true);
};

// Clientes andando: reaproveita os elementos para a animação ficar suave
// Onde está o Pokémon de cada treinador (só visual: ele segue o dono "na coleira")
const companheiros = new Map();
const DISTANCIA_COMPANHEIRO = 0.65;

const desenharMundo = (forcar = false) => {
    const camada = $("#ty-clientes", app);
    if (!camada) return;
    const vivos = new Set();
    for (const c of mundo.clientes) {
        vivos.add(String(c.id));
        vivos.add(`p${c.id}`);
        let el = camada.querySelector(`[data-id="${c.id}"]`);
        let pk = camada.querySelector(`[data-id="p${c.id}"]`);
        if (!el) {
            // O treinador (humano) é quem compra; o Pokémon vem junto
            el = document.createElement("button");
            el.className = `ty-cliente humano${c.rocket ? " rocket" : ""}`;
            el.dataset.id = c.id;
            el.dataset.tycoon = c.rocket ? "rocket" : "cliente";
            el.innerHTML = `<span class="ty-pe"><span class="ty-humano" style="background-image:url('${spriteTreinador(c.sprite ?? c.id, { rocket: c.rocket })}')"></span><i class="ty-balao"></i></span>`;
            camada.appendChild(el);
            pk = document.createElement("span");
            pk.className = "ty-cliente companheiro";
            pk.dataset.id = `p${c.id}`;
            const pid = c.rocket ? ROCKET_SPRITE : CLIENTES_SPRITES[(c.sprite ?? c.id) % CLIENTES_SPRITES.length];
            pk.innerHTML = `<span class="ty-pe"><img src="${imagemPixel(pid)}" alt="" draggable="false"></span>`;
            camada.appendChild(pk);
            companheiros.set(c.id, { x: c.x, y: c.y + 0.4 });
        }
        el.style.transform = `translate(calc(${c.x} * var(--tile)), calc(${c.y} * var(--tile)))`;
        const balao = c.estado === "fila" ? "🛍️" : c.humor ? HUMOR[c.humor] : "";
        const b = el.querySelector(".ty-balao");
        if (b.textContent !== balao) b.textContent = balao;
        const andando = c.rota.length > 0;
        el.classList.toggle("andando", andando);
        // Pokémon: se o dono se afastou, chega perto de novo
        const cp = companheiros.get(c.id);
        const dx = c.x - cp.x;
        const dy = c.y - cp.y;
        const d = Math.hypot(dx, dy);
        if (d > DISTANCIA_COMPANHEIRO) {
            cp.x = c.x - (dx / d) * DISTANCIA_COMPANHEIRO;
            cp.y = c.y - (dy / d) * DISTANCIA_COMPANHEIRO;
        }
        pk.style.transform = `translate(calc(${cp.x + 0.2} * var(--tile)), calc(${cp.y + 0.12} * var(--tile)))`;
        pk.classList.toggle("andando", andando);
    }
    camada.querySelectorAll(".ty-cliente").forEach((el) => {
        if (vivos.has(el.dataset.id)) return;
        el.remove();
        companheiros.delete(Number(el.dataset.id));
    });
    // Barras de estoque das prateleiras
    for (const m of t().moveis) {
        if (m.tipo !== "prateleira") continue;
        const barra = $(`.ty-movel[data-x="${m.x}"][data-y="${m.y}"] .ty-estoque`, app);
        if (!barra) continue;
        const vis = itensVisiveis(m);
        barra.parentElement.querySelectorAll(".ty-estante img").forEach((img, i) => { img.style.visibility = i < vis ? "visible" : "hidden"; });
        const pct = (m.estoque / estoqueMax(t())) * 100;
        barra.firstElementChild.style.width = `${pct}%`;
        barra.classList.toggle("baixo", pct < 30);
    }
    if (forcar || Math.random() < 0.1) atualizarPainelSelecionado();
};

// ---------- Painel lateral ----------
const htmlGerenciar = () => {
    const m = selecionado && movelEm(t(), ...selecionado.split(",").map(Number));
    const prateleiras = t().moveis.filter((x) => x.tipo === "prateleira");
    const custoTudo = prateleiras.reduce((s, x) => s + custoRepor(t(), x), 0);
    return `
        <div class="ty-bloco">
            <button class="btn dourado" data-tycoon="repor-tudo" ${custoTudo ? "" : "disabled"}>📦 Repor tudo (₽ ${fmt(custoTudo)})</button>
            <p class="sutil pequeno">${nivelEquipe(t(), "machamp") ? "💪 O Machamp repõe sozinho as prateleiras quase vazias." : "Contrate o Machamp na aba Equipe para repor sozinho."}</p>
        </div>
        <div class="ty-bloco" id="ty-selecionado">${m ? htmlSelecionado(m) : `<p class="sutil">Clique numa prateleira, vitrine ou caixa do mapa para ver os detalhes.</p>`}</div>
        <div class="ty-bloco">
            <h3>Preços</h3>
            ${Object.entries(PRODUTOS).filter(([id]) => produtoLiberado(t(), id)).map(([id, p]) => `
                <div class="ty-preco">
                    <span>${icoProduto(id)} ${p.nome} <small>₽ ${precoVenda(t(), id)}</small></span>
                    <div class="ty-preco-opcoes">${Object.entries(PRECOS).map(([nivel, info]) => `
                        <button class="${(t().precos[id] || "normal") === nivel ? "ativo" : ""}" data-tycoon="preco" data-produto="${id}" data-nivel="${nivel}">${info.nome}</button>`).join("")}
                    </div>
                </div>`).join("")}
            <p class="sutil pequeno">Mais caro dá mais lucro, mas alguns clientes desistem ao ver o preço.</p>
        </div>
        <div class="ty-bloco ty-estatisticas">
            <span>Atendidos: <b>${fmt(t().atendidos)}</b></span>
            <span>Perdidos: <b>${fmt(t().perdidos)}</b></span>
            <span>Clientes/min: <b>${(taxaClientes(t(), cartasExpostas()) * 60).toFixed(1)}</b></span>
            <span>Atração: <b>+${Math.round(atracao(t(), cartasExpostas()) * 100)}%</b></span>
        </div>`;
};

const htmlSelecionado = (m) => {
    const info = MOVEIS[m.tipo];
    if (m.tipo === "prateleira") {
        const p = PRODUTOS[m.produto];
        return `
            <h3>${icoProduto(m.produto)} Prateleira de ${p.nome}</h3>
            <div class="barra grossa"><div style="width:${(m.estoque / estoqueMax(t())) * 100}%"></div></div>
            <p class="destaque-texto">Estoque: ${m.estoque}/${estoqueMax(t())} • custo ₽ ${p.custo} • vende por ₽ ${precoVenda(t(), m.produto)}</p>
            <button class="btn pequeno" data-tycoon="repor" ${custoRepor(t(), m) ? "" : "disabled"}>Repor (₽ ${fmt(custoRepor(t(), m))})</button>
            <h4>Produto</h4>
            <div class="ty-produtos">${Object.entries(PRODUTOS).map(([id, prod]) => `
                <button class="${m.produto === id ? "ativo" : ""}" data-tycoon="produto" data-produto="${id}" ${produtoLiberado(t(), id) ? "" : `disabled title="Libera em ${CIDADES[prod.cidade].nome}"`}>
                    ${icoProduto(id)}<small>${produtoLiberado(t(), id) ? prod.nome : "🔒"}</small>
                </button>`).join("")}</div>`;
    }
    if (m.tipo === "vitrine") {
        const c = m.carta && CARTA_POR_ID[m.carta];
        return `
            <h3>${icoMovel("vitrine")} Vitrine</h3>
            ${c ? `<div class="ty-vitrine-carta">${htmlCarta(c)}</div>
                <p class="sutil">${quantidade(c.id) ? `Atrai <b>+${Math.round(ATRACAO_RARIDADE[c.raridade] * 100)}%</b> de clientes.` : "Você não tem mais essa carta: a vitrine não atrai ninguém."}</p>`
                : `<p class="sutil">Vazia. Escolha uma carta do seu álbum para expor. Cartas mais raras atraem mais clientes.</p>`}
            <button class="btn pequeno" data-tycoon="escolher-carta">Escolher carta</button>`;
    }
    if (m.tipo === "caixa") {
        const fila = mundo.clientes.filter((c) => c.caixa === `${m.x},${m.y}` && c.estado === "fila").length;
        return `<h3>${icoMovel("caixa")} Caixa</h3><p>Na fila agora: <b>${fila}</b>${nivelEquipe(t(), "chansey") ? " • Chansey atendendo" : ""}</p>
            <p class="sutil">Fila grande faz clientes desistirem. Construa mais caixas ou contrate a Chansey.</p>`;
    }
    return `<h3>${icoMovel(m.tipo)} ${info.nome}</h3><p class="sutil">${info.desc}</p>`;
};

const atualizarPainelSelecionado = () => {
    const area = $("#ty-selecionado", app);
    if (!area || modoConstruir) return;
    const m = selecionado && movelEm(t(), ...selecionado.split(",").map(Number));
    if (m && m.tipo !== "vitrine") area.innerHTML = htmlSelecionado(m);
    const repTudo = $("[data-tycoon=repor-tudo]", app);
    if (repTudo) {
        const custo = t().moveis.reduce((s, x) => s + (x.tipo === "prateleira" ? custoRepor(t(), x) : 0), 0);
        repTudo.innerHTML = `📦 Repor tudo (₽ ${fmt(custo)})`;
        repTudo.disabled = !custo;
    }
};

const htmlPaleta = () => `
    <div class="ty-bloco">
        <h3>Construir</h3>
        <p class="sutil pequeno">Escolha um móvel e clique num espaço livre (verde). Clique num móvel para vender (volta metade do preço). Sempre deixe caminho até a porta 🚪.</p>
        <div class="ty-paleta">${Object.entries(MOVEIS).map(([id, m]) => `
            <button class="${paleta === id ? "ativo" : ""}" data-tycoon="paleta" data-tipo="${id}" ${t().dinheiro < m.custo ? "disabled" : ""}>
                <span>${icoMovel(id)}</span><b>${m.nome}</b><small>₽ ${fmt(m.custo)}</small><em>${m.desc}</em>
            </button>`).join("")}
        </div>
    </div>`;

// ---------- Equipe ----------
const telaEquipe = () => {
    app.innerHTML = `
    <section class="clicker">
        <h1>Equipe</h1>
        <p class="sutil">Contrate Pokémon para trabalhar na loja. Cada um sobe até o nível ${NIVEL_MAX}.</p>
        <p class="destaque-texto">Dinheiro: ₽ ${fmt(t().dinheiro)}</p>
        <div class="ty-equipe">
            ${EQUIPE.map((e) => {
                const n = nivelEquipe(t(), e.id);
                const custo = custoEquipe(e, n);
                return `<article class="ty-funcionario-card ${n ? "contratado" : ""}">
                    <img src="${imagemPixel(e.pid)}" alt="" draggable="false">
                    <div>
                        <b>${e.nome}</b> <small class="etiqueta">${e.papel}</small>
                        <p class="sutil">${e.desc}</p>
                        <div class="ty-niveis">${Array.from({ length: NIVEL_MAX }, (_, i) => `<i class="${i < n ? "cheio" : ""}"></i>`).join("")}</div>
                    </div>
                    ${n >= NIVEL_MAX ? `<span class="sutil">Nível máximo</span>`
                        : `<button class="btn ${t().dinheiro >= custo ? "dourado" : "desativado"}" data-tycoon="contratar" data-id="${e.id}" ${t().dinheiro >= custo ? "" : "disabled"}>
                            ${n ? "Treinar" : "Contratar"}<small>₽ ${fmt(custo)}</small></button>`}
                </article>`;
            }).join("")}
        </div>
    </section>`;
};

// ---------- Cidades ----------
const telaCidades = () => {
    const prox = CIDADES[t().cidade + 1];
    const disponiveis = pacotesDisponiveis(t(), hoje());
    const proximoPacote = LUCRO_POR_PACOTE - (t().lucroTotal % LUCRO_POR_PACOTE);
    app.innerHTML = `
    <section class="clicker">
        <h1>Cidades</h1>
        <p class="sutil">Mude a loja para uma cidade maior: mais espaço, mais clientes e clientes que gastam mais. Os móveis vão junto.</p>
        <p class="destaque-texto">Lucro total: ₽ ${fmt(t().lucroTotal)} • Dinheiro: ₽ ${fmt(t().dinheiro)}</p>
        <ol class="ty-cidades">
            ${CIDADES.map((c, i) => `
                <li class="${i < t().cidade ? "passada" : i === t().cidade ? "atual" : ""}">
                    <b>${c.nome}</b>
                    <small>${c.w}×${c.h} • clientes ×${c.clientes} • gastam ×${c.gasto}</small>
                    ${i === t().cidade + 1 ? `<small>Precisa de ₽ ${fmt(c.lucroMin)} de lucro total e custa ₽ ${fmt(c.custo)}</small>
                        <button class="btn ${podeMudar(t()) ? "dourado" : "desativado"}" data-tycoon="mudar" ${podeMudar(t()) ? "" : "disabled"}>Mudar para ${c.nome}</button>` : ""}
                    ${i === t().cidade ? `<span class="etiqueta">Você está aqui</span>` : ""}
                    ${Object.entries(PRODUTOS).filter(([, p]) => p.cidade === i).map(([id, p]) => `<small>Libera: ${icoProduto(id)} ${p.nome}</small>`).join("")}
                </li>`).join("")}
        </ol>
        ${prox ? "" : `<p class="destaque-texto">Você chegou em Saffron, a maior cidade de Kanto!</p>`}

        <section class="painel mercado aberto">
            <h2>Contrato com a Liga</h2>
            <p>A cada <b>₽ ${fmt(LUCRO_POR_PACOTE)}</b> de lucro, a Liga Pokémon te dá <b>1 pacote</b> do jogo de cartas (até ${PACOTES_POR_DIA} por dia).</p>
            <p class="destaque-texto">Próximo pacote em ₽ ${fmt(proximoPacote)} de lucro</p>
            <button class="btn grande dourado" data-tycoon="pacote" ${disponiveis ? "" : "disabled"}>
                ${disponiveis ? `Pegar pacote (${disponiveis} disponíve${disponiveis > 1 ? "is" : "l"})` : "Nenhum pacote para pegar agora"}
            </button>
        </section>
    </section>`;
};

// ---------- Escolher carta para a vitrine ----------
const escolherCarta = (m) => {
    const minhas = CARTAS.filter((c) => quantidade(c.id)).sort((a, b) => b.raridade - a.raridade || a.numero - b.numero);
    abrirModal(`
        <h3>Escolha uma carta para a vitrine</h3>
        <p class="sutil">A carta continua no seu álbum. Quanto mais rara, mais clientes ela atrai.</p>
        ${minhas.length ? `<div class="grade-cartas pequenas">${minhas.map((c) => `
            <button type="button" class="slot-carta" data-escolher-carta="${c.id}">${htmlCarta(c)}
                <small class="ty-atracao">+${Math.round(ATRACAO_RARIDADE[c.raridade] * 100)}%</small></button>`).join("")}</div>`
            : `<p class="vazio">Você ainda não tem cartas. Abra pacotes no jogo de cartas!</p>`}`, "largo");
    $$("[data-escolher-carta]").forEach((b) => b.addEventListener("click", () => {
        m.carta = b.dataset.escolherCarta;
        fecharModal();
        sons.raro(3);
        salvarTycoon();
        redesenhar();
    }));
};

const mostrarOffline = () => {
    const r = offlinePendente;
    offlinePendente = null;
    abrirModal(`
        <h3>Enquanto você estava fora...</h3>
        <p class="modal-texto">A loja ficou aberta por <b>${tempoTexto(r.segundos)}</b>${r.segundos >= OFFLINE_MAX_SEGUNDOS ? " (o máximo)" : ""} e lucrou:</p>
        <p class="clicker-offline">+₽ ${fmt(r.ganho)}</p>
        <p class="sutil">Sem você por perto a loja vende menos (40%) e só até acabar o estoque. Lembre de repor as prateleiras!</p>
        <div class="modal-botoes"><button class="btn" data-acao="fechar-modal">Legal!</button></div>`, "pequeno");
    sons.moeda();
};

// ---------------- Ações ----------------
const movelDoBotao = (el) => movelEm(t(), Number(el.dataset.x), Number(el.dataset.y));

const ACOES = {
    vista: () => {
        vista3d = !vista3d;
        try {
            localStorage.setItem("tycoon_vista", vista3d ? "3d" : "2d");
        } catch (e) { /* sem armazenamento */ }
        sons.clique();
        redesenhar();
    },
    modo: (el) => {
        modoConstruir = el.dataset.modo === "construir";
        paleta = null;
        redesenhar();
    },
    paleta: (el) => {
        paleta = paleta === el.dataset.tipo ? null : el.dataset.tipo;
        redesenhar();
    },
    chao: (el) => {
        if (!modoConstruir || !paleta) return;
        const x = Number(el.dataset.x);
        const y = Number(el.dataset.y);
        if (!construir(t(), x, y, paleta)) {
            sons.erro();
            return aviso(podeConstruir(t(), x, y) ? "Dinheiro insuficiente." : "Aí não dá: bloquearia o caminho dos clientes.", "erro");
        }
        sons.moeda();
        selecionado = `${x},${y}`;
        salvarTycoon();
        redesenhar();
    },
    movel: async (el) => {
        const m = movelDoBotao(el);
        if (!m) return;
        if (modoConstruir) {
            const ok = await confirmar(`Vender ${MOVEIS[m.tipo].nome}?`, `Você recebe ₽ ${fmt(MOVEIS[m.tipo].custo / 2)} de volta${m.estoque ? " (o estoque volta pelo preço de custo)" : ""}.`, "Vender");
            if (!ok) return;
            if (m.estoque) t().dinheiro += m.estoque * PRODUTOS[m.produto].custo;
            if (!remover(t(), m.x, m.y)) return aviso("A loja precisa de pelo menos um caixa.", "erro");
            sons.moeda();
            salvarTycoon();
            redesenhar();
            return;
        }
        selecionado = `${m.x},${m.y}`;
        sons.clique();
        if (m.tipo === "vitrine" && !m.carta) return escolherCarta(m);
        redesenhar();
    },
    repor: () => {
        const m = selecionado && movelEm(t(), ...selecionado.split(",").map(Number));
        if (!m || !repor(t(), m)) return sons.erro();
        sons.moeda();
        salvarTycoon();
        redesenhar();
    },
    "repor-tudo": () => {
        if (!reporTudo(t())) return sons.erro();
        sons.moeda();
        salvarTycoon();
        redesenhar();
    },
    produto: (el) => {
        const m = selecionado && movelEm(t(), ...selecionado.split(",").map(Number));
        if (!m || !trocarProduto(t(), m, el.dataset.produto)) return sons.erro();
        sons.clique();
        salvarTycoon();
        redesenhar();
    },
    preco: (el) => {
        t().precos[el.dataset.produto] = el.dataset.nivel;
        sons.clique();
        salvarTycoon();
        redesenhar();
    },
    "escolher-carta": () => {
        const m = selecionado && movelEm(t(), ...selecionado.split(",").map(Number));
        if (m) escolherCarta(m);
    },
    contratar: (el) => {
        if (!contratar(t(), el.dataset.id)) return sons.erro();
        sons.raro(4);
        aviso(`${EQUIPE.find((e) => e.id === el.dataset.id).nome} agora está no nível ${nivelEquipe(t(), el.dataset.id)}!`, "sucesso");
        salvarTycoon();
        redesenhar();
    },
    mudar: async () => {
        const prox = CIDADES[t().cidade + 1];
        if (!(await confirmar(`Mudar para ${prox.nome}?`, `Custa ₽ ${fmt(prox.custo)}. A loja fica ${prox.w}×${prox.h}, com mais clientes que gastam mais. Os móveis e a equipe vão junto.`, "Mudar"))) return;
        if (!mudarCidade(t())) return sons.erro();
        mundo = novoMundo();
        sons.raro(6);
        aviso(`🏙️ Bem-vindo a <b>${prox.nome}</b>!`, "sucesso");
        salvarTycoon();
        location.hash = "tycoon";
    },
    pacote: () => {
        if (!resgatarPacote(t(), hoje())) return sons.erro();
        estado.comprados++;
        sons.moeda();
        aviso("+1 pacote! Ele já está na tela de Pacotes.", "sucesso");
        salvar();
        redesenhar();
    },
    rocket: (el) => {
        if (!expulsarRocket(t(), mundo, Number(el.dataset.id))) return;
        sons.raro(5);
        eventoAtual = null;
        aviso("💥 Você expulsou a Equipe Rocket! Os clientes adoraram (+reputação).", "sucesso");
        el.remove();
    },
    cliente: () => {},
};

document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-tycoon]");
    if (!el || el.disabled) return;
    const fn = ACOES[el.dataset.tycoon];
    if (!fn) return;
    e.preventDefault();
    fn(el);
});

// Cartão na tela Início
export const htmlCartaoTycoon = () => {
    const ty = estado.tycoon || {};
    return `
    <section class="cartao-clicker cartao-tycoon">
        <img src="${imagemPixel(52)}" alt="" draggable="false">
        <div>
            <span class="etiqueta">Mini game</span>
            <h2>Pokémart Tycoon</h2>
            <p>Monte sua loja, contrate Pokémon, defina os preços e cresça de Pallet Town até Saffron. O lucro vira pacotes!</p>
            <p class="sutil">₽ ${fmt(ty.dinheiro || 0)} • ${CIDADES[ty.cidade || 0]?.nome || "Pallet Town"} • ★ ${(ty.reputacao ?? 2.5).toFixed(1)}</p>
        </div>
        <a class="btn grande" href="#tycoon">Jogar</a>
    </section>`;
};

