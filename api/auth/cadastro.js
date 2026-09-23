// POST /api/auth/cadastro  { usuario, senha }
// Cria a conta e devolve o QR code para configurar o 2FA (obrigatório)
import {
    rota, responder, lerCorpo, consulta, ErroHttp, gerarHashSenha, cifrar,
    assinarToken, definirCookie, COOKIE_PENDENTE, DURACAO_PENDENTE,
    limitarTaxa, ipDe,
} from "../_lib.js";
import { novoSegredo, dadosConfiguracao } from "../_totp.js";

export const validarUsuario = (usuario) => {
    const u = String(usuario || "").trim().toLowerCase();
    if (!/^[a-z0-9_]{3,20}$/.test(u)) throw new ErroHttp(400, "O usuário deve ter de 3 a 20 caracteres: letras, números ou _.");
    return u;
};

export const validarSenha = (senha) => {
    const s = String(senha || "");
    if (s.length < 8) throw new ErroHttp(400, "A senha precisa ter pelo menos 8 caracteres.");
    if (s.length > 128) throw new ErroHttp(400, "A senha pode ter no máximo 128 caracteres.");
    return s;
};

export default rota(["POST"], async (req, res) => {
    await limitarTaxa(`cadastro:${ipDe(req)}`, 10, 60);
    const corpo = await lerCorpo(req);
    const usuario = validarUsuario(corpo.usuario);
    const senha = validarSenha(corpo.senha);

    // Libera nomes de contas que nunca terminaram o cadastro (2FA não ativado em 1 hora)
    await consulta("DELETE FROM usuarios WHERE usuario = $1 AND NOT totp_ativo AND criado_em < NOW() - INTERVAL '1 hour'", [usuario]);
    const [existente] = await consulta("SELECT id FROM usuarios WHERE usuario = $1", [usuario]);
    if (existente) throw new ErroHttp(409, "Esse nome de usuário já está em uso.");

    const segredo = novoSegredo();
    const [novo] = await consulta(
        "INSERT INTO usuarios (usuario, senha_hash, totp_segredo) VALUES ($1, $2, $3) ON CONFLICT (usuario) DO NOTHING RETURNING id",
        [usuario, await gerarHashSenha(senha), cifrar(segredo)]
    );
    if (!novo) throw new ErroHttp(409, "Esse nome de usuário já está em uso.");

    definirCookie(res, COOKIE_PENDENTE, assinarToken({ uid: novo.id, tipo: "configurar" }, DURACAO_PENDENTE), DURACAO_PENDENTE);
    responder(res, 201, { etapa: "configurar-2fa", usuario, ...(await dadosConfiguracao(usuario, segredo)) });
});
