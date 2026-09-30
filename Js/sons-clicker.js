// ====================================================
// Sons do Pokéclicker: 30 "raios" diferentes para o clique
// e um som próprio para cada item do baú.
// Tudo gerado com Web Audio (sem arquivos de áudio).
// ====================================================
import { estado } from "./state.js";

let ctx = null;
let mestre = null;
let ruidoBuffer = null;

const pronto = () => {
    if (!estado.som) return false;
    try {
        if (!ctx) {
            ctx = new (window.AudioContext || window.webkitAudioContext)();
            // Compressor para vários sons juntos não estourarem o volume
            mestre = ctx.createDynamicsCompressor();
            mestre.threshold.value = -18;
            mestre.ratio.value = 6;
            const volume = ctx.createGain();
            volume.gain.value = 0.9;
            mestre.connect(volume).connect(ctx.destination);
            // 1 segundo de ruído branco, reaproveitado por todos os sons
            ruidoBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
            const d = ruidoBuffer.getChannelData(0);
            for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        }
        if (ctx.state === "suspended") ctx.resume();
        return true;
    } catch (e) {
        return false;
    }
};

// Envelope rápido (ataque curto, queda exponencial)
const envelope = (g, t, vol, ataque, dur) => {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + ataque);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
};

// Oscilador com glissando de f1 até f2
const tom = ({ f1, f2 = f1, tipo = "square", dur = 0.08, vol = 0.08, atraso = 0, ataque = 0.004, curva = "exp", vibrato = 0 }) => {
    const t = ctx.currentTime + atraso;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = tipo;
    o.frequency.setValueAtTime(f1, t);
    if (f2 !== f1) {
        if (curva === "exp") o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + dur);
        else o.frequency.linearRampToValueAtTime(f2, t + dur);
    }
    if (vibrato) {
        const lfo = ctx.createOscillator();
        const lg = ctx.createGain();
        lfo.frequency.value = vibrato;
        lg.gain.value = f1 * 0.08;
        lfo.connect(lg).connect(o.frequency);
        lfo.start(t);
        lfo.stop(t + dur);
    }
    envelope(g, t, vol, ataque, dur);
    o.connect(g).connect(mestre);
    o.start(t);
    o.stop(t + dur + 0.02);
};

// Rajada de ruído filtrado (chiado, estalo, estática)
const ruido = ({ dur = 0.06, vol = 0.08, filtro = "highpass", freq = 2000, freq2, q = 1, atraso = 0 }) => {
    const t = ctx.currentTime + atraso;
    const s = ctx.createBufferSource();
    s.buffer = ruidoBuffer;
    const f = ctx.createBiquadFilter();
    f.type = filtro;
    f.frequency.setValueAtTime(freq, t);
    if (freq2) f.frequency.exponentialRampToValueAtTime(freq2, t + dur);
    f.Q.value = q;
    const g = ctx.createGain();
    envelope(g, t, vol, 0.002, dur);
    s.connect(f).connect(g).connect(mestre);
    s.start(t, Math.random() * 0.5);
    s.stop(t + dur + 0.02);
};

// ---------------- 30 raios para o clique ----------------
// Cada receita combina tom + ruído de um jeito diferente. O número varia a altura um pouco.
const RAIOS = [
    (v) => { tom({ f1: 1800 * v, f2: 300, dur: 0.07 }); ruido({ dur: 0.03, freq: 4000 }); },
    (v) => { tom({ f1: 900 * v, f2: 2400, tipo: "sawtooth", dur: 0.05, vol: 0.05 }); },
    (v) => { ruido({ dur: 0.05, filtro: "bandpass", freq: 3000 * v, q: 8, vol: 0.14 }); tom({ f1: 120, f2: 60, tipo: "sine", dur: 0.06, vol: 0.1 }); },
    (v) => { tom({ f1: 2200 * v, f2: 1100, tipo: "triangle", dur: 0.06 }); tom({ f1: 1100 * v, f2: 550, dur: 0.06, vol: 0.04, atraso: 0.02 }); },
    (v) => { for (let i = 0; i < 3; i++) ruido({ dur: 0.015, freq: 5000, vol: 0.1, atraso: i * 0.018 * v }); },
    (v) => { tom({ f1: 440 * v, f2: 1760, tipo: "square", dur: 0.04, vol: 0.05 }); ruido({ dur: 0.04, freq: 6000, atraso: 0.03 }); },
    (v) => { tom({ f1: 3000 * v, f2: 200, tipo: "sine", dur: 0.09, vol: 0.09 }); },
    (v) => { ruido({ dur: 0.08, filtro: "bandpass", freq: 6000, freq2: 800, q: 4, vol: 0.12 }); },
    (v) => { tom({ f1: 660 * v, tipo: "square", dur: 0.03, vol: 0.05 }); tom({ f1: 990 * v, tipo: "square", dur: 0.03, vol: 0.05, atraso: 0.03 }); },
    (v) => { tom({ f1: 150, f2: 1500 * v, tipo: "sawtooth", dur: 0.06, vol: 0.05, curva: "lin" }); ruido({ dur: 0.02, freq: 7000, atraso: 0.05 }); },
    (v) => { tom({ f1: 1200 * v, f2: 1250, tipo: "square", dur: 0.08, vol: 0.04, vibrato: 60 }); },
    (v) => { ruido({ dur: 0.04, filtro: "lowpass", freq: 900 * v, vol: 0.18 }); tom({ f1: 2600, f2: 1300, tipo: "triangle", dur: 0.04, vol: 0.05 }); },
    (v) => { tom({ f1: 523 * v, f2: 523 * v * 2, tipo: "triangle", dur: 0.07 }); },
    (v) => { tom({ f1: 1400 * v, f2: 700, tipo: "sawtooth", dur: 0.035, vol: 0.05 }); tom({ f1: 1400 * v, f2: 700, tipo: "sawtooth", dur: 0.035, vol: 0.04, atraso: 0.045 }); },
    (v) => { ruido({ dur: 0.1, filtro: "highpass", freq: 8000, vol: 0.07 }); tom({ f1: 90 * v, f2: 40, tipo: "sine", dur: 0.1, vol: 0.14 }); },
    (v) => { tom({ f1: 2400 * v, f2: 2600, tipo: "sine", dur: 0.05, vol: 0.07 }); ruido({ dur: 0.02, freq: 3000 }); },
    (v) => { tom({ f1: 800 * v, f2: 200, tipo: "square", dur: 0.05, vol: 0.05 }); tom({ f1: 1600 * v, f2: 400, tipo: "square", dur: 0.05, vol: 0.03 }); },
    (v) => { ruido({ dur: 0.06, filtro: "bandpass", freq: 1500 * v, freq2: 6000, q: 6, vol: 0.12 }); },
    (v) => { [0, 0.012, 0.024, 0.036].forEach((a, i) => tom({ f1: (1500 + i * 300) * v, tipo: "square", dur: 0.012, vol: 0.04, atraso: a })); },
    (v) => { tom({ f1: 350 * v, f2: 3500, tipo: "sine", dur: 0.05, vol: 0.07, curva: "lin" }); },
    (v) => { tom({ f1: 1000 * v, f2: 980, tipo: "sawtooth", dur: 0.06, vol: 0.04, vibrato: 120 }); ruido({ dur: 0.03, freq: 5000 }); },
    (v) => { ruido({ dur: 0.025, freq: 2500 * v, vol: 0.15 }); ruido({ dur: 0.05, freq: 9000, vol: 0.06, atraso: 0.02 }); },
    (v) => { tom({ f1: 740 * v, tipo: "triangle", dur: 0.04 }); tom({ f1: 1110 * v, tipo: "triangle", dur: 0.06, atraso: 0.025 }); },
    (v) => { tom({ f1: 5000 * v, f2: 500, tipo: "square", dur: 0.03, vol: 0.04 }); },
    (v) => { tom({ f1: 200 * v, f2: 100, tipo: "square", dur: 0.07, vol: 0.06 }); ruido({ dur: 0.05, filtro: "bandpass", freq: 4000, q: 3 }); },
    (v) => { tom({ f1: 1320 * v, f2: 1980, tipo: "triangle", dur: 0.04 }); tom({ f1: 1980 * v, f2: 1320, tipo: "triangle", dur: 0.04, atraso: 0.04 }); },
    (v) => { ruido({ dur: 0.07, filtro: "bandpass", freq: 2200 * v, q: 20, vol: 0.2 }); },
    (v) => { tom({ f1: 600 * v, f2: 1200, tipo: "sawtooth", dur: 0.025, vol: 0.05 }); tom({ f1: 1200 * v, f2: 300, tipo: "sawtooth", dur: 0.05, vol: 0.05, atraso: 0.025 }); },
    (v) => { tom({ f1: 2000 * v, tipo: "sine", dur: 0.02, vol: 0.09 }); tom({ f1: 3000 * v, tipo: "sine", dur: 0.02, vol: 0.06, atraso: 0.02 }); ruido({ dur: 0.03, freq: 7000, atraso: 0.04 }); },
    (v) => { tom({ f1: 1100 * v, f2: 60, tipo: "triangle", dur: 0.12, vol: 0.09 }); ruido({ dur: 0.04, freq: 3500, vol: 0.05 }); },
];
export const TOTAL_RAIOS = RAIOS.length;

let ultimoRaio = -1;
let ultimoToque = 0;
// Um raio diferente a cada clique (nunca repete o anterior). Crítico soa mais forte.
export const somClique = ({ critico = false, combo = 0 } = {}) => {
    if (!pronto()) return;
    const agora = performance.now();
    if (agora - ultimoToque < 25) return; // cliques muito rápidos não empilham som demais
    ultimoToque = agora;
    let i = Math.floor(Math.random() * RAIOS.length);
    if (i === ultimoRaio) i = (i + 1) % RAIOS.length;
    ultimoRaio = i;
    // Combo sobe a altura aos poucos, dando sensação de "carga"
    const v = (0.9 + Math.random() * 0.2) * (1 + Math.min(combo, 60) * 0.006);
    RAIOS[i](v);
    if (critico) {
        tom({ f1: 80, f2: 40, tipo: "sine", dur: 0.25, vol: 0.2 });
        ruido({ dur: 0.2, filtro: "lowpass", freq: 3000, freq2: 300, vol: 0.2 });
        tom({ f1: 2000, f2: 4000, tipo: "sawtooth", dur: 0.08, vol: 0.05, atraso: 0.02 });
    }
};

// ---------------- Sons dos itens do baú ----------------
const notas = (lista, { tipo = "triangle", passo = 0.08, dur = 0.18, vol = 0.08, atraso = 0 } = {}) =>
    lista.forEach((f, i) => tom({ f1: f, tipo, dur, vol, atraso: atraso + i * passo }));

const ITENS = {
    // Pilha: carregando uma bateria (zumbido subindo e um "plim" de cheio)
    pilha: () => {
        tom({ f1: 120, f2: 900, tipo: "sawtooth", dur: 0.55, vol: 0.05, curva: "lin" });
        [0, 0.12, 0.24, 0.36].forEach((a, i) => tom({ f1: 600 + i * 150, tipo: "square", dur: 0.05, vol: 0.04, atraso: a }));
        tom({ f1: 1568, tipo: "sine", dur: 0.3, vol: 0.09, atraso: 0.55 });
    },
    // Fio de cobre: zumbido elétrico de fio (60 Hz) com faíscas
    fio: () => {
        tom({ f1: 60, tipo: "sawtooth", dur: 0.5, vol: 0.07 });
        tom({ f1: 120, tipo: "square", dur: 0.5, vol: 0.03 });
        for (let i = 0; i < 4; i++) ruido({ dur: 0.02, freq: 6000, vol: 0.08, atraso: 0.1 + i * 0.09 });
    },
    // Parafuso: metal girando (tique-tique) e um "clink"
    parafuso: () => {
        for (let i = 0; i < 5; i++) ruido({ dur: 0.015, filtro: "bandpass", freq: 3500, q: 10, vol: 0.12, atraso: i * 0.06 });
        [2637, 3951].forEach((f) => tom({ f1: f, tipo: "sine", dur: 0.35, vol: 0.05, atraso: 0.32 }));
    },
    // Lâmpada: interruptor + "ding" de ideia
    lampada: () => {
        ruido({ dur: 0.02, filtro: "bandpass", freq: 1500, q: 5, vol: 0.15 });
        tom({ f1: 50, tipo: "sawtooth", dur: 0.12, vol: 0.05, atraso: 0.02 });
        notas([1319, 1976], { tipo: "sine", passo: 0.07, dur: 0.4, atraso: 0.1 });
    },
    // Pedra Lunar: brilho suave e misterioso
    "pedra-lunar": () => {
        notas([880, 1175, 1397, 1760], { tipo: "sine", passo: 0.1, dur: 0.6, vol: 0.05 });
        ruido({ dur: 0.5, filtro: "highpass", freq: 9000, vol: 0.03 });
    },
    // Ímã: hum magnético pulsando e "tchac" grudando
    ima: () => {
        tom({ f1: 220, f2: 330, tipo: "sine", dur: 0.45, vol: 0.09, vibrato: 14 });
        ruido({ dur: 0.03, filtro: "lowpass", freq: 1200, vol: 0.25, atraso: 0.42 });
        tom({ f1: 1760, tipo: "triangle", dur: 0.08, vol: 0.05, atraso: 0.43 });
    },
    // Luva de borracha: rangido de borracha esticando e estalo
    luva: () => {
        tom({ f1: 400, f2: 900, tipo: "sawtooth", dur: 0.22, vol: 0.05, vibrato: 30 });
        ruido({ dur: 0.03, filtro: "bandpass", freq: 900, q: 3, vol: 0.22, atraso: 0.24 });
    },
    // Capacete de obra: batida metálica ("clang")
    capacete: () => {
        [523, 1395, 2637, 3520].forEach((f) => tom({ f1: f, tipo: "sine", dur: 0.6, vol: 0.05, ataque: 0.002 }));
        ruido({ dur: 0.04, filtro: "bandpass", freq: 2500, q: 2, vol: 0.2 });
    },
    // Disco de Upgrade: bipes digitais de computador
    upgrade: () => {
        [1047, 1568, 1319, 2093, 1760, 2637].forEach((f, i) => tom({ f1: f, tipo: "square", dur: 0.05, vol: 0.04, atraso: i * 0.06 }));
        tom({ f1: 2637, tipo: "square", dur: 0.2, vol: 0.05, atraso: 0.4 });
    },
    // Escama de dragão: rugido grave
    escama: () => {
        tom({ f1: 110, f2: 70, tipo: "sawtooth", dur: 0.6, vol: 0.12, vibrato: 18 });
        ruido({ dur: 0.6, filtro: "lowpass", freq: 700, freq2: 200, vol: 0.14 });
        tom({ f1: 165, f2: 100, tipo: "square", dur: 0.5, vol: 0.04 });
    },
    // Pedra do Trovão: trovão rolando e cristal
    pedra: () => {
        ruido({ dur: 0.9, filtro: "lowpass", freq: 1500, freq2: 150, vol: 0.25 });
        tom({ f1: 60, f2: 35, tipo: "sine", dur: 0.8, vol: 0.15 });
        notas([2093, 2637, 3136], { tipo: "sine", passo: 0.05, dur: 0.5, vol: 0.04, atraso: 0.1 });
    },
    // Bola de Luz: acorde brilhante e quente
    "bola-luz": () => {
        [523, 659, 784, 1047].forEach((f) => tom({ f1: f, tipo: "triangle", dur: 0.9, vol: 0.05, ataque: 0.08 }));
        ruido({ dur: 0.8, filtro: "highpass", freq: 7000, vol: 0.03 });
    },
    // Colher torta: "boing" da colher entortando (poder psíquico)
    colher: () => {
        tom({ f1: 400, f2: 900, tipo: "sine", dur: 0.5, vol: 0.09, vibrato: 9 });
        tom({ f1: 800, f2: 300, tipo: "triangle", dur: 0.3, vol: 0.04, atraso: 0.3 });
    },
    // Pena de Zapdos: vento/asa batendo e trovão agudo
    pena: () => {
        for (let i = 0; i < 3; i++) ruido({ dur: 0.18, filtro: "bandpass", freq: 700, freq2: 2500, q: 2, vol: 0.14, atraso: i * 0.17 });
        tom({ f1: 3000, f2: 400, tipo: "sawtooth", dur: 0.2, vol: 0.05, atraso: 0.5 });
    },
    // Gene Mítico: arpejo mágico (tipo Mew)
    gene: () => notas([784, 988, 1175, 1568, 1976, 2349], { tipo: "sine", passo: 0.06, dur: 0.4, vol: 0.06 }),
    // Cristal de energia: vidro tilintando
    cristal: () => {
        [3136, 3951, 4699, 3520].forEach((f, i) => tom({ f1: f, tipo: "sine", dur: 0.5, vol: 0.04, atraso: i * 0.09, ataque: 0.001 }));
    },
    // Orbe Adamante (Dialga, tempo): relógio parando e o tempo voltando
    orbe: () => {
        for (let i = 0; i < 4; i++) ruido({ dur: 0.02, filtro: "bandpass", freq: 2500, q: 12, vol: 0.14, atraso: i * 0.18 });
        tom({ f1: 1800, f2: 150, tipo: "sine", dur: 0.9, vol: 0.1, atraso: 0.7 });
        notas([262, 330, 392, 523, 659, 784], { tipo: "triangle", passo: 0.1, dur: 0.6, vol: 0.06, atraso: 1.1 });
    },
    // Sino de Celebi: sino mágico com eco
    sino: () => {
        [1047, 1319, 1568].forEach((f, i) => {
            tom({ f1: f, tipo: "sine", dur: 1.4, vol: 0.07, atraso: i * 0.25, ataque: 0.002 });
            tom({ f1: f * 2.76, tipo: "sine", dur: 0.6, vol: 0.02, atraso: i * 0.25 });
        });
    },
};

// Fanfarra curta da raridade, tocada depois do som do item
const FANFARRA = {
    comum: () => {},
    raro: () => notas([1047, 1319], { tipo: "square", passo: 0.07, dur: 0.12, vol: 0.04, atraso: 0.35 }),
    epico: () => notas([784, 988, 1175, 1568], { tipo: "square", passo: 0.07, dur: 0.14, vol: 0.04, atraso: 0.4 }),
    lendario: () => notas([523, 659, 784, 1047, 1319, 1568], { tipo: "square", passo: 0.08, dur: 0.18, vol: 0.05, atraso: 0.5 }),
    temporal: () => notas([1568, 1319, 1047, 784, 1047, 1319, 1568, 2093], { tipo: "triangle", passo: 0.1, dur: 0.3, vol: 0.05, atraso: 1.6 }),
};

export const somItem = (item) => {
    if (!pronto()) return;
    (ITENS[item.id] || (() => notas([880, 1320], {})))();
    FANFARRA[item.raridade]?.();
};

export const TEM_SOM = Object.keys(ITENS);
