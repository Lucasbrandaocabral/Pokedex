// GET /api/save        → progresso salvo na nuvem
// PUT|POST /api/save   { dados } → salva o progresso (POST é usado pelo navigator.sendBeacon)
import { rota, responder, lerCorpo, consulta, exigirSessao, ErroHttp, TAMANHO_MAX_SAVE } from "./_lib.js";

export default rota(["GET", "PUT", "POST"], async (req, res) => {
    const u = await exigirSessao(req);

    if (req.method === "GET") {
        const [save] = await consulta("SELECT dados, atualizado_em FROM saves WHERE usuario_id = $1", [u.id]);
        return responder(res, 200, { dados: save?.dados ?? null, atualizadoEm: save?.atualizado_em ?? null });
    }

    // "base" é a versão da nuvem que o aparelho conhecia. Se outra versão foi salva
    // depois (por outro aparelho), recusamos para não apagar o progresso mais novo.
    const { dados, base = 0 } = await lerCorpo(req);
    if (!dados || typeof dados !== "object" || Array.isArray(dados) || dados.v !== 1) throw new ErroHttp(400, "Save inválido.");
    const texto = JSON.stringify(dados);
    if (texto.length > TAMANHO_MAX_SAVE) throw new ErroHttp(413, "Save grande demais.");
    const [salvo] = await consulta(
        `INSERT INTO saves (usuario_id, dados, atualizado_em) VALUES ($1, $2::jsonb, NOW())
         ON CONFLICT (usuario_id) DO UPDATE SET dados = EXCLUDED.dados, atualizado_em = NOW()
         WHERE COALESCE((saves.dados->>'salvoEm')::bigint, 0) = $3
         RETURNING atualizado_em`,
        [u.id, texto, Number(base) || 0]
    );
    if (!salvo) {
        const [atual] = await consulta("SELECT dados FROM saves WHERE usuario_id = $1", [u.id]);
        return responder(res, 409, { erro: "Há um progresso mais novo salvo por outro aparelho.", dados: atual?.dados ?? null });
    }
    responder(res, 200, { atualizadoEm: salvo.atualizado_em });
});
