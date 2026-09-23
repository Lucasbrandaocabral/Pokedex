// ====================================================
// Perfil do treinador, amigos e trocas de cartas entre jogadores
// ====================================================
import { CARTAS, CARTA_POR_ID, RARIDADES, TOTAL_CARTAS, imagemSprite, POKEMON_POR_ID, nomeBonito } from "./cards.js";
import { estado, salvar, adicionarCarta, quantidade, cartasUnicas } from "./state.js";
import { $, $$, escapar, numero, htmlCarta, abrirModal, fecharModal, aviso, confirmar, sons } from "./ui.js";
import {
    api, usuarioAtual, contaDisponivel, textoSincronizacao, salvarAgora, aplicarSaveDoServidor, sairDaConta,
} from "./conta.js";

const MAX_POR_LADO = 10;
const INTERVALO_ATUALIZACAO = 30 * 1000;

let resumo = null;
let erroResumo = null;
let renderizarTela = () => {};

export const aoAtualizarSocial = (fn) => { renderizarTela = fn; };

// ---------------- Dados do servidor ----------------
const acao = (nome, dados = {}) => api("social", { metodo: "POST", corpo: { acao: nome, ...dados } });

export const atualizarSocial = async () => {
    if (!usuarioAtual()) {
        resumo = null;
        atualizarBadges();
        return;
    }
    try {
        resumo = await api("social?acao=resumo");
        erroResumo = null;
        await aplicarEntregas(resumo.entregas);
    } catch (e) {
        erroResumo = e.message;
    }
    atualizarBadges();
    renderizarTela();
};

// Cartas recebidas de trocas (ou devolvidas) entram no álbum deste aparelho
const aplicarEntregas = async (entregas) => {
    if (!entregas?.length) return;
    const aplicadas = new Set(estado.entregasAplicadas || []);
    const novas = entregas.filter((e) => !aplicadas.has(e.id));
    for (const e of novas) {
        e.cartas.forEach((id) => adicionarCarta(id));
        aplicadas.add(e.id);
        sons.raro(3);
        aviso(`${escapar(e.motivo)}: <b>+${e.cartas.length} carta${e.cartas.length > 1 ? "s" : ""}</b>`, "sucesso");
    }
    estado.entregasAplicadas = [...aplicadas].slice(-200);
    if (novas.length) salvar();
    try {
        await salvarAgora();
    } catch (e) {
        return; // confirma na próxima vez, depois que o progresso subir
    }
    // Se o progresso foi trocado pelo da nuvem no meio do caminho, as entregas são aplicadas de novo depois
    const ids = entregas.map((e) => e.id).filter((id) => (estado.entregasAplicadas || []).includes(id));
    if (ids.length) await acao("confirmar-entregas", { ids }).catch(() => {});
};

const trocasRecebidasPendentes = () => (resumo?.trocas || []).filter((t) => !t.enviada && t.status === "pendente");

const atualizarBadges = () => {
    const recebidas = trocasRecebidasPendentes().length;
    const pedidos = resumo?.pedidosRecebidos?.length || 0;
    const bTrocas = $("#badge-trocas");
    if (bTrocas) {
        bTrocas.textContent = recebidas;
        bTrocas.hidden = !recebidas;
    }
    const bConta = $("#badge-conta");
    if (bConta) {
        bConta.textContent = pedidos;
        bConta.hidden = !pedidos;
    }
};

export const iniciarSocial = () => {
    window.addEventListener("conta-mudou", atualizarSocial);
    window.addEventListener("botao-conta-atualizado", atualizarBadges);
    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") atualizarSocial();
    });
    setInterval(() => {
        if (usuarioAtual() && document.visibilityState === "visible") atualizarSocial();
    }, INTERVALO_ATUALIZACAO);
};

// ---------------- Pedaços de HTML ----------------
const avatar = (id, classe = "") =>
    `<img class="avatar-treinador ${classe}" src="${imagemSprite(id || 25)}" alt="" loading="lazy">`;

const htmlPessoa = (p, botoes = "") => `
    <li class="pessoa">
        ${avatar(p.avatar)}
        <div>
            <b>${escapar(p.apelido || p.usuario)}</b>
            <small>@${escapar(p.usuario)}${p.cartas !== undefined ? ` • ${p.cartas}/${TOTAL_CARTAS} cartas` : ""}</small>
        </div>
        <div class="pessoa-botoes">${botoes}</div>
    </li>`;

const miniCartas = (ids, classe = "") =>
    ids.length
        ? ids.map((id) => `<div class="mini-carta ${classe}">${htmlCarta(CARTA_POR_ID[id])}</div>`).join("")
        : `<p class="vazio pequeno">Nada</p>`;

const valorCartas = (ids) => ids.reduce((s, id) => s + RARIDADES[CARTA_POR_ID[id].raridade].venda, 0);

const semConta = (titulo, texto) => `
    <section class="painel sem-conta">
        <h2>${titulo}</h2>
        <p>${texto}</p>
        ${contaDisponivel()
            ? `<button class="btn grande" data-acao="conta">Entrar ou criar conta</button>`
            : `<p class="sutil">As contas funcionam na versão do jogo publicada na Vercel.</p>`}
    </section>`;

// ---------------- Tela: Perfil ----------------
export const telaPerfil = (app) => {
    if (!usuarioAtual()) {
        app.innerHTML = semConta("Perfil de treinador", "Crie uma conta para ter um perfil, adicionar amigos e trocar cartas com eles.");
        return;
    }
    if (!resumo) {
        app.innerHTML = erroResumo
            ? `<section class="painel"><p class="erro-conta">${escapar(erroResumo)}</p><button class="btn" data-social="recarregar">Tentar de novo</button></section>`
            : `<div class="carregando"><div class="pokebola-girando"></div><p>Carregando perfil...</p></div>`;
        if (!erroResumo) atualizarSocial();
        return;
    }
    const p = resumo.perfil;
    const vitrine = (p.vitrine || []).filter((id) => CARTA_POR_ID[id]);
    app.innerHTML = `
    <section class="perfil-topo">
        <div class="perfil-avatar">${avatar(p.avatar, "grande")}</div>
        <div class="perfil-info">
            <span class="etiqueta">Treinador</span>
            <h1>${escapar(p.apelido)}</h1>
            <p class="sutil">@${escapar(p.usuario)}</p>
            <p class="perfil-bio">${p.bio ? escapar(p.bio) : "<i>Sem bio ainda. Conte algo sobre você!</i>"}</p>
            <div class="perfil-numeros">
                <div><b>${cartasUnicas()}</b><small>de ${TOTAL_CARTAS} cartas</small></div>
                <div><b>${numero(estado.stats.pacotes)}</b><small>pacotes abertos</small></div>
                <div><b>${resumo.amigos.length}</b><small>amigos</small></div>
            </div>
            <button class="btn secundario" data-social="editar-perfil">Editar perfil</button>
        </div>
        <div class="perfil-vitrine">
            <h3>Vitrine</h3>
            <div class="vitrine-cartas">
                ${[0, 1, 2].map((i) => vitrine[i]
                    ? `<div class="mini-carta">${htmlCarta(CARTA_POR_ID[vitrine[i]])}</div>`
                    : `<button class="vitrine-vazia" data-social="editar-perfil">+</button>`).join("")}
            </div>
        </div>
    </section>

    <div class="grade-painel">
        <section class="painel">
            <h2>Amigos</h2>
            <form id="form-amigo" class="linha-form">
                <input name="usuario" placeholder="Nome de usuário do amigo" autocomplete="off" autocapitalize="none" spellcheck="false" maxlength="20" required>
                <button class="btn" type="submit">Adicionar</button>
            </form>
            ${resumo.pedidosRecebidos.length ? `
                <h3>Pedidos de amizade</h3>
                <ul class="lista-pessoas">${resumo.pedidosRecebidos.map((x) => htmlPessoa(x, `
                    <button class="btn pequeno" data-social="aceitar-amigo" data-id="${x.id}">Aceitar</button>
                    <button class="btn pequeno secundario" data-social="recusar-amigo" data-id="${x.id}">Recusar</button>`)).join("")}
                </ul>` : ""}
            ${resumo.pedidosEnviados.length ? `
                <h3>Esperando resposta</h3>
                <ul class="lista-pessoas">${resumo.pedidosEnviados.map((x) => htmlPessoa(x, `
                    <button class="btn pequeno secundario" data-social="recusar-amigo" data-id="${x.id}">Cancelar</button>`)).join("")}
                </ul>` : ""}
            <h3>Seus amigos (${resumo.amigos.length})</h3>
            ${resumo.amigos.length
                ? `<ul class="lista-pessoas">${resumo.amigos.map((x) => htmlPessoa(x, `
                    <button class="btn pequeno secundario" data-social="ver-amigo" data-usuario="${x.usuario}">Perfil</button>
                    <button class="btn pequeno" data-social="nova-troca" data-usuario="${x.usuario}">Trocar</button>`)).join("")}</ul>`
                : `<p class="vazio">Você ainda não tem amigos. Peça o nome de usuário de alguém e adicione acima!</p>`}
        </section>

        <section class="painel">
            <h2>Conta</h2>
            <p>Seu nome de usuário é <b>@${escapar(p.usuario)}</b>. É ele que seus amigos usam para te adicionar.</p>
            <p class="sutil">${textoSincronizacao()}</p>
            <p class="sutil">Autenticação de 2 fatores: <b class="texto-verde">ativada</b></p>
            <div class="acoes-carta">
                <button class="btn secundario" data-social="salvar-agora">Salvar agora</button>
                <button class="btn secundario" data-social="trocar-senha">Trocar senha</button>
                <button class="btn perigo" data-social="sair">Sair da conta</button>
            </div>
        </section>
    </div>`;

    $("#form-amigo").addEventListener("submit", async (e) => {
        e.preventDefault();
        const usuario = e.target.usuario.value.trim();
        try {
            const r = await acao("adicionar-amigo", { usuario });
            sons.moeda();
            aviso(r.aceito ? `Agora você e <b>@${escapar(usuario)}</b> são amigos!` : `Pedido enviado para <b>@${escapar(usuario)}</b>.`, "sucesso");
            await atualizarSocial();
        } catch (err) {
            sons.erro();
            aviso(escapar(err.message), "erro");
        }
    });
};

// ---------------- Editar perfil ----------------
const modalEditarPerfil = () => {
    const p = resumo.perfil;
    let avatarEscolhido = p.avatar;
    const vitrine = new Set((p.vitrine || []).filter((id) => quantidade(id)));
    const minhasCartas = CARTAS.filter((c) => quantidade(c.id)).sort((a, b) => b.raridade - a.raridade || a.numero - b.numero);

    abrirModal(`
        <h3>Editar perfil</h3>
        <form id="form-perfil" class="form-conta">
            <label>Apelido
                <input name="apelido" maxlength="24" value="${escapar(p.apelido === p.usuario ? "" : p.apelido)}" placeholder="${escapar(p.usuario)}">
            </label>
            <label>Bio <small class="sutil" id="contador-bio"></small>
                <textarea name="bio" maxlength="140" rows="2" placeholder="Ex.: Caçando o Charizard coroa!">${escapar(p.bio)}</textarea>
            </label>
            <div class="campo">
                <span class="rotulo">Avatar</span>
                <input type="search" id="busca-avatar" placeholder="Buscar Pokémon">
                <div class="grade-avatares" id="grade-avatares">
                    ${Object.values(POKEMON_POR_ID).map((pk) => `
                        <button type="button" class="opcao-avatar ${pk.id === avatarEscolhido ? "escolhido" : ""}" data-avatar="${pk.id}" data-nome="${pk.nome}" title="${nomeBonito(pk.nome)}">
                            <img src="${imagemSprite(pk.id)}" alt="${nomeBonito(pk.nome)}" loading="lazy">
                        </button>`).join("")}
                </div>
            </div>
            <div class="campo">
                <span class="rotulo">Vitrine: escolha até 3 cartas para mostrar (<span id="qtd-vitrine">${vitrine.size}</span>/3)</span>
                ${minhasCartas.length
                    ? `<div class="grade-escolha">${minhasCartas.map((c) => `
                        <button type="button" class="opcao-carta ${vitrine.has(c.id) ? "escolhido" : ""}" data-carta="${c.id}">${htmlCarta(c)}</button>`).join("")}</div>`
                    : `<p class="vazio">Abra pacotes para ter cartas na vitrine.</p>`}
            </div>
            <p id="erro-conta" class="erro-conta" hidden></p>
            <div class="modal-botoes">
                <button class="btn secundario" type="button" data-acao="fechar-modal">Cancelar</button>
                <button class="btn" type="submit">Salvar perfil</button>
            </div>
        </form>`, "largo");

    const form = $("#form-perfil");
    const contador = () => { $("#contador-bio").textContent = `${form.bio.value.length}/140`; };
    contador();
    form.bio.addEventListener("input", contador);
    $("#busca-avatar").addEventListener("input", (e) => {
        const busca = e.target.value.trim().toLowerCase();
        $$(".opcao-avatar").forEach((b) => { b.hidden = busca && !b.dataset.nome.includes(busca) && b.dataset.avatar !== busca; });
    });
    $("#grade-avatares").addEventListener("click", (e) => {
        const b = e.target.closest(".opcao-avatar");
        if (!b) return;
        avatarEscolhido = Number(b.dataset.avatar);
        $$(".opcao-avatar.escolhido").forEach((x) => x.classList.remove("escolhido"));
        b.classList.add("escolhido");
    });
    form.addEventListener("click", (e) => {
        const b = e.target.closest(".opcao-carta");
        if (!b) return;
        const id = b.dataset.carta;
        if (vitrine.has(id)) vitrine.delete(id);
        else if (vitrine.size < 3) vitrine.add(id);
        else return aviso("A vitrine tem espaço para 3 cartas.", "erro");
        b.classList.toggle("escolhido", vitrine.has(id));
        $("#qtd-vitrine").textContent = vitrine.size;
    });
    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        try {
            await salvarAgora();
            await acao("editar-perfil", { apelido: form.apelido.value, bio: form.bio.value, avatar: avatarEscolhido, vitrine: [...vitrine] });
            fecharModal();
            aviso("Perfil atualizado!", "sucesso");
            await atualizarSocial();
        } catch (err) {
            $("#erro-conta").textContent = err.message;
            $("#erro-conta").hidden = false;
        }
    });
};

const modalTrocarSenha = () => {
    abrirModal(`
        <h3>Trocar senha</h3>
        <form id="form-senha" class="form-conta">
            <label>Senha atual <input name="atual" type="password" autocomplete="current-password" required></label>
            <label>Nova senha <input name="nova" type="password" autocomplete="new-password" minlength="8" maxlength="128" required></label>
            <label>Repita a nova senha <input name="nova2" type="password" autocomplete="new-password" minlength="8" maxlength="128" required></label>
            <p id="erro-conta" class="erro-conta" hidden></p>
            <button class="btn grande" type="submit">Trocar senha</button>
        </form>`, "pequeno");
    const form = $("#form-senha");
    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const erro = $("#erro-conta");
        if (form.nova.value !== form.nova2.value) {
            erro.textContent = "As senhas novas não são iguais.";
            erro.hidden = false;
            return;
        }
        try {
            await acao("trocar-senha", { atual: form.atual.value, nova: form.nova.value });
            fecharModal();
            aviso("Senha trocada com sucesso.", "sucesso");
        } catch (err) {
            erro.textContent = err.message;
            erro.hidden = false;
        }
    });
};

// ---------------- Perfil de um amigo ----------------
const modalPerfilAmigo = async (usuario) => {
    abrirModal(`<div class="carregando"><div class="pokebola-girando"></div><p>Carregando...</p></div>`, "largo");
    try {
        const p = await api(`social?acao=perfil&usuario=${encodeURIComponent(usuario)}`);
        const vitrine = (p.vitrine || []).filter((id) => CARTA_POR_ID[id]);
        abrirModal(`
            <div class="perfil-topo no-modal">
                <div class="perfil-avatar">${avatar(p.avatar, "grande")}</div>
                <div class="perfil-info">
                    <h3>${escapar(p.apelido)}</h3>
                    <p class="sutil">@${escapar(p.usuario)}</p>
                    <p class="perfil-bio">${p.bio ? escapar(p.bio) : "<i>Sem bio.</i>"}</p>
                    <div class="perfil-numeros">
                        <div><b>${p.cartas}</b><small>de ${TOTAL_CARTAS} cartas</small></div>
                        <div><b>${numero(p.pacotes)}</b><small>pacotes abertos</small></div>
                    </div>
                </div>
            </div>
            ${vitrine.length ? `<h3>Vitrine</h3><div class="vitrine-cartas">${miniCartas(vitrine)}</div>` : ""}
            <div class="modal-botoes">
                ${p.amigo ? `<button class="btn perigo" data-social="remover-amigo" data-usuario="${p.usuario}">Desfazer amizade</button>
                <button class="btn" data-social="nova-troca" data-usuario="${p.usuario}">Propor troca</button>` : ""}
            </div>`, "largo");
    } catch (e) {
        abrirModal(`<p class="erro-conta">${escapar(e.message)}</p>`, "pequeno");
    }
};

// ---------------- Montar uma troca ----------------
const escolherAmigoParaTroca = () => {
    if (!resumo?.amigos.length) {
        abrirModal(`
            <h3>Nova troca</h3>
            <p class="modal-texto">Você precisa ter amigos para trocar cartas. Adicione alguém pelo nome de usuário na tela de perfil.</p>
            <div class="modal-botoes"><a class="btn" href="#perfil" data-acao="fechar-modal">Ir para o perfil</a></div>`, "pequeno");
        return;
    }
    abrirModal(`
        <h3>Trocar com quem?</h3>
        <ul class="lista-pessoas">${resumo.amigos.map((x) => htmlPessoa(x, `
            <button class="btn pequeno" data-social="nova-troca" data-usuario="${x.usuario}">Escolher</button>`)).join("")}
        </ul>`, "pequeno");
};

const modalNovaTroca = async (usuario) => {
    abrirModal(`<div class="carregando"><div class="pokebola-girando"></div><p>Abrindo o álbum de @${escapar(usuario)}...</p></div>`, "largo");
    let amigo;
    try {
        amigo = await api(`social?acao=perfil&usuario=${encodeURIComponent(usuario)}`);
        if (!amigo.amigo) throw new Error("Vocês precisam ser amigos para trocar cartas.");
    } catch (e) {
        abrirModal(`<p class="erro-conta">${escapar(e.message)}</p>`, "pequeno");
        return;
    }

    const selecao = { da: [], quer: [] };
    const donos = { da: estado.colecao, quer: amigo.colecao || {} };
    let lado = "da";
    let busca = "";

    abrirModal(`
        <h3>Troca com ${escapar(amigo.apelido)}</h3>
        <div class="resumo-troca">
            <div class="lado-troca"><h4>Você dá <span id="qtd-da">0</span>/${MAX_POR_LADO}</h4><div class="chips-troca" id="chips-da"></div></div>
            <div class="seta">⇄</div>
            <div class="lado-troca"><h4>Você pede <span id="qtd-quer">0</span>/${MAX_POR_LADO}</h4><div class="chips-troca" id="chips-quer"></div></div>
        </div>
        <p class="sutil centro" id="valor-troca"></p>
        <div class="abas-conta">
            <button class="ativa" data-lado="da">Suas cartas</button>
            <button data-lado="quer">Cartas de @${escapar(amigo.usuario)}</button>
        </div>
        <input type="search" id="busca-troca" class="campo-busca" placeholder="Buscar carta por nome ou número">
        <div class="grade-escolha alta" id="grade-troca"></div>
        <form id="form-troca" class="form-conta">
            <input name="mensagem" maxlength="140" placeholder="Mensagem (opcional)">
            <p id="erro-conta" class="erro-conta" hidden></p>
            <p class="sutil">As cartas que você oferecer ficam reservadas até @${escapar(amigo.usuario)} responder. Se a troca for recusada ou cancelada, elas voltam para você.</p>
            <button class="btn grande" type="submit">Enviar proposta</button>
        </form>`, "largo");

    const desenharGrade = () => {
        const dono = donos[lado];
        const lista = CARTAS
            .filter((c) => dono[c.id] > 0)
            .filter((c) => !busca || c.nome.toLowerCase().includes(busca) || c.id.includes(busca))
            .sort((a, b) => b.raridade - a.raridade || a.numero - b.numero);
        $("#grade-troca").innerHTML = lista.length
            ? lista.map((c) => {
                const usadas = selecao[lado].filter((id) => id === c.id).length;
                return `<button type="button" class="opcao-carta ${usadas ? "escolhido" : ""}" data-carta="${c.id}">
                    ${htmlCarta(c, { qtd: dono[c.id] })}
                    ${usadas ? `<span class="selo-escolha">${usadas}</span>` : ""}
                </button>`;
            }).join("")
            : `<p class="vazio">${lado === "da" ? "Você não tem cartas" : `@${escapar(amigo.usuario)} não tem cartas`}${busca ? " com essa busca" : ""}.</p>`;
    };
    const desenharResumo = () => {
        for (const l of ["da", "quer"]) {
            $(`#qtd-${l}`).textContent = selecao[l].length;
            $(`#chips-${l}`).innerHTML = selecao[l].length
                ? selecao[l].map((id, i) => `<button type="button" class="chip-carta" data-lado="${l}" data-i="${i}" title="Remover">${htmlCarta(CARTA_POR_ID[id])}</button>`).join("")
                : `<p class="vazio pequeno">Nenhuma</p>`;
        }
        $("#valor-troca").innerHTML = `Valor de venda: você dá <i class="ic-moeda"></i> ${valorCartas(selecao.da)} • você recebe <i class="ic-moeda"></i> ${valorCartas(selecao.quer)}`;
    };
    desenharGrade();
    desenharResumo();

    $$(".abas-conta [data-lado]").forEach((b) => b.addEventListener("click", () => {
        lado = b.dataset.lado;
        $$(".abas-conta [data-lado]").forEach((x) => x.classList.toggle("ativa", x === b));
        desenharGrade();
    }));
    $("#busca-troca").addEventListener("input", (e) => {
        busca = e.target.value.trim().toLowerCase();
        desenharGrade();
    });
    $("#grade-troca").addEventListener("click", (e) => {
        const b = e.target.closest(".opcao-carta");
        if (!b) return;
        const id = b.dataset.carta;
        const usadas = selecao[lado].filter((x) => x === id).length;
        if (selecao[lado].length >= MAX_POR_LADO) return aviso(`No máximo ${MAX_POR_LADO} cartas de cada lado.`, "erro");
        if (usadas >= donos[lado][id]) return aviso("Não há mais cópias dessa carta.", "erro");
        selecao[lado].push(id);
        sons.clique();
        desenharGrade();
        desenharResumo();
    });
    $(".resumo-troca").addEventListener("click", (e) => {
        const b = e.target.closest(".chip-carta");
        if (!b) return;
        selecao[b.dataset.lado].splice(Number(b.dataset.i), 1);
        desenharGrade();
        desenharResumo();
    });
    $("#form-troca").addEventListener("submit", async (e) => {
        e.preventDefault();
        const erro = $("#erro-conta");
        const botao = e.target.querySelector("button[type=submit]");
        if (!selecao.da.length && !selecao.quer.length) {
            erro.textContent = "Escolha pelo menos uma carta.";
            erro.hidden = false;
            return;
        }
        botao.disabled = true;
        try {
            await salvarAgora();
            const r = await acao("propor-troca", { para: amigo.usuario, da: selecao.da, quer: selecao.quer, mensagem: e.target.mensagem.value });
            aplicarSaveDoServidor(r.save);
            fecharModal();
            sons.moeda();
            aviso(`Proposta enviada para <b>@${escapar(amigo.usuario)}</b>!`, "sucesso");
            location.hash = "trocas/amigos";
            await atualizarSocial();
        } catch (err) {
            botao.disabled = false;
            erro.textContent = err.message;
            erro.hidden = false;
        }
    });
};

// ---------------- Trocas com amigos (aba da tela de trocas) ----------------
const ROTULOS_STATUS = {
    pendente: "Esperando resposta",
    aceita: "Troca feita",
    recusada: "Recusada",
    cancelada: "Cancelada",
    expirada: "Expirou",
    processando: "Processando",
};

const htmlTroca = (t) => {
    // Do meu ponto de vista: o que eu dou e o que eu recebo
    const dou = t.enviada ? t.da : t.quer;
    const recebo = t.enviada ? t.quer : t.da;
    const podeAceitar = !t.enviada && t.status === "pendente";
    const tenhoTudo = Object.entries(dou.reduce((m, id) => ({ ...m, [id]: (m[id] || 0) + 1 }), {})).every(([id, q]) => quantidade(id) >= q);
    return `
    <article class="oferta troca-amigo status-${t.status}">
        <header>
            ${avatar(t.com.avatar, "avatar")}
            <div>
                <b>${escapar(t.com.apelido)}</b>
                <small>@${escapar(t.com.usuario)} • ${t.enviada ? "você propôs" : "propôs para você"}</small>
            </div>
            <span class="tipo-oferta">${ROTULOS_STATUS[t.status] || t.status}</span>
        </header>
        ${t.mensagem ? `<p class="mensagem-troca">“${escapar(t.mensagem)}”</p>` : ""}
        <div class="lados">
            <div class="lado-oferta"><h4>Você dá${t.enviada && t.status === "pendente" ? " (reservadas)" : ""}</h4><div class="cartas-oferta">${miniCartas(dou)}</div></div>
            <div class="seta">⇄</div>
            <div class="lado-oferta"><h4>Você recebe</h4><div class="cartas-oferta">${miniCartas(recebo)}</div></div>
        </div>
        ${podeAceitar ? `
        <div class="modal-botoes">
            <button class="btn secundario" data-social="recusar-troca" data-id="${t.id}">Recusar</button>
            <button class="btn" data-social="aceitar-troca" data-id="${t.id}" ${tenhoTudo ? "" : "disabled"}>
                ${tenhoTudo ? "Aceitar troca" : "Você não tem as cartas pedidas"}
            </button>
        </div>` : ""}
        ${t.enviada && t.status === "pendente" ? `
        <div class="modal-botoes">
            <button class="btn secundario" data-social="cancelar-troca" data-id="${t.id}">Cancelar proposta</button>
        </div>` : ""}
    </article>`;
};

export const htmlTrocasAmigos = () => {
    if (!usuarioAtual()) return semConta("Trocas com amigos", "Entre na sua conta para trocar cartas com seus amigos.");
    if (!resumo) {
        if (!erroResumo) atualizarSocial();
        return erroResumo
            ? `<p class="erro-conta">${escapar(erroResumo)}</p>`
            : `<div class="carregando"><div class="pokebola-girando"></div><p>Carregando trocas...</p></div>`;
    }
    const pendentes = resumo.trocas.filter((t) => t.status === "pendente");
    const recebidas = pendentes.filter((t) => !t.enviada);
    const enviadas = pendentes.filter((t) => t.enviada);
    const historico = resumo.trocas.filter((t) => t.status !== "pendente");
    return `
        <div class="barra-acoes">
            <p class="sutil">Proponha trocas para seus amigos. As propostas expiram em 7 dias.</p>
            <button class="btn" data-social="escolher-amigo">Nova troca</button>
        </div>
        <h2>Recebidas (${recebidas.length})</h2>
        ${recebidas.length ? `<div class="lista-ofertas">${recebidas.map(htmlTroca).join("")}</div>` : `<p class="vazio">Nenhuma proposta recebida.</p>`}
        <h2>Enviadas (${enviadas.length})</h2>
        ${enviadas.length ? `<div class="lista-ofertas">${enviadas.map(htmlTroca).join("")}</div>` : `<p class="vazio">Você não tem propostas esperando resposta.</p>`}
        ${historico.length ? `<h2>Últimos 7 dias</h2><div class="lista-ofertas">${historico.map(htmlTroca).join("")}</div>` : ""}`;
};

export const quantidadeTrocasRecebidas = () => trocasRecebidasPendentes().length;

// ---------------- Ações (botões com data-social) ----------------
const executar = async (fn, sucesso) => {
    try {
        await fn();
        if (sucesso) aviso(sucesso, "sucesso");
    } catch (e) {
        sons.erro();
        aviso(escapar(e.message), "erro");
    }
    await atualizarSocial();
};

const ACOES = {
    recarregar: () => { erroResumo = null; renderizarTela(); atualizarSocial(); },
    "editar-perfil": () => resumo && modalEditarPerfil(),
    "trocar-senha": modalTrocarSenha,
    "salvar-agora": () => executar(salvarAgora, "Progresso salvo na nuvem."),
    sair: sairDaConta,
    "aceitar-amigo": (el) => executar(() => acao("responder-amigo", { id: el.dataset.id, aceitar: true }), "Pedido aceito! Agora vocês são amigos."),
    "recusar-amigo": (el) => executar(() => acao("responder-amigo", { id: el.dataset.id, aceitar: false })),
    "ver-amigo": (el) => modalPerfilAmigo(el.dataset.usuario),
    "remover-amigo": async (el) => {
        if (!(await confirmar("Desfazer amizade?", `Vocês não poderão mais trocar cartas. Propostas pendentes entre vocês serão canceladas.`, "Desfazer"))) return;
        await executar(() => acao("remover-amigo", { usuario: el.dataset.usuario }), "Amizade desfeita.");
    },
    "escolher-amigo": escolherAmigoParaTroca,
    "nova-troca": (el) => modalNovaTroca(el.dataset.usuario),
    "cancelar-troca": async (el) => {
        if (!(await confirmar("Cancelar proposta?", "As cartas reservadas voltam para o seu álbum.", "Cancelar proposta"))) return;
        await executar(() => acao("cancelar-troca", { id: el.dataset.id }), "Proposta cancelada.");
    },
    "recusar-troca": async (el) => {
        if (!(await confirmar("Recusar troca?", "A proposta será descartada.", "Recusar"))) return;
        await executar(() => acao("responder-troca", { id: el.dataset.id, aceitar: false }), "Troca recusada.");
    },
    "aceitar-troca": async (el) => {
        const t = resumo?.trocas.find((x) => x.id === Number(el.dataset.id));
        if (!t) return;
        el.disabled = true;
        try {
            await salvarAgora();
            const r = await acao("responder-troca", { id: t.id, aceitar: true });
            aplicarSaveDoServidor(r.save);
            sons.raro(Math.max(...t.da.map((id) => CARTA_POR_ID[id].raridade), 3));
            abrirModal(`
                <h3>Troca feita com ${escapar(t.com.apelido)}!</h3>
                <p class="sutil">Cartas que chegaram ao seu álbum:</p>
                <div class="grade-cartas resumo-cartas">${t.da.map((id, i) => `<div class="entrada" style="animation-delay:${i * 90}ms">${htmlCarta(CARTA_POR_ID[id], { classe: "tilt" })}</div>`).join("") || `<p class="vazio">Foi um presente seu. Que gentileza!</p>`}</div>
                <div class="modal-botoes"><button class="btn" data-acao="fechar-modal">Legal!</button></div>`, "largo");
        } catch (e) {
            el.disabled = false;
            sons.erro();
            aviso(escapar(e.message), "erro");
        }
        await atualizarSocial();
    },
};

document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-social]");
    if (!el || el.disabled) return;
    const fn = ACOES[el.dataset.social];
    if (!fn) return;
    e.preventDefault();
    sons.clique();
    fn(el);
});
