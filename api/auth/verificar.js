// POST /api/auth/verificar  { codigo }
// Segunda etapa: confere o código do app autenticador (ou um código de recuperação)
// e abre a sessão. Também conclui a ativação do 2FA no cadastro.
import {
    rota, responder, lerCorpo, consulta, ErroHttp, lerToken, lerCookies, decifrar,
    verificarBloqueio, registrarFalha, iniciarSessao, gerarCodigosRecuperacao, hashCodigoRecuperacao,
    COOKIE_PENDENTE,
} from "../_lib.js";
import { validarCodigo } from "../_totp.js";

export default rota(["POST"], async (req, res) => {
    const token = lerToken(lerCookies(req)[COOKIE_PENDENTE]);
    if (!token || !["configurar", "2fa"].includes(token.tipo)) throw new ErroHttp(401, "O tempo para digitar o código acabou. Entre de novo.");
    const codigo = String((await lerCorpo(req)).codigo || "").replace(/\s/g, "");

    const [u] = await consulta("SELECT * FROM usuarios WHERE id = $1", [token.uid]);
    if (!u) throw new ErroHttp(401, "Conta não encontrada.");
    verificarBloqueio(u);
    const segredo = decifrar(u.totp_segredo);

    if (token.tipo === "configurar") {
        const contador = /^\d{6}$/.test(codigo) ? validarCodigo(u.usuario, segredo, codigo) : null;
        if (contador === null) {
            await registrarFalha(u.id);
            throw new ErroHttp(400, "Código incorreto. Confira o app autenticador e tente de novo.");
        }
        const { codigos, hashes } = gerarCodigosRecuperacao();
        await consulta(
            "UPDATE usuarios SET totp_ativo = TRUE, totp_ultimo = $2, codigos_recuperacao = $3, tentativas = 0, bloqueado_ate = NULL WHERE id = $1",
            [u.id, contador, hashes]
        );
        iniciarSessao(res, u.id);
        return responder(res, 200, { usuario: u.usuario, codigosRecuperacao: codigos });
    }

    let usouRecuperacao = false;
    if (/^\d{6}$/.test(codigo)) {
        const contador = validarCodigo(u.usuario, segredo, codigo);
        // Cada código só vale uma vez (evita que alguém reaproveite um código visto)
        const [ok] = contador === null ? [] : await consulta(
            "UPDATE usuarios SET totp_ultimo = $2 WHERE id = $1 AND totp_ultimo < $2 RETURNING id", [u.id, contador]
        );
        if (!ok) {
            await registrarFalha(u.id);
            throw new ErroHttp(400, "Código incorreto ou já usado.");
        }
    } else {
        const hash = hashCodigoRecuperacao(codigo);
        const [ok] = await consulta(
            "UPDATE usuarios SET codigos_recuperacao = array_remove(codigos_recuperacao, $2) WHERE id = $1 AND $2 = ANY(codigos_recuperacao) RETURNING id",
            [u.id, hash]
        );
        if (!ok) {
            await registrarFalha(u.id);
            throw new ErroHttp(400, "Código de recuperação inválido.");
        }
        usouRecuperacao = true;
    }

    await consulta("UPDATE usuarios SET tentativas = 0, bloqueado_ate = NULL WHERE id = $1", [u.id]);
    iniciarSessao(res, u.id);
    const [{ restantes }] = await consulta("SELECT cardinality(codigos_recuperacao) AS restantes FROM usuarios WHERE id = $1", [u.id]);
    responder(res, 200, { usuario: u.usuario, usouRecuperacao, codigosRestantes: Number(restantes) });
});
