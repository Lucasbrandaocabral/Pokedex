// ====================================================
// Pokéclicker: telas do mini game de clicar
// (as regras e os números ficam em clicker-dados.js)
// ====================================================
import { estado, salvar } from "./state.js";
import { imagemPixel, imagemSprite } from "./cards.js";
import { $, $$, aviso, abrirModal, confirmar, sons } from "./ui.js";
import {
    AJUDANTES, MELHORIAS, ARVORE, MERCADO, NO_POR_ID, ENERGIA_PARA_EVOLUIR, PACOTE_CUSTO_PEDRAS, PACOTES_POR_DIA,
    OFFLINE_MAX_SEGUNDOS, DOURADA_DURACAO, MARCOS,
    normalizarClicker, aplicarOffline, avancar, clicar, energiaPorSegundo, energiaPorClique, custoAjudante, maximoCompravel,
    comprarAjudante, comprarMelhoria, producaoAjudante, quantos, podeEvoluir, pedrasDoReinicio, evoluir, tem, noDisponivel,
    comprarNo, arvoreCompleta, pacotesRestantesHoje, trocarPorPacote, douradaAtiva, formatarGrande as fmt,
} from "./clicker-dados.js";

const TICK = 250;
const SALVAR_JOGANDO = 15 * 1000;
const SALVAR_FORA = 60 * 1000;
const RAMOS = [["clique", "Clique"], ["ajudantes", "Ajudantes"], ["tempo", "Tempo"]];

let app = null;
let aba = "clicar";
let ativo = false; // o jogador está numa tela do clicker
let objetoAtual = null; // detecta quando o save inteiro foi trocado (ex.: veio da nuvem)
let offlinePendente = null;
let ultimoSalvo = Date.now();
let proximaDourada = 0;

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
        avancar(c(), agora);
    }
    atualizarHud();
    if (ativo) {
        atualizarNumeros();
        if (offlinePendente) mostrarOffline();
        talvezDourada(agora);
    }
    if (agora - ultimoSalvo > (ativo ? SALVAR_JOGANDO : SALVAR_FORA)) salvarClicker();
};

export const iniciarClicker = () => {
    sincronizarObjeto();
    setInterval(tick, TICK);
    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") salvarClicker();
    });
};

// Chamado pela navegação ao entrar/sair do modo clicker
export const definirModoClicker = (ligado) => {
    document.body.classList.toggle("modo-clicker", ligado);
    if (ativo && !ligado) salvarClicker();
    ativo = ligado;
    if (!ligado) $(".pokebola-dourada")?.remove();
};

// ---------------- HUD e números ----------------
export const atualizarHud = () => {
    if (!c()) return;
    const e = $("#hud-energia");
    if (e) e.textContent = fmt(Math.floor(c().energia));
    const p = $("#hud-pedras");
    if (p) p.textContent = fmt(c().pedras);
    const bAj = $("#badge-ajudantes");
    if (bAj) {
        const podem = AJUDANTES.filter((a) => custoAjudante(c(), a) <= c().energia).length;
        bAj.textContent = podem;
        bAj.hidden = !podem || aba === "ajudantes";
    }
    const bEv = $("#badge-evolucao");
    if (bEv) {
        const nos = [...ARVORE, MERCADO].filter((n) => noDisponivel(c(), n) && c().pedras >= n.custo).length + (podeEvoluir(c()) ? 1 : 0);
        bEv.textContent = nos;
        bEv.hidden = !nos || aba === "evolucao";
    }
};

const texto = (sel, valor) => $$(`[data-cl="${sel}"]`, app).forEach((el) => { el.textContent = valor; });

const atualizarNumeros = () => {
    if (!app || !document.body.contains(app)) return;
    const eps = energiaPorSegundo(c());
    texto("energia", fmt(Math.floor(c().energia)));
    texto("eps", fmt(eps));
    texto("clique", fmt(energiaPorClique(c())));
    texto("partida", fmt(Math.floor(c().totalPartida)));
    texto("pedras", fmt(c().pedras));
    texto("ganho-evoluir", fmt(pedrasDoReinicio(c())));
    const barra = $("[data-cl=barra-evoluir]", app);
    if (barra) barra.style.width = `${Math.min(100, (c().totalPartida / ENERGIA_PARA_EVOLUIR) * 100)}%`;
    const botaoEvoluir = $("[data-clicker=evoluir]", app);
    if (botaoEvoluir) botaoEvoluir.disabled = !podeEvoluir(c());
    $$("[data-custo]", app).forEach((b) => b.classList.toggle("sem-energia", Number(b.dataset.custo) > c().energia));
    $$("[data-maximo]", app).forEach((b) => {
        const n = maximoCompravel(c(), AJUDANTES.find((a) => a.id === b.dataset.maximo));
        b.querySelector("small").textContent = n ? `×${n}` : "—";
        b.classList.toggle("sem-energia", !n);
    });
    const dourada = $("[data-cl=dourada]", app);
    if (dourada) dourada.hidden = !douradaAtiva(c());
};

// ---------------- Telas ----------------
export const telaClicker = (elemento, arg) => {
    app = elemento;
    aba = ["ajudantes", "evolucao"].includes(arg) ? arg : "clicar";
    sincronizarObjeto();
    $$("#nav-clicker [data-tela-clicker]").forEach((a) => a.classList.toggle("ativo", a.dataset.telaClicker === aba));
    if (aba === "ajudantes") telaAjudantes();
    else if (aba === "evolucao") telaEvolucao();
    else telaClicar();
    atualizarNumeros();
    atualizarHud();
};

const redesenhar = () => telaClicker(app, aba);

const telaClicar = () => {
    app.innerHTML = `
    <section class="clicker">
        <div class="clicker-cabeca">
            <a class="btn secundario pequeno" href="#inicio">← Voltar para as cartas</a>
            <span class="etiqueta">Pokéclicker${c().reinicios ? ` • ${c().reinicios}ª evolução` : ""}</span>
        </div>
        <div class="clicker-palco" id="clicker-palco">
            <div class="clicker-placar">
                <b data-cl="energia">0</b>
                <span>energia</span>
                <small><b data-cl="eps">0</b> ⚡/s</small>
                <em class="clicker-dourada-ativa" data-cl="dourada" hidden>Pokébola Dourada: produção ×7!</em>
            </div>
            <button class="clicker-pikachu" id="botao-pikachu" aria-label="Clicar no Pikachu">
                <span class="clicker-aura"></span>
                <img src="${imagemPixel(25)}" alt="Pikachu" draggable="false">
            </button>
            <p class="clicker-por-clique">+<b data-cl="clique">1</b> ⚡ por clique</p>
        </div>

        <div class="grade-painel">
            <section class="painel">
                <h2>Evoluir</h2>
                <p class="sutil">Junte <b>${fmt(ENERGIA_PARA_EVOLUIR)}</b> de energia numa partida para evoluir. Você recomeça do zero, mas ganha <b>Pedras de Evolução</b> para a árvore de melhorias permanentes.</p>
                <div class="barra grossa"><div data-cl="barra-evoluir" style="width:0%"></div></div>
                <p class="destaque-texto"><span data-cl="partida">0</span> / ${fmt(ENERGIA_PARA_EVOLUIR)} nesta partida</p>
                <button class="btn grande dourado" data-clicker="evoluir" disabled>Evoluir (+<span data-cl="ganho-evoluir">0</span> <i class="ic-pedra"></i>)</button>
            </section>
            <section class="painel">
                <h2>Melhorias</h2>
                <ul class="lista-melhorias">
                    ${MELHORIAS.map((m) => {
                        const tenho = c().melhorias.includes(m.id);
                        return `<li class="${tenho ? "feita" : ""}">
                            <div><b>${m.nome}</b><small>${m.desc}</small></div>
                            ${tenho ? `<span class="sutil">Comprado</span>`
                                : `<button class="btn pequeno" data-clicker="melhoria" data-id="${m.id}" data-custo="${m.custo}">⚡ ${fmt(m.custo)}</button>`}
                        </li>`;
                    }).join("")}
                </ul>
            </section>
        </div>
    </section>`;

    const botao = $("#botao-pikachu");
    botao.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        const { valor, critico } = clicar(c());
        sons.clique();
        botao.classList.remove("apertado");
        void botao.offsetWidth;
        botao.classList.add("apertado");
        numeroFlutuante(e, `+${fmt(valor)}`, critico);
        atualizarNumeros();
        atualizarHud();
    });
    botao.addEventListener("keydown", (e) => {
        if (e.key !== "Enter" && e.key !== " ") return;
        e.preventDefault();
        clicar(c());
        atualizarNumeros();
    });
};

const numeroFlutuante = (e, textoNumero, critico) => {
    const palco = $("#clicker-palco");
    if (!palco) return;
    const r = palco.getBoundingClientRect();
    const el = document.createElement("span");
    el.className = `numero-flutuante ${critico ? "critico" : ""}`;
    el.textContent = critico ? `CRÍTICO ${textoNumero}` : textoNumero;
    el.style.left = `${(e.clientX || r.left + r.width / 2) - r.left + (Math.random() * 30 - 15)}px`;
    el.style.top = `${(e.clientY || r.top + r.height / 2) - r.top - 10}px`;
    palco.appendChild(el);
    setTimeout(() => el.remove(), 900);
};

const telaAjudantes = () => {
    // Um ajudante aparece quando você já tem o anterior ou está perto de poder comprar
    const revelado = (a, i) => quantos(c(), a.id) > 0 || i === 0 || quantos(c(), AJUDANTES[i - 1].id) > 0 || c().energia >= a.custo * 0.3;
    app.innerHTML = `
    <section class="clicker">
        <h1>Ajudantes</h1>
        <p class="sutil">Cada ajudante gera energia sozinho, até com o jogo fechado (por até ${OFFLINE_MAX_SEGUNDOS / 3600}h). A produção dele dobra ao ter ${MARCOS.join(", ")}.</p>
        <p class="destaque-texto">⚡ <span data-cl="energia">0</span> • <span data-cl="eps">0</span> ⚡/s</p>
        <ul class="lista-ajudantes">
            ${AJUDANTES.map((a, i) => {
                const n = quantos(c(), a.id);
                if (!revelado(a, i)) {
                    return `<li class="ajudante escondido"><img src="${imagemSprite(a.pid)}" alt=""><div><b>???</b><small>Junte mais energia para descobrir</small></div></li>`;
                }
                const proximoMarco = MARCOS.find((m) => m > n);
                const cada = producaoAjudante(c(), a) / Math.max(n, 1) || a.prod;
                return `<li class="ajudante">
                    <img src="${imagemSprite(a.pid)}" alt="">
                    <div>
                        <b>${a.nome} <span class="ajudante-qtd">×${n}</span></b>
                        <small>${fmt(cada)} ⚡/s cada • total ${fmt(producaoAjudante(c(), a))} ⚡/s${proximoMarco ? ` • dobra com ${proximoMarco}` : ""}</small>
                    </div>
                    <div class="ajudante-botoes">
                        <button class="btn pequeno" data-clicker="comprar" data-id="${a.id}" data-n="1" data-custo="${custoAjudante(c(), a)}">+1<small>⚡ ${fmt(custoAjudante(c(), a))}</small></button>
                        <button class="btn pequeno secundario" data-clicker="comprar" data-id="${a.id}" data-n="10" data-custo="${custoAjudante(c(), a, 10)}">+10<small>⚡ ${fmt(custoAjudante(c(), a, 10))}</small></button>
                        <button class="btn pequeno secundario" data-clicker="comprar" data-id="${a.id}" data-n="max" data-maximo="${a.id}">Máx<small>—</small></button>
                    </div>
                </li>`;
            }).join("")}
        </ul>
    </section>`;
};

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
        <p class="sutil">Você ganha Pedras de Evolução ao <b>evoluir</b> (reiniciar a partida). As melhorias da árvore são para sempre.</p>
        <p class="destaque-texto"><i class="ic-pedra"></i> <span data-cl="pedras">0</span> pedras • ${c().reinicios} evoluç${c().reinicios === 1 ? "ão" : "ões"} • ${c().arvore.length}/${ARVORE.length + 1} melhorias</p>

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

// ---------------- Pokébola Dourada ----------------
const talvezDourada = (agora) => {
    if (aba !== "clicar" || !tem(c(), "tempo3") || douradaAtiva(c(), agora) || $(".pokebola-dourada")) return;
    if (!proximaDourada) proximaDourada = agora + 60000 + Math.random() * 120000;
    if (agora < proximaDourada) return;
    proximaDourada = 0;
    const palco = $("#clicker-palco");
    if (!palco) return;
    const bola = document.createElement("button");
    bola.className = "pokebola-dourada";
    bola.setAttribute("aria-label", "Pokébola Dourada");
    bola.style.left = `${10 + Math.random() * 75}%`;
    bola.style.top = `${10 + Math.random() * 60}%`;
    bola.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        c().douradaAte = Date.now() + DOURADA_DURACAO;
        bola.remove();
        sons.raro(5);
        aviso("Pokébola Dourada! Produção <b>×7</b> por 30 segundos!", "sucesso");
        salvarClicker();
    });
    palco.appendChild(bola);
    setTimeout(() => bola.remove(), 12000);
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
        if (!comprarMelhoria(c(), el.dataset.id)) return sons.erro();
        sons.moeda();
        salvarClicker();
        redesenhar();
    },
    comprar: (el) => {
        const a = AJUDANTES.find((x) => x.id === el.dataset.id);
        const n = el.dataset.n === "max" ? maximoCompravel(c(), a) : Number(el.dataset.n);
        if (!n || !comprarAjudante(c(), a.id, n)) return sons.erro();
        sons.moeda();
        salvarClicker();
        redesenhar();
    },
    evoluir: async () => {
        const ganho = pedrasDoReinicio(c());
        if (!podeEvoluir(c())) return;
        const ok = await confirmar(
            "Evoluir?",
            `Você ganha <b>${ganho} Pedras de Evolução</b>. A energia, os ajudantes e as melhorias de clique voltam do zero. As melhorias da árvore ficam para sempre.`,
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
            <p>Clique no Pikachu, contrate ajudantes elétricos e evolua. Complete a árvore de evolução para trocar pedras por pacotes!</p>
            <p class="sutil">⚡ ${fmt(Math.floor(cl.energia || 0))} • <i class="ic-pedra"></i> ${fmt(cl.pedras || 0)} pedras${cl.reinicios ? ` • ${cl.reinicios} evoluç${cl.reinicios === 1 ? "ão" : "ões"}` : ""}</p>
        </div>
        <a class="btn grande" href="#clicker">Jogar</a>
    </section>`;
};
