// GET /api/auth/eu  → usuário conectado
import { rota, responder, exigirSessao } from "../_lib.js";

export default rota(["GET"], async (req, res) => {
    const u = await exigirSessao(req);
    responder(res, 200, { usuario: u.usuario });
});
