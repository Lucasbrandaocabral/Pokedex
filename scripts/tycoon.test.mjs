// Testes das regras do Pokémart Tycoon (não precisam do servidor)
import { test } from "node:test";
import assert from "node:assert/strict";
import * as T from "../Js/tycoon-dados.js";

const novo = () => T.tycoonInicial();
// Gerador de números previsível para a simulação
const semente = (s = 42) => () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);

test("não deixa construir na porta nem fechar o caminho dos clientes", () => {
    const t = novo();
    const p = T.porta(t);
    assert.equal(T.podeConstruir(t, p.x, p.y), false);
    assert.equal(T.podeConstruir(t, 1, 1), false, "já tem móvel");
    // Fecha a linha de cima da porta, menos um buraco: o último bloco não pode tapar o buraco
    const { w } = T.tamanho(t);
    t.dinheiro = 1e6;
    for (let x = 0; x < w; x++) if (x !== 2 && T.movelEm(t, x, p.y - 1) === undefined) T.construir(t, x, p.y - 1, "planta");
    assert.equal(T.podeConstruir(t, 2, p.y - 1), false);
});

test("construir cobra e vender devolve metade; o último caixa não sai", () => {
    const t = novo();
    const antes = t.dinheiro;
    assert.ok(T.construir(t, 0, 0, "planta"));
    assert.equal(t.dinheiro, antes - T.MOVEIS.planta.custo);
    assert.ok(T.remover(t, 0, 0));
    assert.equal(t.dinheiro, antes - T.MOVEIS.planta.custo / 2);
    const caixa = t.moveis.find((m) => m.tipo === "caixa");
    assert.equal(T.remover(t, caixa.x, caixa.y), false);
    t.dinheiro = 0;
    assert.equal(T.construir(t, 0, 0, "maquina"), false, "sem dinheiro");
});

test("repor cobra o preço de custo e respeita o estoque máximo", () => {
    const t = novo();
    const m = t.moveis.find((x) => x.tipo === "prateleira");
    m.estoque = 4;
    const custo = T.custoRepor(t, m);
    assert.equal(custo, 6 * T.PRODUTOS[m.produto].custo);
    const antes = t.dinheiro;
    T.repor(t, m);
    assert.equal(m.estoque, T.estoqueMax(t));
    assert.equal(t.dinheiro, antes - custo);
    t.equipe.kangaskhan = 2;
    assert.equal(T.estoqueMax(t), T.ESTOQUE_BASE + 10);
});

test("equipe fica mais cara a cada nível e para no máximo", () => {
    const t = novo();
    t.dinheiro = 1e9;
    for (let i = 0; i < 10; i++) T.contratar(t, "chansey");
    assert.equal(t.equipe.chansey, T.NIVEL_MAX);
    assert.ok(T.tempoCaixa(t) < 2.6);
    assert.ok(T.custoEquipe(T.EQUIPE_POR_ID.chansey, 2) > T.custoEquipe(T.EQUIPE_POR_ID.chansey, 1));
});

test("a simulação vende, dá lucro e gasta estoque", () => {
    const t = novo();
    const mundo = T.novoMundo();
    const rnd = semente();
    let vendas = 0;
    for (let i = 0; i < 1200; i++) vendas += T.simular(t, mundo, 0.1, { rnd }).filter((e) => e.tipo === "venda").length;
    assert.ok(vendas > 3, `vendeu ${vendas}`);
    assert.ok(t.lucroTotal > 0);
    assert.ok(t.moveis.some((m) => m.tipo === "prateleira" && m.estoque < 10));
    // Clientes nunca saem do mapa
    const { w, h } = T.tamanho(t);
    for (const c of mundo.clientes) assert.ok(c.x >= 0 && c.y >= 0 && c.x < w && c.y < h);
});

test("sem estoque os clientes vão embora e a reputação cai", () => {
    const t = novo();
    for (const m of t.moveis) if (m.tipo === "prateleira") m.estoque = 0;
    const mundo = T.novoMundo();
    const rnd = semente(7);
    const rep = t.reputacao;
    for (let i = 0; i < 1200; i++) T.simular(t, mundo, 0.1, { rnd });
    assert.ok(t.perdidos > 0);
    assert.ok(t.reputacao < rep);
    assert.equal(t.atendidos, 0);
});

test("mudar de cidade exige lucro e dinheiro, e os móveis continuam dentro do mapa", () => {
    const t = novo();
    assert.equal(T.podeMudar(t), false);
    t.lucroTotal = T.CIDADES[1].lucroMin;
    t.dinheiro = T.CIDADES[1].custo;
    assert.ok(T.mudarCidade(t));
    assert.equal(t.cidade, 1);
    assert.equal(t.dinheiro, 0);
    const p = T.porta(t);
    for (const m of t.moveis) {
        assert.ok(T.dentro(t, m.x, m.y));
        assert.ok(!(m.x === p.x && m.y === p.y));
    }
});

test("pacotes: 1 a cada 25 mil de lucro, no máximo 2 por dia", () => {
    const t = novo();
    t.lucroTotal = T.LUCRO_POR_PACOTE * 5;
    assert.equal(T.pacotesDisponiveis(t, "d1"), 2);
    assert.ok(T.resgatarPacote(t, "d1"));
    assert.ok(T.resgatarPacote(t, "d1"));
    assert.equal(T.resgatarPacote(t, "d1"), false);
    assert.equal(T.pacotesDisponiveis(t, "d2"), 2);
    T.resgatarPacote(t, "d2");
    T.resgatarPacote(t, "d2");
    assert.equal(T.pacotesDisponiveis(t, "d3"), 1, "só sobrou 1 dos 5 ganhos");
});

test("tempo fora: rende no máximo 8h e nunca mais que o estoque", () => {
    const t = novo();
    t.taxaMin = 1e6;
    const agora = Date.now();
    t.ultimoTick = agora - 48 * 3600 * 1000;
    const r = T.aplicarOffline(t, agora);
    assert.equal(r.segundos, T.OFFLINE_MAX_SEGUNDOS);
    assert.ok(r.ganho < 1000, "limitado pelo estoque das prateleiras");
    assert.ok(t.moveis.every((m) => m.tipo !== "prateleira" || m.estoque < 10));
});

test("Equipe Rocket rouba a prateleira, mas dá para expulsar", () => {
    const t = novo();
    const mundo = T.novoMundo();
    mundo.proximoCliente = 1e9;
    const c = T.entrarRocket(t, mundo);
    assert.ok(c);
    assert.ok(T.expulsarRocket(t, mundo, c.id));
    assert.equal(t.rocketsExpulsos, 1);
    const c2 = T.entrarRocket(t, mundo);
    let roubo = null;
    for (let i = 0; i < 200 && !roubo; i++) roubo = T.simular(t, mundo, 0.1).find((e) => e.tipo === "roubo");
    assert.ok(roubo, "o Rocket roubou");
    assert.equal(T.expulsarRocket(t, mundo, c2.id), true, "ainda dá para pegar ele saindo");
});

test("normalizar conserta saves estranhos", () => {
    const t = T.normalizarTycoon({ dinheiro: -5, cidade: 99, reputacao: 12, moveis: [{ tipo: "foguete" }, null] });
    assert.equal(t.dinheiro, 0);
    assert.equal(t.cidade, T.CIDADES.length - 1);
    assert.equal(t.reputacao, 5);
    assert.deepEqual(t.moveis, []);
    assert.deepEqual(T.normalizarTycoon(null).moveis.length, 3);
});
