// ====================================================
// Funções compartilhadas pelo servidor (Vercel Functions)
// Arquivos que começam com "_" não viram rotas na Vercel.
// ====================================================
import crypto from "node:crypto";
import { promisify } from "node:util";
import { CARTA_POR_ID } from "../Js/cards.js";

const scrypt = promisify(crypto.scrypt);

// ---------------- Configuração ----------------
const URL_BANCO = process.env.DATABASE_URL || process.env.POSTGRES_URL;
const SEGREDO = process.env.SESSION_SECRET;

export const DURACAO_SESSAO = 30 * 24 * 60 * 60; // 30 dias (segundos)
export const DURACAO_PENDENTE = 10 * 60; // 10 minutos para concluir o 2FA
export const MAX_TENTATIVAS = 5;
export const BLOQUEIO_MINUTOS = 15;
export const TAMANHO_MAX_SAVE = 256 * 1024;

// ---------------- Banco de dados ----------------
let executor;
const obterExecutor = async () => {
    if (executor) return executor;
    if (!URL_BANCO) throw new ErroHttp(500, "Banco de dados não configurado (DATABASE_URL).");
    if (/localhost|127\.0\.0\.1/.test(URL_BANCO)) {
        // Desenvolvimento local: Postgres comum
        const { default: pg } = await import("pg");
        const pool = new pg.Pool({ connectionString: URL_BANCO });
        executor = async (texto, params) => (await pool.query(texto, params)).rows;
    } else {
        // Produção: Neon via HTTP (ideal para funções serverless)
        const { neon } = await import("@neondatabase/serverless");
        const sql = neon(URL_BANCO);
        executor = (texto, params) => sql.query(texto, params);
    }
    return executor;
};

const ESQUEMA = `
CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    usuario TEXT UNIQUE NOT NULL,
    senha_hash TEXT NOT NULL,
    totp_segredo TEXT NOT NULL,
    totp_ativo BOOLEAN NOT NULL DEFAULT FALSE,
    totp_ultimo BIGINT NOT NULL DEFAULT 0,
    codigos_recuperacao TEXT[] NOT NULL DEFAULT '{}',
    tentativas INT NOT NULL DEFAULT 0,
    bloqueado_ate TIMESTAMPTZ,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS saves (
    usuario_id INT PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
    dados JSONB NOT NULL,
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS apelido TEXT;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS avatar INT NOT NULL DEFAULT 25;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS bio TEXT NOT NULL DEFAULT '';
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS vitrine TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS codigo_amigo TEXT UNIQUE;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS usuario_alterado_em TIMESTAMPTZ;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS sessao_versao INT NOT NULL DEFAULT 0;
CREATE TABLE IF NOT EXISTS limites (
    chave TEXT PRIMARY KEY,
    inicio TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    contagem INT NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS amizades (
    id SERIAL PRIMARY KEY,
    de_id INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    para_id INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pendente',
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (de_id, para_id)
);
CREATE TABLE IF NOT EXISTS trocas (
    id SERIAL PRIMARY KEY,
    de_id INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    para_id INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    da TEXT[] NOT NULL DEFAULT '{}',
    quer TEXT[] NOT NULL DEFAULT '{}',
    mensagem TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pendente',
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolvido_em TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS entregas (
    id SERIAL PRIMARY KEY,
    usuario_id INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    cartas TEXT[] NOT NULL,
    motivo TEXT NOT NULL,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS trocas_para ON trocas (para_id, status);
CREATE INDEX IF NOT EXISTS trocas_de ON trocas (de_id, status);
CREATE INDEX IF NOT EXISTS entregas_usuario ON entregas (usuario_id);`;

let esquemaPronto;
export const consulta = async (texto, params = []) => {
    const exec = await obterExecutor();
    if (!esquemaPronto) {
        esquemaPronto = (async () => {
            for (const comando of ESQUEMA.split(";").map((c) => c.trim()).filter(Boolean)) await exec(comando, []);
        })().catch((e) => {
            esquemaPronto = null;
            throw e;
        });
    }
    await esquemaPronto;
    return exec(texto, params);
};

// ---------------- Erros e respostas ----------------
export class ErroHttp extends Error {
    constructor(status, mensagem) {
        super(mensagem);
        this.status = status;
    }
}

export const responder = (res, status, dados) => {
    res.statusCode = status;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    res.end(JSON.stringify(dados));
};

// Lê o corpo JSON (a Vercel já entrega req.body; no servidor local lemos o stream)
export const lerCorpo = async (req) => {
    // Só aceita "application/json" de verdade (evita formulários de outros sites)
    const tipo = String(req.headers["content-type"] || "").split(";")[0].trim().toLowerCase();
    if (tipo !== "application/json") throw new ErroHttp(415, "Envie os dados como JSON.");
    let corpo;
    try {
        corpo = req.body; // a Vercel já entrega o corpo lido (e lança erro se o JSON for inválido)
    } catch {
        throw new ErroHttp(400, "JSON inválido.");
    }
    if (corpo !== undefined) {
        try {
            if (typeof corpo === "string") corpo = JSON.parse(corpo || "{}");
            else if (Buffer.isBuffer(corpo)) corpo = JSON.parse(corpo.toString() || "{}");
        } catch {
            throw new ErroHttp(400, "JSON inválido.");
        }
        if (!corpo || typeof corpo !== "object" || Array.isArray(corpo)) throw new ErroHttp(400, "JSON inválido.");
        return corpo;
    }
    let tamanho = 0;
    const partes = [];
    for await (const parte of req) {
        tamanho += parte.length;
        if (tamanho > TAMANHO_MAX_SAVE * 2) throw new ErroHttp(413, "Dados grandes demais.");
        partes.push(parte);
    }
    try {
        corpo = JSON.parse(Buffer.concat(partes).toString() || "{}");
    } catch {
        throw new ErroHttp(400, "JSON inválido.");
    }
    if (!corpo || typeof corpo !== "object" || Array.isArray(corpo)) throw new ErroHttp(400, "JSON inválido.");
    return corpo;
};

// Envolve um handler: controla métodos aceitos e converte erros em JSON
export const rota = (metodos, fn) => async (req, res) => {
    try {
        if (!metodos.includes(req.method)) throw new ErroHttp(405, "Método não permitido.");
        if (!SEGREDO || SEGREDO.length < 32) throw new ErroHttp(500, "SESSION_SECRET não configurado (mínimo 32 caracteres).");
        await fn(req, res);
    } catch (e) {
        if (e instanceof ErroHttp) return responder(res, e.status, { erro: e.message });
        console.error(e);
        responder(res, 500, { erro: "Erro interno no servidor." });
    }
};

// ---------------- Senhas (scrypt) ----------------
export const gerarHashSenha = async (senha) => {
    const sal = crypto.randomBytes(16);
    const hash = await scrypt(senha.normalize("NFKC"), sal, 64, { N: 16384, r: 8, p: 1 });
    return `scrypt$${sal.toString("base64")}$${hash.toString("base64")}`;
};

export const conferirSenha = async (senha, guardado) => {
    const [, salB64, hashB64] = guardado.split("$");
    const esperado = Buffer.from(hashB64, "base64");
    const hash = await scrypt(senha.normalize("NFKC"), Buffer.from(salB64, "base64"), esperado.length, { N: 16384, r: 8, p: 1 });
    return crypto.timingSafeEqual(hash, esperado);
};

// Hash usado para comparar senha quando o usuário não existe (evita diferença de tempo)
export const HASH_FALSO = "scrypt$AAAAAAAAAAAAAAAAAAAAAA==$" + Buffer.alloc(64).toString("base64");

// ---------------- Criptografia do segredo do 2FA ----------------
const chave = () => crypto.createHash("sha256").update(`totp:${SEGREDO}`).digest();

export const cifrar = (texto) => {
    const iv = crypto.randomBytes(12);
    const c = crypto.createCipheriv("aes-256-gcm", chave(), iv);
    const dados = Buffer.concat([c.update(texto, "utf8"), c.final()]);
    return [iv, c.getAuthTag(), dados].map((b) => b.toString("base64")).join(".");
};

export const decifrar = (guardado) => {
    const [iv, tag, dados] = guardado.split(".").map((b) => Buffer.from(b, "base64"));
    const d = crypto.createDecipheriv("aes-256-gcm", chave(), iv);
    d.setAuthTag(tag);
    return Buffer.concat([d.update(dados), d.final()]).toString("utf8");
};

// ---------------- Códigos de recuperação ----------------
const hashCodigo = (codigo) =>
    crypto.createHmac("sha256", SEGREDO).update(codigo.toLowerCase().replace(/[^a-z0-9]/g, "")).digest("hex");

export const gerarCodigosRecuperacao = () => {
    const codigos = Array.from({ length: 8 }, () => {
        const b = crypto.randomBytes(5).toString("hex");
        return `${b.slice(0, 5)}-${b.slice(5)}`;
    });
    return { codigos, hashes: codigos.map(hashCodigo) };
};

export const hashCodigoRecuperacao = hashCodigo;

// ---------------- Tokens assinados e cookies ----------------
const b64url = (buf) => Buffer.from(buf).toString("base64url");

export const assinarToken = (dados, duracaoSeg) => {
    const corpo = b64url(JSON.stringify({ ...dados, exp: Math.floor(Date.now() / 1000) + duracaoSeg }));
    const assinatura = b64url(crypto.createHmac("sha256", SEGREDO).update(corpo).digest());
    return `${corpo}.${assinatura}`;
};

export const lerToken = (token) => {
    if (!token || !token.includes(".")) return null;
    const [corpo, assinatura] = token.split(".");
    const esperado = crypto.createHmac("sha256", SEGREDO).update(corpo).digest();
    const recebido = Buffer.from(assinatura, "base64url");
    if (recebido.length !== esperado.length || !crypto.timingSafeEqual(recebido, esperado)) return null;
    try {
        const dados = JSON.parse(Buffer.from(corpo, "base64url").toString());
        return dados.exp > Date.now() / 1000 ? dados : null;
    } catch {
        return null;
    }
};

const ehProducao = () => process.env.NODE_ENV === "production" || !!process.env.VERCEL;

export const lerCookies = (req) =>
    Object.fromEntries(
        (req.headers.cookie || "").split(";").map((c) => c.trim().split("=")).filter(([k]) => k).map(([k, ...v]) => [k, decodeURIComponent(v.join("="))])
    );

export const definirCookie = (res, nome, valor, maxAge) => {
    const partes = [`${nome}=${encodeURIComponent(valor)}`, "Path=/", "HttpOnly", "SameSite=Lax", `Max-Age=${maxAge}`];
    if (ehProducao()) partes.push("Secure");
    const atuais = res.getHeader("Set-Cookie") || [];
    res.setHeader("Set-Cookie", [...(Array.isArray(atuais) ? atuais : [atuais]), partes.join("; ")]);
};

export const apagarCookie = (res, nome) => definirCookie(res, nome, "", 0);

export const COOKIE_SESSAO = "pp_sessao";
export const COOKIE_PENDENTE = "pp_pendente";

// Retorna o usuário logado ou lança 401
export const exigirSessao = async (req) => {
    const token = lerToken(lerCookies(req)[COOKIE_SESSAO]);
    if (!token || token.tipo !== "sessao") throw new ErroHttp(401, "Você não está conectado.");
    const [usuario] = await consulta("SELECT id, usuario, sessao_versao FROM usuarios WHERE id = $1 AND totp_ativo", [token.uid]);
    if (!usuario || (token.v || 0) !== usuario.sessao_versao) throw new ErroHttp(401, "Você não está conectado.");
    return usuario;
};

export const iniciarSessao = (res, uid, versao = 0) => {
    apagarCookie(res, COOKIE_PENDENTE);
    definirCookie(res, COOKIE_SESSAO, assinarToken({ uid, tipo: "sessao", v: versao }, DURACAO_SESSAO), DURACAO_SESSAO);
};

// Invalida todas as sessões da conta e mantém só a deste aparelho
export const renovarSessoes = async (res, uid) => {
    const [u] = await consulta("UPDATE usuarios SET sessao_versao = sessao_versao + 1 WHERE id = $1 RETURNING sessao_versao", [uid]);
    iniciarSessao(res, uid, u.sessao_versao);
};

// ---------------- Limite de tentativas por IP ----------------
export const ipDe = (req) =>
    String(req.headers["x-real-ip"] || req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "?").split(",")[0].trim();

// Conta tentativas numa janela de tempo; passou do máximo, responde 429
export const limitarTaxa = async (chave, maximo, minutos) => {
    if (process.env.LIMITE_IP === "desligado") return; // só para testes locais
    const [r] = await consulta(
        `INSERT INTO limites (chave, inicio, contagem) VALUES ($1, NOW(), 1)
         ON CONFLICT (chave) DO UPDATE SET
            contagem = CASE WHEN limites.inicio < NOW() - make_interval(mins => $2) THEN 1 ELSE limites.contagem + 1 END,
            inicio = CASE WHEN limites.inicio < NOW() - make_interval(mins => $2) THEN NOW() ELSE limites.inicio END
         RETURNING contagem`,
        [chave, minutos]
    );
    if (Math.random() < 0.02) await consulta("DELETE FROM limites WHERE inicio < NOW() - INTERVAL '1 day'");
    if (r.contagem > maximo) throw new ErroHttp(429, "Muitas tentativas a partir desta rede. Espere alguns minutos e tente de novo.");
};

// ---------------- Bloqueio por tentativas ----------------
export const verificarBloqueio = (u) => {
    if (u.bloqueado_ate && new Date(u.bloqueado_ate) > new Date()) {
        const min = Math.ceil((new Date(u.bloqueado_ate) - new Date()) / 60000);
        throw new ErroHttp(429, `Muitas tentativas. Tente de novo em ${min} minuto(s).`);
    }
};

// A cada 5 erros seguidos (senha ou código), a conta fica bloqueada por 15 minutos
export const registrarFalha = (uid) =>
    consulta(
        `UPDATE usuarios SET
            tentativas = CASE WHEN tentativas + 1 >= $2 THEN 0 ELSE tentativas + 1 END,
            bloqueado_ate = CASE WHEN tentativas + 1 >= $2 THEN NOW() + make_interval(mins => $3) ELSE bloqueado_ate END
         WHERE id = $1`,
        [uid, MAX_TENTATIVAS, BLOQUEIO_MINUTOS]
    );

export const limparFalhas = (uid) => consulta("UPDATE usuarios SET tentativas = 0, bloqueado_ate = NULL WHERE id = $1", [uid]);

// ---------------- Save: só aceita dados com o formato certo ----------------
const inteiro = (valor, min, max, padrao = 0) =>
    Number.isInteger(valor) ? Math.min(Math.max(valor, min), max) : padrao;

// Só aceita cartas que existem no jogo (Origem Genética usa "001", as outras expansões "A1a-001")
export const idCartaValido = (id) => Object.hasOwn(CARTA_POR_ID, id);

// Mini game Pokéclicker: só números finitos, listas curtas de textos curtos
const numeroLivre = (v, max = 1e300) => (typeof v === "number" && Number.isFinite(v) ? Math.min(Math.max(v, 0), max) : 0);
const listaTextos = (v, max = 150) => (Array.isArray(v) ? v.filter((x) => typeof x === "string" && x.length <= 30).slice(0, max) : []);
const limparClicker = (c) => {
    if (!c || typeof c !== "object" || Array.isArray(c)) return undefined;
    const ajudantes = {};
    for (const [id, q] of Object.entries(c.ajudantes && typeof c.ajudantes === "object" ? c.ajudantes : {}).slice(0, 20)) {
        if (id.length <= 30) ajudantes[id] = Math.floor(numeroLivre(q, 1e6));
    }
    const itens = {};
    for (const [id, q] of Object.entries(c.itens && typeof c.itens === "object" ? c.itens : {}).slice(0, 30)) {
        if (id.length <= 30) itens[id] = Math.floor(numeroLivre(q, 1000));
    }
    const hoje = c.pacotesHoje && typeof c.pacotesHoje === "object" ? c.pacotesHoje : {};
    return {
        energia: numeroLivre(c.energia),
        totalPartida: numeroLivre(c.totalPartida),
        totalGeral: numeroLivre(c.totalGeral),
        recorde: numeroLivre(c.recorde),
        cliques: numeroLivre(c.cliques, 1e15),
        pedras: numeroLivre(c.pedras, 1e12),
        pedrasTotal: numeroLivre(c.pedrasTotal, 1e12),
        reinicios: numeroLivre(c.reinicios, 1e9),
        ultimoTick: numeroLivre(c.ultimoTick, 8.64e15),
        douradaAte: numeroLivre(c.douradaAte, 8.64e15),
        cadeiaAte: numeroLivre(c.cadeiaAte, 8.64e15),
        pokebolas: numeroLivre(c.pokebolas, 1e9),
        tempoJogado: numeroLivre(c.tempoJogado, 1e10),
        bauProgresso: numeroLivre(c.bauProgresso, 1e4),
        baus: numeroLivre(c.baus, 1e12),
        lendarios: numeroLivre(c.lendarios, 1e9),
        itens,
        conquistas: listaTextos(c.conquistas),
        ajudantes,
        melhorias: listaTextos(c.melhorias),
        arvore: listaTextos(c.arvore),
        pacotesHoje: { dia: typeof hoje.dia === "string" ? hoje.dia.slice(0, 12) : "", qtd: Math.floor(numeroLivre(hoje.qtd, 100)) },
    };
};

// Remove cartas inexistentes, quantidades absurdas e números inválidos.
// Assim um save adulterado não quebra a tela de ninguém.
export const limparSave = (dados) => {
    if (!dados || typeof dados !== "object" || Array.isArray(dados) || dados.v !== 1) throw new ErroHttp(400, "Save inválido.");
    const colecao = {};
    for (const [id, q] of Object.entries(dados.colecao && typeof dados.colecao === "object" ? dados.colecao : {})) {
        if (idCartaValido(id) && Number.isInteger(q) && q > 0) colecao[id] = Math.min(q, 9999);
    }
    const novas = {};
    for (const id of Object.keys(dados.novas && typeof dados.novas === "object" ? dados.novas : {})) {
        if (colecao[id]) novas[id] = true;
    }
    const stats = dados.stats && typeof dados.stats === "object" && !Array.isArray(dados.stats) ? dados.stats : {};
    return {
        ...dados,
        colecao,
        novas,
        moedas: inteiro(dados.moedas, 0, 1e9),
        pontos: inteiro(dados.pontos, 0, 1e9),
        comprados: inteiro(dados.comprados, 0, 1e6),
        salvoEm: inteiro(dados.salvoEm, 0, 8.64e15),
        nuvemBase: inteiro(dados.nuvemBase, 0, 8.64e15),
        clicker: limparClicker(dados.clicker),
        stats: {
            pacotes: inteiro(stats.pacotes, 0, 1e9),
            trocas: inteiro(stats.trocas, 0, 1e9),
            vendidas: inteiro(stats.vendidas, 0, 1e9),
            godPacks: inteiro(stats.godPacks, 0, 1e9),
        },
    };
};
