// POST /api/auth/entrar  { usuario, senha }
// Confere a senha. Se estiver certa, pede o código do 2FA (ou a configuração dele).
import {
    rota, responder, lerCorpo, consulta, ErroHttp, conferirSenha, HASH_FALSO, decifrar,
    verificarBloqueio, registrarFalha, assinarToken, definirCookie, COOKIE_PENDENTE, DURACAO_PENDENTE,
    limitarTaxa, ipDe,
} from "../_lib.js";
import { dadosConfiguracao } from "../_totp.js";

const ERRO_LOGIN = "Usuário ou senha incorretos.";

export default rota(["POST"], async (req, res) => {
    await limitarTaxa(`entrar:${ipDe(req)}`, 20, 15);
    const corpo = await lerCorpo(req);
    const usuario = String(corpo.usuario || "").trim().toLowerCase();
    const senha = String(corpo.senha || "");
    if (!usuario || !senha || senha.length > 128) throw new ErroHttp(400, ERRO_LOGIN);

    const [u] = await consulta("SELECT * FROM usuarios WHERE usuario = $1", [usuario]);
    if (!u) {
        await conferirSenha(senha, HASH_FALSO); // mesmo tempo de resposta de um usuário existente
        throw new ErroHttp(401, ERRO_LOGIN);
    }
    verificarBloqueio(u);
    if (!(await conferirSenha(senha, u.senha_hash))) {
        await registrarFalha(u.id);
        throw new ErroHttp(401, ERRO_LOGIN);
    }

    if (!u.totp_ativo) {
        // Conta criada mas o 2FA não foi configurado: retoma a configuração
        definirCookie(res, COOKIE_PENDENTE, assinarToken({ uid: u.id, tipo: "configurar" }, DURACAO_PENDENTE), DURACAO_PENDENTE);
        return responder(res, 200, { etapa: "configurar-2fa", usuario: u.usuario, ...(await dadosConfiguracao(u.usuario, decifrar(u.totp_segredo))) });
    }
    definirCookie(res, COOKIE_PENDENTE, assinarToken({ uid: u.id, tipo: "2fa" }, DURACAO_PENDENTE), DURACAO_PENDENTE);
    responder(res, 200, { etapa: "codigo" });
});
