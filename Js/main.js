// ====================================================
// Pokédex Pocket: telas e interações do jogo
// ====================================================
import {
    CARTAS, CARTA_POR_ID, PACOTES, RARIDADES, TIPOS, TOTAL_CARTAS,
    cartasDoPacote, imagemSprite, nomeBonito, POKEMON_POR_ID,
} from "./cards.js";
import {
    estado, salvar, aoMudar, resetar, quantidade, cartasUnicas,
    sincronizarGratis, sincronizarDiario, tempoProximoGratis, pacotesDisponiveis,
    PACOTES_GRATIS_MAX, INTERVALO_GRATIS, PONTOS_POR_PACOTE, BONUS_DIARIO, MISSOES, CONQUISTAS,
    resgatarMissao, resgatarBonusDiario, resgatarConquista,
    venderCarta, listarRepetidas, venderRepetidas, resgatarComPontos, comprar, alternarFavorito,
} from "./state.js";
import { abrirPacotes, CHANCES, CHANCE_GOD_PACK } from "./packs.js";
import { sincronizarTrocas, tempoProximaRodada, verificarOferta, aceitarOferta, INTERVALO_TROCAS } from "./trades.js";
import {
    icone, $, $$, escapar, numero, formatarTempo, htmlCarta, htmlVerso, htmlPacote,
    ativarTilt, aviso, abrirModal, fecharModal, confirmar, sons,
} from "./ui.js";

const app = $("#app");
let telaAtual = "inicio";
let pacoteSelecionado = "charizard";
const filtrosAlbum = { busca: "", pacote: "", raridade: "", mostrar: "todas" };
// Cartas novas mostradas com o selo "NOVA" enquanto o jogador está no álbum
let novasVisita = {};

const LOJA = [
    { id: "p1", nome: "Pacote avulso", pacotes: 1, preco: 100, desc: "Um pacote para abrir quando quiser." },
    { id: "p5", nome: "Kit 5 pacotes", pacotes: 5, preco: 450, desc: "10% de desconto." },
    { id: "p10", nome: "Kit 10 pacotes", pacotes: 10, preco: 850, desc: "15% de desconto." },
    { id: "p25", nome: "Caixa com 25 pacotes", pacotes: 25, preco: 2000, desc: "20% de desconto. A melhor oferta!", destaque: true },
];

// ====================================================
// Cabeçalho e navegação
// ====================================================
const atualizarCabecalho = () => {
    $("#hud-moedas").textContent = numero(estado.moedas);
    $("#hud-pontos").textContent = numero(estado.pontos);
    $("#hud-pacotes").textContent = pacotesDisponiveis();
    const tempo = tempoProximoGratis();
    $("#hud-gratis").textContent =
        estado.gratis.qtd >= PACOTES_GRATIS_MAX ? "cheio" : `+1 em ${formatarTempo(tempo)}`;
    $("#btn-som").innerHTML = icone(estado.som ? "som" : "mudo");
    const novas = Object.keys(estado.novas).length;
    const badge = $("#badge-album");
    badge.textContent = novas;
    badge.hidden = !novas;
    const avisosInicio = Math.max(0, recompensasProntas() - estado.missoesVistas);
    const badgeInicio = $("#badge-inicio");
    badgeInicio.textContent = avisosInicio;
    badgeInicio.hidden = !avisosInicio;
};

// Quantas recompensas (bônus diário + missões) estão prontas para resgatar
const recompensasProntas = () =>
    MISSOES.filter((m) =>
        !estado.diario.resgatadas.includes(m.id) && (estado.diario.progresso[m.campo] || 0) >= m.meta
    ).length + (estado.diario.bonus ? 0 : 1);

// Limpa as notificações da barra de baixo ao abrir a tela correspondente
const limparNotificacoes = (tela) => {
    if (tela === "album" && Object.keys(estado.novas).length) {
        Object.assign(novasVisita, estado.novas);
        estado.novas = {};
        salvar(false);
    }
    if (tela === "inicio" && estado.missoesVistas !== recompensasProntas()) {
        estado.missoesVistas = recompensasProntas();
        salvar(false);
    }
};

const TELAS = {
    inicio: () => telaInicio(),
    pacotes: () => telaPacotes(),
    album: () => telaAlbum(),
    trocas: () => telaTrocas(),
    loja: () => telaLoja(),
    pokedex: (arg) => telaPokedex(arg),
};

const navegar = () => {
    const [tela, arg] = location.hash.replace("#", "").split("/");
    const anterior = telaAtual;
    telaAtual = TELAS[tela] ? tela : "inicio";
    if (anterior === "album" && telaAtual !== "album") novasVisita = {};
    limparNotificacoes(telaAtual);
    atualizarCabecalho();
    $$(".nav-item").forEach((a) => a.classList.toggle("ativo", a.dataset.tela === telaAtual));
    TELAS[telaAtual](arg && decodeURIComponent(arg));
    ativarTilt(app);
    window.scrollTo({ top: 0 });
};

const renderizar = () => {
    limparNotificacoes(telaAtual);
    TELAS[telaAtual]();
    ativarTilt(app);
};

// ====================================================
// Tela: Início
// ====================================================
const barra = (valor, max, classe = "") =>
    `<div class="barra ${classe}"><div style="width:${Math.min(100, (valor / max) * 100)}%"></div></div>`;

const telaInicio = () => {
    sincronizarDiario();
    const unicas = cartasUnicas();
    const tempo = tempoProximoGratis();
    app.innerHTML = `
    <section class="hero">
        <div>
            <span class="etiqueta">Coleção 1</span>
            <h1>Origem Genética</h1>
            <p>${unicas} de ${TOTAL_CARTAS} cartas encontradas. Abra pacotes, troque com outros treinadores e complete o álbum.</p>
            <a class="btn grande" href="#pacotes">Abrir pacote (${pacotesDisponiveis()})</a>
        </div>
        <div class="hero-pacotes">
            ${Object.keys(PACOTES).map((p) => htmlPacote(p, "mini")).join("")}
        </div>
    </section>

    <div class="grade-painel">
        <section class="painel">
            <h2>Pacotes grátis</h2>
            <p class="sutil">Você ganha <b>${PACOTES_GRATIS_MAX} pacotes por dia</b>: 1 a cada ${formatarTempo(INTERVALO_GRATIS)}. Acumula até ${PACOTES_GRATIS_MAX}.</p>
            <div class="ampulheta">
                ${Array.from({ length: PACOTES_GRATIS_MAX }, (_, i) => `
                    <div class="ampulheta-slot ${i < estado.gratis.qtd ? "cheio" : ""}">
                        ${i === estado.gratis.qtd ? `<div class="enchendo" style="height:${(1 - tempo / INTERVALO_GRATIS) * 100}%"></div>` : ""}
                    </div>`).join("")}
            </div>
            <p class="destaque-texto">${estado.gratis.qtd}/${PACOTES_GRATIS_MAX} disponíveis
                ${estado.gratis.qtd < PACOTES_GRATIS_MAX ? `• próximo em <span data-relogio="gratis">${formatarTempo(tempo)}</span>` : ""}</p>
            <button class="btn ${estado.diario.bonus ? "desativado" : "dourado"}" data-acao="bonus" ${estado.diario.bonus ? "disabled" : ""}>
                ${estado.diario.bonus ? "Bônus de hoje já resgatado" : `Resgatar bônus diário +${BONUS_DIARIO} <i class="ic-moeda"></i>`}
            </button>
        </section>

        <section class="painel">
            <h2>Missões diárias</h2>
            <ul class="lista-missoes">
                ${MISSOES.map((m) => {
                    const prog = Math.min(estado.diario.progresso[m.campo] || 0, m.meta);
                    const feita = estado.diario.resgatadas.includes(m.id);
                    const pronta = prog >= m.meta && !feita;
                    return `
                    <li class="${feita ? "feita" : ""}">
                        <div>
                            <span>${m.texto}</span>
                            ${barra(prog, m.meta)}
                            <small>${prog}/${m.meta} • <i class="ic-moeda"></i> ${m.premio}</small>
                        </div>
                        <button class="btn pequeno ${pronta ? "dourado" : "desativado"}" data-acao="missao" data-id="${m.id}" ${pronta ? "" : "disabled"}>
                            ${feita ? "Feito" : "Resgatar"}
                        </button>
                    </li>`;
                }).join("")}
            </ul>
        </section>

        <section class="painel">
            <h2>Coleção</h2>
            <p class="destaque-texto">${unicas}/${TOTAL_CARTAS} cartas</p>
            ${barra(unicas, TOTAL_CARTAS, "grossa")}
            ${Object.values(PACOTES).map((p) => {
                const cartas = cartasDoPacote(p.id);
                const tenho = cartas.filter((c) => quantidade(c.id)).length;
                return `<div class="linha-progresso"><span>${p.nome}</span>${barra(tenho, cartas.length)}<small>${tenho}/${cartas.length}</small></div>`;
            }).join("")}
            <h3>Conquistas</h3>
            <ul class="lista-missoes">
                ${CONQUISTAS.map((c) => {
                    const feita = estado.conquistas.includes(c.id);
                    const pronta = unicas >= c.meta && !feita;
                    return `
                    <li class="${feita ? "feita" : ""}">
                        <div><span>Colete ${c.meta} cartas diferentes</span><small><i class="ic-moeda"></i> ${numero(c.premio)}</small></div>
                        <button class="btn pequeno ${pronta ? "dourado" : "desativado"}" data-acao="conquista" data-id="${c.id}" ${pronta ? "" : "disabled"}>
                            ${feita ? "Feito" : "Resgatar"}
                        </button>
                    </li>`;
                }).join("")}
            </ul>
        </section>

        <section class="painel">
            <h2>Estatísticas</h2>
            <dl class="estatisticas">
                <div><dt>Pacotes abertos</dt><dd>${numero(estado.stats.pacotes)}</dd></div>
                <div><dt>Trocas feitas</dt><dd>${numero(estado.stats.trocas)}</dd></div>
                <div><dt>Cartas vendidas</dt><dd>${numero(estado.stats.vendidas)}</dd></div>
                <div><dt>God packs</dt><dd>${numero(estado.stats.godPacks)}</dd></div>
                <div><dt>Cartas no total</dt><dd>${numero(Object.values(estado.colecao).reduce((s, q) => s + q, 0))}</dd></div>
                <div><dt>Pontos de pacote</dt><dd>${numero(estado.pontos)}</dd></div>
            </dl>
            <button class="btn perigo pequeno" data-acao="resetar">Apagar progresso</button>
        </section>
    </div>`;
};

// ====================================================
// Tela: Pacotes
// ====================================================
const telaPacotes = () => {
    const disponiveis = pacotesDisponiveis();
    const cartas = cartasDoPacote(pacoteSelecionado);
    const tenho = cartas.filter((c) => quantidade(c.id)).length;
    const destaques = cartas.filter((c) => c.raridade >= 4).sort((a, b) => b.raridade - a.raridade).slice(0, 6);
    app.innerHTML = `
    <section class="tela-pacotes">
        <h1>Escolha um pacote</h1>
        <div class="seletor-pacotes">
            ${Object.keys(PACOTES).map((p) =>
                `<button class="opcao-pacote ${p === pacoteSelecionado ? "selecionado" : ""}" data-acao="selecionar-pacote" data-id="${p}">
                    ${htmlPacote(p)}
                </button>`).join("")}
        </div>
        <p class="destaque-texto">Pacote <b>${PACOTES[pacoteSelecionado].nome}</b> • ${tenho}/${cartas.length} cartas coletadas</p>
        <div class="saldo-pacotes">
            <span>Grátis: <b>${estado.gratis.qtd}/${PACOTES_GRATIS_MAX}</b></span>
            <span>Comprados: <b>${estado.comprados}</b></span>
            ${estado.gratis.qtd < PACOTES_GRATIS_MAX ? `<span>Próximo grátis: <b data-relogio="gratis">${formatarTempo(tempoProximoGratis())}</b></span>` : ""}
        </div>
        ${disponiveis ? `
        <div class="botoes-abrir">
            <button class="btn grande" data-acao="abrir" data-qtd="1">Abrir 1 pacote</button>
            ${disponiveis >= 2 ? `<button class="btn grande secundario" data-acao="abrir" data-qtd="${Math.min(10, disponiveis)}">Abrir ${Math.min(10, disponiveis)} de uma vez</button>` : ""}
            ${disponiveis > 10 ? `<button class="btn grande secundario" data-acao="abrir" data-qtd="${Math.min(25, disponiveis)}">Abrir ${Math.min(25, disponiveis)}</button>` : ""}
        </div>` : `
        <div class="sem-pacotes">
            <p>Você não tem pacotes agora.</p>
            <p>O próximo pacote grátis chega em <b data-relogio="gratis">${formatarTempo(tempoProximoGratis())}</b>.</p>
            <a class="btn dourado" href="#loja">Comprar na loja</a>
        </div>`}

        <h2>Destaques deste pacote</h2>
        <div class="grade-cartas pequenas">
            ${destaques.map((c) => quantidade(c.id)
                ? `<button class="slot-carta" data-acao="ver-carta" data-id="${c.id}">${htmlCarta(c)}</button>`
                : `<div class="slot-carta faltando"><img src="${c.imagem}" alt="" loading="lazy"><span>${RARIDADES[c.raridade].simbolo}</span></div>`
            ).join("")}
        </div>

        <details class="painel chances">
            <summary>Chances de cada raridade</summary>
            <p>As 3 primeiras cartas são sempre ◆. A 4ª e a 5ª podem ser raras. Chance de <b>God Pack</b> (5 cartas ☆ ou melhores): ${CHANCE_GOD_PACK}%.</p>
            <table>
                <thead><tr><th>Raridade</th><th>4ª carta</th><th>5ª carta</th><th>Venda</th></tr></thead>
                <tbody>
                ${Object.entries(RARIDADES).slice(1).map(([r, info]) =>
                    `<tr><td>${info.simbolo} ${info.nome}</td><td>${CHANCES[4][r]}%</td><td>${CHANCES[5][r]}%</td><td><i class="ic-moeda"></i> ${info.venda}</td></tr>`).join("")}
                </tbody>
            </table>
            <p>Cada pacote aberto dá <b>${PONTOS_POR_PACOTE} pontos de pacote</b>, que podem ser trocados por qualquer carta no álbum.</p>
        </details>
    </section>`;
};

// ---------------- Abertura de pacote (animação) ----------------
const overlay = $("#abertura");

const fecharAbertura = () => {
    overlay.className = "abertura";
    overlay.innerHTML = "";
    document.body.classList.remove("travado");
    renderizar();
};

const abrir = (qtd) => {
    const abertos = abrirPacotes(pacoteSelecionado, qtd);
    if (!abertos.length) {
        sons.erro();
        aviso("Você não tem pacotes! Compre na loja ou espere o próximo grátis.", "erro");
        return;
    }
    // Pré-carrega as imagens para a revelação não aparecer vazia
    abertos.forEach((p) => p.cartas.forEach(({ carta }) => { new Image().src = carta.imagem; }));
    document.body.classList.add("travado");
    if (abertos.length === 1) animarPacote(abertos[0]);
    else mostrarResumoMultiplo(abertos);
};

const animarPacote = (pacote) => {
    overlay.className = "abertura aberta";
    overlay.innerHTML = `
        <div class="abertura-palco">
            ${pacote.god ? `<div class="god-banner">GOD PACK</div>` : ""}
            <p class="dica">Arraste sobre a linha pontilhada para abrir o pacote</p>
            <div class="pacote-abrir">
                ${htmlPacote(pacoteSelecionado, "grande")}
                <div class="linha-corte"><div class="progresso-corte"></div></div>
            </div>
            <button class="btn secundario pequeno" data-abertura="cortar">Toque para abrir</button>
        </div>`;
    const alvo = $(".pacote-abrir", overlay);
    const progresso = $(".progresso-corte", overlay);
    let inicioX = null;
    let aberto = false;
    const cortar = () => {
        if (aberto) return;
        aberto = true;
        sons.rasgar();
        alvo.classList.add("cortado");
        setTimeout(() => mostrarCartas(pacote), 750);
    };
    alvo.addEventListener("pointerdown", (e) => {
        inicioX = e.clientX;
        alvo.setPointerCapture(e.pointerId);
    });
    alvo.addEventListener("pointermove", (e) => {
        if (inicioX === null) return;
        const largura = alvo.getBoundingClientRect().width;
        const p = Math.min(1, Math.abs(e.clientX - inicioX) / (largura * 0.7));
        progresso.style.width = `${p * 100}%`;
        if (p >= 1) cortar();
    });
    alvo.addEventListener("pointerup", () => {
        inicioX = null;
        if (!aberto) progresso.style.width = "0";
    });
    $("[data-abertura=cortar]", overlay).addEventListener("click", cortar);
};

const mostrarCartas = (pacote) => {
    let indice = 0;
    const total = pacote.cartas.length;
    overlay.innerHTML = `
        <div class="abertura-palco">
            ${pacote.god ? `<div class="god-banner">GOD PACK</div>` : ""}
            <p class="contador-cartas"><span id="contador">1</span>/${total}</p>
            <div class="pilha">
                ${pacote.cartas.map(({ carta }, i) => `
                    <div class="pilha-item ${carta.raridade >= 5 ? "virada" : ""}" style="z-index:${total - i}" data-i="${i}">
                        <div class="gira">
                            <div class="lado frente">${htmlCarta(carta, { classe: "tilt" })}</div>
                            <div class="lado tras">${htmlVerso(`brilho-r${carta.raridade}`)}</div>
                        </div>
                    </div>`).join("")}
            </div>
            <p class="dica">Toque na carta para ver a próxima</p>
            <button class="btn secundario pequeno" data-abertura="pular">Pular</button>
        </div>`;
    ativarTilt(overlay);
    const itens = $$(".pilha-item", overlay);

    const destacar = () => {
        const { carta, nova } = pacote.cartas[indice];
        const item = itens[indice];
        $("#contador").textContent = indice + 1;
        if (item.classList.contains("virada")) {
            sons.carta();
            return;
        }
        if (carta.raridade >= 3) sons.raro(carta.raridade);
        else sons.carta();
        if (nova) item.querySelector(".carta").insertAdjacentHTML("beforeend", `<span class="carta-nova">NOVA</span>`);
    };
    destacar();

    $(".pilha", overlay).addEventListener("click", () => {
        const item = itens[indice];
        if (!item) return;
        if (item.classList.contains("virada")) {
            item.classList.remove("virada");
            item.classList.add("revelada");
            const { carta, nova } = pacote.cartas[indice];
            sons.raro(carta.raridade);
            if (nova) item.querySelector(".carta").insertAdjacentHTML("beforeend", `<span class="carta-nova">NOVA</span>`);
            return;
        }
        item.classList.add("saiu");
        indice++;
        if (indice >= total) setTimeout(() => mostrarResumo([pacote]), 350);
        else destacar();
    });
    $("[data-abertura=pular]", overlay).addEventListener("click", () => mostrarResumo([pacote]));
};

const mostrarResumo = (pacotes) => {
    const pacote = pacotes[0];
    const restantes = pacotesDisponiveis();
    overlay.innerHTML = `
        <div class="abertura-palco resumo">
            ${pacote.god ? `<div class="god-banner">GOD PACK</div>` : ""}
            <h2>Suas cartas</h2>
            <div class="grade-cartas resumo-cartas">
                ${pacote.cartas.map(({ carta, nova }, i) =>
                    `<div class="entrada" style="animation-delay:${i * 90}ms">${htmlCarta(carta, { nova, classe: "tilt" })}</div>`).join("")}
            </div>
            <p class="sutil">+${PONTOS_POR_PACOTE} pontos de pacote • ${restantes} pacote(s) restantes</p>
            <div class="modal-botoes">
                <button class="btn secundario" data-abertura="fechar">Fechar</button>
                <a class="btn secundario" href="#album" data-abertura="fechar">Ver álbum</a>
                ${restantes ? `<button class="btn" data-abertura="outro">Abrir outro</button>` : ""}
            </div>
        </div>`;
    ativarTilt(overlay);
    ligarBotoesAbertura();
};

const mostrarResumoMultiplo = (pacotes) => {
    const agrupado = new Map();
    let novas = 0;
    pacotes.forEach((p) => p.cartas.forEach(({ carta, nova }) => {
        const g = agrupado.get(carta.id) || { carta, qtd: 0, nova: false };
        g.qtd++;
        if (nova) { g.nova = true; novas++; }
        agrupado.set(carta.id, g);
    }));
    const lista = [...agrupado.values()].sort((a, b) => b.carta.raridade - a.carta.raridade || a.carta.numero - b.carta.numero);
    const melhor = lista[0].carta.raridade;
    const gods = pacotes.filter((p) => p.god).length;
    sons.raro(melhor);
    overlay.className = "abertura aberta";
    overlay.innerHTML = `
        <div class="abertura-palco resumo">
            ${gods ? `<div class="god-banner">${gods} GOD PACK${gods > 1 ? "S" : ""}</div>` : ""}
            <h2>${pacotes.length} pacotes abertos!</h2>
            <p class="sutil">${pacotes.length * 5} cartas • ${novas} novas • melhor raridade: ${RARIDADES[melhor].simbolo}
                • +${pacotes.length * PONTOS_POR_PACOTE} pontos</p>
            <div class="grade-cartas resumo-cartas multiplo">
                ${lista.map(({ carta, qtd, nova }, i) =>
                    `<div class="entrada" style="animation-delay:${Math.min(i * 40, 1500)}ms">${htmlCarta(carta, { qtd, nova, classe: "tilt" })}</div>`).join("")}
            </div>
            <div class="modal-botoes">
                <button class="btn secundario" data-abertura="fechar">Fechar</button>
                <a class="btn" href="#album" data-abertura="fechar">Ver álbum</a>
            </div>
        </div>`;
    ativarTilt(overlay);
    ligarBotoesAbertura();
};

const ligarBotoesAbertura = () => {
    $$("[data-abertura=fechar]", overlay).forEach((b) => b.addEventListener("click", fecharAbertura));
    const outro = $("[data-abertura=outro]", overlay);
    if (outro) outro.addEventListener("click", () => abrir(1));
};

// ====================================================
// Tela: Álbum
// ====================================================
const cartasFiltradas = () => {
    const busca = filtrosAlbum.busca.trim().toLowerCase();
    return CARTAS.filter((c) => {
        const q = quantidade(c.id);
        if (filtrosAlbum.pacote && c.pacote !== filtrosAlbum.pacote) return false;
        if (filtrosAlbum.raridade && c.raridade !== Number(filtrosAlbum.raridade)) return false;
        if (filtrosAlbum.mostrar === "tenho" && !q) return false;
        if (filtrosAlbum.mostrar === "faltando" && q) return false;
        if (filtrosAlbum.mostrar === "repetidas" && q < 2) return false;
        if (filtrosAlbum.mostrar === "novas" && !novasVisita[c.id]) return false;
        if (busca && !(q && c.nome.toLowerCase().includes(busca)) && !c.id.includes(busca)) return false;
        return true;
    });
};

const htmlGradeAlbum = () => {
    const lista = cartasFiltradas();
    if (!lista.length) return `<p class="vazio">Nenhuma carta encontrada com esses filtros.</p>`;
    return lista.map((c) => {
        const q = quantidade(c.id);
        if (!q) {
            return `<button class="slot-carta faltando" data-acao="ver-faltando" data-id="${c.id}" title="Carta ${c.id}">
                <img src="${c.imagem}" alt="" loading="lazy" draggable="false">
                <span>#${c.id}</span><small>${RARIDADES[c.raridade].simbolo}</small>
            </button>`;
        }
        return `<button class="slot-carta" data-acao="ver-carta" data-id="${c.id}">${htmlCarta(c, { qtd: q, nova: novasVisita[c.id] })}</button>`;
    }).join("");
};

const telaAlbum = () => {
    const unicas = cartasUnicas();
    const repetidas = listarRepetidas(1, 8).reduce((s, x) => s + x.qtd, 0);
    app.innerHTML = `
    <section>
        <div class="titulo-album">
            <div>
                <h1>Meu Álbum</h1>
                <p class="destaque-texto">${unicas}/${TOTAL_CARTAS} cartas • ${numero(estado.pontos)} pontos de pacote</p>
                ${barra(unicas, TOTAL_CARTAS, "grossa")}
            </div>
            <button class="btn dourado" data-acao="vender-repetidas" ${repetidas ? "" : "disabled"}><i class="ic-moeda"></i> Vender repetidas (${repetidas})</button>
        </div>
        <div class="filtros">
            <input type="search" id="busca-album" placeholder="Buscar por nome ou número" value="${escapar(filtrosAlbum.busca)}">
            <select id="filtro-pacote">
                <option value="">Todos os pacotes</option>
                ${Object.values(PACOTES).map((p) => `<option value="${p.id}" ${filtrosAlbum.pacote === p.id ? "selected" : ""}>${p.nome}</option>`).join("")}
            </select>
            <select id="filtro-raridade">
                <option value="">Todas as raridades</option>
                ${Object.entries(RARIDADES).map(([r, i]) => `<option value="${r}" ${filtrosAlbum.raridade === r ? "selected" : ""}>${i.simbolo} ${i.nome}</option>`).join("")}
            </select>
            <select id="filtro-mostrar">
                ${[["todas", "Mostrar todas"], ["tenho", "Só as que tenho"], ["faltando", "Só as que faltam"], ["repetidas", "Só repetidas"], ["novas", "Só novas"]]
                    .map(([v, t]) => `<option value="${v}" ${filtrosAlbum.mostrar === v ? "selected" : ""}>${t}</option>`).join("")}
            </select>
        </div>
        <div class="grade-cartas album" id="grade-album">${htmlGradeAlbum()}</div>
    </section>`;

    const atualizarGrade = () => { $("#grade-album").innerHTML = htmlGradeAlbum(); };
    $("#busca-album").addEventListener("input", (e) => { filtrosAlbum.busca = e.target.value; atualizarGrade(); });
    $("#filtro-pacote").addEventListener("change", (e) => { filtrosAlbum.pacote = e.target.value; atualizarGrade(); });
    $("#filtro-raridade").addEventListener("change", (e) => { filtrosAlbum.raridade = e.target.value; atualizarGrade(); });
    $("#filtro-mostrar").addEventListener("change", (e) => { filtrosAlbum.mostrar = e.target.value; atualizarGrade(); });
};

const verCarta = (id) => {
    const c = CARTA_POR_ID[id];
    const q = quantidade(id);
    delete novasVisita[id];
    if (estado.novas[id]) {
        delete estado.novas[id];
        salvar();
    }
    const info = RARIDADES[c.raridade];
    abrirModal(`
        <div class="detalhe-carta">
            <div class="detalhe-imagem">${htmlCarta(c, { classe: "tilt" })}</div>
            <div class="detalhe-info">
                <h3>${c.nome}</h3>
                <p class="sutil">#${c.id}/${TOTAL_CARTAS} • ${info.simbolo} ${info.nome} • Pacote ${PACOTES[c.pacote].nome}</p>
                <p>${c.tipos.map((t) => `<span class="chip-tipo" style="--cor:${TIPOS[t].cor}">${TIPOS[t].nome}</span>`).join(" ")}</p>
                <p class="destaque-texto">${q ? `Você tem <b>${q}</b> ${q > 1 ? "cópias" : "cópia"}` : "Você ainda não tem essa carta"}</p>
                <div class="acoes-carta">
                    ${q ? `<button class="btn dourado" data-acao="vender-uma" data-id="${id}"><i class="ic-moeda"></i> Vender 1 (+${info.venda})</button>` : ""}
                    <button class="btn ${estado.pontos >= info.pontos ? "" : "desativado"}" data-acao="resgatar-pontos" data-id="${id}" ${estado.pontos >= info.pontos ? "" : "disabled"}>
                        Pegar com ${numero(info.pontos)} pontos
                    </button>
                    <a class="btn secundario" href="#pokedex/${POKEMON_POR_ID[c.pid].nome}" data-acao="fechar-modal">Ver na Pokédex</a>
                </div>
                <p class="sutil">Você tem ${numero(estado.pontos)} pontos de pacote.</p>
            </div>
        </div>`, "largo");
};

const verFaltando = (id) => {
    const c = CARTA_POR_ID[id];
    const info = RARIDADES[c.raridade];
    abrirModal(`
        <div class="detalhe-carta">
            <div class="detalhe-imagem"><div class="slot-carta faltando grande"><img src="${c.imagem}" alt=""><span>#${c.id}</span><small>${info.simbolo}</small></div></div>
            <div class="detalhe-info">
                <h3>Quem é esse Pokémon?</h3>
                <p class="sutil">#${c.id}/${TOTAL_CARTAS} • ${info.simbolo} ${info.nome} • Pacote ${PACOTES[c.pacote].nome}</p>
                <p>Encontre essa carta abrindo pacotes <b>${PACOTES[c.pacote].nome}</b>, trocando com bots ou usando pontos de pacote.</p>
                <div class="acoes-carta">
                    <button class="btn ${estado.pontos >= info.pontos ? "" : "desativado"}" data-acao="resgatar-pontos" data-id="${id}" ${estado.pontos >= info.pontos ? "" : "disabled"}>
                        Pegar com ${numero(info.pontos)} pontos
                    </button>
                </div>
                <p class="sutil">Você tem ${numero(estado.pontos)} pontos de pacote.</p>
            </div>
        </div>`, "largo");
};

const modalVenderRepetidas = (manter = 1, raridadeMax = 4) => {
    const lista = listarRepetidas(manter, raridadeMax).sort((a, b) => b.carta.raridade - a.carta.raridade);
    const total = lista.reduce((s, x) => s + RARIDADES[x.carta.raridade].venda * x.qtd, 0);
    const qtd = lista.reduce((s, x) => s + x.qtd, 0);
    abrirModal(`
        <h3><i class="ic-moeda"></i> Vender repetidas</h3>
        <div class="opcoes-venda">
            <label>Manter
                <select id="venda-manter">
                    ${[1, 2, 3].map((n) => `<option value="${n}" ${n === manter ? "selected" : ""}>${n} ${n > 1 ? "cópias" : "cópia"} de cada</option>`).join("")}
                </select>
            </label>
            <label>Vender até
                <select id="venda-raridade">
                    ${Object.entries(RARIDADES).map(([r, i]) => `<option value="${r}" ${Number(r) === raridadeMax ? "selected" : ""}>${i.simbolo} ${i.nome}</option>`).join("")}
                </select>
            </label>
        </div>
        <p class="sutil">Dica: guarde algumas repetidas para trocar com os bots! Eles pagam o dobro em algumas ofertas.</p>
        <div class="lista-venda">
            ${lista.length ? lista.map(({ carta, qtd }) => `
                <div class="item-venda">
                    <img src="${imagemSprite(carta.pid)}" alt="" loading="lazy">
                    <span>${carta.nome} <small>${RARIDADES[carta.raridade].simbolo}</small></span>
                    <span>x${qtd}</span>
                    <b><i class="ic-moeda"></i> ${RARIDADES[carta.raridade].venda * qtd}</b>
                </div>`).join("") : `<p class="vazio">Nada para vender com essas opções.</p>`}
        </div>
        <p class="destaque-texto">Total: ${qtd} cartas por <i class="ic-moeda"></i> ${numero(total)}</p>
        <div class="modal-botoes">
            <button class="btn secundario" data-acao="fechar-modal">Cancelar</button>
            <button class="btn dourado" data-acao="confirmar-venda" data-manter="${manter}" data-raridade="${raridadeMax}" ${qtd ? "" : "disabled"}>Vender tudo</button>
        </div>`, "largo");
    const reabrir = () => modalVenderRepetidas(Number($("#venda-manter").value), Number($("#venda-raridade").value));
    $("#venda-manter").addEventListener("change", reabrir);
    $("#venda-raridade").addEventListener("change", reabrir);
};

// ====================================================
// Tela: Trocas
// ====================================================
const miniCarta = (id) => {
    const c = CARTA_POR_ID[id];
    const q = quantidade(id);
    return `
    <button class="mini-carta" data-acao="${q ? "ver-carta" : "ver-previa"}" data-id="${id}">
        ${htmlCarta(c)}
        <small>${q ? `você tem x${q}` : `<b class="falta">Nova p/ você!</b>`}</small>
    </button>`;
};

const ROTULOS_TROCA = {
    troca: "Troca 1 por 1",
    pacotao: "3 repetidas por 1 melhor",
    compra: "Quer comprar",
    venda: "Está vendendo",
};

const htmlOferta = (o) => {
    const v = verificarOferta(o);
    const feita = estado.trocas.feitas.includes(o.indice);
    const lado = (ids, moedas) => [
        ...ids.map(miniCarta),
        moedas ? `<div class="moedas-oferta"><i class="ic-moeda"></i> ${numero(moedas)}</div>` : "",
    ].join("");
    return `
    <article class="oferta ${feita ? "feita" : ""}">
        <header>
            <img class="avatar" src="${imagemSprite(o.bot.avatar)}" alt="">
            <div>
                <b>${o.bot.nome}</b>
                <small>“${o.bot.fala}”</small>
            </div>
            <span class="tipo-oferta">${ROTULOS_TROCA[o.tipo]}</span>
        </header>
        <div class="lados">
            <div class="lado-oferta"><h4>Você dá</h4><div class="cartas-oferta">${lado(o.quer, o.moedas < 0 ? -o.moedas : 0)}</div></div>
            <div class="seta">${icone("trocas")}</div>
            <div class="lado-oferta"><h4>Você recebe</h4><div class="cartas-oferta">${lado(o.da, o.moedas > 0 ? o.moedas : 0)}</div></div>
        </div>
        <button class="btn ${v.ok ? "" : "desativado"}" data-acao="aceitar-troca" data-i="${o.indice}" ${v.ok ? "" : "disabled"}>
            ${feita ? "Troca concluída" : v.ok ? (v.ultimaCopia ? "Aceitar (é sua última cópia!)" : "Aceitar troca") : v.motivo}
        </button>
    </article>`;
};

const telaTrocas = () => {
    sincronizarTrocas();
    const tempo = tempoProximaRodada();
    app.innerHTML = `
    <section>
        <div class="titulo-trocas">
            <div>
                <h1>Trocas com bots</h1>
                <p class="sutil">Os bots trazem ofertas novas a cada <b>2 minutos</b>. Cada oferta pode ser aceita uma vez.</p>
            </div>
            <div class="relogio-trocas">
                <span>Novas ofertas em</span>
                <b data-relogio="trocas">${formatarTempo(tempo)}</b>
                <div class="barra"><div id="barra-trocas" style="width:${(1 - tempo / INTERVALO_TROCAS) * 100}%"></div></div>
            </div>
        </div>
        <div class="lista-ofertas">${estado.trocas.ofertas.map(htmlOferta).join("")}</div>
    </section>`;
};

// ====================================================
// Tela: Loja
// ====================================================
const telaLoja = () => {
    app.innerHTML = `
    <section>
        <h1>Loja</h1>
        <p class="destaque-texto">Seu saldo: <i class="ic-moeda"></i> ${numero(estado.moedas)} moedas</p>
        <div class="grade-loja">
            ${LOJA.map((item) => `
            <article class="item-loja ${item.destaque ? "destaque" : ""}">
                ${item.destaque ? `<span class="selo">Melhor oferta</span>` : ""}
                <div class="ilustracao-loja ${item.pacotes >= 25 ? "caixa" : ""}">
                    ${item.pacotes >= 25
                        ? `<div class="caixa-3d"><span>25</span><small>PACOTES</small></div>`
                        : Array.from({ length: Math.min(item.pacotes, 3) }, (_, i) => htmlPacote(Object.keys(PACOTES)[i % 3], "mini")).join("")}
                </div>
                <h3>${item.nome}</h3>
                <p class="sutil">${item.desc}</p>
                <button class="btn ${estado.moedas >= item.preco ? "dourado" : "desativado"}" data-acao="comprar" data-id="${item.id}" ${estado.moedas >= item.preco ? "" : "disabled"}>
                    <i class="ic-moeda"></i> ${numero(item.preco)}
                </button>
            </article>`).join("")}
        </div>
        <section class="painel">
            <h2>Como ganhar moedas</h2>
            <ul class="lista-dicas">
                <li>Resgate o <b>bônus diário</b> de ${BONUS_DIARIO} moedas na tela inicial.</li>
                <li>Complete as <b>missões diárias</b> e as <b>conquistas</b> do álbum.</li>
                <li><b>Venda cartas repetidas</b> no álbum (◆ ${RARIDADES[1].venda}, ◆◆ ${RARIDADES[2].venda}, ◆◆◆ ${RARIDADES[3].venda}, ex ${RARIDADES[4].venda}...).</li>
                <li>Alguns <b>bots compram suas repetidas</b> pelo dobro do preço na tela de trocas.</li>
            </ul>
            <p class="sutil">As moedas são só do jogo, nada de dinheiro de verdade.</p>
        </section>
    </section>`;
};

// ====================================================
// Tela: Pokédex (busca na PokeAPI)
// ====================================================
const cachePokeapi = new Map();
const buscarApi = async (url) => {
    if (!cachePokeapi.has(url)) {
        cachePokeapi.set(url, fetch(url).then((r) => {
            if (!r.ok) throw new Error("não encontrado");
            return r.json();
        }));
    }
    try {
        return await cachePokeapi.get(url);
    } catch (e) {
        cachePokeapi.delete(url);
        throw e;
    }
};

const NOMES_STATUS = { hp: "PS", attack: "Ataque", defense: "Defesa", "special-attack": "At. Esp.", "special-defense": "Def. Esp.", speed: "Velocidade" };

const telaPokedex = (busca) => {
    app.innerHTML = `
    <section class="pokedex">
        <h1>Pokédex</h1>
        <form class="busca-pokedex" id="form-pokedex">
            <input type="search" id="input-pokedex" placeholder="Nome ou número do Pokémon" value="${escapar(busca || "")}">
            <button class="btn" type="submit">Buscar</button>
            <button class="btn secundario" type="button" data-acao="pokedex-aleatorio">Aleatório</button>
        </form>
        <div id="resultado-pokedex" class="painel resultado-pokedex">
            <p class="qual-pokemon">Qual é esse Pokémon?! Digite um nome ou número acima.</p>
        </div>
        <section class="painel">
            <h2>Favoritos</h2>
            <div class="lista-favoritos">
                ${estado.favoritos.length ? estado.favoritos.map((nome) => `
                    <a class="favorito" href="#pokedex/${encodeURIComponent(nome)}">
                        <img src="${imagemSprite(Object.values(POKEMON_POR_ID).find((p) => p.nome === nome)?.id || 0)}" alt="" onerror="this.style.visibility='hidden'">
                        <span>${escapar(nomeBonito(nome))}</span>
                    </a>`).join("") : `<p class="vazio">Toque na estrela de um Pokémon para favoritar.</p>`}
            </div>
        </section>
    </section>`;
    $("#form-pokedex").addEventListener("submit", (e) => {
        e.preventDefault();
        const q = $("#input-pokedex").value.trim().toLowerCase();
        if (q) location.hash = `pokedex/${encodeURIComponent(q)}`;
    });
    if (busca) mostrarPokemon(busca.toLowerCase());
};

const mostrarPokemon = async (busca) => {
    const area = $("#resultado-pokedex");
    area.innerHTML = `<div class="carregando"><div class="pokebola-girando"></div><p>Buscando...</p></div>`;
    try {
        const p = await buscarApi(`https://pokeapi.co/api/v2/pokemon/${encodeURIComponent(busca)}`);
        const especie = await buscarApi(p.species.url);
        const cadeiaDados = await buscarApi(especie.evolution_chain.url);
        const cadeia = [];
        const percorrer = (no) => {
            cadeia.push(no.species);
            no.evolves_to.forEach(percorrer);
        };
        percorrer(cadeiaDados.chain);
        const idDaUrl = (url) => Number(url.split("/").filter(Boolean).pop());
        const cartas = CARTAS.filter((c) => c.pid === p.id);
        const favorito = estado.favoritos.includes(p.name);
        const texto = especie.flavor_text_entries.find((f) => f.language.name === "pt-br")
            || especie.flavor_text_entries.find((f) => f.language.name === "es")
            || especie.flavor_text_entries.find((f) => f.language.name === "en");
        if ($("#resultado-pokedex") !== area) return;
        area.innerHTML = `
        <div class="pokemon-detalhe">
            <div class="pokemon-imagem" style="--cor:${TIPOS[p.types[0].type.name]?.cor || "#888"}">
                <img src="${p.sprites.other["official-artwork"].front_default || p.sprites.front_default}" alt="${p.name}">
            </div>
            <div class="pokemon-dados">
                <div class="pokemon-titulo">
                    <button class="estrela ${favorito ? "ativa" : ""}" data-acao="favoritar" data-nome="${p.name}" title="Favoritar">★</button>
                    <h2>${nomeBonito(p.name)} <small>#${String(p.id).padStart(3, "0")}</small></h2>
                </div>
                <p>${p.types.map((t) => {
                    const tipo = TIPOS[t.type.name];
                    return tipo ? `<span class="chip-tipo" style="--cor:${tipo.cor}">${tipo.nome}</span>` : t.type.name;
                }).join(" ")}</p>
                ${texto ? `<p class="descricao">${escapar(texto.flavor_text.replace(/\s+/g, " "))}</p>` : ""}
                <p class="sutil">Altura ${(p.height / 10).toLocaleString("pt-BR")} m • Peso ${(p.weight / 10).toLocaleString("pt-BR")} kg</p>
                <div class="status">
                    ${p.stats.map((s) => `
                        <div class="linha-status"><span>${NOMES_STATUS[s.stat.name] || s.stat.name}</span><b>${s.base_stat}</b>${barra(s.base_stat, 200)}</div>`).join("")}
                </div>
            </div>
        </div>
        <h3>Evoluções</h3>
        <div class="evolucoes">
            ${cadeia.map((e, i) => `
                ${i ? `<span class="seta-evo">➜</span>` : ""}
                <a href="#pokedex/${e.name}" class="evo ${e.name === p.species.name ? "atual" : ""}">
                    <img src="${imagemSprite(idDaUrl(e.url))}" alt="${e.name}">
                    <span>${nomeBonito(e.name)}</span>
                </a>`).join("")}
        </div>
        ${cartas.length ? `
        <h3>Cartas deste Pokémon na coleção</h3>
        <div class="grade-cartas pequenas">
            ${cartas.map((c) => quantidade(c.id)
                ? `<button class="slot-carta" data-acao="ver-carta" data-id="${c.id}">${htmlCarta(c, { qtd: quantidade(c.id) })}</button>`
                : `<div class="slot-carta faltando"><img src="${c.imagem}" alt="" loading="lazy"><span>#${c.id}</span><small>${RARIDADES[c.raridade].simbolo}</small></div>`).join("")}
        </div>` : ""}`;
    } catch (e) {
        area.innerHTML = `<p class="erro-pokedex">Error 404 - Tá maluco, que Pokémon é esse? <br><small>“${escapar(busca)}” não foi encontrado.</small></p>`;
    }
};

// ====================================================
// Ações (cliques com data-acao)
// ====================================================
const ACOES = {
    bonus: () => {
        const v = resgatarBonusDiario();
        if (v) { sons.moeda(); aviso(`+${v} moedas de bônus diário! <i class="ic-moeda"></i>`, "sucesso"); }
    },
    missao: (el) => {
        const v = resgatarMissao(el.dataset.id);
        if (v) { sons.moeda(); aviso(`Missão concluída! +${v} moedas <i class="ic-moeda"></i>`, "sucesso"); }
    },
    conquista: (el) => {
        const v = resgatarConquista(el.dataset.id);
        if (v) { sons.moeda(); aviso(`Conquista desbloqueada! +${numero(v)} moedas`, "sucesso"); }
    },
    resetar: async () => {
        if (await confirmar("Apagar progresso?", "Todas as cartas, moedas e pacotes serão perdidos. Essa ação não pode ser desfeita.", "Apagar tudo")) resetar();
    },
    "selecionar-pacote": (el) => {
        pacoteSelecionado = el.dataset.id;
        renderizar();
    },
    abrir: (el) => abrir(Number(el.dataset.qtd)),
    "ver-carta": (el) => verCarta(el.dataset.id),
    "ver-faltando": (el) => verFaltando(el.dataset.id),
    "ver-previa": (el) => {
        const c = CARTA_POR_ID[el.dataset.id];
        abrirModal(`<div class="detalhe-imagem sozinha">${htmlCarta(c, { classe: "tilt" })}</div>
            <p class="sutil centro">${RARIDADES[c.raridade].simbolo} ${RARIDADES[c.raridade].nome} • Você ainda não tem essa carta</p>`, "largo");
    },
    "fechar-modal": () => fecharModal(),
    "vender-uma": async (el) => {
        const id = el.dataset.id;
        const c = CARTA_POR_ID[id];
        if (quantidade(id) === 1 && !(await confirmar("Vender sua única cópia?", `Você vai ficar sem <b>${c.nome}</b> no álbum.`, "Vender"))) return;
        const v = venderCarta(id);
        if (v) {
            sons.moeda();
            aviso(`${c.nome} vendida por ${v} moedas <i class="ic-moeda"></i>`, "sucesso");
            if (quantidade(id)) verCarta(id);
            else fecharModal();
        }
    },
    "resgatar-pontos": (el) => {
        const id = el.dataset.id;
        if (resgatarComPontos(id)) {
            sons.raro(CARTA_POR_ID[id].raridade);
            aviso(`${CARTA_POR_ID[id].nome} adicionada ao álbum!`, "sucesso");
            verCarta(id);
        }
    },
    "vender-repetidas": () => modalVenderRepetidas(),
    "confirmar-venda": (el) => {
        const { total, qtd } = venderRepetidas(Number(el.dataset.manter), Number(el.dataset.raridade));
        fecharModal();
        if (qtd) { sons.moeda(); aviso(`${qtd} cartas vendidas por ${numero(total)} moedas <i class="ic-moeda"></i>`, "sucesso"); }
    },
    "aceitar-troca": async (el) => {
        const oferta = estado.trocas.ofertas[Number(el.dataset.i)];
        const v = verificarOferta(oferta);
        if (!v.ok) return;
        if (v.ultimaCopia && !(await confirmar("Última cópia!", "Você vai entregar a sua única cópia de uma carta. Quer mesmo trocar?", "Trocar"))) return;
        const recebidas = aceitarOferta(oferta);
        if (!recebidas) return;
        if (!recebidas.length) {
            sons.moeda();
            aviso(`${oferta.bot.nome} comprou sua carta por ${numero(oferta.moedas)} moedas! <i class="ic-moeda"></i>`, "sucesso");
            return;
        }
        const { carta, nova } = recebidas[0];
        sons.raro(Math.max(carta.raridade, 3));
        abrirModal(`
            <h3>Troca feita com ${oferta.bot.nome}</h3>
            <div class="detalhe-imagem sozinha revelar">${htmlCarta(carta, { nova, classe: "tilt" })}</div>
            <p class="sutil centro">${RARIDADES[carta.raridade].simbolo} ${RARIDADES[carta.raridade].nome}${nova ? " • Nova no seu álbum!" : ""}</p>
            <div class="modal-botoes"><button class="btn" data-acao="fechar-modal">Legal!</button></div>`, "largo");
    },
    comprar: async (el) => {
        const item = LOJA.find((i) => i.id === el.dataset.id);
        if (!(await confirmar(`Comprar ${item.nome}?`, `Você vai gastar <i class="ic-moeda"></i> ${numero(item.preco)} e receber ${item.pacotes} pacote(s).`, "Comprar"))) return;
        if (comprar(item.preco, item.pacotes)) {
            sons.moeda();
            aviso(`+${item.pacotes} pacote(s)! <a href="#pacotes">Abrir agora</a>`, "sucesso");
        } else {
            sons.erro();
            aviso("Moedas insuficientes!", "erro");
        }
    },
    "pokedex-aleatorio": () => { location.hash = `pokedex/${1 + Math.floor(Math.random() * 151)}`; },
    favoritar: (el) => {
        const ativo = alternarFavorito(el.dataset.nome);
        el.classList.toggle("ativa", ativo);
        aviso(ativo ? "Adicionado aos favoritos" : "Removido dos favoritos");
    },
    som: () => {
        estado.som = !estado.som;
        salvar();
    },
};

document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-acao]");
    if (!el || el.disabled) return;
    const acao = ACOES[el.dataset.acao];
    if (!acao) return;
    if (el.tagName !== "A") e.preventDefault();
    sons.clique();
    acao(el);
});

$("#modal").addEventListener("click", (e) => {
    if (e.target.id === "modal" || e.target.closest(".modal-fechar")) fecharModal();
});
document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") fecharModal();
});

// Qualquer mudança no estado atualiza o cabeçalho e a tela atual (mantendo a rolagem)
aoMudar(() => {
    atualizarCabecalho();
    if (overlay.classList.contains("aberta") || telaAtual === "pokedex") return;
    const y = window.scrollY;
    renderizar();
    window.scrollTo({ top: y });
});

// Relógio: pacotes grátis e rodadas de troca
let slotVisto = null;
setInterval(() => {
    const qtdAntes = estado.gratis.qtd;
    sincronizarGratis();
    if (estado.gratis.qtd > qtdAntes) aviso("Você ganhou um pacote grátis!", "sucesso");
    sincronizarDiario();
    atualizarCabecalho();
    $$("[data-relogio=gratis]").forEach((el) => { el.textContent = formatarTempo(tempoProximoGratis()); });
    const tempo = tempoProximaRodada();
    $$("[data-relogio=trocas]").forEach((el) => { el.textContent = formatarTempo(tempo); });
    const barraTrocas = $("#barra-trocas");
    if (barraTrocas) barraTrocas.style.width = `${(1 - tempo / INTERVALO_TROCAS) * 100}%`;
    if (sincronizarTrocas() && slotVisto !== null && telaAtual === "trocas") aviso("Os bots trouxeram novas ofertas!");
    slotVisto = estado.trocas.slot;
}, 1000);

window.addEventListener("hashchange", () => {
    fecharModal();
    if (overlay.classList.contains("aberta")) {
        overlay.className = "abertura";
        overlay.innerHTML = "";
        document.body.classList.remove("travado");
    }
    navegar();
});

// Início
sincronizarGratis();
sincronizarDiario();
sincronizarTrocas();
slotVisto = estado.trocas.slot;
limparNotificacoes("album");
limparNotificacoes("inicio");
atualizarCabecalho();
navegar();
