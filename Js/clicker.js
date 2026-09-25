// ====================================================
// Pokéclicker: telas do mini game de clicar
// (as regras e os números ficam em clicker-dados.js)
// ====================================================
import { estado, salvar } from "./state.js";
import { imagemPixel, imagemSprite } from "./cards.js";
import { $, $$, aviso, abrirModal, confirmar, sons, escapar } from "./ui.js";
import {
    AJUDANTES, ARVORE, MERCADO, NO_POR_ID, MELHORIA_POR_ID, ITENS, RARIDADES_ITEM, CONQUISTAS, POKEBOLAS,
    PACOTE_CUSTO_PEDRAS, PACOTES_POR_DIA, OFFLINE_MAX_SEGUNDOS, MAX_COPIAS,
    normalizarClicker, aplicarOffline, avancar, clicar, energiaPorSegundo, energiaPorClique, custoAjudante, maximoCompravel,
    comprarAjudante, comprarMelhoria, melhoriasNaLoja, producaoAjudante, quantos, podeEvoluir, pedrasDoReinicio, evoluir,
    metaEvolucao, tem, noDisponivel, comprarNo, arvoreCompleta, pacotesRestantesHoje, trocarPorPacote, frenesiAtivo,
    cadeiaAtiva, sortearPokebola, pegarPokebola, intervaloPokebola, duracaoPokebola, verificarConquistas, bonusConquistas,
    abrirBau, cliquesPorBau, copias, noticiasDisponiveis, romano, multiplicador, formatarGrande as fmt,
} from "./clicker-dados.js";

const TICK = 250;
const SALVAR_JOGANDO = 15 * 1000;
const SALVAR_FORA = 60 * 1000;
const RAMOS = [["clique", "Clique"], ["ajudantes", "Ajudantes"], ["tempo", "Tempo"]];
const ICONE_TIPO = { clique: "⚡", global: "🔋", amizade: "❤️" };
const NOME_TIPO = { clique: "Melhoria de clique", global: "Melhoria de produção", amizade: "Melhoria de amizade", ajudante: "Melhoria de ajudante" };

let app = null;
let aba = "jogar";
let ativo = false; // o jogador está numa tela do clicker
let objetoAtual = null; // detecta quando o save inteiro foi trocado (ex.: veio da nuvem)
let offlinePendente = null;
let ultimoSalvo = Date.now();
let proximaBola = 0;
let qtdCompra = 1; // 1, 10, 100 ou "max"
let selecionada = null; // melhoria mostrada no quadro de detalhes
let assinaturaLoja = "";
let novidadesColecao = 0;
let contadorTicks = 0;
let proximaNoticia = 0;
let ultimoPonteiro = "mouse";

const c = () => estado.clicker;
const hoje = () => {
    const d = new Date();
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
};
const tempoTexto = (s) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return h ? `${h}h ${m}min` : `${m} min`;
};

const salvarClicker = () => {
    ultimoSalvo = Date.now();
    salvar(false);
};

// Garante que o save do clicker está completo e paga o tempo que o jogo ficou fechado
const sincronizarObjeto = () => {
    if (estado.clicker === objetoAtual) return;
    estado.clicker = normalizarClicker(estado.clicker);
    objetoAtual = estado.clicker;
    const r = aplicarOffline(c());
    if (r.ganho > 0) offlinePendente = r;
};

// ---------------- Loop ----------------
const tick = () => {
    sincronizarObjeto();
    const agora = Date.now();
    // Aba em segundo plano: o navegador segura o timer, então conta como tempo fora
    if (agora - c().ultimoTick > 60 * 1000) {
        const r = aplicarOffline(c(), agora);
        if (r.ganho > 0) offlinePendente = r;
    } else {
        const dt = avancar(c(), agora);
        if (ativo) c().tempoJogado += dt;
    }
    if (++contadorTicks % 4 === 0) checarConquistas();
    atualizarHud();
    if (ativo) {
        if (offlinePendente) mostrarOffline();
        if (aba === "jogar") {
            atualizarNumeros();
            talvezPokebola(agora);
            if (agora > proximaNoticia) trocarNoticia();
            if (contadorTicks % 4 === 0) conferirLoja();
        }
    }
    if (agora - ultimoSalvo > (ativo ? SALVAR_JOGANDO : SALVAR_FORA)) salvarClicker();
};

const checarConquistas = () => {
    const novas = verificarConquistas(c());
    if (!novas.length) return;
    novidadesColecao += novas.length;
    sons.raro(3);
    novas.slice(0, 3).forEach((q) => aviso(`🏆 Conquista: <b>${q.nome}</b> <small>(+produção)</small>`, "sucesso"));
    salvarClicker();
    if (ativo && aba === "colecao") redesenhar();
};

export const iniciarClicker = () => {
    sincronizarObjeto();
    setInterval(tick, TICK);
    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") salvarClicker();
    });
    document.addEventListener("pointerdown", (e) => { ultimoPonteiro = e.pointerType; }, true);
};

// Chamado pela navegação ao entrar/sair do modo clicker
export const definirModoClicker = (ligado) => {
    document.body.classList.toggle("modo-clicker", ligado);
    if (ativo && !ligado) salvarClicker();
    ativo = ligado;
    if (!ligado) $$(".pokebola-especial").forEach((b) => b.remove());
};

// ---------------- HUD e números ----------------
export const atualizarHud = () => {
    if (!c()) return;
    const e = $("#hud-energia");
    if (e) e.textContent = fmt(Math.floor(c().energia));
    const p = $("#hud-pedras");
    if (p) p.textContent = fmt(c().pedras);
    const bCol = $("#badge-colecao");
    if (bCol) {
        bCol.textContent = novidadesColecao;
        bCol.hidden = !novidadesColecao || aba === "colecao";
    }
    const bEv = $("#badge-evolucao");
    if (bEv) {
        const nos = [...ARVORE, MERCADO].filter((n) => noDisponivel(c(), n) && c().pedras >= n.custo).length + (podeEvoluir(c()) ? 1 : 0);
        bEv.textContent = nos;
        bEv.hidden = !nos || aba === "evolucao";
    }
};

const texto = (sel, valor) => $$(`[data-cl="${sel}"]`, app).forEach((el) => { el.textContent = valor; });
const qtdDoAjudante = (a) => (qtdCompra === "max" ? maximoCompravel(c(), a) : qtdCompra);

const atualizarNumeros = () => {
    if (!app || !document.body.contains(app)) return;
    const agora = Date.now();
    texto("energia", fmt(Math.floor(c().energia)));
    texto("eps", fmt(energiaPorSegundo(c(), agora)));
    texto("clique", fmt(energiaPorClique(c(), agora)));
    texto("partida", fmt(Math.floor(c().totalPartida)));
    texto("ganho-evoluir", fmt(pedrasDoReinicio(c())));
    const barra = $("[data-cl=barra-evoluir]", app);
    if (barra) barra.style.width = `${Math.min(100, (c().totalPartida / metaEvolucao(c())) * 100)}%`;
    const evoluirBtn = $("[data-clicker=evoluir]", app);
    if (evoluirBtn) evoluirBtn.disabled = !podeEvoluir(c());
    const porBau = cliquesPorBau(c());
    const barraBau = $("[data-cl=barra-bau]", app);
    if (barraBau) barraBau.style.width = `${Math.min(100, (c().bauProgresso / porBau) * 100)}%`;
    texto("bau-texto", `${Math.min(c().bauProgresso, porBau)}/${porBau}`);
    // Melhorias e ajudantes que dá para comprar
    $$(".cl-melhoria", app).forEach((b) => b.classList.toggle("pode", MELHORIA_POR_ID[b.dataset.id].custo <= c().energia));
    $$(".cl-ajudante[data-id]", app).forEach((b) => {
        const a = AJUDANTES.find((x) => x.id === b.dataset.id);
        const n = qtdDoAjudante(a);
        const custo = n ? custoAjudante(c(), a, n) : custoAjudante(c(), a);
        b.classList.toggle("pode", n > 0 && custo <= c().energia);
        $(".cl-ajudante-custo", b).textContent = `⚡ ${fmt(custo)}${qtdCompra === "max" ? ` (×${n})` : qtdCompra > 1 ? ` (×${qtdCompra})` : ""}`;
    });
    const detalheBtn = $("#cl-detalhe [data-clicker=melhoria]", app);
    if (detalheBtn) detalheBtn.disabled = MELHORIA_POR_ID[detalheBtn.dataset.id].custo > c().energia;
    // Efeitos ativos (pokébolas)
    const efeitos = [];
    if (frenesiAtivo(c(), agora)) efeitos.push(`<span class="cl-efeito frenesi">Frenesi ×7 • ${Math.ceil((c().douradaAte - agora) / 1000)}s</span>`);
    if (cadeiaAtiva(c(), agora)) efeitos.push(`<span class="cl-efeito cadeia">Choque em Cadeia ×777 • ${Math.ceil((c().cadeiaAte - agora) / 1000)}s</span>`);
    const areaEfeitos = $("[data-cl=efeitos]", app);
    if (areaEfeitos && areaEfeitos.dataset.html !== efeitos.join("")) {
        areaEfeitos.innerHTML = efeitos.join("");
        areaEfeitos.dataset.html = efeitos.join("");
    }
    $("#clicker-palco")?.classList.toggle("em-frenesi", frenesiAtivo(c(), agora) || cadeiaAtiva(c(), agora));
};

// Redesenha a loja quando aparece uma melhoria ou ajudante novo
const conferirLoja = () => {
    const assinatura = melhoriasNaLoja(c()).map((m) => m.id).join() + "|" + AJUDANTES.filter(revelado).length;
    if (assinatura !== assinaturaLoja) desenharLoja();
};

// ---------------- Telas ----------------
export const telaClicker = (elemento, arg) => {
    app = elemento;
    aba = ["colecao", "evolucao"].includes(arg) ? arg : "jogar";
    sincronizarObjeto();
    $$("#nav-clicker [data-tela-clicker]").forEach((a) => a.classList.toggle("ativo", a.dataset.telaClicker === aba));
    if (aba === "colecao") {
        novidadesColecao = 0;
        telaColecao();
    } else if (aba === "evolucao") {
        telaEvolucao();
    } else {
        telaJogar();
    }
    atualizarHud();
};

const redesenhar = () => telaClicker(app, aba);

// ---------- Jogar ----------
const telaJogar = () => {
    app.innerHTML = `
    <section class="cl-jogo">
        <div class="clicker-cabeca">
            <a class="btn secundario pequeno" href="#inicio">← Voltar para as cartas</a>
            <span class="etiqueta">Pokéclicker${c().reinicios ? ` • ${c().reinicios}ª evolução` : ""}</span>
        </div>
        <div class="cl-grade">
            <div class="cl-esquerda">
                <div class="clicker-palco" id="clicker-palco">
                    <div class="clicker-placar">
                        <b data-cl="energia">0</b>
                        <span>energia</span>
                        <small><b data-cl="eps">0</b> ⚡/s</small>
                    </div>
                    <div class="cl-efeitos" data-cl="efeitos"></div>
                    <button class="clicker-pikachu" id="botao-pikachu" aria-label="Clicar no Pikachu">
                        <span class="clicker-aura"></span>
                        <img src="${imagemPixel(25)}" alt="Pikachu" draggable="false">
                    </button>
                    <p class="clicker-por-clique">+<b data-cl="clique">1</b> ⚡ por clique</p>
                    <div class="cl-bau" title="A cada ${cliquesPorBau(c())} cliques você ganha um baú com um item">
                        <span class="cl-bau-icone">🎁</span>
                        <div class="barra"><div data-cl="barra-bau"></div></div>
                        <small data-cl="bau-texto">0/${cliquesPorBau(c())}</small>
                    </div>
                </div>
                <div class="painel cl-evoluir">
                    <div class="cl-evoluir-topo"><b>Evoluir</b><small><span data-cl="partida">0</span> / ${fmt(metaEvolucao(c()))}</small></div>
                    <div class="barra"><div data-cl="barra-evoluir" style="width:0%"></div></div>
                    <button class="btn dourado" data-clicker="evoluir" disabled>Evoluir (+<span data-cl="ganho-evoluir">0</span> <i class="ic-pedra"></i>)</button>
                </div>
            </div>

            <div class="cl-meio">
                <div class="cl-noticia"><span>📰</span><p data-cl="noticia"></p></div>
                <div class="cl-campo" id="cl-campo"></div>
            </div>

            <div class="cl-loja">
                <h2>Loja</h2>
                <div class="cl-melhorias" id="cl-melhorias"></div>
                <div class="cl-detalhe" id="cl-detalhe"></div>
                <div class="cl-quantidade">
                    <span>Comprar</span>
                    ${[1, 10, 100, "max"].map((q) => `<button class="${qtdCompra === q ? "ativo" : ""}" data-clicker="quantidade" data-q="${q}">${q === "max" ? "Máx" : `×${q}`}</button>`).join("")}
                </div>
                <div class="cl-ajudantes" id="cl-ajudantes"></div>
            </div>
        </div>
    </section>`;

    desenharLoja();
    desenharCampo();
    trocarNoticia();
    atualizarNumeros();

    const botao = $("#botao-pikachu");
    botao.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        clicarNoPikachu(e);
    });
    botao.addEventListener("keydown", (e) => {
        if (e.key !== "Enter" && e.key !== " ") return;
        e.preventDefault();
        const r = botao.getBoundingClientRect();
        clicarNoPikachu({ clientX: r.left + r.width / 2, clientY: r.top + r.height / 3 });
    });
};

const clicarNoPikachu = (e) => {
    const botao = $("#botao-pikachu");
    const { valor, critico, bau } = clicar(c());
    sons.clique();
    botao.classList.remove("apertado");
    void botao.offsetWidth;
    botao.classList.add("apertado");
    numeroFlutuante(e, `+${fmt(valor)}`, critico);
    faiscas(e);
    if (bau) soltarBau();
    atualizarNumeros();
    atualizarHud();
};

const posicaoNoPalco = (e) => {
    const palco = $("#clicker-palco");
    const r = palco.getBoundingClientRect();
    return { palco, x: (e.clientX ?? r.left + r.width / 2) - r.left, y: (e.clientY ?? r.top + r.height / 2) - r.top };
};

const numeroFlutuante = (e, textoNumero, critico) => {
    if (!$("#clicker-palco")) return;
    const { palco, x, y } = posicaoNoPalco(e);
    const el = document.createElement("span");
    el.className = `numero-flutuante ${critico ? "critico" : ""}`;
    el.textContent = critico ? `CRÍTICO ${textoNumero}` : textoNumero;
    el.style.left = `${x + (Math.random() * 30 - 15)}px`;
    el.style.top = `${y - 10}px`;
    palco.appendChild(el);
    setTimeout(() => el.remove(), 900);
};

// Faíscas saindo do ponto do clique
const faiscas = (e) => {
    if (!$("#clicker-palco")) return;
    const { palco, x, y } = posicaoNoPalco(e);
    for (let i = 0; i < 4; i++) {
        const f = document.createElement("i");
        f.className = "cl-faisca";
        const ang = Math.random() * Math.PI * 2;
        const dist = 40 + Math.random() * 40;
        f.style.left = `${x}px`;
        f.style.top = `${y}px`;
        f.style.setProperty("--dx", `${Math.cos(ang) * dist}px`);
        f.style.setProperty("--dy", `${Math.sin(ang) * dist}px`);
        palco.appendChild(f);
        setTimeout(() => f.remove(), 600);
    }
};

// Baú: abre na hora e mostra o item em cima do Pikachu
const soltarBau = () => {
    const { item, energia, repetido } = abrirBau(c());
    const r = RARIDADES_ITEM[item.raridade];
    const nivel = { comum: 2, raro: 3, epico: 5, lendario: 6 }[item.raridade];
    sons.raro(nivel);
    novidadesColecao++;
    const palco = $("#clicker-palco");
    if (palco) {
        $(".cl-drop", palco)?.remove();
        const el = document.createElement("div");
        el.className = `cl-drop r-${item.raridade}`;
        el.style.setProperty("--cor", r.cor);
        el.innerHTML = `
            <span class="cl-drop-icone">${item.icone}</span>
            <div><small>${r.nome}</small><b>${item.nome}</b>
            <em>${repetido ? `Já no máximo: virou energia extra` : `${copias(c(), item.id)}/${MAX_COPIAS} • ${item.desc}`} • +${fmt(energia)} ⚡</em></div>`;
        palco.appendChild(el);
        setTimeout(() => el.classList.add("saindo"), 2600);
        setTimeout(() => el.remove(), 3000);
    }
    if (item.raridade === "epico" || item.raridade === "lendario") aviso(`🎁 Item ${r.nome.toLowerCase()}: <b>${item.nome}</b>!`, "sucesso");
    salvarClicker();
};

// Um ajudante aparece quando você já tem o anterior ou está perto de poder comprar
const revelado = (a) => {
    const i = AJUDANTES.indexOf(a);
    return quantos(c(), a.id) > 0 || i === 0 || quantos(c(), AJUDANTES[i - 1].id) > 0 || c().energia >= a.custo * 0.3;
};

const iconeMelhoria = (m) => (m.tipo === "ajudante"
    ? `<img src="${imagemSprite(AJUDANTES.find((a) => a.id === m.ajudante).pid)}" alt=""><i class="cl-nivel">${romano(m.nivel)}</i>`
    : `<span>${ICONE_TIPO[m.tipo]}</span>`);

const desenharLoja = () => {
    const lista = melhoriasNaLoja(c());
    assinaturaLoja = lista.map((m) => m.id).join() + "|" + AJUDANTES.filter(revelado).length;
    const areaMelhorias = $("#cl-melhorias", app);
    if (!areaMelhorias) return;
    areaMelhorias.innerHTML = lista.length
        ? lista.map((m) => `<button class="cl-melhoria tipo-${m.tipo} ${selecionada === m.id ? "selecionada" : ""}" data-clicker="melhoria" data-id="${m.id}" aria-label="${m.nome}">${iconeMelhoria(m)}</button>`).join("")
        : `<p class="sutil pequeno">Nenhuma melhoria por enquanto. Continue juntando energia!</p>`;
    if (selecionada && !lista.some((m) => m.id === selecionada)) selecionada = null;
    mostrarDetalhe(selecionada);

    // Só o próximo ajudante misterioso aparece (como "???"); os outros ficam escondidos
    const proximoEscondido = AJUDANTES.find((a) => !revelado(a));
    $("#cl-ajudantes", app).innerHTML = AJUDANTES.map((a) => {
        if (!revelado(a)) {
            if (a !== proximoEscondido) return "";
            return `<div class="cl-ajudante escondido"><img src="${imagemSprite(a.pid)}" alt=""><div><b>???</b><small>Junte mais energia para descobrir</small></div></div>`;
        }
        const n = quantos(c(), a.id);
        const cada = (n ? producaoAjudante(c(), a) / n : a.prod) * multiplicador(c());
        return `<button class="cl-ajudante" data-clicker="comprar" data-id="${a.id}" title="${escapar(a.desc)}">
            <img src="${imagemSprite(a.pid)}" alt="">
            <div>
                <b>${a.nome}</b>
                <span class="cl-ajudante-custo">⚡ ${fmt(custoAjudante(c(), a))}</span>
                <small>${fmt(cada)} ⚡/s cada</small>
            </div>
            <span class="cl-ajudante-qtd">${n}</span>
        </button>`;
    }).join("");

    // Passar o mouse mostra o detalhe da melhoria
    $$(".cl-melhoria", app).forEach((b) => b.addEventListener("mouseenter", () => mostrarDetalhe(b.dataset.id)));
    areaMelhorias.addEventListener("mouseleave", () => mostrarDetalhe(selecionada));
    atualizarNumeros();
};

const mostrarDetalhe = (id) => {
    const area = $("#cl-detalhe", app);
    if (!area) return;
    const m = id && MELHORIA_POR_ID[id];
    if (!m) {
        area.innerHTML = `<p class="sutil">Passe o mouse ou toque numa melhoria para ver o que ela faz.</p>`;
        return;
    }
    area.innerHTML = `
        <div class="cl-detalhe-icone tipo-${m.tipo}">${iconeMelhoria(m)}</div>
        <div class="cl-detalhe-texto">
            <small>${NOME_TIPO[m.tipo]}</small>
            <b>${m.nome}</b>
            <span>${m.desc}</span>
        </div>
        <button class="btn pequeno dourado" data-clicker="melhoria" data-id="${m.id}" data-comprar="1" ${m.custo > c().energia ? "disabled" : ""}>⚡ ${fmt(m.custo)}</button>`;
};

const desenharCampo = () => {
    const campo = $("#cl-campo", app);
    if (!campo) return;
    const donos = AJUDANTES.filter((a) => quantos(c(), a.id) > 0);
    campo.innerHTML = donos.length
        ? donos.map((a) => {
            const n = quantos(c(), a.id);
            const mostrar = Math.min(n, 10);
            return `<div class="cl-linha" style="--cor:${a.cor}">
                <div class="cl-linha-info"><b>${a.nome}</b> <span>×${n}</span><small>${fmt(producaoAjudante(c(), a) * multiplicador(c()))} ⚡/s</small></div>
                <div class="cl-linha-sprites">
                    ${Array.from({ length: mostrar }, (_, i) => `<img src="${imagemPixel(a.pid)}" alt="" style="animation-delay:${(i * 0.37) % 1.6}s">`).join("")}
                    ${n > mostrar ? `<em>+${n - mostrar}</em>` : ""}
                </div>
            </div>`;
        }).join("")
        : `<div class="cl-campo-vazio"><p>Seus ajudantes aparecem aqui.</p><p class="sutil">Compre o primeiro Magnemite na loja!</p></div>`;
};

const trocarNoticia = () => {
    proximaNoticia = Date.now() + 10000;
    const el = $("[data-cl=noticia]", app);
    if (!el) return;
    const lista = noticiasDisponiveis(c());
    const n = lista[Math.floor(Math.random() * lista.length)];
    el.classList.remove("entrando");
    void el.offsetWidth;
    el.textContent = n.texto;
    el.classList.add("entrando");
};

// ---------- Pokébolas especiais (aparecem em qualquer lugar da tela) ----------
const talvezPokebola = (agora) => {
    if ($(".pokebola-especial")) return;
    const [min, max] = intervaloPokebola(c());
    if (!proximaBola) proximaBola = agora + min + Math.random() * (max - min);
    if (agora < proximaBola) return;
    proximaBola = 0;
    const bola = document.createElement("button");
    bola.className = "pokebola-especial";
    bola.setAttribute("aria-label", "Pokébola especial");
    bola.style.left = `${8 + Math.random() * 80}vw`;
    bola.style.top = `${18 + Math.random() * 60}vh`;
    bola.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        const tipo = sortearPokebola();
        const r = pegarPokebola(c(), tipo);
        bola.remove();
        sons.raro(6);
        aviso(`✨ <b>${r.titulo}</b> ${r.texto}`, "sucesso");
        const txt = document.createElement("span");
        txt.className = "pokebola-texto";
        txt.textContent = r.titulo;
        txt.style.left = bola.style.left;
        txt.style.top = bola.style.top;
        document.body.appendChild(txt);
        setTimeout(() => txt.remove(), 1500);
        salvarClicker();
        atualizarNumeros();
    });
    document.body.appendChild(bola);
    setTimeout(() => bola.remove(), duracaoPokebola(c()));
};

// ---------- Coleção: mochila, conquistas e estatísticas ----------
const telaColecao = () => {
    const bonus = bonusConquistas(c());
    const porConquista = c().conquistas.length ? bonus / c().conquistas.length : 0.01;
    app.innerHTML = `
    <section class="clicker">
        <h1>Coleção</h1>
        <section class="painel cl-painel">
            <h2>Mochila</h2>
            <p class="sutil">Itens que saem dos baús (1 baú a cada ${cliquesPorBau(c())} cliques no Pikachu). Eles <b>ficam para sempre</b>, até depois de evoluir. Cada cópia soma o bônus, até ${MAX_COPIAS} cópias.</p>
            <div class="cl-itens">
                ${Object.keys(RARIDADES_ITEM).map((r) => ITENS.filter((i) => i.raridade === r).map((i) => {
                    const n = copias(c(), i.id);
                    return n
                        ? `<div class="cl-item" style="--cor:${RARIDADES_ITEM[r].cor}">
                            <span class="cl-item-icone">${i.icone}</span>
                            <b>${i.nome}</b><small>${RARIDADES_ITEM[r].nome} • ${n}/${MAX_COPIAS}</small>
                            <em>${i.desc} cada</em>
                            <div class="barra"><div style="width:${(n / MAX_COPIAS) * 100}%"></div></div>
                        </div>`
                        : `<div class="cl-item bloqueado" style="--cor:${RARIDADES_ITEM[r].cor}"><span class="cl-item-icone">?</span><b>???</b><small>${RARIDADES_ITEM[r].nome}</small></div>`;
                }).join("")).join("")}
            </div>
        </section>

        <section class="painel cl-painel">
            <h2>Conquistas ${c().conquistas.length}/${CONQUISTAS.length}</h2>
            <p class="sutil">Cada conquista dá <b>+${Math.round(porConquista * 100)}%</b> de produção. Bônus atual: <b>+${Math.round(bonus * 100)}%</b>. As melhorias de amizade da loja aumentam esse bônus.</p>
            <div class="cl-conquistas">
                ${CONQUISTAS.map((q) => {
                    const feita = c().conquistas.includes(q.id);
                    return `<div class="cl-conquista ${feita ? "feita" : ""}" title="${escapar(q.desc)}">
                        <span>${feita ? "🏆" : "🔒"}</span><b>${feita ? q.nome : "???"}</b><small>${q.desc}</small>
                    </div>`;
                }).join("")}
            </div>
        </section>

        <section class="painel cl-painel">
            <h2>Estatísticas</h2>
            <dl class="estatisticas cl-stats">
                <div><dt>Energia nesta partida</dt><dd>${fmt(Math.floor(c().totalPartida))}</dd></div>
                <div><dt>Energia total</dt><dd>${fmt(Math.floor(c().totalGeral))}</dd></div>
                <div><dt>Recorde numa partida</dt><dd>${fmt(Math.floor(c().recorde))}</dd></div>
                <div><dt>Energia por segundo</dt><dd>${fmt(energiaPorSegundo(c()))}</dd></div>
                <div><dt>Cliques no Pikachu</dt><dd>${fmt(c().cliques)}</dd></div>
                <div><dt>Baús abertos</dt><dd>${fmt(c().baus)}</dd></div>
                <div><dt>Pokébolas especiais</dt><dd>${fmt(c().pokebolas)}</dd></div>
                <div><dt>Evoluções</dt><dd>${c().reinicios}</dd></div>
                <div><dt>Tempo jogando</dt><dd>${tempoTexto(c().tempoJogado)}</dd></div>
            </dl>
            <p class="sutil">Pokébolas especiais: ${Object.values(POKEBOLAS).map((p) => `<b>${p.nome}</b> (${p.desc.toLowerCase()})`).join(", ")}. Elas aparecem de vez em quando em qualquer lugar da tela. Fique de olho!</p>
        </section>
    </section>`;
};

// ---------- Evolução ----------
const htmlNo = (no) => {
    const comprado = tem(c(), no.id);
    const liberado = noDisponivel(c(), no);
    const classe = comprado ? "comprado" : !liberado ? "bloqueado" : c().pedras >= no.custo ? "disponivel" : "caro";
    return `<button class="no-arvore ${classe}" data-clicker="no" data-id="${no.id}" ${comprado || !liberado ? "disabled" : ""}>
        <b>${no.nome}</b>
        <small>${no.desc}</small>
        <span class="no-custo">${comprado ? "✓ Comprado" : `<i class="ic-pedra"></i> ${no.custo}`}</span>
    </button>`;
};

const telaEvolucao = () => {
    const mercadoAberto = tem(c(), "mercado");
    const restantes = pacotesRestantesHoje(c(), hoje());
    app.innerHTML = `
    <section class="clicker">
        <h1>Árvore de evolução</h1>
        <p class="sutil">Ao <b>evoluir</b>, a partida recomeça do zero e você ganha Pedras de Evolução. A meta da próxima evolução é <b>${fmt(metaEvolucao(c()))}</b> de energia (fica 8× maior a cada evolução). Na meta você ganha 10 pedras, e esperar mais rende mais. As melhorias da árvore, os itens e as conquistas ficam para sempre.</p>
        <p class="destaque-texto"><i class="ic-pedra"></i> ${fmt(c().pedras)} pedras • ${c().reinicios} evoluç${c().reinicios === 1 ? "ão" : "ões"} • ${c().arvore.length}/${ARVORE.length + 1} melhorias</p>

        <div class="arvore">
            ${RAMOS.map(([ramo, nome]) => `
                <div class="ramo-arvore">
                    <h3>${nome}</h3>
                    ${ARVORE.filter((n) => n.ramo === ramo).map(htmlNo).join('<i class="liga-arvore"></i>')}
                </div>`).join("")}
        </div>
        <div class="arvore-topo">
            <i class="liga-topo"></i>
            <h3>Topo</h3>
            <div class="topo-nos">${ARVORE.filter((n) => n.ramo === "topo").map(htmlNo).join("")}</div>
        </div>

        <section class="painel mercado ${mercadoAberto ? "aberto" : ""}">
            <h2>Mercado de Pacotes</h2>
            ${mercadoAberto ? `
                <p>Troque <b>${PACOTE_CUSTO_PEDRAS} pedras</b> por <b>1 pacote</b> do jogo de cartas. O pacote vai para "Comprados" e vale para qualquer expansão.</p>
                <p class="destaque-texto">Hoje: ${PACOTES_POR_DIA - restantes}/${PACOTES_POR_DIA} pacotes</p>
                <button class="btn grande dourado" data-clicker="pacote" ${restantes && c().pedras >= PACOTE_CUSTO_PEDRAS ? "" : "disabled"}>
                    ${restantes ? `Trocar ${PACOTE_CUSTO_PEDRAS} <i class="ic-pedra"></i> por 1 pacote` : "Limite de hoje atingido. Volte amanhã!"}
                </button>`
            : `
                <p>${arvoreCompleta(c()) ? "Sua árvore está completa! Compre o mercado para trocar pedras por pacotes." : `🔒 Complete a árvore inteira (${c().arvore.length}/${ARVORE.length}) para liberar a troca de pedras por pacotes do jogo de cartas.`}</p>
                <div class="topo-nos">${htmlNo(MERCADO)}</div>`}
        </section>
    </section>`;
};

const mostrarOffline = () => {
    const r = offlinePendente;
    offlinePendente = null;
    abrirModal(`
        <h3>Enquanto você estava fora...</h3>
        <p class="modal-texto">Seus ajudantes trabalharam por <b>${tempoTexto(r.segundos)}</b>${r.segundos >= OFFLINE_MAX_SEGUNDOS ? " (o máximo)" : ""} e juntaram:</p>
        <p class="clicker-offline">+${fmt(r.ganho)} ⚡</p>
        ${tem(c(), "tempo1") ? "" : `<p class="sutil">Com o jogo fechado os ajudantes rendem 50%. A melhoria <b>Soneca</b> da árvore aumenta para 100%.</p>`}
        <div class="modal-botoes"><button class="btn" data-acao="fechar-modal">Legal!</button></div>`, "pequeno");
    sons.moeda();
};

// ---------------- Ações ----------------
const ACOES = {
    melhoria: (el) => {
        const id = el.dataset.id;
        // No celular o primeiro toque mostra o que a melhoria faz; o segundo compra
        if (!el.dataset.comprar && ultimoPonteiro !== "mouse" && selecionada !== id) {
            selecionada = id;
            $$(".cl-melhoria", app).forEach((b) => b.classList.toggle("selecionada", b.dataset.id === id));
            mostrarDetalhe(id);
            return;
        }
        if (!comprarMelhoria(c(), id)) {
            selecionada = id;
            mostrarDetalhe(id);
            return sons.erro();
        }
        sons.moeda();
        aviso(`Melhoria comprada: <b>${MELHORIA_POR_ID[id].nome}</b>`, "sucesso");
        selecionada = null;
        salvarClicker();
        desenharLoja();
        desenharCampo();
    },
    comprar: (el) => {
        const a = AJUDANTES.find((x) => x.id === el.dataset.id);
        const n = qtdDoAjudante(a);
        if (!n || !comprarAjudante(c(), a.id, n)) return sons.erro();
        sons.moeda();
        salvarClicker();
        desenharLoja();
        desenharCampo();
    },
    quantidade: (el) => {
        qtdCompra = el.dataset.q === "max" ? "max" : Number(el.dataset.q);
        $$(".cl-quantidade button", app).forEach((b) => b.classList.toggle("ativo", b === el));
        atualizarNumeros();
    },
    evoluir: async () => {
        const ganho = pedrasDoReinicio(c());
        if (!podeEvoluir(c())) return;
        const ok = await confirmar(
            "Evoluir?",
            `Você ganha <b>${ganho} Pedras de Evolução</b>. A energia, os ajudantes e as melhorias da loja voltam do zero. A árvore, os itens da mochila e as conquistas ficam para sempre.`,
            "Evoluir",
        );
        if (!ok) return;
        evoluir(c());
        sons.raro(6);
        aviso(`Evolução completa! <b>+${ganho}</b> pedras`, "sucesso");
        salvarClicker();
        location.hash = "clicker/evolucao";
    },
    no: (el) => {
        const no = NO_POR_ID[el.dataset.id];
        if (!comprarNo(c(), no.id)) return sons.erro();
        sons.raro(4);
        aviso(`Melhoria desbloqueada: <b>${no.nome}</b>`, "sucesso");
        salvarClicker();
        redesenhar();
    },
    pacote: () => {
        if (!trocarPorPacote(c(), hoje())) return sons.erro();
        estado.comprados++;
        sons.moeda();
        aviso(`+1 pacote! Ele já está na tela de Pacotes.`, "sucesso");
        salvar(); // aqui notifica, para o HUD de pacotes atualizar
        redesenhar();
    },
};

document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-clicker]");
    if (!el || el.disabled) return;
    const fn = ACOES[el.dataset.clicker];
    if (!fn) return;
    e.preventDefault();
    fn(el);
});

// Cartão na tela Início
export const htmlCartaoClicker = () => {
    const cl = c() || {};
    return `
    <section class="cartao-clicker">
        <img src="${imagemPixel(25)}" alt="" draggable="false">
        <div>
            <span class="etiqueta">Mini game</span>
            <h2>Pokéclicker</h2>
            <p>Clique no Pikachu, abra baús com itens raros, contrate ajudantes elétricos e evolua. Complete a árvore de evolução para trocar pedras por pacotes!</p>
            <p class="sutil">⚡ ${fmt(Math.floor(cl.energia || 0))} • <i class="ic-pedra"></i> ${fmt(cl.pedras || 0)} pedras${cl.reinicios ? ` • ${cl.reinicios} evoluç${cl.reinicios === 1 ? "ão" : "ões"}` : ""}</p>
        </div>
        <a class="btn grande" href="#clicker">Jogar</a>
    </section>`;
};
