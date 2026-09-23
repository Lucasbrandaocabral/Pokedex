// POST /api/auth/sair  → encerra a sessão
import { rota, responder, apagarCookie, COOKIE_SESSAO, COOKIE_PENDENTE } from "../_lib.js";

export default rota(["POST"], async (req, res) => {
    apagarCookie(res, COOKIE_SESSAO);
    apagarCookie(res, COOKIE_PENDENTE);
    responder(res, 200, { ok: true });
});
