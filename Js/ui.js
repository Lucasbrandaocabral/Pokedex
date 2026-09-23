// ====================================================
// Helpers de interface: cartas, modais, avisos, sons e efeito 3D
// ====================================================
import { TIPOS, RARIDADES, PACOTES, COLECAO_POR_CODIGO, numeroCarta, imagemPixel } from "./cards.js";
import { estado } from "./state.js";

export const $ = (sel, raiz = document) => raiz.querySelector(sel);
export const $$ = (sel, raiz = document) => [...raiz.querySelectorAll(sel)];

export const escapar = (txt) =>
    String(txt).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

export const numero = (n) => n.toLocaleString("pt-BR");

export const formatarTempo = (ms) => {
    const s = Math.ceil(ms / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const seg = s % 60;
    if (h) return `${h}h ${String(m).padStart(2, "0")}m`;
    return `${m}:${String(seg).padStart(2, "0")}`;
};

// ---------------- Cartas ----------------
const ESTAGIOS = ["Básico", "Estágio 1", "Estágio 2"];
const FULL_ART = ["arte", "sr", "im", "coroa"];

export const iconeTipo = (tipo) =>
    `<span class="icone-tipo" style="--cor:${TIPOS[tipo].cor}" title="${TIPOS[tipo].nome}"></span>`;

// Ícones de traço simples (usam a cor do texto)
const ICONES = {
    inicio: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    pacote: '<path d="M6 3l1.5 2L9 3l1.5 2L12 3l1.5 2L15 3l1.5 2L18 3v18H6z"/><path d="M6 8h12"/>',
    album: '<rect x="3" y="4" width="8" height="16" rx="1"/><rect x="13" y="4" width="8" height="16" rx="1"/>',
    trocas: '<path d="M4 8h14l-4-4M20 16H6l4 4"/>',
    loja: '<path d="M5 8h14l-1 12H6z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
    busca: '<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/>',
    som: '<path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16.5 9a4 4 0 0 1 0 6M19 6.5a8 8 0 0 1 0 11"/>',
    mudo: '<path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 9l5 6M21 9l-5 6"/>',
};
export const icone = (nome) =>
    `<svg class="icone" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONES[nome]}</svg>`;

// Nomes compridos (ex.: "Gyarados ex") diminuem um pouco para caber
const tamanhoNome = (nome) => (nome.length > 10 ? `style="font-size:${(7 * Math.max(0.72, 10 / nome.length)).toFixed(2)}cqw"` : "");

export const htmlCarta = (c, { qtd = 0, nova = false, classe = "" } = {}) => `
    <div class="carta r${c.raridade} v-${c.variante} ${FULL_ART.includes(c.variante) ? "full-art" : ""} ${classe}"
         data-id="${c.id}" style="--cor:${TIPOS[c.tipo].cor}">
        <div class="carta-face">
            <div class="carta-arte"><img src="${c.imagem}" alt="${c.nome}" loading="lazy" draggable="false">${c.forma ? `<span class="carta-forma">${c.forma}</span>` : ""}</div>
            <div class="carta-topo">
                <span class="carta-estagio">${ESTAGIOS[c.estagio]}</span>
                <span class="carta-nome" ${tamanhoNome(c.nomeFace || c.nome)}>${c.nomeFace || c.nome}</span>
                <span class="carta-hp"><small>PS</small>${c.hp}</span>
                ${iconeTipo(c.tipo)}
            </div>
            <div class="carta-corpo">
                <div class="carta-ataques">
                    ${c.ataques.map((a, i) => `
                        <div class="carta-ataque">
                            <span class="custo">${iconeTipo(c.tipo).repeat(Math.min(i + 1 + (c.estagio > 1 ? 1 : 0), 3))}</span>
                            <span class="nome-ataque">${a.nome}</span>
                            <span class="dano">${a.dano}</span>
                        </div>`).join("")}
                </div>
                <div class="carta-rodape">
                    <span>Fraqueza ${iconeTipo(c.fraqueza)}+20</span>
                    <span>Recuo ${"●".repeat(c.recuo) || "—"}</span>
                </div>
                <div class="carta-info">
                    <span>${numeroCarta(c)}</span>
                    <span class="carta-raridade">${RARIDADES[c.raridade].simbolo}</span>
                </div>
            </div>
        </div>
        <div class="carta-brilho"></div>
        ${qtd > 1 ? `<span class="carta-qtd">x${qtd}</span>` : ""}
        ${nova ? `<span class="carta-nova">NOVA</span>` : ""}
    </div>`;

export const htmlVerso = (classe = "") => `
    <div class="carta verso ${classe}"><div class="verso-logo"><span></span></div></div>`;

export const htmlPacote = (p, classe = "") => {
    const pacote = PACOTES[p];
    const { logo } = COLECAO_POR_CODIGO[pacote.colecao];
    // Nomes compridos ficam com a letra menor para caber no pacote
    const escala = Math.min(1, 9 / Math.max(...logo.map((l) => l.length)));
    return `
    <div class="pacote ${classe}" data-pacote="${p}"
         style="--c1:${pacote.cores[0]};--c2:${pacote.cores[1]};--c3:${pacote.cores[2]}">
        <div class="pacote-casca"></div>
        <div class="pacote-fundo">
            <div class="pacote-corpo">
                <span class="pacote-logo" style="--escala:${escala.toFixed(2)}">${logo.join("<br>")}</span>
                <img src="${imagemPixel(pacote.mascote)}" alt="${pacote.nome}" draggable="false">
                <span class="pacote-nome">${pacote.nome}</span>
            </div>
            <div class="pacote-brilho"></div>
        </div>
        <div class="pacote-topo"></div>
    </div>`;
};

// ---------------- Efeito 3D das cartas ----------------
export const ativarTilt = (raiz = document) => {
    $$(".tilt", raiz).forEach((el) => {
        if (el.dataset.tiltOk) return;
        el.dataset.tiltOk = "1";
        const mover = (e) => {
            const r = el.getBoundingClientRect();
            const x = (e.clientX - r.left) / r.width;
            const y = (e.clientY - r.top) / r.height;
            el.style.setProperty("--ry", `${(x - 0.5) * 24}deg`);
            el.style.setProperty("--rx", `${(0.5 - y) * 24}deg`);
            el.style.setProperty("--mx", `${x * 100}%`);
            el.style.setProperty("--my", `${y * 100}%`);
            el.classList.add("inclinada");
        };
        const soltar = () => {
            el.style.setProperty("--rx", "0deg");
            el.style.setProperty("--ry", "0deg");
            el.classList.remove("inclinada");
        };
        el.addEventListener("pointermove", mover);
        el.addEventListener("pointerleave", soltar);
    });
};

// ---------------- Avisos (toast) ----------------
export const aviso = (texto, tipo = "") => {
    const area = $("#avisos");
    const el = document.createElement("div");
    el.className = `aviso ${tipo}`;
    el.innerHTML = texto;
    area.appendChild(el);
    setTimeout(() => el.classList.add("saindo"), 2600);
    setTimeout(() => el.remove(), 3000);
};

// ---------------- Modal ----------------
export const abrirModal = (html, classe = "") => {
    const modal = $("#modal");
    modal.className = `modal aberto ${classe}`;
    $("#modal-conteudo").innerHTML = html;
    ativarTilt(modal);
    return modal;
};
export const fecharModal = () => {
    $("#modal").className = "modal";
    $("#modal-conteudo").innerHTML = "";
};

export const confirmar = (titulo, texto, rotuloOk = "Confirmar") =>
    new Promise((resolve) => {
        abrirModal(`
            <h3>${titulo}</h3>
            <p class="modal-texto">${texto}</p>
            <div class="modal-botoes">
                <button class="btn secundario" data-resposta="nao">Cancelar</button>
                <button class="btn" data-resposta="sim">${rotuloOk}</button>
            </div>`, "pequeno");
        $$("#modal [data-resposta]").forEach((b) =>
            b.addEventListener("click", () => {
                fecharModal();
                resolve(b.dataset.resposta === "sim");
            })
        );
    });

// ---------------- Sons (Web Audio, sem arquivos) ----------------
let audio;
const tocar = (freq, dur = 0.1, tipo = "sine", vol = 0.12, atraso = 0) => {
    if (!estado.som) return;
    try {
        audio = audio || new (window.AudioContext || window.webkitAudioContext)();
        const t = audio.currentTime + atraso;
        const osc = audio.createOscillator();
        const ganho = audio.createGain();
        osc.type = tipo;
        osc.frequency.setValueAtTime(freq, t);
        ganho.gain.setValueAtTime(vol, t);
        ganho.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        osc.connect(ganho).connect(audio.destination);
        osc.start(t);
        osc.stop(t + dur);
    } catch (e) { /* áudio indisponível */ }
};

export const sons = {
    clique: () => tocar(660, 0.05, "square", 0.04),
    rasgar: () => {
        for (let i = 0; i < 6; i++) tocar(200 + Math.random() * 400, 0.05, "sawtooth", 0.05, i * 0.03);
    },
    carta: () => tocar(420, 0.08, "triangle", 0.1),
    raro: (r) => {
        const notas = [523, 659, 784, 1047, 1319];
        notas.slice(0, Math.min(r - 1, 5)).forEach((n, i) => tocar(n, 0.25, "triangle", 0.1, i * 0.09));
    },
    moeda: () => {
        tocar(988, 0.08, "square", 0.06);
        tocar(1319, 0.25, "square", 0.06, 0.08);
    },
    erro: () => tocar(160, 0.2, "sawtooth", 0.06),
};
