// Testes das regras do Pokéclicker (não precisam do servidor)
import { test } from "node:test";
import assert from "node:assert/strict";
import * as C from "../Js/clicker-dados.js";

const novo = () => C.clickerInicial();
const magnemite = C.AJUDANTE_POR_ID.magnemite;

test("custo dos ajudantes cresce 15% por compra e a Liga dá 10% de desconto", () => {
    const c = novo();
    assert.equal(C.custoAjudante(c, magnemite), 15);
    c.ajudantes.magnemite = 10;
    assert.equal(C.custoAjudante(c, magnemite), Math.ceil(15 * 1.15 ** 10));
    assert.equal(C.custoAjudante(c, magnemite, 3), Math.ceil(15 * 1.15 ** 10 * (1 + 1.15 + 1.15 ** 2)));
    c.arvore.push("ajud1", "ajud2");
    assert.equal(C.custoAjudante(c, magnemite), Math.ceil(15 * 1.15 ** 10 * 0.9));
});

test("comprar o máximo nunca passa da energia", () => {
    const c = novo();
    c.energia = 12345;
    const n = C.maximoCompravel(c, magnemite);
    assert.ok(C.custoAjudante(c, magnemite, n) <= c.energia);
    assert.ok(C.custoAjudante(c, magnemite, n + 1) > c.energia);
    assert.ok(C.comprarAjudante(c, "magnemite", n));
    assert.equal(c.ajudantes.magnemite, n);
});

test("melhorias da loja: aparecem na hora certa e dobram a produção", () => {
    const c = novo();
    c.ajudantes.voltorb = 4;
    assert.equal(C.energiaPorSegundo(c), 4);
    const loja = () => C.melhoriasNaLoja(c).map((m) => m.id);
    assert.ok(loja().includes("voltorb-1"));
    assert.ok(!loja().includes("voltorb-2"), "o nível II só aparece com 5 Voltorbs");
    c.energia = 1e9;
    assert.equal(C.comprarMelhoria(c, "voltorb-2"), false, "não compra o que não aparece");
    assert.equal(C.comprarMelhoria(c, "voltorb-1"), true);
    assert.equal(C.energiaPorSegundo(c), 8);
    c.melhorias.push("choque", "trovoada");
    c.arvore.push("clique1");
    assert.equal(C.energiaPorClique(c), 12);
});

test("conquistas dão +1% de produção cada (mais com amizade)", () => {
    const c = novo();
    c.ajudantes.voltorb = 100;
    c.totalGeral = 1e5;
    const novas = C.verificarConquistas(c);
    assert.ok(novas.some((q) => q.id === "total-1000"));
    assert.ok(novas.some((q) => q.id === "tem-voltorb-100"));
    const n = c.conquistas.length;
    assert.equal(C.verificarConquistas(c).length, 0, "não repete");
    assert.ok(Math.abs(C.energiaPorSegundo(c) - 100 * (1 + n * 0.01)) < 1e-9);
    c.melhorias.push("amizade1");
    assert.ok(Math.abs(C.energiaPorSegundo(c) - 100 * (1 + n * 0.02)) < 1e-9);
});

test("baú a cada 100 cliques, item vai para a mochila e para no máximo", () => {
    const c = novo();
    let bau = false;
    for (let i = 0; i < 100; i++) bau = C.clicar(c).bau;
    assert.equal(bau, true);
    const r = C.abrirBau(c, Date.now(), () => 0); // rnd 0 = comum, primeiro item
    assert.equal(r.item.raridade, "comum");
    assert.equal(c.itens[r.item.id], 1);
    assert.equal(c.bauProgresso, 0);
    c.itens[r.item.id] = C.MAX_COPIAS;
    assert.equal(C.abrirBau(c, Date.now(), () => 0).repetido, true);
    assert.equal(c.itens[r.item.id], C.MAX_COPIAS);
});

test("pokébolas: frenesi multiplica a produção e cadeia o clique", () => {
    const c = novo();
    c.ajudantes.voltorb = 10;
    const agora = 1e12;
    C.pegarPokebola(c, "frenesi", agora);
    assert.equal(C.energiaPorSegundo(c, agora), 70);
    assert.equal(C.energiaPorSegundo(c, agora + 78e3), 10);
    C.pegarPokebola(c, "cadeia", agora);
    assert.equal(C.energiaPorClique(c, agora), 777);
    const antes = c.energia;
    C.pegarPokebola(c, "sorte", agora);
    assert.ok(c.energia > antes);
    assert.equal(c.pokebolas, 3);
});

test("evoluir só na meta, dá 10 pedras e a meta dobra", () => {
    const c = novo();
    const meta = C.metaEvolucao(c);
    c.totalPartida = meta - 1;
    assert.equal(C.podeEvoluir(c), false);
    assert.equal(C.evoluir(c), 0);
    c.totalPartida = meta;
    c.ajudantes.zapdos = 3;
    c.melhorias.push("choque");
    c.itens.pilha = 2;
    assert.equal(C.evoluir(c), 10);
    assert.deepEqual([c.pedras, c.totalPartida, c.energia, c.melhorias.length, c.reinicios], [10, 0, 0, 0, 1]);
    assert.deepEqual(c.ajudantes, {});
    assert.equal(c.itens.pilha, 2, "itens ficam");
    assert.equal(C.metaEvolucao(c), meta * C.CRESCIMENTO_META);
    c.totalPartida = C.metaEvolucao(c) * 8;
    assert.equal(C.pedrasDoReinicio(c), 20, "8× a meta = 20 pedras");
});

test("árvore respeita pré-requisitos e o mercado só abre com tudo", () => {
    const c = novo();
    c.pedras = 1000;
    assert.equal(C.comprarNo(c, "clique2"), false, "precisa do Dedo Treinado antes");
    assert.equal(C.comprarNo(c, "clique1"), true);
    assert.equal(C.comprarNo(c, "clique1"), false, "não compra duas vezes");
    for (const n of C.ARVORE) C.comprarNo(c, n.id);
    // compra em ordem (alguns só liberam depois de outros)
    for (const n of C.ARVORE) C.comprarNo(c, n.id);
    assert.equal(C.arvoreCompleta(c), true);
    assert.equal(C.comprarNo(c, "mercado"), true);
    assert.equal(c.pedras, 1000 - 150);
});

test("mercado: 10 pedras por pacote e no máximo 5 por dia", () => {
    const c = novo();
    c.pedras = 1000;
    assert.equal(C.trocarPorPacote(c, "2026-9-25"), false, "sem o mercado não troca");
    c.arvore.push("mercado");
    for (let i = 0; i < 5; i++) assert.equal(C.trocarPorPacote(c, "2026-9-25"), true);
    assert.equal(C.trocarPorPacote(c, "2026-9-25"), false, "6º pacote do dia");
    assert.equal(c.pedras, 950);
    assert.equal(C.trocarPorPacote(c, "2026-9-26"), true, "no dia seguinte volta");
});

test("offline: no máximo 8h e 50% sem a Soneca", () => {
    const c = novo();
    c.ajudantes.voltorb = 1; // 1 ⚡/s
    const agora = 1e12;
    c.ultimoTick = agora - 10 * 3600 * 1000;
    const r = C.aplicarOffline(c, agora);
    assert.equal(r.segundos, 8 * 3600);
    assert.equal(r.ganho, 8 * 3600 * 0.5);
    c.arvore.push("tempo1");
    c.ultimoTick = agora - 3600 * 1000;
    assert.equal(C.aplicarOffline(c, agora + 0).ganho, 3600);
});

test("números grandes ficam legíveis", () => {
    assert.equal(C.formatarGrande(950), "950");
    assert.equal(C.formatarGrande(1500), "1,5 mil");
    assert.equal(C.formatarGrande(2.5e6), "2,5 mi");
    assert.equal(C.formatarGrande(1e9), "1 bi");
});

test("baú temporal (0,01%) dá a energia inteira da meta de evolução", () => {
    const c = novo();
    // rnd perto de 1 cai na última faixa do sorteio: a raridade temporal
    let chamada = 0;
    const rnd = () => (chamada++ === 0 ? 0.99999999 : 0);
    const r = C.abrirBau(c, Date.now(), rnd);
    assert.equal(r.item.raridade, "temporal");
    assert.ok(r.energia >= C.metaEvolucao(c));
    assert.equal(C.podeEvoluir(c), true);
    assert.equal(c.temporais, 1);
    const pesos = Object.values(C.RARIDADES_ITEM).map((x) => x.peso);
    assert.ok(Math.abs(C.RARIDADES_ITEM.temporal.peso / pesos.reduce((a, b) => a + b) - 0.0001) < 1e-6, "chance de 0,01%");
});

test("13 ajudantes e conquistas novas", () => {
    const c = novo();
    assert.equal(C.AJUDANTES.length, 13);
    C.AJUDANTES.forEach((a) => { c.ajudantes[a.id] = 1; });
    const novas = C.verificarConquistas(c).map((q) => q.id);
    assert.ok(novas.includes("tiposAjudantes-13"));
    assert.ok(novas.includes("tem-mew-1"));
    assert.ok(C.CONQUISTAS.length >= 90);
});
