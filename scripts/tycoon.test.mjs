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

test("editar móveis: mover respeita o caminho, girar dá a volta e pintar só aceita cores da lista", () => {
    const t = novo();
    const p = T.porta(t);
    assert.equal(T.moverMovel(t, 1, 1, p.x, p.y), false, "não vai para a porta");
    assert.equal(T.moverMovel(t, 1, 1, 4, 1), false, "não vai para cima de outro móvel");
    assert.ok(T.moverMovel(t, 1, 1, 0, 0));
    assert.ok(T.movelEm(t, 0, 0));
    assert.equal(T.movelEm(t, 1, 1), undefined);
    // Fecha a fileira de cima da porta menos um buraco: mover algo para o buraco é proibido
    const { w } = T.tamanho(t);
    t.dinheiro = 1e6;
    for (let x = 0; x < w; x++) if (x !== 2 && !T.movelEm(t, x, p.y - 1)) T.construir(t, x, p.y - 1, "planta");
    assert.equal(T.moverMovel(t, 0, 0, 2, p.y - 1), false);
    const m = T.movelEm(t, 0, 0);
    for (let i = 0; i < 4; i++) T.girarMovel(t, 0, 0);
    assert.equal(m.rot, 0);
    T.girarMovel(t, 0, 0);
    assert.equal(m.rot, 1);
    assert.ok(T.pintarMovel(t, 0, 0, "azul"));
    assert.equal(T.pintarMovel(t, 0, 0, "dourado"), false);
    assert.equal(m.acabamento, "azul");
});

test("clientes usam a frente do móvel quando ela está livre", () => {
    const t = novo();
    const m = T.movelEm(t, 1, 1);
    assert.deepEqual(T.ladoLivre(t, m), { x: 1, y: 2 });
    m.rot = 1;
    assert.deepEqual(T.ladoLivre(t, m), { x: 2, y: 1 });
    m.rot = 2;
    assert.deepEqual(T.ladoLivre(t, m), { x: 1, y: 0 });
});

test("melhorar móveis: mais estoque, custo certo e a venda devolve metade do que foi gasto", () => {
    const t = novo();
    t.dinheiro = 1e6;
    const m = T.movelEm(t, 1, 1);
    assert.equal(T.estoqueMax(t, m), 10);
    assert.ok(T.melhorarMovel(t, 1, 1));
    assert.equal(T.estoqueMax(t, m), 15);
    assert.ok(T.melhorarMovel(t, 1, 1));
    assert.equal(T.estoqueMax(t, m), 20);
    assert.equal(T.melhorarMovel(t, 1, 1), false, "nível 3 é o máximo");
    assert.equal(T.valorMovel(m), 120 + 300 + 1200);
    const antes = t.dinheiro;
    T.remover(t, 1, 1);
    assert.equal(t.dinheiro, antes + Math.floor((120 + 300 + 1200) / 2));
    T.comprarMelhoria(t, "deposito");
    assert.equal(T.estoqueMax(t), 10, "depósito só libera em Viridian");
    t.cidade = 1;
    assert.ok(T.comprarMelhoria(t, "deposito"));
    assert.equal(T.estoqueMax(t), 15);
    assert.equal(T.comprarMelhoria(t, "deposito"), false, "não compra duas vezes");
});

test("qualidade aumenta preço e procura; caixa melhorado atende mais rápido", () => {
    const t = novo();
    t.dinheiro = 1e6;
    const preco = T.precoVenda(t, "pocao");
    const procura = T.procura(t, "pocao");
    assert.ok(T.melhorarQualidade(t, "pocao"));
    assert.equal(t.dinheiro, 1e6 - T.custoQualidade("pocao", 0));
    assert.ok(T.precoVenda(t, "pocao") > preco);
    assert.ok(T.procura(t, "pocao") > procura);
    assert.equal(T.melhorarQualidade(t, "docerara"), false, "doce raro ainda bloqueado");
    const caixa = T.movelEm(t, 4, 3);
    const tempo = T.tempoCaixa(t, caixa);
    T.melhorarMovel(t, 4, 3);
    assert.ok(T.tempoCaixa(t, caixa) < tempo);
});

test("geladeira só vende bebidas; limites e cidades dos móveis novos", () => {
    const t = novo();
    t.dinheiro = 1e6;
    assert.ok(T.construir(t, 0, 0, "geladeira"));
    const g = T.movelEm(t, 0, 0);
    assert.equal(g.produto, "agua");
    assert.equal(T.trocarProduto(t, g, "pocao"), false);
    assert.equal(T.trocarProduto(t, T.movelEm(t, 1, 1), "agua"), false, "estante não vende bebida");
    assert.ok(T.construir(t, 3, 0, "banco"));
    assert.ok(T.construir(t, 5, 3, "banco"));
    assert.ok(T.construir(t, 0, 3, "banco"));
    assert.equal(T.bloqueioConstruir(t, "banco"), "Máximo de 3");
    assert.match(T.bloqueioConstruir(t, "estatua"), /Libera em/);
    assert.ok(T.pacienciaFila(t) > 14);
});

test("clientes procuram produtos que a loja não vende e isso fica anotado", () => {
    const t = novo();
    const mundo = T.novoMundo();
    const rnd = semente(3);
    let naoTem = 0;
    for (let i = 0; i < 3000; i++) naoTem += T.simular(t, mundo, 0.1, { rnd }).filter((e) => e.tipo === "nao-tem").length;
    assert.ok(naoTem > 0);
    assert.ok((t.procurados.pacote || 0) + (t.procurados.agua || 0) > 0, "pacote e água estão liberados mas não estão à venda");
    assert.ok(Object.keys(t.vendidos).length >= 1);
});

test("metas pagam uma vez só", () => {
    const t = novo();
    assert.equal(T.resgatarMeta(t, "atender10"), false);
    t.atendidos = 10;
    assert.equal(T.metasProntas(t) >= 1, true);
    const antes = t.dinheiro;
    assert.ok(T.resgatarMeta(t, "atender10"));
    assert.equal(t.dinheiro, antes + 200);
    assert.equal(T.resgatarMeta(t, "atender10"), false);
});
