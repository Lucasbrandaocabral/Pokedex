// Testes do login com 2FA. Rode com o servidor local ligado: `npm run dev` e depois `npm test`
import { test } from "node:test";
import assert from "node:assert/strict";
import * as OTPAuth from "otpauth";

const BASE = process.env.BASE_URL || "http://localhost:3000";

const cliente = () => {
    const cookies = {};
    return async (caminho, { metodo = "GET", corpo } = {}) => {
        const r = await fetch(BASE + caminho, {
            method: metodo,
            headers: { "Content-Type": "application/json", Cookie: Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join("; ") },
            body: corpo ? JSON.stringify(corpo) : undefined,
        });
        for (const c of r.headers.getSetCookie()) {
            const [par] = c.split(";");
            const [k, v] = par.split("=");
            if (/Max-Age=0/.test(c)) delete cookies[k];
            else cookies[k] = v;
        }
        return { status: r.status, dados: await r.json() };
    };
};

// "momento" fixo deixa o teste estável quando a janela de 30s do código vira no meio dele
const codigoDe = (segredo, deslocamento = 0, momento = Date.now()) =>
    new OTPAuth.TOTP({ secret: OTPAuth.Secret.fromBase32(segredo) }).generate({ timestamp: momento + deslocamento * 30000 });
let momentoAtivacao = 0;

const usuario = `teste_${Date.now().toString(36)}`;
const senha = "senha-bem-forte-123";
let segredo;
let recuperacao;

test("cadastro exige usuário e senha válidos", async () => {
    const api = cliente();
    assert.equal((await api("/api/auth/cadastro", { metodo: "POST", corpo: { usuario: "a", senha } })).status, 400);
    assert.equal((await api("/api/auth/cadastro", { metodo: "POST", corpo: { usuario, senha: "curta" } })).status, 400);
});

test("cadastro + ativação do 2FA abre a sessão e salva na nuvem", async () => {
    const api = cliente();
    const cad = await api("/api/auth/cadastro", { metodo: "POST", corpo: { usuario, senha } });
    assert.equal(cad.status, 201);
    assert.equal(cad.dados.etapa, "configurar-2fa");
    assert.match(cad.dados.qr, /^data:image\/png;base64,/);
    segredo = cad.dados.segredo;

    assert.equal((await api("/api/auth/eu")).status, 401, "sem 2FA ainda não está logado");
    assert.equal((await api("/api/auth/verificar", { metodo: "POST", corpo: { codigo: "000000" } })).status, 400);

    momentoAtivacao = Date.now();
    const ok = await api("/api/auth/verificar", { metodo: "POST", corpo: { codigo: codigoDe(segredo, 0, momentoAtivacao) } });
    assert.equal(ok.status, 200);
    assert.equal(ok.dados.codigosRecuperacao.length, 8);
    recuperacao = ok.dados.codigosRecuperacao;

    assert.deepEqual((await api("/api/auth/eu")).dados, { usuario });
    assert.equal((await api("/api/save")).dados.dados, null);
    assert.equal((await api("/api/save", { metodo: "PUT", corpo: { dados: { v: 1, moedas: 10, salvoEm: 100 }, base: 0 } })).status, 200);
    assert.equal((await api("/api/save", { metodo: "PUT", corpo: { dados: { v: 1, moedas: 42, salvoEm: 200 }, base: 100 } })).status, 200);
    assert.equal((await api("/api/save")).dados.dados.moedas, 42);
    // Aparelho desatualizado (conhecia a versão 100) não sobrescreve a versão 200
    const conflito = await api("/api/save", { metodo: "PUT", corpo: { dados: { v: 1, moedas: 1, salvoEm: 300 }, base: 100 } });
    assert.equal(conflito.status, 409);
    assert.equal(conflito.dados.dados.moedas, 42);
    assert.equal((await api("/api/save", { metodo: "PUT", corpo: { dados: { hack: true } } })).status, 400);

    await api("/api/auth/sair", { metodo: "POST" });
    assert.equal((await api("/api/auth/eu")).status, 401);
});

test("nome de usuário repetido é recusado", async () => {
    const r = await cliente()("/api/auth/cadastro", { metodo: "POST", corpo: { usuario: usuario.toUpperCase(), senha } });
    assert.equal(r.status, 409);
});

test("login pede senha certa e depois o código do app", async () => {
    const api = cliente();
    assert.equal((await api("/api/auth/entrar", { metodo: "POST", corpo: { usuario, senha: "errada123" } })).status, 401);
    assert.equal((await api("/api/auth/entrar", { metodo: "POST", corpo: { usuario: "nao_existe_x", senha } })).status, 401);
    assert.equal((await api("/api/auth/verificar", { metodo: "POST", corpo: { codigo: codigoDe(segredo) } })).status, 401, "sem senha não passa");

    const r = await api("/api/auth/entrar", { metodo: "POST", corpo: { usuario, senha } });
    assert.deepEqual(r.dados, { etapa: "codigo" });
    assert.equal((await api("/api/auth/eu")).status, 401, "só a senha não basta");

    // O código usado na ativação não pode ser reaproveitado; o do próximo intervalo vale
    assert.equal((await api("/api/auth/verificar", { metodo: "POST", corpo: { codigo: codigoDe(segredo, 0, momentoAtivacao) } })).status, 400);
    const ok = await api("/api/auth/verificar", { metodo: "POST", corpo: { codigo: codigoDe(segredo, 1, momentoAtivacao) } });
    assert.equal(ok.status, 200);
    assert.equal((await api("/api/save")).dados.dados.moedas, 42);
});

test("código de recuperação funciona uma única vez", async () => {
    const api = cliente();
    await api("/api/auth/entrar", { metodo: "POST", corpo: { usuario, senha } });
    const ok = await api("/api/auth/verificar", { metodo: "POST", corpo: { codigo: recuperacao[0] } });
    assert.equal(ok.status, 200);
    assert.equal(ok.dados.codigosRestantes, 7);

    await api("/api/auth/sair", { metodo: "POST" });
    await api("/api/auth/entrar", { metodo: "POST", corpo: { usuario, senha } });
    assert.equal((await api("/api/auth/verificar", { metodo: "POST", corpo: { codigo: recuperacao[0] } })).status, 400);
});

test("conta é bloqueada depois de 5 erros seguidos", async () => {
    const api = cliente();
    for (let i = 0; i < 4; i++) await api("/api/auth/entrar", { metodo: "POST", corpo: { usuario, senha: "errada123" } });
    const r = await api("/api/auth/entrar", { metodo: "POST", corpo: { usuario, senha } });
    assert.equal(r.status, 429, "a 5ª falha veio do teste anterior (código de recuperação repetido)");
});
