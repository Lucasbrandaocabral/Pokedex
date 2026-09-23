// ====================================================
// Helpers de interface: cartas, modais, avisos, sons e efeito 3D
// ====================================================
import { TIPOS, RARIDADES, PACOTES, TOTAL_CARTAS, imagemArte } from "./cards.js";
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
    `<span class="icone-tipo" style="--cor:${TIPOS[tipo].cor}" title="${TIPOS[tipo].nome}">${TIPOS[tipo].icone}</span>`;

export const htmlCarta = (c, { qtd = 0, nova = false, classe = "" } = {}) => `
    <div class="carta r${c.raridade} v-${c.variante} ${FULL_ART.includes(c.variante) ? "full-art" : ""} ${classe}"
         data-id="${c.id}" style="--cor:${TIPOS[c.tipo].cor}">
        <div class="carta-face">
            <div class="carta-arte"><img src="${c.imagem}" alt="${c.nome}" loading="lazy" draggable="false"></div>
            <div class="carta-topo">
                <span class="carta-estagio">${ESTAGIOS[c.estagio]}</span>
                <span class="carta-nome">${c.nome}</span>
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
                    <span>${c.id}/${TOTAL_CARTAS}</span>
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
    return `
    <div class="pacote ${classe}" data-pacote="${p}"
         style="--c1:${pacote.cores[0]};--c2:${pacote.cores[1]};--c3:${pacote.cores[2]}">
        <div class="pacote-topo"></div>
        <div class="pacote-corpo">
            <span class="pacote-logo">ORIGEM<br>GENÉTICA</span>
            <img src="${imagemArte(pacote.mascote)}" alt="${pacote.nome}" draggable="false">
            <span class="pacote-nome">${pacote.nome}</span>
        </div>
        <div class="pacote-reflexo"></div>
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
