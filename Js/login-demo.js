// ====================================================
// Tela de login: carrossel com todos os pacotes e aberturas
// automáticas, como se alguém estivesse jogando.
// Só sorteia para mostrar: não mexe no progresso de ninguém.
// ====================================================
import { PACOTES, COLECAO_POR_CODIGO, RARIDADES, imagemPixel } from "./cards.js";
import { sortearPacote } from "./packs.js";
import { $, $$, htmlCarta, htmlPacote, htmlVerso } from "./ui.js";

const LUZ_RARIDADE = { 1: "comum", 2: "comum", 3: "rara", 4: "ex", 5: "estrela", 6: "estrela", 7: "estrela", 8: "coroa" };
const calmo = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

let rodando = false;
let geracao = 0; // muda a cada início, para um ciclo antigo não continuar junto com o novo
let temporizador = null;
let ultimo = null;

const esperar = (ms) => new Promise((ok) => { temporizador = setTimeout(ok, ms); });

// Espera as imagens carregarem (no máximo 2s) para as cartas não aparecerem em branco
const preCarregar = (urls) => Promise.race([
    Promise.all(urls.map((src) => new Promise((ok) => {
        const img = new Image();
        img.onload = img.onerror = ok;
        img.src = src;
    }))),
    new Promise((ok) => setTimeout(ok, 2000)),
]);

const montarCarrossel = () => {
    const faixa = Object.keys(PACOTES).map((id) => htmlPacote(id, "mini")).join("");
    // Duas cópias seguidas: a animação rola metade e recomeça sem emenda
    $(".login-carrossel").innerHTML = `<div class="carrossel-trilho">${faixa}${faixa}</div>`;
};

const sortearOutroPacote = () => {
    const ids = Object.keys(PACOTES).filter((id) => id !== ultimo);
    ultimo = ids[Math.floor(Math.random() * ids.length)];
    return ultimo;
};

const abrirUm = async (g) => {
    const palco = $(".login-demo");
    const id = sortearOutroPacote();
    const pacote = PACOTES[id];
    const colecao = COLECAO_POR_CODIGO[pacote.colecao];
    const { cartas } = sortearPacote(id);
    // A carta mais rara fica guardada para o final
    const iMaisRara = cartas.reduce((m, c, i) => (c.raridade >= cartas[m].raridade ? i : m), 0);
    const maisRara = cartas[iMaisRara];

    await preCarregar([...cartas.map((c) => c.imagem), imagemPixel(pacote.mascote)]);
    if (g !== geracao) return;

    $$(".login-carrossel .pacote").forEach((p) => p.classList.toggle("em-destaque", p.dataset.pacote === id));
    palco.className = "login-demo";
    palco.dataset.luz = "comum";
    palco.innerHTML = `
        <div class="demo-luz"></div>
        <div class="demo-pacote">${htmlPacote(id)}</div>
        <div class="demo-cartas">
            ${cartas.map((c, i) => `
                <div class="demo-carta" style="--i:${i - 2};--y:${Math.abs(i - 2) * 12}px;--atraso:${i * 90}ms">
                    ${htmlCarta(c)}
                    ${i === iMaisRara ? htmlVerso("demo-verso") : ""}
                </div>`).join("")}
        </div>
        <p class="demo-legenda">Abrindo <b>Pacote ${pacote.nome}</b> · ${colecao.nome}...</p>`;

    await esperar(calmo() ? 1200 : 900);
    palco.classList.add("cortado");
    await esperar(700);
    palco.classList.add("cartas");
    await esperar(1500);
    palco.classList.add("revelado");
    palco.dataset.luz = LUZ_RARIDADE[maisRara.raridade];
    $(".demo-legenda", palco).innerHTML =
        `Saiu <b>${maisRara.nome}</b> ${RARIDADES[maisRara.raridade].simbolo} no Pacote ${pacote.nome}`;
    await esperar(calmo() ? 4000 : 3200);
    palco.classList.add("saindo");
    await esperar(500);
};

const ciclo = async (g) => {
    while (g === geracao) {
        if (document.visibilityState === "hidden") await esperar(1000);
        else await abrirUm(g);
    }
};

export const iniciarDemoLogin = () => {
    if (rodando || !$(".login-demo")) return;
    rodando = true;
    montarCarrossel();
    ciclo(++geracao);
};

export const pararDemoLogin = () => {
    rodando = false;
    geracao++;
    clearTimeout(temporizador);
    const palco = $(".login-demo");
    if (palco) palco.innerHTML = "";
    const carrossel = $(".login-carrossel");
    if (carrossel) carrossel.innerHTML = "";
};
