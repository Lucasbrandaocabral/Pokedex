// Testes dos dados das cartas e do sorteio dos pacotes (não precisam do servidor)
import { test } from "node:test";
import assert from "node:assert/strict";

// packs.js usa o localStorage do navegador (via state.js)
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const { CARTAS, CARTA_POR_ID, COLECOES, PACOTES, numeroCarta } = await import("../Js/cards.js");
const { sortearPacote } = await import("../Js/packs.js");

test("IDs únicos e Origem Genética com os mesmos números de antes", () => {
    assert.equal(new Set(CARTAS.map((c) => c.id)).size, CARTAS.length);
    assert.equal(COLECOES[0].codigo, "A1");
    assert.equal(COLECOES[0].total, 200);
    assert.equal(CARTA_POR_ID["025"].nome, "Pikachu");
    assert.equal(numeroCarta(CARTA_POR_ID["025"]), "025/200");
    assert.match(numeroCarta(CARTA_POR_ID["A1a-001"]), /^A1a 001\/\d{3}$/);
});

test("toda expansão tem as 8 raridades e todo pacote existe", () => {
    assert.equal(COLECOES.length, 21);
    for (const col of COLECOES) {
        assert.deepEqual([...new Set(col.cartas.map((c) => c.raridade))].sort(), [1, 2, 3, 4, 5, 6, 7, 8], col.codigo);
        for (const c of col.cartas) assert.ok(PACOTES[c.pacote], `${c.id} sem pacote`);
    }
});

test("Série A não mudou com a chegada da Série B", async () => {
    const { createHash } = await import("node:crypto");
    const a = CARTAS.filter((c) => !c.colecao.startsWith("B"));
    assert.equal(a.length, 725);
    assert.ok(a.every((c) => c.pid <= 151), "Origem Genética e Série A só com a 1ª geração");
    const hash = createHash("sha256").update(JSON.stringify(a.map((c) => [c.id, c.nome, c.raridade, c.pacote, c.hp, c.imagem, c.ataques]))).digest("hex");
    assert.equal(hash, "7a03147f73e5701b99acaf93d79369160e78eb51608916a18cb77e790c9b928a");
});

test("Série B: 10 expansões, 18 pacotes, Megas só como ex ou melhores", () => {
    const b = COLECOES.filter((c) => c.serie === "B");
    assert.equal(b.length, 10);
    assert.equal(b.flatMap((c) => c.pacotes).length, 18);
    const megas = CARTAS.filter((c) => c.forma === "Mega");
    assert.ok(megas.length >= 40);
    for (const c of megas) {
        assert.ok(c.raridade >= 4, `${c.id} ${c.nome}`);
        assert.match(c.nome, /^Mega .+ ex$/);
    }
    const paradoxo = CARTAS.find((c) => c.nome === "Walking Wake ex");
    assert.equal(paradoxo.dex, 1009);
    assert.equal(CARTAS.find((c) => c.forma === "Paldea").nomeFace, "Wooper");
});

test("cada pacote só sorteia cartas da própria expansão", () => {
    for (const pacote of Object.values(PACOTES)) {
        for (let i = 0; i < 300; i++) {
            for (const c of sortearPacote(pacote.id).cartas) assert.equal(c.colecao, pacote.colecao, pacote.id);
        }
    }
});
