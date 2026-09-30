// Testes das regras da economia (não precisam do servidor)
import { test } from "node:test";
import assert from "node:assert/strict";

globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const S = await import("../Js/state.js");
const T = await import("../Js/trades.js");
const { RARIDADES } = await import("../Js/cards.js");

test("trocas com bots: no máximo 10 por dia", () => {
    const oferta = { indice: 99, tipo: "compra", da: [], quer: [], moedas: 1 };
    S.estado.diario.progresso.trocar = T.LIMITE_TROCAS_DIA - 1;
    assert.equal(T.verificarOferta(oferta).ok, true);
    S.estado.diario.progresso.trocar = T.LIMITE_TROCAS_DIA;
    const v = T.verificarOferta(oferta);
    assert.equal(v.ok, false);
    assert.match(v.motivo, /Limite/);
});

test("conquistas do álbum dão pacotes, não moedas", () => {
    const antes = { moedas: S.estado.moedas, comprados: S.estado.comprados };
    for (let i = 1; i <= 25; i++) S.estado.colecao[String(i).padStart(3, "0")] = 1;
    assert.equal(S.resgatarConquista("c25"), 1);
    assert.equal(S.estado.comprados, antes.comprados + 1);
    assert.equal(S.estado.moedas, antes.moedas);
});

test("pontos de pacote: cartas raras custam mais", () => {
    const custos = Object.values(RARIDADES).map((r) => r.pontos);
    assert.deepEqual([...custos].sort((a, b) => a - b), custos, "custo cresce com a raridade");
    assert.ok(S.PONTOS_POR_PACOTE * 4 <= RARIDADES[1].pontos, "uma comum custa mais que 4 pacotes");
});
