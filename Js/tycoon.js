// ====================================================
// Pokémart Tycoon: telas do modo de gerenciar a loja
// (as regras e a simulação ficam em tycoon-dados.js)
// ====================================================
import { estado, salvar, quantidade } from "./state.js";
import { spriteTreinador, aparenciaTreinador } from "./treinadores.js";
import { IMAGEM_PRODUTO, ARTE_MOVEL, ITENS_NA_ESTANTE } from "./moveis-arte.js";
import { imagemPixel, imagemSprite, CARTAS, CARTA_POR_ID, RARIDADES } from "./cards.js";
import { $, $$, aviso, abrirModal, fecharModal, confirmar, sons, htmlCarta, numero } from "./ui.js";
import {
    PRODUTOS, PRECOS, MOVEIS, EQUIPE, CIDADES, NIVEL_MAX, LUCRO_POR_PACOTE, PACOTES_POR_DIA, OFFLINE_MAX_SEGUNDOS, ATRACAO_RARIDADE,
    normalizarTycoon, novoMundo, simular, tamanho, porta, movelEm, podeConstruir, construir, remover, trocarProduto, repor, reporTudo,
    custoRepor, estoqueMax, produtoLiberado, contratar, custoEquipe, nivelEquipe, podeMudar, mudarCidade, taxaClientes, precoVenda,
    atracao, expulsarRocket, entrarRocket, atualizarTaxa, aplicarOffline, pacotesDisponiveis, resgatarPacote,
    ACABAMENTOS, podeMover, moverMovel, girarMovel, pintarMovel, movelMudou,
    vende, ehCaixa, nivelMovel, proximoNivel, melhorarMovel, valorMovel, bloqueioConstruir, custoUnit, procura,
    MELHORIAS_LOJA, temMelhoria, comprarMelhoria, QUALIDADE_MAX, qualidade, custoQualidade, melhorarQualidade,
    METAS, metaPronta, metasProntas, resgatarMeta, tempoCaixa, pacienciaFila,
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
let editando = null; // "x,y" do móvel sendo editado no modo Construir
let movendo = false; // escolhendo o lugar novo do móvel em edição
let modoEditar = false; // modo só para mexer nos objetos (pegar, soltar, girar, pintar)
let folhaAberta = false; // no celular, o painel é uma gaveta que sobe de baixo
const celular = () => window.matchMedia("(max-width: 1100px)").matches;
let eventoAtual = null; // { tipo, ate }
let proximoEvento = 0;
let lucroMinuto = { inicio: Date.now(), valor: 0 };
let ultimoSalvo = Date.now();
let offlinePendente = null;
let ultimaVendaSom = 0;
// Vista do mapa: 3D (padrão) ou 2D, lembrada só neste navegador
let vista3d = true;
let cena3d = null; // cena WebGL (carregada só quando a vista 3D é usada)
let modulo3d = null;
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
    const sorteio = temMelhoria(t(), "torneios") ? ["torneio", "torneio", "torneio", "carvalho", "rocket"] : ["torneio", "torneio", "carvalho", "rocket"];
    const tipo = sorteio[Math.floor(Math.random() * sorteio.length)];
    if (tipo === "rocket" && !entrarRocket(t(), mundo)) return;
    eventoAtual = { tipo, ate: agora + EVENTOS[tipo].dur * (tipo === "torneio" && temMelhoria(t(), "torneios") ? 2 : 1) };
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
    } else if (ev.tipo === "nao-tem") {
        flutuar(ev.cliente, `Não tem ${PRODUTOS[ev.produto].nome}?`, "ruim");
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
    if (vista3d && cena3d && $("#ty-mapa3d", app)) return cena3d.flutuar(pos, texto, classe);
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
    const bm = $("#badge-melhorias");
    if (bm) {
        const n = metasProntas(t());
        bm.textContent = n;
        bm.hidden = !n || aba === "melhorias";
    }
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
    aba = ["equipe", "cidades", "melhorias"].includes(arg) ? arg : "loja";
    sincronizarObjeto();
    $$("#nav-tycoon [data-tela-tycoon]").forEach((a) => a.classList.toggle("ativo", a.dataset.telaTycoon === aba));
    if (aba === "equipe") telaEquipe();
    else if (aba === "melhorias") telaMelhorias();
    else if (aba === "cidades") telaCidades();
    else telaLoja();
    atualizarHud();
};
// Na loja em 3D, redesenhar só troca o painel e atualiza a cena (sem recriar o mapa)
const redesenhar = () => {
    if (aba === "loja" && vista3d && cena3d && $("#ty-mapa3d", app)) return atualizarLoja();
    telaTycoon(app, aba);
};
const atualizarLoja = () => {
    const inferior = $("#ty-inferior", app);
    if (inferior) inferior.outerHTML = htmlInferior();
    const acoes = $(".ty-acoes", app);
    if (acoes) acoes.outerHTML = htmlAcoes();
    const dica = $(".ty-dica3d", app);
    if (dica) dica.textContent = textoDica3d();
    cena3d.montarLoja(dadosLoja3d());
    desenharMundo(true);
    atualizarHud();
};
const textoDica3d = () => (modoConstruir ? "Arraste o chão para girar a câmera" : "Arraste para girar e inclinar • rodinha para aproximar");

// Botões flutuantes que abrem o painel
const htmlAcoes = () => `<div class="ty-acoes">
                <button class="${folhaAberta && !modoConstruir ? "ativo" : ""}" data-tycoon="abrir-painel" data-modo="jogar">🛒 Gerenciar</button>
                <button class="${modoConstruir && !modoEditar ? "ativo" : ""}" data-tycoon="abrir-painel" data-modo="construir">🔨 Construir</button>
                <button class="${modoEditar ? "ativo" : ""}" data-tycoon="abrir-painel" data-modo="editar">✥ Editar</button>
                <button data-tycoon="vista" title="Trocar a vista do mapa">${vista3d ? "▦ 2D" : "🧊 3D"}</button>
            </div>`;
const htmlInferior = () => `<div id="ty-inferior">${modoConstruir ? htmlBarra() : htmlLado()}</div>`;
const htmlLado = () => `<aside class="ty-lado ${folhaAberta ? "aberta" : ""}">
                <button class="ty-folha-alca" data-tycoon="folha" aria-label="${folhaAberta ? "Fechar" : "Abrir"} o painel"><i></i></button>
                <button class="ty-fechar-painel" data-tycoon="folha" title="Fechar o painel">✕</button>
                <div class="ty-modos">
                    <button class="${modoConstruir ? "" : "ativo"}" data-tycoon="modo" data-modo="jogar">🛒 Gerenciar</button>
                    <button class="${modoConstruir && !modoEditar ? "ativo" : ""}" data-tycoon="modo" data-modo="construir">🔨 Construir</button>
                    <button class="${modoEditar ? "ativo" : ""}" data-tycoon="modo" data-modo="editar">✥ Editar</button>
                </div>
                <div id="ty-painel">${htmlGerenciar()}</div>
            </aside>`;

// ---------- Loja (o mapa) ----------
// Imagens pequenas dos produtos e móveis (painéis e paleta)
const icoProduto = (id) => `<img class="ty-ico" src="${IMAGEM_PRODUTO[id]}" alt="" draggable="false">`;
const icoMovel = (tipo) => `<img class="ty-ico" src="${ARTE_MOVEL[tipo]}" alt="" draggable="false">`;
const itensVisiveis = (m) => Math.ceil((m.estoque / estoqueMax(t(), m)) * ITENS_NA_ESTANTE);
const selo = (m) => (nivelMovel(m) > 1 ? `<i class="ty-nivel n${nivelMovel(m)}">${"★".repeat(nivelMovel(m) - 1)}</i>` : "");

const htmlMovel = (m) => {
    const info = MOVEIS[m.tipo];
    const sel = selecionado === `${m.x},${m.y}` ? " selecionado" : "";
    let dentro = `<img class="ty-arte" src="${ARTE_MOVEL[m.tipo]}" alt="" draggable="false">`;
    if (vende(m)) {
        // Estante (ou geladeira) com o produto nas tábuas; os itens somem conforme o estoque acaba
        const pct = (m.estoque / estoqueMax(t(), m)) * 100;
        const vis = itensVisiveis(m);
        const itens = Array.from({ length: ITENS_NA_ESTANTE }, (_, i) =>
            `<img src="${IMAGEM_PRODUTO[m.produto]}" alt="" draggable="false" style="visibility:${i < vis ? "visible" : "hidden"}">`).join("");
        // No 3D a estante é montada com peças (fundo, laterais, tábuas) e os itens ficam em pé nas tábuas
        const tabuas = [0, 1, 2].map((n) => `<span class="g-tabua" style="--n:${n}">${[0, 1, 2].map((k) => {
            const i = n * 3 + k;
            return `<img class="ty-item" src="${IMAGEM_PRODUTO[m.produto]}" alt="" draggable="false" style="--k:${k};visibility:${i < vis ? "visible" : "hidden"}">`;
        }).join("")}${n === 0 ? `<b class="g-preco">₽ ${precoVenda(t(), m.produto)}</b>` : ""}</span>`).join("");
        const gondola = `<span class="ty-gondola"><i class="g-fundo"></i><i class="g-lado e"></i><i class="g-lado d"></i>${tabuas}<i class="g-topo"></i></span>`;
        dentro = `<span class="ty-estante ${m.tipo === "geladeira" ? "fria" : ""}">${itens}<i class="ty-etiqueta">₽ ${precoVenda(t(), m.produto)}</i></span>${gondola}<i class="ty-estoque ${pct < 30 ? "baixo" : ""}"><b style="width:${pct}%"></b></i>`;
    } else if (m.tipo === "vitrine") {
        const c = m.carta && CARTA_POR_ID[m.carta];
        dentro = `<span class="ty-vidro">${c ? `<img src="${c.imagem}" alt="" draggable="false"><i class="ty-raridade">${RARIDADES[c.raridade].simbolo}</i>` : "<em>vazia</em>"}</span>`;
    } else if (m.tipo === "caixa") {
        // Caixa registradora (2D antigo) (corpo com teclado e gaveta + torre do visor)
        dentro += `<span class="ty-registradora"><i class="rg-corpo"></i><i class="rg-visor"></i></span>`;
        if (nivelEquipe(t(), "chansey")) dentro += `<img class="ty-funcionario" src="${imagemPixel(113)}" alt="Chansey" draggable="false">`;
    }
    const edit = editando === `${m.x},${m.y}` ? " editando" : "";
    const acab = m.acabamento ? `--acab:${ACABAMENTOS[m.acabamento].cor};` : "";
    return `<button class="ty-movel ty-${m.tipo}${sel}${edit} rot-${m.rot || 0}${m.acabamento ? " pintado" : ""}" data-tycoon="movel" data-x="${m.x}" data-y="${m.y}"
        style="grid-column:${m.x + 1};grid-row:${m.y + 1};${acab}" title="${info.nome}">${dentro}${selo(m)}</button>`;
};

// Move um móvel e avisa os clientes que iam até ele (e a seleção do painel)
const mover = (de, nx, ny) => {
    if (!moverMovel(t(), ...de.split(",").map(Number), nx, ny)) return false;
    const para = `${nx},${ny}`;
    movelMudou(t(), mundo, de, para);
    if (selecionado === de) selecionado = para;
    return true;
};

// No modo Construir: dá para pôr o móvel escolhido (ou levar o que está sendo movido) aqui?
const posEditando = () => editando && editando.split(",").map(Number);
const podeAqui = (x, y) => {
    if (movendo && editando) return podeMover(t(), ...posEditando(), x, y);
    return !!paleta && podeConstruir(t(), x, y);
};

const htmlChao = () => {
    const { w, h } = tamanho(t());
    const p = porta(t());
    const partes = [];
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            if (movelEm(t(), x, y)) continue;
            const ehPorta = x === p.x && y === p.y;
            const pode = modoConstruir && !ehPorta && podeAqui(x, y);
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
            ${vista3d ? `<div class="ty-mapa3d" id="ty-mapa3d" style="--w:${w};--h:${h}">
                <span class="ty-dica3d">${textoDica3d()}</span>
                <div class="ty-camera">
                    <button data-tycoon="cam" data-passo="-0.7" title="Girar para a esquerda">⟲</button>
                    <button data-tycoon="cam-centro" title="Voltar a câmera">⌂</button>
                    <button data-tycoon="cam" data-passo="0.7" title="Girar para a direita">⟳</button>
                </div>
                <span class="ty-carregando">Carregando a loja em 3D...</span>
            </div>` : `<div class="ty-mapa-caixa" style="--w:${w};--h:${h}">
                <div class="ty-mapa ${modoConstruir ? "construindo" : ""}" id="ty-mapa">
                    <div class="ty-piso"></div>
                    <div class="ty-rejunte"></div>
                    <div class="ty-luz"></div>
                    <div class="ty-parede fundo">
                        <span class="ty-poster p1"><b>PROMOÇÃO</b><img src="${imagemSprite(25)}" alt=""><small>Tudo pelo melhor preço!</small></span>
                        <span class="ty-poster p2"><b>NOVIDADES</b><img src="${imagemSprite(133)}" alt=""><small>Pacotes de cartas</small></span>
                        <span class="ty-relogio"><i></i><i></i></span>
                    </div>
                    <div class="ty-parede esquerda">
                        <span class="ty-janela j1"></span>
                        <span class="ty-janela j2"></span>
                    </div>
                    ${htmlChao()}
                    ${t().moveis.map(htmlMovel).join("")}
                    ${nivelEquipe(t(), "pikachu") ? `<div class="ty-mascote" style="left:calc(${porta(t()).x + 1} * var(--tile));top:calc(${porta(t()).y} * var(--tile))"><img src="${imagemPixel(25)}" alt="Pikachu"></div>` : ""}
                    <div class="ty-clientes" id="ty-clientes"></div>
                </div>
            </div>`}
            ${htmlAcoes()}
            ${htmlInferior()}

        </div>
    </section>`;
    if (vista3d) iniciar3d();
    desenharMundo(true);
};

// ---------- Vista 3D (WebGL) ----------
const dadosLoja3d = () => ({
    w: tamanho(t()).w,
    h: tamanho(t()).h,
    porta: porta(t()),
    pikachu: nivelEquipe(t(), "pikachu") > 0,
    moveis: t().moveis.map((m) => ({
        ...m,
        visiveis: vende(m) ? itensVisiveis(m) : 0,
        preco: vende(m) ? precoVenda(t(), m.produto) : 0,
        nivel: nivelMovel(m),
        carta: m.tipo === "vitrine" && m.carta && CARTA_POR_ID[m.carta] && quantidade(m.carta) ? CARTA_POR_ID[m.carta].imagem : null,
        chansey: m.tipo === "caixa" && nivelEquipe(t(), "chansey") > 0,
        selecionado: selecionado === `${m.x},${m.y}` || editando === `${m.x},${m.y}`,
        cor: m.acabamento ? ACABAMENTOS[m.acabamento].cor : null,
    })),
    // Espaços onde dá para construir (só com um móvel escolhido na paleta)
    livres: modoConstruir && (paleta || movendo) ? livresParaConstruir() : [],
    construir: modoConstruir,
    // Objeto "na mão" no modo Editar: ele segue o mouse por cima do chão
    carregando: modoEditar && movendo && editando ? editando : null,
});
const livresParaConstruir = () => {
    const { w, h } = tamanho(t());
    const lista = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (podeAqui(x, y)) lista.push([x, y]);
    return lista;
};

// Clique no 3D: chama as mesmas ações dos botões do 2D
// Usado nos testes automáticos para achar uma casa na tela
export const pontoNaTela3d = (x, y, altura) => cena3d?.pontoNaTela(x, y, altura);

const clique3d = (alvo) => {
    const el = { dataset: { x: String(alvo.x), y: String(alvo.y), id: String(alvo.id) }, disabled: false, remove() {} };
    if (alvo.tipo === "chao") ACOES.chao(el);
    else if (alvo.tipo === "movel") ACOES.movel(el);
    else if (alvo.tipo === "rocket") ACOES.rocket(el);
};

const iniciar3d = async () => {
    try {
        modulo3d ||= await import("./tycoon-3d.js");
        if (!modulo3d.temWebGL()) throw new Error("sem WebGL");
        const el = $("#ty-mapa3d", app);
        if (!el) return;
        cena3d ||= modulo3d.criarCena({
            aoClicar: clique3d,
            // Arrastar um móvel no modo Construir e soltar numa casa livre
            podeMover: (x, y, nx, ny) => podeMover(t(), x, y, nx, ny),
            aoMover: (x, y, nx, ny) => {
                if (!mover(`${x},${y}`, nx, ny)) return;
                sons.clique();
                editando = `${nx},${ny}`;
                modoEditar = true;
                movendo = false;
                salvarTycoon();
                redesenhar();
            },
        });
        cena3d.anexar(el);
        cena3d.limparClientes();
        cena3d.montarLoja(dadosLoja3d());
        el.classList.add("pronto");
        desenharMundo(true);
    } catch (e) {
        // Sem 3D neste aparelho: volta para a vista de cima
        vista3d = false;
        aviso("Seu navegador não conseguiu abrir o 3D. Mostrando a loja em 2D.", "erro");
        redesenhar();
    }
};

// Clientes andando: reaproveita os elementos para a animação ficar suave
// Onde está o Pokémon de cada treinador (só visual: ele segue o dono "na coleira")
const companheiros = new Map();
const DISTANCIA_COMPANHEIRO = 0.65;

const desenharMundo = (forcar = false) => {
    if (vista3d) {
        if (cena3d && $("#ty-mapa3d", app)) {
            cena3d.atualizarClientes(mundo.clientes.map((c) => ({
                id: c.id,
                x: c.x,
                y: c.y,
                rocket: !!c.rocket,
                andando: c.rota.length > 0,
                aparencia: aparenciaTreinador(c.sprite ?? c.id, { rocket: c.rocket }),
                pokemon: imagemSprite(c.rocket ? ROCKET_SPRITE : CLIENTES_SPRITES[(c.sprite ?? c.id) % CLIENTES_SPRITES.length]),
                balao: c.estado === "fila" ? "🛍️" : c.humor ? HUMOR[c.humor] : "",
            })));
            cena3d.atualizarEstoque(Object.fromEntries(t().moveis.filter(vende).map((m) => [`${m.x},${m.y}`, itensVisiveis(m)])));
        }
        if (forcar || Math.random() < 0.1) atualizarPainelSelecionado();
        return;
    }
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
        if (!vende(m)) continue;
        const barra = $(`.ty-movel[data-x="${m.x}"][data-y="${m.y}"] .ty-estoque`, app);
        if (!barra) continue;
        const vis = itensVisiveis(m);
        for (const sel of [".ty-estante img", ".ty-gondola .ty-item"]) {
            barra.parentElement.querySelectorAll(sel).forEach((img, i) => { img.style.visibility = i < vis ? "visible" : "hidden"; });
        }
        const pct = (m.estoque / estoqueMax(t(), m)) * 100;
        barra.firstElementChild.style.width = `${pct}%`;
        barra.classList.toggle("baixo", pct < 30);
    }
    if (forcar || Math.random() < 0.1) atualizarPainelSelecionado();
};

// ---------- Painel lateral ----------
const htmlGerenciar = () => {
    const m = selecionado && movelEm(t(), ...selecionado.split(",").map(Number));
    const custoTudo = t().moveis.filter(vende).reduce((s, x) => s + custoRepor(t(), x), 0);
    const aVenda = new Set(t().moveis.filter(vende).map((x) => x.produto));
    // Produtos que os clientes procuraram e a loja não vende (os mais pedidos primeiro)
    const faltam = Object.entries(t().procurados).filter(([id, n]) => n > 0 && PRODUTOS[id] && !aVenda.has(id)).sort((a, b) => b[1] - a[1]).slice(0, 4);
    return `
        <div class="ty-bloco">
            <button class="btn dourado" data-tycoon="repor-tudo" ${custoTudo ? "" : "disabled"}>📦 Repor tudo (₽ ${fmt(custoTudo)})</button>
            <p class="sutil pequeno">${nivelEquipe(t(), "machamp") ? "💪 O Machamp repõe sozinho as prateleiras quase vazias." : "Contrate o Machamp na aba Equipe para repor sozinho."}</p>
        </div>
        <div class="ty-bloco" id="ty-selecionado">${m ? htmlSelecionado(m) : `<p class="sutil">Clique numa estante, geladeira, vitrine ou caixa do mapa para ver os detalhes e melhorar.</p>`}</div>
        ${faltam.length ? `<div class="ty-bloco ty-procurados">
            <h3>🔎 Clientes procuraram</h3>
            <p class="sutil pequeno">Você não vende estes produtos. Coloque numa estante ou geladeira!</p>
            <ul>${faltam.map(([id, n]) => `<li>${icoProduto(id)} ${PRODUTOS[id].nome} <b>${n}×</b> <small>${PRODUTOS[id].cat === "bebida" ? "geladeira" : "estante"}</small></li>`).join("")}</ul>
        </div>` : ""}
        <div class="ty-bloco">
            <h3>Preços</h3>
            ${Object.entries(PRODUTOS).filter(([id]) => aVenda.has(id)).map(([id, p]) => `
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
            <span>Paciência na fila: <b>${Math.round(pacienciaFila(t()))}s</b></span>
            <span>Produtos à venda: <b>${aVenda.size}</b></span>
        </div>`;
};

const htmlSelecionado = (m) => {
    const info = MOVEIS[m.tipo];
    if (vende(m)) {
        const p = PRODUTOS[m.produto];
        return `
            <h3>${icoProduto(m.produto)} ${info.nome} de ${p.nome} ${selo(m)}</h3>
            <div class="barra grossa"><div style="width:${(m.estoque / estoqueMax(t(), m)) * 100}%"></div></div>
            <p class="destaque-texto">Estoque: ${m.estoque}/${estoqueMax(t(), m)} • custo ₽ ${fmt(custoUnit(t(), m.produto))} • vende por ₽ ${precoVenda(t(), m.produto)}${qualidade(t(), m.produto) ? ` • qualidade ${"★".repeat(qualidade(t(), m.produto))}` : ""}</p>
            <button class="btn pequeno" data-tycoon="repor" ${custoRepor(t(), m) ? "" : "disabled"}>Repor (₽ ${fmt(custoRepor(t(), m))})</button>
            ${htmlMelhoriaMovel(m)}
            <h4>Produto</h4>
            <div class="ty-produtos">${Object.entries(PRODUTOS).filter(([, prod]) => prod.cat === info.vende).map(([id, prod]) => `
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
            <button class="btn pequeno" data-tycoon="escolher-carta">Escolher carta</button>
            ${htmlMelhoriaMovel(m)}`;
    }
    if (ehCaixa(m)) {
        const fila = mundo.clientes.filter((c) => c.caixa === `${m.x},${m.y}` && c.estado === "fila").length;
        return `<h3>${icoMovel(m.tipo)} ${info.nome} ${selo(m)}</h3><p>Na fila agora: <b>${fila}</b>${nivelEquipe(t(), "chansey") ? " • Chansey atendendo" : ""} • ${tempoCaixa(t(), m).toFixed(1)}s por cliente</p>
            <p class="sutil">Fila grande faz clientes desistirem. Construa mais caixas, melhore este ou contrate a Chansey.</p>
            ${htmlMelhoriaMovel(m)}`;
    }
    return `<h3>${icoMovel(m.tipo)} ${info.nome} ${selo(m)}</h3><p class="sutil">${info.desc}</p>${htmlMelhoriaMovel(m)}`;
};

// Melhoria do móvel (nível 2 e 3)
const htmlMelhoriaMovel = (m) => {
    const niveis = MOVEIS[m.tipo].niveis;
    if (!niveis) return "";
    const prox = proximoNivel(m);
    return `<div class="ty-melhoria-movel">
        <h4>Melhorias deste móvel</h4>
        <ol>${niveis.map((n, i) => `<li class="${nivelMovel(m) >= i + 2 ? "feita" : ""}"><b>${"★".repeat(i + 1)} ${n.nome}</b><small>${n.desc}</small></li>`).join("")}</ol>
        ${prox ? `<button class="btn pequeno ${t().dinheiro >= prox.custo ? "dourado" : "desativado"}" data-tycoon="melhorar-movel" ${t().dinheiro >= prox.custo ? "" : "disabled"}>⬆ ${prox.nome} (₽ ${fmt(prox.custo)})</button>`
            : `<p class="sutil pequeno">Nível máximo!</p>`}
    </div>`;
};

const atualizarPainelSelecionado = () => {
    const area = $("#ty-selecionado", app);
    if (!area || modoConstruir) return;
    const m = selecionado && movelEm(t(), ...selecionado.split(",").map(Number));
    if (m && m.tipo !== "vitrine") area.innerHTML = htmlSelecionado(m);
    const repTudo = $("[data-tycoon=repor-tudo]", app);
    if (repTudo) {
        const custo = t().moveis.reduce((s, x) => s + (vende(x) ? custoRepor(t(), x) : 0), 0);
        repTudo.innerHTML = `📦 Repor tudo (₽ ${fmt(custo)})`;
        repTudo.disabled = !custo;
    }
};

// ---------- Barra de construir (embaixo do mapa) ----------
// Sem móvel escolhido: o catálogo de móveis. Com móvel escolhido: as ferramentas dele.
const htmlBarra = () => {
    const m = editando && movelEm(t(), ...posEditando());
    if (m) {
        const info = MOVEIS[m.tipo];
        const prox = proximoNivel(m);
        return `<div class="ty-barra ty-barra-edicao">
            <div class="tb-titulo">${icoMovel(m.tipo)}<div><b>${info.nome} ${selo(m)}</b><small>${movendo ? "Toque num quadrado verde para soltar" : "Toque no objeto de novo para pegar e mover"}</small></div></div>
            <div class="tb-grupo">
                <button class="tb-btn" data-tycoon="girar" title="Girar">↻<small>Girar</small></button>
                <button class="tb-btn ${movendo ? "ativo" : ""}" data-tycoon="mover" title="Mover">✥<small>Mover</small></button>
            </div>
            <div class="tb-cores">${Object.entries(ACABAMENTOS).map(([id, a]) => `
                <button class="${(m.acabamento || "madeira") === id ? "ativo" : ""}" data-tycoon="pintar" data-acabamento="${id}" title="${a.nome}" style="--cor:${a.cor}"></button>`).join("")}
            </div>
            <div class="tb-grupo">
                ${prox ? `<button class="tb-btn tb-melhorar" data-tycoon="melhorar-movel" ${t().dinheiro >= prox.custo ? "" : "disabled"} title="${prox.desc}">⬆<small>${prox.nome}<br>₽ ${fmt(prox.custo)}</small></button>` : ""}
                <button class="tb-btn tb-vender" data-tycoon="vender-movel">₽<small>Vender<br>+${fmt(valorMovel(m) / 2)}</small></button>
                <button class="tb-btn tb-pronto" data-tycoon="fechar-edicao">✓<small>Pronto</small></button>
            </div>
        </div>`;
    }
    if (modoEditar) {
        return `<div class="ty-barra ty-barra-dica">
            <span>✥ <b>Modo Editar</b> • toque num objeto para pegar, depois num quadrado verde para soltar. Também dá para arrastar.</span>
            <button class="tb-sair" data-tycoon="sair-construir">✕ Sair</button>
        </div>`;
    }
    return `<div class="ty-barra ty-barra-catalogo">
        <div class="tb-topo">
            ${paleta ? `<span class="tb-colocando">👉 Toque num quadrado <b>verde</b> para colocar: <b>${MOVEIS[paleta].nome}</b></span>
            <button class="tb-sair" data-tycoon="cancelar-acao">Cancelar</button>`
            : `<span>🔨 <b>Construir</b> • escolha um móvel e toque num quadrado verde • para mexer nos que já existem, use ✥ Editar</span>
            <button class="tb-sair" data-tycoon="sair-construir">✕ Sair</button>`}
        </div>
        <div class="tb-itens">${Object.entries(MOVEIS).map(([id, mv]) => {
            const bloqueio = bloqueioConstruir(t(), id);
            const trancado = (mv.cidade || 0) > t().cidade;
            return `<button class="tb-item ${paleta === id ? "ativo" : ""} ${trancado ? "trancado" : ""}" data-tycoon="paleta" data-tipo="${id}" ${bloqueio ? "disabled" : ""} title="${bloqueio || mv.desc}">
                ${icoMovel(id)}<b>${mv.nome}</b><small>${trancado ? "🔒 " + bloqueio.replace("Libera em ", "") : `₽ ${fmt(mv.custo)}`}</small>
            </button>`;
        }).join("")}</div>
    </div>`;
};

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

// ---------- Melhorias (qualidade dos produtos, melhorias da loja e metas) ----------
const telaMelhorias = () => {
    const tt = t();
    const metasVisiveis = METAS.filter((m) => !tt.metas.includes(m.id)).slice(0, 6);
    app.innerHTML = `
    <section class="clicker ty-melhorias">
        <h1>Melhorias</h1>
        <p class="destaque-texto">Dinheiro: ₽ ${fmt(tt.dinheiro)}</p>

        <h2>🏆 Metas</h2>
        <p class="sutil">Cumpra as metas para ganhar dinheiro extra. Feitas: ${tt.metas.length}/${METAS.length}</p>
        <div class="ty-metas">${metasVisiveis.map((m) => {
            const valor = Math.min(m.valor(tt), m.alvo);
            const pronta = metaPronta(tt, m);
            return `<article class="ty-meta ${pronta ? "pronta" : ""}">
                <b>${m.texto}</b>
                <div class="barra"><div style="width:${(valor / m.alvo) * 100}%"></div></div>
                <small>${fmt(valor)}/${fmt(m.alvo)} • prêmio ₽ ${fmt(m.premio)}</small>
                ${pronta ? `<button class="btn pequeno dourado" data-tycoon="meta" data-id="${m.id}">Resgatar</button>` : ""}
            </article>`;
        }).join("") || `<p class="sutil">Todas as metas cumpridas! 🎉</p>`}</div>

        <h2>⭐ Qualidade dos produtos</h2>
        <p class="sutil">Produtos de melhor qualidade custam igual para você, mas vendem mais caro (+10% por estrela), mais gente procura e mais gente aceita o preço.</p>
        <div class="ty-qualidades">${Object.entries(PRODUTOS).map(([id, p]) => {
            const q = qualidade(tt, id);
            const liberado = produtoLiberado(tt, id);
            const custo = custoQualidade(id, q);
            return `<article class="ty-qualidade ${liberado ? "" : "trancado"}">
                ${icoProduto(id)}
                <div><b>${p.nome}</b><span class="ty-estrelas">${"★".repeat(q)}${"☆".repeat(QUALIDADE_MAX - q)}</span>
                    <small>${liberado ? `vende por ₽ ${precoVenda(tt, id)} • procura ${Math.round(procura(tt, id))}` : `Libera em ${CIDADES[p.cidade].nome}`}</small></div>
                ${!liberado ? "<span>🔒</span>" : q >= QUALIDADE_MAX ? `<span class="sutil">Máximo</span>`
                    : `<button class="btn pequeno ${tt.dinheiro >= custo ? "dourado" : "desativado"}" data-tycoon="qualidade" data-produto="${id}" ${tt.dinheiro >= custo ? "" : "disabled"}>+★ ₽ ${fmt(custo)}</button>`}
            </article>`;
        }).join("")}</div>

        <h2>🏪 Melhorias da loja</h2>
        <p class="sutil">Compradas uma vez, valem para sempre (inclusive quando mudar de cidade).</p>
        <div class="ty-qualidades">${MELHORIAS_LOJA.map((m) => {
            const tem = temMelhoria(tt, m.id);
            const liberado = m.cidade <= tt.cidade;
            return `<article class="ty-qualidade ${tem ? "comprada" : ""} ${liberado ? "" : "trancado"}">
                <span class="ty-ico-melhoria">${tem ? "✅" : liberado ? "⬆" : "🔒"}</span>
                <div><b>${m.nome}</b><small>${m.desc}${liberado ? "" : ` • libera em ${CIDADES[m.cidade].nome}`}</small></div>
                ${tem ? `<span class="sutil">Comprada</span>` : liberado
                    ? `<button class="btn pequeno ${tt.dinheiro >= m.custo ? "dourado" : "desativado"}" data-tycoon="melhoria-loja" data-id="${m.id}" ${tt.dinheiro >= m.custo ? "" : "disabled"}>₽ ${fmt(m.custo)}</button>` : ""}
            </article>`;
        }).join("")}</div>
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
                    ${i > 0 ? `<span class="ty-libera">${[
                        ...Object.entries(PRODUTOS).filter(([, p]) => p.cidade === i).map(([id, p]) => `<small>${icoProduto(id)} ${p.nome}</small>`),
                        ...Object.entries(MOVEIS).filter(([, m]) => m.cidade === i).map(([id, m]) => `<small>${icoMovel(id)} ${m.nome}</small>`),
                        ...MELHORIAS_LOJA.filter((m) => m.cidade === i).map((m) => `<small>⬆ ${m.nome}</small>`),
                    ].join("")}</span>` : ""}
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
        modoConstruir = el.dataset.modo !== "jogar";
        modoEditar = el.dataset.modo === "editar";
        paleta = null;
        folhaAberta = true;
        editando = null;
        movendo = false;
        redesenhar();
    },
    paleta: (el) => {
        paleta = paleta === el.dataset.tipo ? null : el.dataset.tipo;
        modoEditar = false;
        editando = null;
        movendo = false;
        // Escolheu o móvel: a gaveta desce para mostrar o mapa
        folhaAberta = !paleta;
        redesenhar();
    },
    chao: (el) => {
        const x = Number(el.dataset.x);
        const y = Number(el.dataset.y);
        if (modoConstruir && movendo && editando) {
            if (!mover(editando, x, y)) {
                sons.erro();
                return aviso("Aí não dá: bloquearia o caminho dos clientes.", "erro");
            }
            sons.clique();
            editando = `${x},${y}`;
            movendo = false;
            salvarTycoon();
            return redesenhar();
        }
        if (!modoConstruir || !paleta) return;
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
            // Tocar num objeto: entra no modo Editar e "pega" o objeto (ele segue o mouse até tocar num verde).
            // Tocar de novo no mesmo objeto pega/solta de novo.
            const pos = `${m.x},${m.y}`;
            modoEditar = true;
            paleta = null;
            if (editando === pos) movendo = !movendo;
            else {
                editando = pos;
                movendo = true;
            }
            // No celular a gaveta desce para o mapa ficar livre; no PC o painel fica aberto ao lado
            folhaAberta = !!editando && !celular();
            paleta = null;
            sons.clique();
            redesenhar();
            return;
        }
        selecionado = `${m.x},${m.y}`;
        folhaAberta = true;
        sons.clique();
        if (m.tipo === "vitrine" && !m.carta) return escolherCarta(m);
        redesenhar();
    },
    folha: () => {
        folhaAberta = !folhaAberta;
        $(".ty-lado", app)?.classList.toggle("aberta", folhaAberta);
        const acoes = $(".ty-acoes", app);
        if (acoes) acoes.outerHTML = htmlAcoes();
    },
    "cancelar-acao": () => {
        paleta = null;
        movendo = false;
        editando = null;
        redesenhar();
    },
    "sair-construir": () => {
        modoConstruir = false;
        modoEditar = false;
        paleta = null;
        editando = null;
        movendo = false;
        folhaAberta = false;
        redesenhar();
    },
    "abrir-painel": (el) => {
        const modo = el.dataset.modo;
        paleta = null;
        editando = null;
        movendo = false;
        if (modo === "jogar") {
            folhaAberta = modoConstruir ? true : !folhaAberta;
            modoConstruir = false;
            modoEditar = false;
        } else {
            // Construir e Editar ligam/desligam a barra de baixo (o mapa fica livre)
            const jaEsta = modoConstruir && (modo === "editar") === modoEditar;
            modoConstruir = !jaEsta;
            modoEditar = !jaEsta && modo === "editar";
            folhaAberta = false;
        }
        redesenhar();
    },
    cam: (el) => cena3d?.girarCamera(Number(el.dataset.passo)),
    "cam-centro": () => cena3d?.centralizarCamera(),
    "fechar-edicao": () => {
        editando = null;
        movendo = false;
        redesenhar();
    },
    girar: () => {
        if (!editando || !girarMovel(t(), ...posEditando())) return;
        sons.clique();
        salvarTycoon();
        redesenhar();
    },
    mover: () => {
        if (!editando) return;
        movendo = !movendo;
        sons.clique();
        redesenhar();
    },
    pintar: (el) => {
        if (!editando || !pintarMovel(t(), ...posEditando(), el.dataset.acabamento)) return;
        sons.clique();
        salvarTycoon();
        redesenhar();
    },
    "vender-movel": async () => {
        const m = editando && movelEm(t(), ...posEditando());
        if (!m) return;
        const ok = await confirmar(`Vender ${MOVEIS[m.tipo].nome}?`, `Você recebe ₽ ${fmt(valorMovel(m) / 2)} de volta${m.estoque ? " (o estoque volta pelo preço de custo)" : ""}.`, "Vender");
        if (!ok) return;
        if (ehCaixa(m) && t().moveis.filter(ehCaixa).length === 1) return aviso("A loja precisa de pelo menos um caixa.", "erro");
        if (m.estoque) t().dinheiro += m.estoque * custoUnit(t(), m.produto);
        remover(t(), m.x, m.y);
        movelMudou(t(), mundo, `${m.x},${m.y}`, null);
        if (selecionado === `${m.x},${m.y}`) selecionado = null;
        editando = null;
        movendo = false;
        sons.moeda();
        salvarTycoon();
        redesenhar();
    },
    "melhorar-movel": () => {
        const pos = (modoConstruir && editando) || selecionado;
        const m = pos && movelEm(t(), ...pos.split(",").map(Number));
        if (!m || !melhorarMovel(t(), m.x, m.y)) return sons.erro();
        sons.raro(4);
        aviso(`⬆ ${MOVEIS[m.tipo].nome} agora é <b>${MOVEIS[m.tipo].niveis[nivelMovel(m) - 2].nome}</b>!`, "sucesso");
        salvarTycoon();
        redesenhar();
    },
    "qualidade": (el) => {
        if (!melhorarQualidade(t(), el.dataset.produto)) return sons.erro();
        sons.raro(3);
        salvarTycoon();
        redesenhar();
    },
    "melhoria-loja": (el) => {
        if (!comprarMelhoria(t(), el.dataset.id)) return sons.erro();
        sons.raro(5);
        aviso(`⬆ Melhoria comprada: <b>${MELHORIAS_LOJA.find((m) => m.id === el.dataset.id).nome}</b>`, "sucesso");
        salvarTycoon();
        redesenhar();
    },
    meta: (el) => {
        const meta = METAS.find((m) => m.id === el.dataset.id);
        if (!resgatarMeta(t(), el.dataset.id)) return sons.erro();
        sons.moeda();
        aviso(`🏆 Meta cumprida! +₽ ${fmt(meta.premio)}`, "sucesso");
        salvarTycoon();
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

