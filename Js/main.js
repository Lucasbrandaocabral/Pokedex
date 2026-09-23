// ====================================================
// Pokédex Pocket: telas e interações do jogo
// ====================================================
import {
    CARTAS, CARTA_POR_ID, PACOTES, RARIDADES, TIPOS, TOTAL_CARTAS, COLECOES, COLECAO_POR_CODIGO,
    cartasDoPacote, imagemSprite, nomeBonito, POKEMON_POR_ID, numeroCarta,
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
import { iniciarConta, abrirConta } from "./conta.js";
import {
    iniciarSocial, aoAtualizarSocial, atualizarSocial, telaPerfil, htmlTrocasAmigos, quantidadeTrocasRecebidas, processarConvite,
} from "./social.js";

// O endereço antigo do GitHub Pages não tem servidor: manda para o jogo na Vercel
if (location.hostname.endsWith("github.io")) location.replace(`https://pokepalword.vercel.app/${location.hash}`);

const app = $("#app");
let telaAtual = "inicio";
let pacoteSelecionado = "charizard";
const filtrosAlbum = { busca: "", colecao: "A1", pacote: "", raridade: "", mostrar: "todas" };
const colecaoSelecionada = () => COLECAO_POR_CODIGO[PACOTES[pacoteSelecionado].colecao];
const tenhoDe = (cartas) => cartas.filter((c) => quantidade(c.id)).length;
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
    trocas: (arg) => {
        if (arg === "amigos" || arg === "bots") abaTrocas = arg;
        telaTrocas();
    },
    perfil: () => telaPerfil(app),
    // Link de convite: #amigo/CODIGO abre o perfil e pergunta se quer adicionar
    amigo: (codigo) => {
        history.replaceState(null, "", "#perfil");
        telaAtual = "perfil";
        telaPerfil(app);
        processarConvite(codigo);
    },
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
            <span class="etiqueta">Série A • ${COLECOES.length} expansões</span>
            <h1>Complete o álbum</h1>
            <p>${unicas} de ${TOTAL_CARTAS} cartas encontradas. Abra pacotes, troque com outros treinadores e complete todas as expansões.</p>
            <a class="btn grande" href="#pacotes">Abrir pacote (${pacotesDisponiveis()})</a>
        </div>
        <div class="hero-pacotes">
            ${["mew", "charizard", "gyarados"].map((p) => htmlPacote(p, "mini")).join("")}
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
            ${COLECOES.map((c) => {
                const tenho = tenhoDe(c.cartas);
                return `<div class="linha-progresso"><span>${c.nome}</span>${barra(tenho, c.total)}<small>${tenho}/${c.total}</small></div>`;
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
    const tenho = tenhoDe(cartas);
    const colecao = colecaoSelecionada();
    const destaques = cartas.filter((c) => c.raridade >= 4).sort((a, b) => b.raridade - a.raridade).slice(0, 6);
    app.innerHTML = `
    <section class="tela-pacotes">
        <h1>Escolha um pacote</h1>
        <div class="seletor-colecoes">
            ${COLECOES.map((c) => `
                <button class="opcao-colecao ${c.codigo === colecao.codigo ? "selecionada" : ""}" data-acao="selecionar-colecao" data-id="${c.codigo}"
                        style="--c1:${c.pacotes[0].cores[0]};--c2:${c.pacotes[0].cores[1]}">
                    <img src="${imagemSprite(c.pacotes[0].mascote)}" alt="" loading="lazy" draggable="false">
                    <b>${c.nome}</b>
                    <small>${c.codigo} • ${tenhoDe(c.cartas)}/${c.total}</small>
                </button>`).join("")}
        </div>
        <div class="seletor-pacotes">
            ${colecao.pacotes.map(({ id: p }) =>
                `<button class="opcao-pacote ${p === pacoteSelecionado ? "selecionado" : ""}" data-acao="selecionar-pacote" data-id="${p}">
                    ${htmlPacote(p)}
                </button>`).join("")}
        </div>
        <p class="destaque-texto">${colecao.nome} • Pacote <b>${PACOTES[pacoteSelecionado].nome}</b> • ${tenho}/${cartas.length} cartas coletadas</p>
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
    // Deixa a expansão escolhida visível na faixa (no celular ela rola para o lado)
    const escolhida = $(".opcao-colecao.selecionada");
    escolhida.parentElement.scrollLeft = escolhida.offsetLeft - (escolhida.parentElement.clientWidth - escolhida.offsetWidth) / 2;
};

// ---------------- Abertura de pacote (animação) ----------------
const overlay = $("#abertura");

const fecharAbertura = () => {
    overlay.className = "abertura";
    overlay.innerHTML = "";
    document.body.classList.remove("travado");
    renderizar();
};

// Sequência de abertura: cada pacote é cortado e as cartas passam para o lado, uma por uma.
// Com vários pacotes, um depois do outro; dá para pular o pacote atual ou pular tudo.
let sequencia = null;

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
    sequencia = { pacotes: abertos, atual: 0 };
    animarPacote();
};

const finalizarSequencia = () => {
    const { pacotes } = sequencia;
    if (pacotes.length === 1) mostrarResumo(pacotes);
    else mostrarResumoMultiplo(pacotes);
};

const proximoPacote = () => {
    sequencia.atual++;
    if (sequencia.atual < sequencia.pacotes.length) animarPacote();
    else finalizarSequencia();
};

const topoSequencia = (fase) => {
    const { pacotes, atual } = sequencia;
    const varios = pacotes.length > 1;
    return `
        <div class="abertura-topo">
            <span class="contador-pacotes">${varios ? `Pacote <b>${atual + 1}</b> de ${pacotes.length}` : ""}</span>
            <div class="abertura-botoes">
                ${varios && fase === "cartas" && atual < pacotes.length - 1 ? `<button class="btn secundario pequeno" data-abertura="pular-pacote">Próximo pacote</button>` : ""}
                <button class="btn secundario pequeno" data-abertura="pular-tudo">${varios ? "Pular animação" : "Pular"}</button>
            </div>
        </div>`;
};

const ligarPulos = () => {
    $("[data-abertura=pular-tudo]", overlay)?.addEventListener("click", finalizarSequencia);
    $("[data-abertura=pular-pacote]", overlay)?.addEventListener("click", proximoPacote);
};

// Cor da luz atrás da carta, de acordo com a raridade
const LUZ_RARIDADE = { 1: "comum", 2: "comum", 3: "rara", 4: "ex", 5: "estrela", 6: "estrela", 7: "estrela", 8: "coroa" };

// Abertura de um pacote: corte, o pacote desce e as cartas sobem de dentro dele
const animarPacote = () => {
    const pacote = sequencia.pacotes[sequencia.atual];
    const cores = PACOTES[pacoteSelecionado].cores;
    const total = pacote.cartas.length;
    const ultimoPacote = sequencia.atual === sequencia.pacotes.length - 1;
    overlay.className = "abertura aberta";
    overlay.innerHTML = `
        <div class="abertura-barra">${topoSequencia("pacote")}</div>
        <div class="abertura-palco palco-pacote fase-pacote" style="--c1:${cores[0]};--c2:${cores[1]}">
            <div class="luz-fundo"><div class="raios"></div></div>
            ${pacote.god ? `<div class="god-banner">GOD PACK</div>` : ""}
            <p class="dica" id="dica-abertura">Arraste o dedo sobre a linha para abrir o pacote</p>
            <div class="area-abertura">
                <div class="pilha">
                    ${pacote.cartas.map(({ carta }, i) => `
                        <div class="pilha-item ${carta.raridade >= 5 ? "virada" : ""}" style="z-index:${total - i}" data-i="${i}">
                            <div class="gira">
                                <div class="lado frente">${htmlCarta(carta)}</div>
                                <div class="lado tras">${htmlVerso(`brilho-r${carta.raridade}`)}</div>
                            </div>
                        </div>`).join("")}
                </div>
                <div class="pacote-abrir">
                    ${htmlPacote(pacoteSelecionado, "grande")}
                    <div class="linha-corte"><div class="progresso-corte"></div></div>
                </div>
            </div>
            <div class="pontos-cartas">${pacote.cartas.map(() => "<i></i>").join("")}</div>
            <button class="btn secundario pequeno" data-abertura="cortar">Toque para abrir</button>
        </div>`;
    ligarPulos();
    const palco = $(".palco-pacote", overlay);
    const alvo = $(".pacote-abrir", overlay);
    const progresso = $(".progresso-corte", overlay);
    const itens = $$(".pilha-item", overlay);
    const pilha = $(".pilha", overlay);
    const pontos = $$(".pontos-cartas i", overlay);
    let indice = 0;
    let cartasProntas = false;

    // ---------- 1. Cortar o pacote ----------
    let inicioCorte = null;
    let aberto = false;
    const cortar = () => {
        if (aberto) return;
        aberto = true;
        sons.rasgar();
        palco.classList.add("cortado");
        $("[data-abertura=cortar]", overlay).remove();
        setTimeout(() => {
            if (sequencia?.pacotes[sequencia.atual] !== pacote || !overlay.classList.contains("aberta")) return;
            palco.classList.replace("fase-pacote", "fase-cartas");
            $(".abertura-barra", overlay).innerHTML = topoSequencia("cartas");
            ligarPulos();
            $("#dica-abertura").textContent = "Arraste a carta para o lado (ou toque) para ver a próxima";
            cartasProntas = true;
            destacar();
        }, 1150);
    };
    alvo.addEventListener("pointerdown", (e) => {
        inicioCorte = e.clientX;
        alvo.setPointerCapture(e.pointerId);
    });
    alvo.addEventListener("pointermove", (e) => {
        if (inicioCorte === null || aberto) return;
        const largura = alvo.getBoundingClientRect().width;
        const p = Math.min(1, Math.abs(e.clientX - inicioCorte) / (largura * 0.7));
        progresso.style.width = `${p * 100}%`;
        if (p >= 1) cortar();
    });
    alvo.addEventListener("pointerup", () => {
        inicioCorte = null;
        if (!aberto) progresso.style.width = "0";
    });
    $("[data-abertura=cortar]", overlay).addEventListener("click", cortar);

    // ---------- 2. Revelar as cartas ----------
    const marcarNova = (i) => {
        if (pacote.cartas[i].nova) itens[i].querySelector(".carta").insertAdjacentHTML("beforeend", `<span class="carta-nova">NOVA</span>`);
    };
    const luz = (raridade) => { palco.dataset.luz = LUZ_RARIDADE[raridade] || "comum"; };
    const destacar = () => {
        const { carta } = pacote.cartas[indice];
        const item = itens[indice];
        item.classList.add("em-cima");
        pontos.forEach((p, i) => p.classList.toggle("ativo", i === indice));
        pontos.forEach((p, i) => p.classList.toggle("visto", i < indice));
        if (item.classList.contains("virada")) {
            luz(carta.raridade);
            return sons.carta();
        }
        luz(carta.raridade);
        if (carta.raridade >= 3) sons.raro(carta.raridade);
        else sons.carta();
        marcarNova(indice);
    };
    const revelar = (item) => {
        item.classList.remove("virada");
        item.classList.add("revelada");
        palco.classList.remove("clarao");
        void palco.offsetWidth; // reinicia a animação do clarão
        palco.classList.add("clarao");
        sons.raro(pacote.cartas[indice].carta.raridade);
        marcarNova(indice);
    };
    // A carta de cima sai voando para o lado escolhido
    const passar = (direcao) => {
        const item = itens[indice];
        item.style.transform = "";
        item.style.transition = "";
        item.classList.add("saiu", direcao);
        indice++;
        if (indice < total) destacar();
        else {
            palco.dataset.luz = "comum";
            setTimeout(() => (ultimoPacote ? finalizarSequencia() : proximoPacote()), 420);
        }
    };

    let inicio = null;
    let deslocamento = 0;
    pilha.addEventListener("pointerdown", (e) => {
        if (!cartasProntas || !itens[indice]) return;
        inicio = e.clientX;
        deslocamento = 0;
        pilha.setPointerCapture(e.pointerId);
        itens[indice].style.transition = "none";
    });
    pilha.addEventListener("pointermove", (e) => {
        if (inicio === null) return;
        deslocamento = e.clientX - inicio;
        const item = itens[indice];
        if (!item.classList.contains("virada")) item.style.transform = `translateX(${deslocamento}px) rotate(${deslocamento / 18}deg)`;
    });
    const soltar = () => {
        if (inicio === null) return;
        inicio = null;
        const item = itens[indice];
        if (!item) return;
        item.style.transition = "";
        if (item.classList.contains("virada")) return revelar(item);
        if (Math.abs(deslocamento) > 70) return passar(deslocamento > 0 ? "direita" : "esquerda");
        item.style.transform = "";
        if (Math.abs(deslocamento) < 8) passar("esquerda");
    };
    pilha.addEventListener("pointerup", soltar);
    pilha.addEventListener("pointercancel", () => {
        inicio = null;
        if (itens[indice]) itens[indice].style.transform = "";
    });
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
        if (filtrosAlbum.colecao && c.colecao !== filtrosAlbum.colecao) return false;
        if (filtrosAlbum.pacote && c.pacote !== filtrosAlbum.pacote) return false;
        if (filtrosAlbum.raridade && c.raridade !== Number(filtrosAlbum.raridade)) return false;
        if (filtrosAlbum.mostrar === "tenho" && !q) return false;
        if (filtrosAlbum.mostrar === "faltando" && q) return false;
        if (filtrosAlbum.mostrar === "repetidas" && q < 2) return false;
        if (filtrosAlbum.mostrar === "novas" && !novasVisita[c.id]) return false;
        if (busca && !(q && c.nome.toLowerCase().includes(busca)) && !numeroCarta(c).toLowerCase().includes(busca)) return false;
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
                <span>${numeroCarta(c)}</span><small>${RARIDADES[c.raridade].simbolo}</small>
            </button>`;
        }
        return `<button class="slot-carta" data-acao="ver-carta" data-id="${c.id}">${htmlCarta(c, { qtd: q, nova: novasVisita[c.id] })}</button>`;
    }).join("");
};

const telaAlbum = () => {
    const unicas = cartasUnicas();
    const repetidas = listarRepetidas(1, 8).reduce((s, x) => s + x.qtd, 0);
    const colecao = COLECAO_POR_CODIGO[filtrosAlbum.colecao];
    const pacotesDoFiltro = colecao ? colecao.pacotes : Object.values(PACOTES);
    app.innerHTML = `
    <section>
        <div class="titulo-album">
            <div>
                <h1>Meu Álbum</h1>
                <p class="destaque-texto">${colecao ? `${colecao.nome}: ${tenhoDe(colecao.cartas)}/${colecao.total} • ` : ""}${unicas}/${TOTAL_CARTAS} no total • ${numero(estado.pontos)} pontos de pacote</p>
                ${colecao ? barra(tenhoDe(colecao.cartas), colecao.total, "grossa") : barra(unicas, TOTAL_CARTAS, "grossa")}
            </div>
            <button class="btn dourado" data-acao="vender-repetidas" ${repetidas ? "" : "disabled"}><i class="ic-moeda"></i> Vender repetidas (${repetidas})</button>
        </div>
        <div class="filtros">
            <input type="search" id="busca-album" placeholder="Buscar por nome ou número" value="${escapar(filtrosAlbum.busca)}">
            <select id="filtro-colecao">
                <option value="">Todas as expansões</option>
                ${COLECOES.map((c) => `<option value="${c.codigo}" ${filtrosAlbum.colecao === c.codigo ? "selected" : ""}>${c.nome} (${c.codigo})</option>`).join("")}
            </select>
            <select id="filtro-pacote">
                <option value="">Todos os pacotes</option>
                ${pacotesDoFiltro.map((p) => `<option value="${p.id}" ${filtrosAlbum.pacote === p.id ? "selected" : ""}>${p.nome}</option>`).join("")}
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
    $("#filtro-colecao").addEventListener("change", (e) => {
        filtrosAlbum.colecao = e.target.value;
        filtrosAlbum.pacote = "";
        telaAlbum();
    });
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
                <p class="sutil">${numeroCarta(c)} • ${info.simbolo} ${info.nome} • ${COLECAO_POR_CODIGO[c.colecao].nome} • Pacote ${PACOTES[c.pacote].nome}</p>
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
            <div class="detalhe-imagem"><div class="slot-carta faltando grande"><img src="${c.imagem}" alt=""><span>${numeroCarta(c)}</span><small>${info.simbolo}</small></div></div>
            <div class="detalhe-info">
                <h3>Quem é esse Pokémon?</h3>
                <p class="sutil">${numeroCarta(c)} • ${info.simbolo} ${info.nome} • ${COLECAO_POR_CODIGO[c.colecao].nome} • Pacote ${PACOTES[c.pacote].nome}</p>
                <p>Encontre essa carta abrindo pacotes <b>${PACOTES[c.pacote].nome}</b> (${COLECAO_POR_CODIGO[c.colecao].nome}), trocando com bots ou usando pontos de pacote.</p>
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

let abaTrocas = "bots";

const abasTrocas = () => {
    const recebidas = quantidadeTrocasRecebidas();
    return `
    <div class="abas-tela">
        <button class="${abaTrocas === "bots" ? "ativa" : ""}" data-acao="aba-trocas" data-aba="bots">Bots</button>
        <button class="${abaTrocas === "amigos" ? "ativa" : ""}" data-acao="aba-trocas" data-aba="amigos">Amigos${recebidas ? ` <i class="badge-inline">${recebidas}</i>` : ""}</button>
    </div>`;
};

const telaTrocas = () => {
    if (abaTrocas === "amigos") {
        app.innerHTML = `
        <section>
            <h1>Trocas com amigos</h1>
            ${abasTrocas()}
            ${htmlTrocasAmigos()}
        </section>`;
        return;
    }
    sincronizarTrocas();
    const tempo = tempoProximaRodada();
    app.innerHTML = `
    <section>
        ${abasTrocas()}
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
                        <img src="${imagemSprite(Object.values(POKEMON_POR_ID).find((p) => p.nome === nome)?.id || 25)}" alt="">
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
                : `<div class="slot-carta faltando"><img src="${c.imagem}" alt="" loading="lazy"><span>${numeroCarta(c)}</span><small>${RARIDADES[c.raridade].simbolo}</small></div>`).join("")}
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
        if (!(await confirmar("Apagar progresso?", "Todas as cartas, moedas e pacotes serão perdidos. Essa ação não pode ser desfeita.", "Apagar tudo"))) return;
        novasVisita = {};
        resetar();
        aviso("Progresso apagado. Boa sorte na nova coleção!");
    },
    "selecionar-pacote": (el) => {
        pacoteSelecionado = el.dataset.id;
        filtrosAlbum.colecao = colecaoSelecionada().codigo;
        filtrosAlbum.pacote = "";
        renderizar();
    },
    "selecionar-colecao": (el) => {
        pacoteSelecionado = COLECAO_POR_CODIGO[el.dataset.id].pacotes[0].id;
        filtrosAlbum.colecao = el.dataset.id;
        filtrosAlbum.pacote = "";
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
    conta: () => abrirConta(),
    "aba-trocas": (el) => {
        abaTrocas = el.dataset.aba;
        history.replaceState(null, "", `#trocas/${abaTrocas}`);
        renderizar();
        if (abaTrocas === "amigos") atualizarSocial();
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
const digitandoNaTela = () => {
    const el = document.activeElement;
    return !!el && app.contains(el) && ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName);
};

aoMudar(() => {
    atualizarCabecalho();
    // Não redesenha enquanto alguém digita (senão o texto do campo some)
    if (overlay.classList.contains("aberta") || telaAtual === "pokedex" || digitandoNaTela()) return;
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
aoAtualizarSocial(() => {
    const aberto = $("#modal").classList.contains("aberto") || overlay.classList.contains("aberta");
    if (!aberto && (telaAtual === "perfil" || telaAtual === "trocas")) {
        const y = window.scrollY;
        renderizar();
        window.scrollTo({ top: y });
    }
});
iniciarSocial();
iniciarConta();
