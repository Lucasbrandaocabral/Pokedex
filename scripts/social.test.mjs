// Testes de perfil, amigos e trocas entre jogadores. Rode com o servidor local ligado.
import { test } from "node:test";
import assert from "node:assert/strict";
import * as OTPAuth from "otpauth";

const BASE = process.env.BASE_URL || "http://localhost:3000";

const cliente = () => {
    const cookies = {};
    const api = async (caminho, { metodo = "GET", corpo } = {}) => {
        const r = await fetch(BASE + caminho, {
            method: metodo,
            headers: { "Content-Type": "application/json", Cookie: Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join("; ") },
            body: corpo === undefined ? undefined : typeof corpo === "string" ? corpo : JSON.stringify(corpo),
        });
        for (const c of r.headers.getSetCookie()) {
            const [k, v] = c.split(";")[0].split("=");
            if (/Max-Age=0/.test(c)) delete cookies[k];
            else cookies[k] = v;
        }
        return { status: r.status, dados: await r.json() };
    };
    api.acao = (acao, dados = {}) => api("/api/social", { metodo: "POST", corpo: { acao, ...dados } });
    api.cookies = cookies;
    return api;
};

const criarJogador = async (prefixo, colecao) => {
    const api = cliente();
    const usuario = `${prefixo}_${Math.random().toString(36).slice(2, 8)}`;
    const cad = await api("/api/auth/cadastro", { metodo: "POST", corpo: { usuario, senha: "senha-forte-1" } });
    const codigo = new OTPAuth.TOTP({ secret: OTPAuth.Secret.fromBase32(cad.dados.segredo) }).generate();
    await api("/api/auth/verificar", { metodo: "POST", corpo: { codigo } });
    await api("/api/save", { metodo: "PUT", corpo: { dados: { v: 1, colecao, novas: {}, stats: { pacotes: 3 }, salvoEm: 1 }, base: 0 } });
    return { api, usuario };
};

const save = async (api) => (await api("/api/save")).dados.dados;

let ash, misty, brock;

test("prepara três treinadores", async () => {
    ash = await criarJogador("ash", { "025": 2, "004": 1 });
    misty = await criarJogador("misty", { "007": 3, "120": 1 });
    brock = await criarJogador("brock", { "095": 1 });
});

test("editar perfil e ver o próprio perfil", async () => {
    assert.equal((await ash.api.acao("editar-perfil", { apelido: "Ash Ketchum", bio: "<b>Quero ser mestre</b>", avatar: 25, vitrine: ["025"] })).status, 200);
    assert.equal((await ash.api.acao("editar-perfil", { avatar: 25, vitrine: ["150"] })).status, 400, "vitrine só com cartas que tem");
    assert.equal((await ash.api.acao("editar-perfil", { avatar: 999 })).status, 400);
    await ash.api.acao("editar-perfil", { apelido: "Ash Ketchum", bio: "<b>Quero ser mestre</b>", avatar: 25, vitrine: ["025"] });
    const { perfil } = (await ash.api("/api/social?acao=resumo")).dados;
    assert.equal(perfil.apelido, "Ash Ketchum");
    assert.equal(perfil.bio, "bQuero ser mestre/b", "tira os < > para não virar HTML");
    assert.deepEqual(perfil.vitrine, ["025"]);
    assert.equal(perfil.cartas, 2);
});

test("pedido de amizade: enviar, aceitar e ver a coleção do amigo", async () => {
    assert.equal((await ash.api.acao("adicionar-amigo", { usuario: "ninguem_aqui" })).status, 404);
    assert.equal((await ash.api.acao("adicionar-amigo", { usuario: ash.usuario })).status, 400);
    assert.equal((await ash.api.acao("adicionar-amigo", { usuario: misty.usuario.toUpperCase() })).status, 200);
    assert.equal((await ash.api.acao("adicionar-amigo", { usuario: misty.usuario })).status, 409, "pedido repetido");

    const antes = (await misty.api(`/api/social?acao=perfil&usuario=${ash.usuario}`)).dados;
    assert.equal(antes.amigo, false);
    assert.equal(antes.colecao, null, "sem amizade não vê a coleção");

    const { pedidosRecebidos } = (await misty.api("/api/social?acao=resumo")).dados;
    assert.equal(pedidosRecebidos.length, 1);
    assert.equal((await misty.api.acao("responder-amigo", { id: pedidosRecebidos[0].id, aceitar: true })).status, 200);

    const depois = (await misty.api(`/api/social?acao=perfil&usuario=${ash.usuario}`)).dados;
    assert.equal(depois.amigo, true);
    assert.deepEqual(depois.colecao, { "025": 2, "004": 1 });
    assert.equal((await ash.api("/api/social?acao=resumo")).dados.amigos[0].usuario, misty.usuario);
});

test("pedido cruzado vira amizade na hora", async () => {
    await brock.api.acao("adicionar-amigo", { usuario: ash.usuario });
    const r = await ash.api.acao("adicionar-amigo", { usuario: brock.usuario });
    assert.equal(r.dados.aceito, true);
});

test("troca: reservar, aceitar e receber a entrega", async () => {
    assert.equal((await ash.api.acao("propor-troca", { para: misty.usuario, da: ["150"], quer: ["007"] })).status, 409, "não tem a carta");
    assert.equal((await ash.api.acao("propor-troca", { para: misty.usuario, da: [], quer: [] })).status, 400);

    const prop = await ash.api.acao("propor-troca", { para: misty.usuario, da: ["025"], quer: ["007", "007"], mensagem: "Troca?" });
    assert.equal(prop.status, 200);
    assert.equal(prop.dados.save.colecao["025"], 1, "carta oferecida fica reservada");
    assert.equal((await save(ash.api)).colecao["025"], 1);

    const recebida = (await misty.api("/api/social?acao=resumo")).dados.trocas.find((t) => !t.enviada);
    assert.deepEqual([recebida.da, recebida.quer, recebida.mensagem], [["025"], ["007", "007"], "Troca?"]);

    const ok = await misty.api.acao("responder-troca", { id: recebida.id, aceitar: true });
    assert.equal(ok.status, 200);
    assert.equal(ok.dados.save.colecao["007"], 1);
    assert.equal(ok.dados.save.colecao["025"], 1);
    assert.equal(ok.dados.save.novas["025"], true);
    assert.equal((await misty.api.acao("responder-troca", { id: recebida.id, aceitar: true })).status, 404, "não aceita duas vezes");

    const { entregas, trocas } = (await ash.api("/api/social?acao=resumo")).dados;
    assert.deepEqual(entregas.map((e) => e.cartas), [["007", "007"]]);
    assert.equal(trocas[0].status, "aceita");
    await ash.api.acao("confirmar-entregas", { ids: entregas.map((e) => e.id) });
    assert.equal((await ash.api("/api/social?acao=resumo")).dados.entregas.length, 0);
});

test("troca recusada ou cancelada devolve as cartas reservadas", async () => {
    const p1 = await ash.api.acao("propor-troca", { para: misty.usuario, da: ["004"], quer: [] });
    assert.equal(p1.dados.save.colecao["004"], undefined);
    await misty.api.acao("responder-troca", { id: p1.dados.id, aceitar: false });

    const p2 = await ash.api.acao("propor-troca", { para: misty.usuario, da: ["025"], quer: ["120"] });
    assert.equal((await misty.api.acao("cancelar-troca", { id: p2.dados.id })).status, 404, "só quem propôs cancela");
    await ash.api.acao("cancelar-troca", { id: p2.dados.id });

    const { entregas } = (await ash.api("/api/social?acao=resumo")).dados;
    assert.deepEqual(entregas.map((e) => e.cartas).sort(), [["004"], ["025"]]);
});

test("aceitar sem ter as cartas pedidas falha e a troca continua pendente", async () => {
    const p = await brock.api.acao("propor-troca", { para: ash.usuario, da: ["095"], quer: ["120"] });
    assert.equal((await ash.api.acao("responder-troca", { id: p.dados.id, aceitar: true })).status, 409);
    const t = (await ash.api("/api/social?acao=resumo")).dados.trocas.find((x) => x.id === p.dados.id);
    assert.equal(t.status, "pendente");
});

test("sem amizade não dá para propor troca; desfazer amizade cancela as trocas", async () => {
    assert.equal((await misty.api.acao("propor-troca", { para: brock.usuario, da: ["007"] })).status, 403);
    await ash.api.acao("remover-amigo", { usuario: brock.usuario });
    const { entregas, amigos } = (await brock.api("/api/social?acao=resumo")).dados;
    assert.equal(amigos.length, 0);
    assert.deepEqual(entregas.map((e) => e.cartas), [["095"]]);
});

test("trocar senha exige a senha atual", async () => {
    assert.equal((await ash.api.acao("trocar-senha", { atual: "errada", nova: "outra-senha-1" })).status, 400);
    assert.equal((await ash.api.acao("trocar-senha", { atual: "senha-forte-1", nova: "outra-senha-1" })).status, 200);
    const login = await cliente()("/api/auth/entrar", { metodo: "POST", corpo: { usuario: ash.usuario, senha: "outra-senha-1" } });
    assert.equal(login.dados.etapa, "codigo");
});

test("código de amigo: aparece no perfil e serve para adicionar", async () => {
    const eevee = await criarJogador("eevee", {});
    const { perfil } = (await eevee.api("/api/social?acao=resumo")).dados;
    assert.match(perfil.codigoAmigo, /^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    assert.equal((await eevee.api("/api/social?acao=resumo")).dados.perfil.codigoAmigo, perfil.codigoAmigo, "o código não muda");

    // Com hífen, sem hífen, minúsculo: tudo funciona
    const r = await misty.api.acao("adicionar-amigo", { usuario: perfil.codigoAmigo.replace("-", "").toLowerCase() });
    assert.equal(r.status, 200);
    assert.equal(r.dados.usuario, eevee.usuario);
    assert.equal((await misty.api(`/api/social?acao=perfil&usuario=${perfil.codigoAmigo}`)).dados.usuario, eevee.usuario);
    assert.equal((await misty.api.acao("adicionar-amigo", { usuario: "ZZZZ-ZZZZ" })).status, 404);
});

test("mudar o nome de usuário: exige senha e só a cada 6 meses", async () => {
    const pikachu = await criarJogador("pika", {});
    const novo = `raichu_${Math.random().toString(36).slice(2, 7)}`;
    assert.equal((await pikachu.api.acao("trocar-nome", { novo, senha: "errada" })).status, 400);
    assert.equal((await pikachu.api.acao("trocar-nome", { novo: "a!", senha: "senha-forte-1" })).status, 400);
    assert.equal((await pikachu.api.acao("trocar-nome", { novo: misty.usuario, senha: "senha-forte-1" })).status, 409, "nome em uso");

    const ok = await pikachu.api.acao("trocar-nome", { novo: novo.toUpperCase(), senha: "senha-forte-1" });
    assert.equal(ok.status, 200);
    assert.equal(ok.dados.usuario, novo);
    assert.deepEqual((await pikachu.api("/api/auth/eu")).dados, { usuario: novo }, "a sessão continua valendo");
    assert.ok((await pikachu.api("/api/social?acao=resumo")).dados.perfil.proximaTrocaNome, "mostra quando pode mudar de novo");

    assert.equal((await pikachu.api.acao("trocar-nome", { novo: `${novo}x`, senha: "senha-forte-1" })).status, 429);
    const antigo = await cliente()("/api/auth/entrar", { metodo: "POST", corpo: { usuario: pikachu.usuario, senha: "senha-forte-1" } });
    assert.equal(antigo.status, 401, "o nome antigo não entra mais");
    const atual = await cliente()("/api/auth/entrar", { metodo: "POST", corpo: { usuario: novo, senha: "senha-forte-1" } });
    assert.equal(atual.dados.etapa, "codigo");
});

test("save adulterado é limpo e não quebra a tela dos amigos", async () => {
    const hacker = await criarJogador("hacker", {});
    await hacker.api.acao("adicionar-amigo", { usuario: misty.usuario });
    const { pedidosRecebidos } = (await misty.api("/api/social?acao=resumo")).dados;
    await misty.api.acao("responder-amigo", { id: pedidosRecebidos.find((p) => p.usuario === hacker.usuario).id, aceitar: true });
    const atual = await save(hacker.api);
    const r = await hacker.api("/api/save", { metodo: "PUT", corpo: { base: atual.salvoEm, dados: {
        v: 1, salvoEm: atual.salvoEm + 1, moedas: 1e300, pontos: -5,
        colecao: { "999": 3, "<img src=x onerror=alert(1)>": 1, "__proto__": { x: 1 }, "150": "7<b>", "025": 2 },
        stats: { pacotes: "abc" },
    } } });
    assert.equal(r.status, 200);
    const limpo = await save(hacker.api);
    assert.deepEqual(limpo.colecao, { "025": 2 });
    assert.equal(limpo.moedas, 1e9);
    assert.equal(limpo.pontos, 0);
    assert.equal(limpo.stats.pacotes, 0);
    assert.equal((await misty.api("/api/social?acao=resumo")).status, 200, "a tela da amiga continua funcionando");
    assert.deepEqual((await misty.api(`/api/social?acao=perfil&usuario=${hacker.usuario}`)).dados.colecao, { "025": 2 });
});

test("só aceita JSON de verdade", async () => {
    const cookie = `pp_sessao=${ash.api.cookies.pp_sessao}`;
    const r = await fetch(`${BASE}/api/social`, { method: "POST", headers: { Cookie: cookie, "Content-Type": "text/plain; charset=application/json" }, body: JSON.stringify({ acao: "editar-perfil", avatar: 25 }) });
    assert.equal(r.status, 415);
    assert.equal((await ash.api("/api/social", { metodo: "POST", corpo: "[1,2]" })).status, 400);
});

test("trocar a senha desconecta os outros aparelhos", async () => {
    const j = await criarJogador("sessao", {});
    const antes = await j.api("/api/auth/eu");
    assert.equal(antes.status, 200);
    const roubado = j.api.cookies.pp_sessao;
    assert.equal((await j.api.acao("trocar-senha", { atual: "senha-forte-1", nova: "senha-nova-22" })).status, 200);
    assert.equal((await j.api("/api/auth/eu")).status, 200, "este aparelho continua conectado");
    const velho = await fetch(`${BASE}/api/auth/eu`, { headers: { Cookie: `pp_sessao=${roubado}` } });
    assert.equal(velho.status, 401, "o cookie antigo não vale mais");

    const roubado2 = j.api.cookies.pp_sessao;
    await j.api.acao("sair-de-todos");
    assert.equal((await fetch(`${BASE}/api/auth/eu`, { headers: { Cookie: `pp_sessao=${roubado2}` } })).status, 401);
    assert.equal((await j.api("/api/auth/eu")).status, 200);
});

test("sem login não acessa nada social", async () => {
    assert.equal((await cliente()("/api/social?acao=resumo")).status, 401);
});

test("cartas das outras expansões: salvar e trocar", async () => {
    const gary = await criarJogador("gary", { "A1a-001": 2, "A3-004": 1, "A1a-999": 1, "201": 1, "a1a-001": 1 });
    assert.deepEqual((await save(gary.api)).colecao, { "A1a-001": 2, "A3-004": 1 }, "só fica o que existe no jogo");

    const tracey = await criarJogador("tracey", { "001": 1 });
    await gary.api.acao("adicionar-amigo", { usuario: tracey.usuario });
    const { pedidosRecebidos } = (await tracey.api("/api/social?acao=resumo")).dados;
    await tracey.api.acao("responder-amigo", { id: pedidosRecebidos[0].id, aceitar: true });

    assert.equal((await gary.api.acao("propor-troca", { para: tracey.usuario, da: ["A1a-999"], quer: [] })).status, 400);
    const prop = await gary.api.acao("propor-troca", { para: tracey.usuario, da: ["A1a-001"], quer: ["001"] });
    assert.equal(prop.status, 200);
    const recebida = (await tracey.api("/api/social?acao=resumo")).dados.trocas.find((t) => !t.enviada);
    const ok = await tracey.api.acao("responder-troca", { id: recebida.id, aceitar: true });
    assert.equal(ok.status, 200);
    assert.equal(ok.dados.save.colecao["A1a-001"], 1);
});
