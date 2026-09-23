// ====================================================
// Conta do jogador: login com usuário, senha e 2FA
// e sincronização do progresso com a nuvem
// ====================================================
import { estado, salvar, aoSalvar, substituirEstado, temProgresso, limparSaveLocal } from "./state.js";
import { $, $$, abrirModal, fecharModal, aviso, escapar, confirmar, sons } from "./ui.js";
import { iniciarDemoLogin, pararDemoLogin } from "./login-demo.js";

const conta = {
    disponivel: false, // false quando o site está sem servidor (ex.: GitHub Pages)
    usuario: null,
    sincronizacao: "", // "salvando" | "salvo" | "erro"
    ultimoEnvio: null,
};

// ---------------- Comunicação com o servidor ----------------
const api = async (caminho, { metodo = "GET", corpo } = {}) => {
    const r = await fetch(`/api/${caminho}`, {
        method: metodo,
        credentials: "same-origin",
        headers: corpo ? { "Content-Type": "application/json" } : {},
        body: corpo ? JSON.stringify(corpo) : undefined,
    });
    let dados = {};
    try {
        dados = await r.json();
    } catch (e) { /* resposta sem JSON */ }
    if (!r.ok) {
        const erro = new Error(dados.erro || "Não foi possível falar com o servidor.");
        erro.status = r.status;
        erro.dados = dados;
        throw erro;
    }
    return dados;
};

// ---------------- Sincronização ----------------
let temporizador = null;
let envioPendente = false;

const enviarSave = async () => {
    if (!conta.usuario) return;
    envioPendente = false;
    conta.sincronizacao = "salvando";
    atualizarBotao();
    const dados = JSON.parse(JSON.stringify(estado));
    try {
        await api("save", { metodo: "PUT", corpo: { dados, base: estado.nuvemBase || 0 } });
        estado.nuvemBase = dados.salvoEm;
        localStorage.setItem("pokepocket_save_v1", JSON.stringify(estado));
        conta.sincronizacao = "salvo";
        conta.ultimoEnvio = new Date();
    } catch (e) {
        if (e.status === 409 && e.dados?.dados) {
            // Outro aparelho salvou algo mais novo: usamos o progresso da nuvem
            usarNuvem(e.dados.dados);
            aviso("Seu progresso foi atualizado com o que você jogou em outro aparelho.");
        } else if (e.status === 401) {
            desconectado();
        } else {
            conta.sincronizacao = "erro";
            agendarEnvio(15000); // tenta de novo mais tarde
        }
    }
    atualizarBotao();
};

// Troca o progresso deste aparelho pelo da nuvem sem reenviá-lo
const usarNuvem = (nuvem) => {
    carregandoNuvem = true;
    substituirEstado({ ...nuvem, conta: conta.usuario, nuvemBase: nuvem.salvoEm || 0 });
    estado.salvoEm = nuvem.salvoEm || 0;
    localStorage.setItem("pokepocket_save_v1", JSON.stringify(estado));
    carregandoNuvem = false;
    conta.sincronizacao = "salvo";
    conta.ultimoEnvio = new Date();
};
let carregandoNuvem = false;

const agendarEnvio = (espera = 1500) => {
    if (!conta.usuario || carregandoNuvem) return;
    envioPendente = true;
    clearTimeout(temporizador);
    temporizador = setTimeout(enviarSave, espera);
};

// Garante o envio ao fechar a aba
const enviarAoSair = () => {
    if (!conta.usuario || !envioPendente) return;
    clearTimeout(temporizador);
    const blob = new Blob([JSON.stringify({ dados: estado, base: estado.nuvemBase || 0 })], { type: "application/json" });
    navigator.sendBeacon?.("/api/save", blob);
    envioPendente = false;
};

// Decide qual progresso usar ao conectar: o da nuvem ou o deste aparelho
const sincronizarAoConectar = async (usuario, { perguntar = true } = {}) => {
    const { dados: nuvem } = await api("save");
    const localEhDaConta = estado.conta === usuario;
    const localSemDono = !estado.conta;

    if (!nuvem) {
        // Conta nova: leva o progresso atual (se ele não for de outra conta)
        if (!localEhDaConta && !localSemDono) substituirEstado({ som: estado.som });
        estado.conta = usuario;
        estado.nuvemBase = 0;
        salvar();
        return enviarSave();
    }
    const versaoNuvem = nuvem.salvoEm || 0;
    if (localEhDaConta && estado.nuvemBase === versaoNuvem) {
        // A nuvem não mudou desde a última sincronização: sobe o que foi jogado aqui (se houver)
        if ((estado.salvoEm || 0) > versaoNuvem) return enviarSave();
        conta.sincronizacao = "salvo";
        return;
    }
    if (localSemDono && temProgresso() && perguntar) {
        const usarAparelho = await perguntarConflito(nuvem);
        if (usarAparelho) {
            estado.conta = usuario;
            estado.nuvemBase = versaoNuvem;
            salvar();
            return enviarSave();
        }
    }
    usarNuvem(nuvem);
};

const resumo = (s) => `${Object.keys(s.colecao || {}).length} cartas diferentes • ${s.moedas ?? 0} moedas • ${s.stats?.pacotes ?? 0} pacotes abertos`;

const perguntarConflito = (nuvem) =>
    new Promise((resolve) => {
        abrirModal(`
            <h3>Qual progresso usar?</h3>
            <p class="modal-texto">Esta conta já tem um progresso salvo, e você também jogou neste aparelho sem estar conectado.</p>
            <div class="escolha-save">
                <button class="opcao-save" data-escolha="nuvem">
                    <b>Progresso da conta</b><small>${resumo(nuvem)}</small>
                </button>
                <button class="opcao-save" data-escolha="aparelho">
                    <b>Progresso deste aparelho</b><small>${resumo(estado)}</small>
                </button>
            </div>
            <p class="sutil">O progresso que você não escolher será substituído.</p>`, "pequeno");
        $$("[data-escolha]").forEach((b) => b.addEventListener("click", () => {
            fecharModal();
            resolve(b.dataset.escolha === "aparelho");
        }));
    });

const avisarMudancaConta = () => window.dispatchEvent(new CustomEvent("conta-mudou", { detail: conta.usuario }));

const conectado = async (usuario, opcoes) => {
    conta.usuario = usuario;
    atualizarBotao();
    try {
        await sincronizarAoConectar(usuario, opcoes);
    } catch (e) {
        aviso("Não foi possível carregar o progresso da nuvem. Tentaremos de novo.", "erro");
        agendarEnvio(15000);
    }
    atualizarBotao();
    avisarMudancaConta();
};

const desconectado = () => {
    conta.usuario = null;
    conta.sincronizacao = "";
    atualizarBotao();
    avisarMudancaConta();
    mostrarTelaLogin("Sua sessão terminou. Entre de novo para continuar.");
};

// ---------------- Botão no cabeçalho ----------------
const atualizarBotao = () => {
    const botao = $("#btn-conta");
    if (!botao) return;
    botao.hidden = !conta.disponivel;
    if (!conta.usuario) {
        botao.innerHTML = `<span class="avatar-conta"></span><span>Entrar</span>`;
        botao.title = "Entrar ou criar conta";
        return;
    }
    const status = { salvando: "salvando...", salvo: "salvo", erro: "não salvo" }[conta.sincronizacao] || "";
    botao.innerHTML = `<span class="avatar-conta conectado"></span><span>${escapar(conta.usuario)}</span><small class="sync-${conta.sincronizacao}">${status}</small>`;
    window.dispatchEvent(new CustomEvent("botao-conta-atualizado"));
    botao.title = "Sua conta";
};

// ---------------- Telas (modais) ----------------
const erroForm = (msg) => {
    const el = $("#erro-conta");
    if (el) {
        el.textContent = msg;
        el.hidden = !msg;
    }
    if (msg) sons.erro();
};

// ---------------- Tela de entrada (obrigatória para jogar) ----------------
const painel = (html) => {
    $("#login-conteudo").innerHTML = html;
    $("#tela-login").scrollTo?.({ top: 0 });
};

const mostrarTelaLogin = (mensagem = "") => {
    document.body.classList.add("bloqueado");
    iniciarDemoLogin();
    fecharModal();
    telaEntrar();
    if (mensagem) erroForm(mensagem);
};

const liberarJogo = () => {
    document.body.classList.remove("bloqueado");
    pararDemoLogin();
    window.scrollTo({ top: 0 });
};

const carregando = (form, ativo) => {
    $$("button, input", form).forEach((el) => { el.disabled = ativo; });
};

const telaEntrar = (aba = "entrar") => {
    const cadastro = aba === "cadastro";
    painel(`
        <div class="abas-conta">
            <button class="${cadastro ? "" : "ativa"}" data-aba="entrar">Entrar</button>
            <button class="${cadastro ? "ativa" : ""}" data-aba="cadastro">Criar conta</button>
        </div>
        <p class="sutil">${cadastro
            ? "Crie sua conta para começar a colecionar. Seu progresso fica salvo na nuvem e você joga em qualquer aparelho."
            : "Entre com seu usuário e senha para continuar sua coleção."}</p>
        <form id="form-conta" class="form-conta" autocomplete="on">
            <label>Usuário
                <input name="usuario" autocomplete="username" required minlength="3" maxlength="20"
                       pattern="[A-Za-z0-9_]{3,20}" autocapitalize="none" spellcheck="false">
            </label>
            <label>Senha
                <input name="senha" type="password" autocomplete="${cadastro ? "new-password" : "current-password"}" required minlength="${cadastro ? 8 : 1}" maxlength="128">
            </label>
            ${cadastro ? `
            <label>Repita a senha
                <input name="senha2" type="password" autocomplete="new-password" required minlength="8" maxlength="128">
            </label>
            <p class="sutil">Usuário: 3 a 20 letras, números ou _. Senha: pelo menos 8 caracteres.</p>` : ""}
            <p id="erro-conta" class="erro-conta" hidden></p>
            <button class="btn grande" type="submit">${cadastro ? "Criar conta" : "Entrar"}</button>
        </form>
        <p class="login-rodape">${cadastro
            ? `Já tem conta? <a href="#" data-aba="entrar">Entrar</a>`
            : `Ainda não tem conta? <a href="#" data-aba="cadastro">Criar conta grátis</a>`}</p>
        ${cadastro && temProgresso() ? `<p class="sutil login-aviso">Você já jogava neste aparelho sem conta? Seu progresso vai junto para a conta nova.</p>` : ""}`);

    $$("[data-aba]").forEach((b) => b.addEventListener("click", (e) => {
        e.preventDefault();
        telaEntrar(b.dataset.aba);
    }));
    const form = $("#form-conta");
    form.usuario.focus();
    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const usuario = form.usuario.value.trim();
        const senha = form.senha.value;
        if (cadastro && senha !== form.senha2.value) return erroForm("As senhas não são iguais.");
        erroForm("");
        carregando(form, true);
        try {
            const r = await api(cadastro ? "auth/cadastro" : "auth/entrar", { metodo: "POST", corpo: { usuario, senha } });
            if (r.etapa === "configurar-2fa") telaConfigurar2fa(r);
            else telaCodigo();
        } catch (err) {
            carregando(form, false);
            erroForm(err.message);
        }
    });
};

const formatarChave = (chave) => chave.replace(/(.{4})/g, "$1 ").trim();

const telaConfigurar2fa = ({ qr, segredo, usuario }) => {
    painel(`
        <h3>Proteja sua conta</h3>
        <p class="sutil">A autenticação de 2 fatores é obrigatória. Além da senha, você vai precisar de um código do celular para entrar.</p>
        <ol class="passos-2fa">
            <li>Instale um app autenticador no celular: <b>Google Authenticator</b>, <b>Microsoft Authenticator</b> ou <b>Authy</b>.</li>
            <li>No app, toque em <b>adicionar</b> e escaneie o QR code:
                <img class="qr-2fa" src="${qr}" alt="QR code para o app autenticador">
                <small>Não consegue escanear? Digite esta chave no app:</small>
                <code class="chave-2fa">${formatarChave(segredo)}</code>
            </li>
            <li>Digite o código de 6 dígitos que aparece no app para a conta <b>${escapar(usuario)}</b>:</li>
        </ol>
        <form id="form-conta" class="form-conta">
            <input name="codigo" class="campo-codigo" inputmode="numeric" autocomplete="one-time-code"
                   pattern="[0-9 ]{6,7}" maxlength="7" placeholder="000000" required>
            <p id="erro-conta" class="erro-conta" hidden></p>
            <button class="btn grande" type="submit">Ativar e entrar</button>
        </form>`);
    ligarFormCodigo(usuario);
};

const telaCodigo = () => {
    painel(`
        <h3>Código de verificação</h3>
        <p class="sutil">Abra o app autenticador no celular e digite o código de 6 dígitos da conta Pokédex Pocket.</p>
        <form id="form-conta" class="form-conta">
            <input name="codigo" class="campo-codigo" autocomplete="one-time-code" maxlength="11" placeholder="000000" required>
            <p id="erro-conta" class="erro-conta" hidden></p>
            <button class="btn grande" type="submit">Entrar</button>
        </form>
        <p class="sutil">Perdeu o celular? Digite um dos seus <b>códigos de recuperação</b> no lugar do código.</p>`);
    ligarFormCodigo();
};

const ligarFormCodigo = () => {
    const form = $("#form-conta");
    form.codigo.focus();
    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        erroForm("");
        carregando(form, true);
        try {
            const r = await api("auth/verificar", { metodo: "POST", corpo: { codigo: form.codigo.value } });
            sons.moeda();
            if (r.codigosRecuperacao) {
                // Conta nova: mostra os códigos antes de liberar o jogo
                telaCodigosRecuperacao(r.usuario, r.codigosRecuperacao);
                await conectado(r.usuario);
            } else {
                liberarJogo();
                aviso(`Bem-vindo de volta, <b>${escapar(r.usuario)}</b>!`, "sucesso");
                if (r.usouRecuperacao) aviso(`Você usou um código de recuperação. Restam ${r.codigosRestantes}.`, "erro");
                await conectado(r.usuario);
            }
        } catch (err) {
            carregando(form, false);
            form.codigo.value = "";
            form.codigo.focus();
            erroForm(err.message);
            if (err.status === 401) setTimeout(() => telaEntrar(), 1500);
        }
    });
};

const telaCodigosRecuperacao = (usuario, codigos) => {
    const texto = `Pokédex Pocket - códigos de recuperação da conta ${usuario}\n\n${codigos.join("\n")}\n\nCada código funciona uma única vez.`;
    painel(`
        <h3>Guarde seus códigos</h3>
        <p class="sutil">Se você perder o celular, use um destes códigos no lugar do código do app. Cada um funciona <b>uma única vez</b> e eles não serão mostrados de novo.</p>
        <div class="codigos-recuperacao">${codigos.map((c) => `<code>${c}</code>`).join("")}</div>
        <div class="modal-botoes esquerda">
            <button class="btn secundario pequeno" id="baixar-codigos">Baixar .txt</button>
            <button class="btn secundario pequeno" id="copiar-codigos">Copiar</button>
        </div>
        <label class="confirmar-codigos"><input type="checkbox" id="guardei"> Guardei meus códigos em um lugar seguro</label>
        <div class="modal-botoes">
            <button class="btn" id="concluir-conta" disabled>Concluir</button>
        </div>`);
    $("#baixar-codigos").addEventListener("click", () => {
        const link = document.createElement("a");
        link.href = URL.createObjectURL(new Blob([texto], { type: "text/plain" }));
        link.download = `pokedex-pocket-codigos-${usuario}.txt`;
        link.click();
        URL.revokeObjectURL(link.href);
    });
    $("#copiar-codigos").addEventListener("click", async () => {
        try {
            await navigator.clipboard.writeText(texto);
            aviso("Códigos copiados.", "sucesso");
        } catch (e) {
            aviso("Não foi possível copiar. Use o botão Baixar.", "erro");
        }
    });
    $("#guardei").addEventListener("change", (e) => { $("#concluir-conta").disabled = !e.target.checked; });
    $("#concluir-conta").addEventListener("click", () => {
        liberarJogo();
        aviso(`Conta criada! Bem-vindo, <b>${escapar(usuario)}</b>. Seus 5 pacotes grátis já estão esperando!`, "sucesso");
    });
};

// ---------------- Usado pela tela de perfil e pelas trocas ----------------
export { api };
export const usuarioAtual = () => conta.usuario;
export const contaDisponivel = () => conta.disponivel;

export const textoSincronizacao = () => {
    const quando = conta.ultimoEnvio ? conta.ultimoEnvio.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : null;
    return {
        salvando: "Salvando na nuvem...",
        salvo: `Progresso salvo na nuvem${quando ? ` às ${quando}` : ""}.`,
        erro: "Não foi possível salvar agora. Vamos tentar de novo automaticamente.",
    }[conta.sincronizacao] || "Progresso sincronizado com a nuvem.";
};

// Envia agora o que estiver pendente. Usado antes de trocas, para o servidor ter o save atualizado.
export const salvarAgora = async () => {
    clearTimeout(temporizador);
    await enviarSave();
    if (conta.sincronizacao === "erro") throw new Error("Não foi possível salvar seu progresso agora. Tente de novo.");
};

// Depois de mudar o nome de usuário
export const definirUsuario = (novo) => {
    conta.usuario = novo;
    estado.conta = novo;
    salvar();
    atualizarBotao();
};

// Usa o save devolvido pelo servidor depois de uma troca
export const aplicarSaveDoServidor = (save) => usarNuvem(save);

export const sairDaConta = async () => {
    if (!(await confirmar("Sair da conta?", "Seu progresso fica salvo na nuvem. Neste aparelho o jogo volta para o começo até você entrar de novo.", "Sair"))) return;
    clearTimeout(temporizador);
    if (envioPendente) await enviarSave();
    try {
        await api("auth/sair", { metodo: "POST" });
    } catch (e) { /* mesmo sem resposta, limpamos o aparelho */ }
    limparSaveLocal();
};

// Conectado: abre a tela de perfil. Sem conta: abre o login.
export const abrirConta = () => {
    if (conta.usuario) location.hash = "perfil";
    else mostrarTelaLogin();
};

// ---------------- Início ----------------
export const iniciarConta = async () => {
    aoSalvar(() => agendarEnvio());
    window.addEventListener("pagehide", enviarAoSair);
    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") enviarAoSair();
    });
    let r;
    try {
        r = await fetch("/api/auth/eu", { credentials: "same-origin" });
    } catch (e) {
        r = null;
    }
    if (r?.status === 401) {
        conta.disponivel = true;
        // Save de uma conta que saiu deste aparelho: começa limpo
        if (estado.conta) return limparSaveLocal();
        avisarMudancaConta();
        iniciarDemoLogin();
        telaEntrar();
    } else if (r?.ok) {
        conta.disponivel = true;
        liberarJogo();
        await conectado((await r.json()).usuario, { perguntar: false });
    } else {
        painel(`
            <h3>Sem conexão com o servidor</h3>
            <p class="sutil">Não foi possível conectar agora. Confira sua internet e tente de novo em alguns instantes.</p>
            <button class="btn grande" id="tentar-de-novo">Tentar de novo</button>`);
        $("#tentar-de-novo").addEventListener("click", () => location.reload());
    }
    atualizarBotao();
};
