// ====================================================
// Perfil, amigos e trocas de cartas entre jogadores
//
// GET  /api/social?acao=resumo                 → perfil, amigos, pedidos, trocas e entregas
// GET  /api/social?acao=perfil&usuario=nome    → perfil público (e coleção, se for amigo)
// POST /api/social { acao, ... }               → ações (editar perfil, amigos, trocas...)
//
// Como o progresso fica salvo no aparelho e na nuvem, as trocas funcionam assim:
// - Quem age (propõe ou aceita) envia o save antes; o servidor altera esse save e devolve.
// - A outra pessoa recebe as cartas por uma "entrega", aplicada pelo jogo dela.
// - Ao propor, as cartas oferecidas ficam reservadas (saem do álbum). Se a troca for
//   recusada, cancelada ou expirar, elas voltam por uma entrega.
// ====================================================
import {
    rota, responder, lerCorpo, consulta, exigirSessao, ErroHttp,
    conferirSenha, gerarHashSenha,
} from "./_lib.js";

const MAX_CARTAS_POR_LADO = 10;
const MAX_TROCAS_PENDENTES = 10;
const MAX_PEDIDOS_AMIZADE = 20;
const DIAS_EXPIRAR_TROCA = 7;
const TOTAL_CARTAS = 200;
const TOTAL_POKEMON = 151;

// ---------------- Validações ----------------
const validarCartas = (lista, nome) => {
    if (!Array.isArray(lista)) throw new ErroHttp(400, `Lista de cartas inválida (${nome}).`);
    if (lista.length > MAX_CARTAS_POR_LADO) throw new ErroHttp(400, `No máximo ${MAX_CARTAS_POR_LADO} cartas de cada lado.`);
    return lista.map((id) => {
        const texto = String(id);
        const n = Number(texto);
        if (!/^\d{3}$/.test(texto) || n < 1 || n > TOTAL_CARTAS) throw new ErroHttp(400, "Carta inválida.");
        return texto;
    });
};

const contar = (ids) => ids.reduce((m, id) => ({ ...m, [id]: (m[id] || 0) + 1 }), {});

const limparTexto = (texto, max) => String(texto ?? "").replace(/[\u0000-\u001f\u007f<>]/g, "").trim().slice(0, max);

// ---------------- Usuários ----------------
const buscarUsuario = async (nome) => {
    const usuario = String(nome || "").trim().toLowerCase();
    const [u] = await consulta("SELECT id, usuario FROM usuarios WHERE usuario = $1 AND totp_ativo", [usuario]);
    if (!u) throw new ErroHttp(404, "Treinador não encontrado.");
    return u;
};

const saoAmigos = async (a, b) => {
    const [r] = await consulta(
        `SELECT 1 FROM amizades WHERE status = 'aceita' AND ((de_id = $1 AND para_id = $2) OR (de_id = $2 AND para_id = $1))`,
        [a, b]
    );
    return !!r;
};

// Dados públicos do perfil (sem coleção)
const CAMPOS_PERFIL = `u.usuario, COALESCE(u.apelido, u.usuario) AS apelido, u.avatar, u.bio, u.vitrine,
    COALESCE((SELECT count(*) FROM jsonb_object_keys(COALESCE(s.dados->'colecao', '{}'::jsonb))), 0)::int AS cartas,
    COALESCE((s.dados->'stats'->>'pacotes')::int, 0) AS pacotes`;

const perfilPublico = (linha) => ({
    usuario: linha.usuario,
    apelido: linha.apelido,
    avatar: linha.avatar,
    bio: linha.bio,
    vitrine: linha.vitrine || [],
    cartas: Number(linha.cartas) || 0,
    pacotes: Number(linha.pacotes) || 0,
});

// ---------------- Save na nuvem ----------------
// Altera o save de quem está fazendo a ação. O aparelho envia o save antes,
// então aqui usamos a versão da nuvem e conferimos que ninguém mexeu no meio.
const alterarSave = async (uid, alterar) => {
    const [linha] = await consulta("SELECT dados FROM saves WHERE usuario_id = $1", [uid]);
    if (!linha) throw new ErroHttp(409, "Seu progresso ainda não foi salvo na nuvem. Tente de novo em alguns segundos.");
    const dados = linha.dados;
    const versao = Number(dados.salvoEm) || 0;
    dados.colecao = dados.colecao || {};
    dados.novas = dados.novas || {};
    alterar(dados);
    dados.salvoEm = Math.max(Date.now(), versao + 1);
    dados.nuvemBase = dados.salvoEm;
    const [ok] = await consulta(
        `UPDATE saves SET dados = $2::jsonb, atualizado_em = NOW()
         WHERE usuario_id = $1 AND COALESCE((dados->>'salvoEm')::bigint, 0) = $3 RETURNING usuario_id`,
        [uid, JSON.stringify(dados), versao]
    );
    if (!ok) throw new ErroHttp(409, "Seu progresso mudou durante a troca. Tente de novo.");
    return dados;
};

const retirarCartas = (dados, ids, mensagemFalta) => {
    for (const [id, q] of Object.entries(contar(ids))) {
        if ((dados.colecao[id] || 0) < q) throw new ErroHttp(409, mensagemFalta);
    }
    for (const id of ids) {
        dados.colecao[id] -= 1;
        if (!dados.colecao[id]) delete dados.colecao[id];
    }
};

const colocarCartas = (dados, ids) => {
    for (const id of ids) {
        if (!dados.colecao[id]) dados.novas[id] = true;
        dados.colecao[id] = (dados.colecao[id] || 0) + 1;
    }
};

const criarEntrega = (uid, cartas, motivo) =>
    cartas.length ? consulta("INSERT INTO entregas (usuario_id, cartas, motivo) VALUES ($1, $2, $3)", [uid, cartas, motivo]) : null;

// Trocas pendentes há mais de 7 dias expiram e devolvem as cartas reservadas
const expirarTrocas = async (uid) => {
    const expiradas = await consulta(
        `UPDATE trocas SET status = 'expirada', resolvido_em = NOW()
         WHERE status = 'pendente' AND (de_id = $1 OR para_id = $1) AND criado_em < NOW() - make_interval(days => $2)
         RETURNING de_id, da`,
        [uid, DIAS_EXPIRAR_TROCA]
    );
    for (const t of expiradas) await criarEntrega(t.de_id, t.da, "Troca expirada: cartas devolvidas");
};

const cancelarTrocasEntre = async (a, b, motivo) => {
    const canceladas = await consulta(
        `UPDATE trocas SET status = 'cancelada', resolvido_em = NOW()
         WHERE status = 'pendente' AND ((de_id = $1 AND para_id = $2) OR (de_id = $2 AND para_id = $1))
         RETURNING de_id, da`,
        [a, b]
    );
    for (const t of canceladas) await criarEntrega(t.de_id, t.da, motivo);
};

// ---------------- GET ----------------
const resumo = async (eu) => {
    await expirarTrocas(eu.id);
    const [perfil] = await consulta(`SELECT ${CAMPOS_PERFIL} FROM usuarios u LEFT JOIN saves s ON s.usuario_id = u.id WHERE u.id = $1`, [eu.id]);
    const amigos = await consulta(
        `SELECT ${CAMPOS_PERFIL} FROM amizades a
         JOIN usuarios u ON u.id = CASE WHEN a.de_id = $1 THEN a.para_id ELSE a.de_id END
         LEFT JOIN saves s ON s.usuario_id = u.id
         WHERE a.status = 'aceita' AND (a.de_id = $1 OR a.para_id = $1)
         ORDER BY u.usuario`,
        [eu.id]
    );
    const pedidos = await consulta(
        `SELECT a.id, a.de_id = $1 AS enviado, u.usuario, COALESCE(u.apelido, u.usuario) AS apelido, u.avatar
         FROM amizades a JOIN usuarios u ON u.id = CASE WHEN a.de_id = $1 THEN a.para_id ELSE a.de_id END
         WHERE a.status = 'pendente' AND (a.de_id = $1 OR a.para_id = $1)
         ORDER BY a.criado_em DESC`,
        [eu.id]
    );
    const trocas = await consulta(
        `SELECT t.id, t.de_id = $1 AS enviada, t.da, t.quer, t.mensagem, t.status, t.criado_em, t.resolvido_em,
                u.usuario, COALESCE(u.apelido, u.usuario) AS apelido, u.avatar
         FROM trocas t JOIN usuarios u ON u.id = CASE WHEN t.de_id = $1 THEN t.para_id ELSE t.de_id END
         WHERE (t.de_id = $1 OR t.para_id = $1)
           AND (t.status = 'pendente' OR t.resolvido_em > NOW() - INTERVAL '7 days')
         ORDER BY COALESCE(t.resolvido_em, t.criado_em) DESC
         LIMIT 40`,
        [eu.id]
    );
    const entregas = await consulta("SELECT id, cartas, motivo FROM entregas WHERE usuario_id = $1 ORDER BY id", [eu.id]);
    const outro = (l) => ({ usuario: l.usuario, apelido: l.apelido, avatar: l.avatar });
    return {
        perfil: perfilPublico(perfil),
        amigos: amigos.map(perfilPublico),
        pedidosRecebidos: pedidos.filter((p) => !p.enviado).map((p) => ({ id: p.id, ...outro(p) })),
        pedidosEnviados: pedidos.filter((p) => p.enviado).map((p) => ({ id: p.id, ...outro(p) })),
        trocas: trocas.map((t) => ({
            id: t.id,
            enviada: t.enviada,
            // "da" e "quer" sempre do ponto de vista de quem propôs
            da: t.da,
            quer: t.quer,
            mensagem: t.mensagem,
            status: t.status,
            criadoEm: t.criado_em,
            resolvidoEm: t.resolvido_em,
            com: outro(t),
        })),
        entregas: entregas.map((e) => ({ id: e.id, cartas: e.cartas, motivo: e.motivo })),
    };
};

const verPerfil = async (eu, nome) => {
    const alvo = await buscarUsuario(nome);
    const [linha] = await consulta(
        `SELECT ${CAMPOS_PERFIL}, s.dados->'colecao' AS colecao FROM usuarios u LEFT JOIN saves s ON s.usuario_id = u.id WHERE u.id = $1`,
        [alvo.id]
    );
    const amigo = alvo.id === eu.id || (await saoAmigos(eu.id, alvo.id));
    return { ...perfilPublico(linha), amigo, colecao: amigo ? linha.colecao || {} : null };
};

// ---------------- POST ----------------
const ACOES = {
    async "editar-perfil"(eu, corpo) {
        const apelido = limparTexto(corpo.apelido, 24) || null;
        const bio = limparTexto(corpo.bio, 140);
        const avatar = Number(corpo.avatar);
        if (!Number.isInteger(avatar) || avatar < 1 || avatar > TOTAL_POKEMON) throw new ErroHttp(400, "Avatar inválido.");
        const vitrine = validarCartas(corpo.vitrine || [], "vitrine").slice(0, 3);
        if (vitrine.length) {
            const [s] = await consulta("SELECT dados->'colecao' AS colecao FROM saves WHERE usuario_id = $1", [eu.id]);
            if (vitrine.some((id) => !s?.colecao?.[id])) throw new ErroHttp(400, "Você só pode mostrar cartas que tem.");
        }
        await consulta("UPDATE usuarios SET apelido = $2, bio = $3, avatar = $4, vitrine = $5 WHERE id = $1", [eu.id, apelido, bio, avatar, [...new Set(vitrine)]]);
        return { ok: true };
    },

    async "trocar-senha"(eu, corpo) {
        const nova = String(corpo.nova || "");
        if (nova.length < 8 || nova.length > 128) throw new ErroHttp(400, "A nova senha precisa ter de 8 a 128 caracteres.");
        const [u] = await consulta("SELECT senha_hash FROM usuarios WHERE id = $1", [eu.id]);
        if (!(await conferirSenha(String(corpo.atual || ""), u.senha_hash))) throw new ErroHttp(400, "A senha atual está incorreta.");
        await consulta("UPDATE usuarios SET senha_hash = $2 WHERE id = $1", [eu.id, await gerarHashSenha(nova)]);
        return { ok: true };
    },

    async "adicionar-amigo"(eu, corpo) {
        const alvo = await buscarUsuario(corpo.usuario);
        if (alvo.id === eu.id) throw new ErroHttp(400, "Você não pode adicionar a si mesmo.");
        const [existente] = await consulta(
            "SELECT id, de_id, status FROM amizades WHERE (de_id = $1 AND para_id = $2) OR (de_id = $2 AND para_id = $1)",
            [eu.id, alvo.id]
        );
        if (existente?.status === "aceita") throw new ErroHttp(409, "Vocês já são amigos.");
        if (existente && existente.de_id === eu.id) throw new ErroHttp(409, "Você já enviou um pedido para esse treinador.");
        if (existente) {
            // A outra pessoa já tinha pedido: aceita direto
            await consulta("UPDATE amizades SET status = 'aceita' WHERE id = $1", [existente.id]);
            return { ok: true, aceito: true };
        }
        const [{ total }] = await consulta("SELECT count(*)::int AS total FROM amizades WHERE de_id = $1 AND status = 'pendente'", [eu.id]);
        if (total >= MAX_PEDIDOS_AMIZADE) throw new ErroHttp(429, "Você tem pedidos de amizade demais esperando resposta.");
        await consulta("INSERT INTO amizades (de_id, para_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", [eu.id, alvo.id]);
        return { ok: true, aceito: false };
    },

    async "responder-amigo"(eu, corpo) {
        const id = Number(corpo.id);
        if (corpo.aceitar) {
            const [ok] = await consulta("UPDATE amizades SET status = 'aceita' WHERE id = $1 AND para_id = $2 AND status = 'pendente' RETURNING id", [id, eu.id]);
            if (!ok) throw new ErroHttp(404, "Pedido não encontrado.");
        } else {
            // Recusar um pedido recebido ou cancelar um enviado
            await consulta("DELETE FROM amizades WHERE id = $1 AND (para_id = $2 OR de_id = $2) AND status = 'pendente'", [id, eu.id]);
        }
        return { ok: true };
    },

    async "remover-amigo"(eu, corpo) {
        const alvo = await buscarUsuario(corpo.usuario);
        await consulta("DELETE FROM amizades WHERE (de_id = $1 AND para_id = $2) OR (de_id = $2 AND para_id = $1)", [eu.id, alvo.id]);
        await cancelarTrocasEntre(eu.id, alvo.id, "Amizade desfeita: cartas da troca devolvidas");
        return { ok: true };
    },

    async "propor-troca"(eu, corpo) {
        const alvo = await buscarUsuario(corpo.para);
        if (!(await saoAmigos(eu.id, alvo.id))) throw new ErroHttp(403, "Vocês precisam ser amigos para trocar cartas.");
        const da = validarCartas(corpo.da || [], "da");
        const quer = validarCartas(corpo.quer || [], "quer");
        if (!da.length && !quer.length) throw new ErroHttp(400, "Escolha pelo menos uma carta.");
        const [{ total }] = await consulta("SELECT count(*)::int AS total FROM trocas WHERE de_id = $1 AND status = 'pendente'", [eu.id]);
        if (total >= MAX_TROCAS_PENDENTES) throw new ErroHttp(429, `Você já tem ${MAX_TROCAS_PENDENTES} propostas esperando resposta.`);

        // Reserva as cartas oferecidas (saem do álbum até a troca terminar)
        const save = await alterarSave(eu.id, (dados) => retirarCartas(dados, da, "Você não tem todas as cartas que está oferecendo."));
        const [troca] = await consulta(
            "INSERT INTO trocas (de_id, para_id, da, quer, mensagem) VALUES ($1, $2, $3, $4, $5) RETURNING id",
            [eu.id, alvo.id, da, quer, limparTexto(corpo.mensagem, 140)]
        );
        return { ok: true, id: troca.id, save };
    },

    async "responder-troca"(eu, corpo) {
        const id = Number(corpo.id);
        if (!corpo.aceitar) {
            const [t] = await consulta(
                "UPDATE trocas SET status = 'recusada', resolvido_em = NOW() WHERE id = $1 AND para_id = $2 AND status = 'pendente' RETURNING de_id, da",
                [id, eu.id]
            );
            if (!t) throw new ErroHttp(404, "Essa troca não está mais disponível.");
            await criarEntrega(t.de_id, t.da, `@${eu.usuario} recusou a troca: cartas devolvidas`);
            return { ok: true };
        }
        // Trava a troca para ninguém cancelar enquanto ela acontece
        const [t] = await consulta(
            "UPDATE trocas SET status = 'processando' WHERE id = $1 AND para_id = $2 AND status = 'pendente' RETURNING de_id, da, quer",
            [id, eu.id]
        );
        if (!t) throw new ErroHttp(404, "Essa troca não está mais disponível.");
        let save;
        try {
            save = await alterarSave(eu.id, (dados) => {
                retirarCartas(dados, t.quer, "Você não tem mais todas as cartas pedidas nessa troca.");
                colocarCartas(dados, t.da);
            });
        } catch (e) {
            await consulta("UPDATE trocas SET status = 'pendente' WHERE id = $1", [id]);
            throw e;
        }
        await consulta("UPDATE trocas SET status = 'aceita', resolvido_em = NOW() WHERE id = $1", [id]);
        await criarEntrega(t.de_id, t.quer, `@${eu.usuario} aceitou sua troca`);
        return { ok: true, save };
    },

    async "cancelar-troca"(eu, corpo) {
        const [t] = await consulta(
            "UPDATE trocas SET status = 'cancelada', resolvido_em = NOW() WHERE id = $1 AND de_id = $2 AND status = 'pendente' RETURNING da",
            [Number(corpo.id), eu.id]
        );
        if (!t) throw new ErroHttp(404, "Essa troca não está mais disponível.");
        await criarEntrega(eu.id, t.da, "Troca cancelada: cartas devolvidas");
        return { ok: true };
    },

    // O jogo confirma que já colocou as cartas das entregas no álbum
    async "confirmar-entregas"(eu, corpo) {
        const ids = (Array.isArray(corpo.ids) ? corpo.ids : []).map(Number).filter(Number.isInteger).slice(0, 100);
        if (ids.length) await consulta("DELETE FROM entregas WHERE usuario_id = $1 AND id = ANY($2::int[])", [eu.id, ids]);
        return { ok: true };
    },
};

export default rota(["GET", "POST"], async (req, res) => {
    const eu = await exigirSessao(req);
    if (req.method === "GET") {
        const params = new URL(req.url, "http://local").searchParams;
        const acao = params.get("acao") || "resumo";
        if (acao === "resumo") return responder(res, 200, await resumo(eu));
        if (acao === "perfil") return responder(res, 200, await verPerfil(eu, params.get("usuario")));
        throw new ErroHttp(400, "Ação desconhecida.");
    }
    const corpo = await lerCorpo(req);
    const acao = ACOES[corpo.acao];
    if (!acao) throw new ErroHttp(400, "Ação desconhecida.");
    responder(res, 200, await acao(eu, corpo));
});
