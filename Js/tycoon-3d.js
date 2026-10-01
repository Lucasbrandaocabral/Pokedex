// ====================================================
// Pokémart Tycoon em 3D de verdade (WebGL com Three.js).
// Tudo é modelado aqui em código: loja, móveis e produtos.
// Coordenadas: 1 casa do mapa = 1 unidade. X = coluna, Z = linha, Y = altura.
// ====================================================
import * as THREE from "./vendor/three.module.min.js";

const SPRITES = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon";
const TINTA = 0x1c1b22;

// ---------------- Materiais e texturas (com cache) ----------------
const materiais = new Map();
const mat = (cor, { rough = 0.75, metal = 0, emissivo = 0, opacidade = 1, ...extra } = {}) => {
    const chave = `${cor}|${rough}|${metal}|${emissivo}|${opacidade}|${JSON.stringify(extra)}`;
    if (!materiais.has(chave)) {
        materiais.set(chave, new THREE.MeshStandardMaterial({
            color: cor, roughness: rough, metalness: metal,
            emissive: emissivo ? cor : 0x000000, emissiveIntensity: emissivo,
            transparent: opacidade < 1, opacity: opacidade, ...extra,
        }));
    }
    return materiais.get(chave);
};

const texturaCanvas = (w, h, desenhar, pixel = false) => {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const g = c.getContext("2d");
    desenhar(g, w, h);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    if (pixel) t.magFilter = t.minFilter = THREE.NearestFilter;
    t.anisotropy = 4;
    return t;
};

const carregador = new THREE.TextureLoader();
carregador.setCrossOrigin("anonymous");
const texturasUrl = new Map();
const texturaUrl = (url) => {
    if (!texturasUrl.has(url)) {
        const t = carregador.load(url);
        t.colorSpace = THREE.SRGBColorSpace;
        t.magFilter = THREE.NearestFilter;
        t.minFilter = THREE.NearestFilter;
        texturasUrl.set(url, t);
    }
    return texturasUrl.get(url);
};

// SVG dos treinadores (2 quadros lado a lado) desenhado num canvas nítido
const canvasTreinador = new Map();
const pegarCanvasTreinador = (url) => {
    if (!canvasTreinador.has(url)) {
        const c = document.createElement("canvas");
        c.width = 280;
        c.height = 220;
        const lista = [];
        const img = new Image();
        img.onload = () => {
            const g = c.getContext("2d");
            g.imageSmoothingEnabled = false;
            g.drawImage(img, 0, 0, 280, 220);
            lista.forEach((t) => { t.needsUpdate = true; });
        };
        img.src = url;
        canvasTreinador.set(url, { c, lista });
    }
    return canvasTreinador.get(url);
};

const caixa = (w, h, d, material) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
};
const cilindro = (rt, rb, h, material, seg = 20) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), material);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
};
const em = (obj, x, y, z) => {
    obj.position.set(x, y, z);
    return obj;
};

// ---------------- Produtos (modelos pequenos, base em y = 0) ----------------
const bola = (topo, faixaTopo = null) => {
    const g = new THREE.Group();
    const r = 0.1;
    const cima = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat(topo, { rough: 0.35 }));
    const baixo = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), mat(0xf4f4f4, { rough: 0.35 }));
    [cima, baixo].forEach((m) => { m.position.y = r; m.castShadow = true; g.add(m); });
    g.add(em(cilindro(r * 1.02, r * 1.02, 0.018, mat(TINTA)), 0, r, 0));
    const botao = cilindro(0.032, 0.032, 0.02, mat(0xf4f4f4, { rough: 0.3 }));
    botao.rotation.x = Math.PI / 2;
    g.add(em(botao, 0, r, r * 0.98));
    const aro = cilindro(0.044, 0.044, 0.014, mat(TINTA));
    aro.rotation.x = Math.PI / 2;
    g.add(em(aro, 0, r, r * 0.93));
    if (faixaTopo) {
        // Ultra Ball: as faixas amarelas em cima
        for (const lado of [-1, 1]) {
            const f = caixa(0.03, 0.03, 0.14, mat(faixaTopo, { rough: 0.4 }));
            f.position.set(lado * 0.045, r + 0.07, 0);
            g.add(f);
        }
    }
    return g;
};

const pocao = () => {
    const g = new THREE.Group();
    g.add(em(cilindro(0.065, 0.07, 0.17, mat(0x8a5cd6, { rough: 0.25 })), 0, 0.085, 0));
    g.add(em(cilindro(0.071, 0.071, 0.05, mat(0xf4f4f4, { rough: 0.5 })), 0, 0.09, 0));
    g.add(em(cilindro(0.03, 0.045, 0.05, mat(0xf4f4f4, { rough: 0.4 })), 0, 0.195, 0));
    g.add(em(caixa(0.06, 0.05, 0.09, mat(0x6b7390, { rough: 0.4 })), 0, 0.24, 0.015));
    return g;
};

const reviver = () => {
    const g = new THREE.Group();
    const cristal = new THREE.Mesh(new THREE.OctahedronGeometry(0.1), mat(0xffd23f, { rough: 0.15, metal: 0.2, emissivo: 0.25 }));
    cristal.scale.set(0.8, 1.35, 0.8);
    cristal.position.y = 0.14;
    cristal.castShadow = true;
    g.add(cristal);
    return g;
};

let texPacote = null;
const pacote = () => {
    texPacote ||= texturaCanvas(64, 96, (g) => {
        g.fillStyle = "#dc2a3c";
        g.fillRect(0, 0, 64, 96);
        g.fillStyle = "#e6e6ee";
        g.fillRect(0, 0, 64, 10);
        g.fillRect(0, 86, 64, 10);
        g.fillStyle = "#ffcb05";
        g.beginPath();
        g.arc(32, 46, 17, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = "#1c1b22";
        g.font = "bold 13px sans-serif";
        g.textAlign = "center";
        g.fillText("TCG", 32, 51);
    });
    const lados = mat(0xb3192b);
    const frente = new THREE.MeshStandardMaterial({ map: texPacote, roughness: 0.35 });
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.24, 0.03), [lados, lados, lados, lados, frente, frente]);
    m.position.y = 0.12;
    m.rotation.x = -0.08;
    m.castShadow = true;
    const g = new THREE.Group();
    g.add(m);
    return g;
};

const isca = () => {
    // Isca de pesca: peixinho de plástico com anzol
    const g = new THREE.Group();
    const corpo = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 10), mat(0xf07d2a, { rough: 0.3 }));
    corpo.scale.set(1.7, 1, 1);
    corpo.position.y = 0.08;
    corpo.castShadow = true;
    g.add(corpo);
    const rabo = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.08, 4), mat(0xffcb05, { rough: 0.3 }));
    rabo.rotation.z = Math.PI / 2;
    rabo.position.set(-0.13, 0.08, 0);
    g.add(rabo);
    g.add(em(new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 6), mat(TINTA)), 0.07, 0.1, 0.045));
    const anzol = new THREE.Mesh(new THREE.TorusGeometry(0.025, 0.006, 6, 12, Math.PI * 1.4), mat(0xb8bcc8, { metal: 0.8, rough: 0.3 }));
    anzol.position.set(0.02, 0.025, 0);
    g.add(anzol);
    return g;
};

const MODELOS_PRODUTO = {
    pokebola: () => bola(0xdc2a3c),
    ultraball: () => bola(0x2a2a33, 0xffcb05),
    pocao,
    reviver,
    pacote,
    isca,
};

// ---------------- Móveis ----------------
const MADEIRA = 0xc98b55;
const MADEIRA_ESC = 0x7a4f2e;
const MADEIRA_CLARA = 0xe0a36a;

const etiqueta = (texto) => {
    const t = texturaCanvas(96, 40, (g, w, h) => {
        g.fillStyle = "#ffcb05";
        g.fillRect(0, 0, w, h);
        g.strokeStyle = "#1c1b22";
        g.lineWidth = 4;
        g.strokeRect(2, 2, w - 4, h - 4);
        g.fillStyle = "#1c1b22";
        g.font = "bold 24px sans-serif";
        g.textAlign = "center";
        g.textBaseline = "middle";
        g.fillText(texto, w / 2, h / 2 + 1);
    });
    return new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.1), new THREE.MeshBasicMaterial({ map: t }));
};

// Estante (gôndola) com 3 tábuas em degrau e até 9 produtos
const ALTURAS_TABUA = [0.1, 0.43, 0.76];
const FUNDOS_TABUA = [0.64, 0.44, 0.26];
const estante = (m) => {
    const g = new THREE.Group();
    const madeira = mat(MADEIRA);
    const escura = mat(MADEIRA_ESC);
    g.add(em(caixa(0.88, 0.08, 0.7, escura), 0, 0.04, 0));
    g.add(em(caixa(0.88, 1.08, 0.05, escura), 0, 0.54, -0.325));
    for (const lado of [-1, 1]) g.add(em(caixa(0.05, 1.08, 0.7, madeira), lado * 0.415, 0.54, 0));
    g.add(em(caixa(0.92, 0.05, 0.4, mat(MADEIRA_CLARA)), 0, 1.1, -0.15));
    const produtos = [];
    ALTURAS_TABUA.forEach((y, n) => {
        const fundo = FUNDOS_TABUA[n];
        const z0 = -0.3;
        g.add(em(caixa(0.78, 0.03, fundo, madeira), 0, y, z0 + fundo / 2));
        g.add(em(caixa(0.8, 0.06, 0.025, mat(MADEIRA_CLARA)), 0, y + 0.005, z0 + fundo));
        [-0.25, 0, 0.25].forEach((x) => {
            const p = (MODELOS_PRODUTO[m.produto] || pocao)();
            p.position.set(x, y + 0.015, z0 + fundo - 0.11);
            g.add(p);
            produtos.push(p);
        });
    });
    const tag = etiqueta(`₽ ${m.preco}`);
    tag.position.set(0, ALTURAS_TABUA[0] - 0.02, -0.3 + FUNDOS_TABUA[0] + 0.016);
    g.add(tag);
    g.userData.produtos = produtos;
    g.userData.atualizar = (vis) => produtos.forEach((p, i) => { p.visible = i < vis; });
    g.userData.atualizar(m.visiveis);
    return g;
};

let texBalcao = null;
const caixaRegistradora = (m) => {
    const g = new THREE.Group();
    texBalcao ||= texturaCanvas(128, 96, (c, w, h) => {
        c.fillStyle = "#dc2a3c";
        c.fillRect(0, 0, w, h * 0.45);
        c.fillStyle = "#f4f4f4";
        c.fillRect(0, h * 0.55, w, h * 0.45);
        c.fillStyle = "#1c1b22";
        c.fillRect(0, h * 0.45, w, h * 0.1);
        c.beginPath();
        c.arc(w / 2, h / 2, 17, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = "#f4f4f4";
        c.beginPath();
        c.arc(w / 2, h / 2, 11, 0, Math.PI * 2);
        c.fill();
    });
    const frente = new THREE.MeshStandardMaterial({ map: texBalcao, roughness: 0.5 });
    const lado = mat(0xd9d9e2, { rough: 0.5 });
    const tampo = mat(MADEIRA_CLARA, { rough: 0.55 });
    const balcao = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.55, 0.62), [lado, lado, tampo, lado, frente, lado]);
    balcao.position.y = 0.275;
    balcao.castShadow = balcao.receiveShadow = true;
    g.add(balcao);
    // Registradora: corpo inclinado, teclas, gaveta e visor
    const corpo = new THREE.Group();
    corpo.position.set(0.05, 0.55, 0.02);
    corpo.add(em(caixa(0.44, 0.1, 0.34, mat(0xb8bcc8, { rough: 0.35, metal: 0.35 })), 0, 0.05, 0));
    corpo.add(em(caixa(0.4, 0.05, 0.08, mat(0x6b7390, { rough: 0.4 })), 0, 0.035, 0.14));
    corpo.add(em(caixa(0.07, 0.015, 0.02, mat(0xffcb05, { metal: 0.6, rough: 0.3 })), 0, 0.04, 0.185));
    for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 3; j++) {
            corpo.add(em(caixa(0.05, 0.025, 0.04, mat(i === 3 ? 0xdc2a3c : 0xf4f4f4, { rough: 0.4 })), -0.13 + i * 0.075, 0.11, -0.08 + j * 0.065));
        }
    }
    corpo.add(em(cilindro(0.02, 0.02, 0.16, mat(0x6b7390)), 0, 0.18, -0.12));
    const visor = texturaCanvas(64, 32, (c, w, h) => {
        c.fillStyle = "#7fe0a0";
        c.fillRect(0, 0, w, h);
        c.fillStyle = "#1f6e3e";
        c.font = "bold 20px monospace";
        c.textAlign = "center";
        c.textBaseline = "middle";
        c.fillText("₽ 0", w / 2, h / 2 + 1);
    });
    const tela = new THREE.MeshStandardMaterial({ map: visor, emissive: 0x3fbf6a, emissiveIntensity: 0.35, roughness: 0.3 });
    const cinza = mat(0x3c4a66);
    corpo.add(em(new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.13, 0.05), [cinza, cinza, cinza, cinza, tela, cinza]), 0, 0.3, -0.12));
    g.add(corpo);
    // Chansey em pé atrás do balcão, atendendo
    if (m.chansey) {
        const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: texturaUrl(`${SPRITES}/113.png`), alphaTest: 0.5 }));
        s.center.set(0.5, 0);
        s.scale.set(0.95, 0.95, 1);
        s.position.set(-0.05, 0.02, -0.5);
        g.add(s);
    }
    return g;
};

const vitrine = (m) => {
    const g = new THREE.Group();
    g.add(em(caixa(0.78, 0.42, 0.66, mat(0xf4f4f4, { rough: 0.4 })), 0, 0.21, 0));
    g.add(em(caixa(0.8, 0.04, 0.68, mat(0xffcb05, { metal: 0.5, rough: 0.35 })), 0, 0.43, 0));
    // Vidro
    const vidro = caixa(0.72, 0.6, 0.6, mat(0xbfe8ff, { rough: 0.05, opacidade: 0.22, depthWrite: false }));
    vidro.castShadow = false;
    g.add(em(vidro, 0, 0.75, 0));
    const quinas = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(0.72, 0.6, 0.6)), new THREE.LineBasicMaterial({ color: 0xffd75a }));
    quinas.position.y = 0.75;
    g.add(quinas);
    if (m.carta) {
        const suporte = new THREE.Group();
        suporte.position.y = 0.47;
        suporte.add(em(cilindro(0.08, 0.1, 0.04, mat(0xffcb05, { metal: 0.6, rough: 0.3 })), 0, 0.02, 0));
        const arte = new THREE.MeshStandardMaterial({ map: texturaUrl(m.carta), transparent: true, alphaTest: 0.1, roughness: 0.4, side: THREE.DoubleSide });
        const moldura = mat(0xffd23f, { metal: 0.5, rough: 0.3 });
        const quadro = new THREE.Group();
        quadro.position.y = 0.27;
        quadro.add(em(caixa(0.36, 0.46, 0.025, moldura), 0, 0, 0));
        quadro.add(em(new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.3), arte), 0, 0.03, 0.014));
        const verso = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.3), arte);
        verso.rotation.y = Math.PI;
        quadro.add(em(verso, 0, 0.03, -0.014));
        suporte.add(quadro);
        g.add(suporte);
        g.userData.girar = quadro;
        const luz = new THREE.PointLight(0xffe7a0, 0.6, 1.4);
        luz.position.set(0, 1.0, 0.1);
        g.add(luz);
    }
    return g;
};

const planta = () => {
    const g = new THREE.Group();
    g.add(em(cilindro(0.17, 0.12, 0.26, mat(0xd2693a, { rough: 0.85 })), 0, 0.13, 0));
    g.add(em(cilindro(0.18, 0.18, 0.04, mat(0xb5582a)), 0, 0.26, 0));
    g.add(em(cilindro(0.155, 0.155, 0.02, mat(0x4a3019)), 0, 0.27, 0));
    const folhas = new THREE.Group();
    folhas.position.y = 0.27;
    const verde = [mat(0x4caf50, { rough: 0.6 }), mat(0x2e7d32, { rough: 0.6 }), mat(0x66bb6a, { rough: 0.6 })];
    for (let i = 0; i < 9; i++) {
        const f = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), verde[i % 3]);
        const a = (i / 9) * Math.PI * 2;
        const alto = i % 2 ? 0.32 : 0.24;
        f.scale.set(0.55, 2.6, 0.9);
        f.position.set(Math.cos(a) * 0.08, alto * 0.6, Math.sin(a) * 0.08);
        f.rotation.set(Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5);
        f.castShadow = true;
        folhas.add(f);
    }
    g.add(folhas);
    g.userData.balancar = folhas;
    return g;
};

let texLetreiro = null;
const maquina = () => {
    const g = new THREE.Group();
    const vermelho = mat(0xdc2a3c, { rough: 0.4 });
    g.add(em(caixa(0.7, 1.3, 0.56, vermelho), 0, 0.68, -0.04));
    for (const x of [-0.28, 0.28]) g.add(em(caixa(0.08, 0.04, 0.5, mat(TINTA)), x, 0.02, -0.04));
    // Vitrine de latinhas atrás do vidro
    g.add(em(caixa(0.44, 0.7, 0.04, mat(0x1d2a4a)), -0.08, 0.82, 0.2));
    const cores = [0x2e9e5b, 0xf07d2a, 0x8a5cd6, 0xffcb05, 0x2f5bd3];
    for (let linha = 0; linha < 3; linha++) {
        for (let k = 0; k < 4; k++) {
            g.add(em(cilindro(0.035, 0.035, 0.11, mat(cores[(linha + k) % cores.length], { rough: 0.3, metal: 0.3 }), 12), -0.22 + k * 0.095, 0.58 + linha * 0.22, 0.26));
        }
        g.add(em(caixa(0.42, 0.015, 0.1, mat(0xb8bcc8)), -0.08, 0.52 + linha * 0.22, 0.26));
    }
    const vidro = caixa(0.46, 0.72, 0.02, mat(0xcdeeff, { rough: 0.05, opacidade: 0.25, depthWrite: false }));
    vidro.castShadow = false;
    g.add(em(vidro, -0.08, 0.82, 0.32));
    // Botões, saída e letreiro aceso
    for (let i = 0; i < 4; i++) g.add(em(caixa(0.07, 0.05, 0.03, mat(0xf4f4f4)), 0.24, 0.98 - i * 0.1, 0.25));
    g.add(em(caixa(0.12, 0.05, 0.03, mat(TINTA)), 0.24, 0.55, 0.25));
    g.add(em(caixa(0.5, 0.14, 0.04, mat(0x2a1414)), -0.04, 0.25, 0.24));
    texLetreiro ||= texturaCanvas(128, 32, (c, w, h) => {
        c.fillStyle = "#ffcb05";
        c.fillRect(0, 0, w, h);
        c.fillStyle = "#1c1b22";
        c.font = "bold 20px sans-serif";
        c.textAlign = "center";
        c.textBaseline = "middle";
        c.fillText("POKÉ DRINKS", w / 2, h / 2 + 1);
    });
    const letreiro = new THREE.MeshStandardMaterial({ map: texLetreiro, emissive: 0xffcb05, emissiveIntensity: 0.4 });
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.15), letreiro);
    sign.position.set(0, 1.24, 0.245);
    g.add(sign);
    g.userData.brilho = letreiro;
    return g;
};

const MODELOS_MOVEL = { prateleira: estante, caixa: caixaRegistradora, vitrine, planta, maquina };

// ---------------- Loja (piso, paredes e decoração) ----------------
const montarSala = (w, h, porta) => {
    const sala = new THREE.Group();
    const piso = texturaCanvas(w * 64, h * 64, (g) => {
        for (let x = 0; x < w * 2; x++) {
            for (let y = 0; y < h * 2; y++) {
                g.fillStyle = (Math.floor(x / 2) + Math.floor(y / 2)) % 2 ? "#ead3ab" : "#f5e6c8";
                g.fillRect(x * 32, y * 32, 32, 32);
                g.strokeStyle = "rgba(120, 90, 50, 0.18)";
                g.lineWidth = 2;
                g.strokeRect(x * 32 + 1, y * 32 + 1, 30, 30);
            }
        }
    });
    const borda = mat(0x8a5f3c);
    const chao = new THREE.Mesh(new THREE.BoxGeometry(w, 0.2, h), [borda, borda, new THREE.MeshStandardMaterial({ map: piso, roughness: 0.85 }), borda, borda, borda]);
    chao.position.set(w / 2, -0.1, h / 2);
    chao.receiveShadow = true;
    chao.userData.alvo = { tipo: "piso" };
    sala.add(chao);

    const parede = (largura) => texturaCanvas(Math.max(64, largura * 64), 128, (g, cw, ch) => {
        g.fillStyle = "#f7efe0";
        g.fillRect(0, 0, cw, ch);
        g.fillStyle = "#dc2a3c";
        g.fillRect(0, ch * 0.42, cw, ch * 0.07);
        g.fillStyle = "#e8dcc6";
        g.fillRect(0, ch * 0.78, cw, ch * 0.22);
        g.fillStyle = "#c9a37a";
        g.fillRect(0, ch * 0.94, cw, ch * 0.06);
    });
    const alturaParede = 1.7;
    const fundoMat = new THREE.MeshStandardMaterial({ map: parede(w), roughness: 0.9 });
    const fundo = new THREE.Mesh(new THREE.BoxGeometry(w + 0.12, alturaParede, 0.12), [mat(0xe8dcc6), mat(0xe8dcc6), mat(0xc9a37a), mat(0xe8dcc6), fundoMat, mat(0xe8dcc6)]);
    fundo.position.set(w / 2 - 0.06, alturaParede / 2, -0.06);
    fundo.receiveShadow = true;
    sala.add(fundo);
    const esqMat = new THREE.MeshStandardMaterial({ map: parede(h), roughness: 0.9 });
    const esquerda = new THREE.Mesh(new THREE.BoxGeometry(0.12, alturaParede, h), [esqMat, mat(0xe8dcc6), mat(0xc9a37a), mat(0xe8dcc6), mat(0xe8dcc6), mat(0xe8dcc6)]);
    esquerda.position.set(-0.06, alturaParede / 2, h / 2);
    esquerda.receiveShadow = true;
    sala.add(esquerda);
    // Rodapé de madeira em cima das paredes
    sala.add(em(caixa(w + 0.16, 0.06, 0.16, mat(0xa8744a)), w / 2 - 0.06, alturaParede + 0.03, -0.06));
    sala.add(em(caixa(0.16, 0.06, h, mat(0xa8744a)), -0.06, alturaParede + 0.03, h / 2));

    // Janelas na parede da esquerda
    for (const z of [h * 0.28, h * 0.72]) {
        const jan = new THREE.Group();
        jan.position.set(0.005, 1.0, z);
        jan.add(em(caixa(0.04, 0.72, 0.92, mat(0xf7efe0)), 0, 0, 0));
        const vidro = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.6), new THREE.MeshStandardMaterial({ color: 0xa9dcff, emissive: 0x9fd6ff, emissiveIntensity: 0.55, roughness: 0.1 }));
        vidro.rotation.y = Math.PI / 2;
        vidro.position.x = 0.025;
        jan.add(vidro);
        jan.add(em(caixa(0.05, 0.6, 0.03, mat(0xf7efe0)), 0.01, 0, 0));
        jan.add(em(caixa(0.05, 0.03, 0.8, mat(0xf7efe0)), 0.01, 0, 0));
        jan.add(em(caixa(0.12, 0.04, 0.96, mat(0xc9a37a)), 0.04, -0.38, 0));
        sala.add(jan);
    }
    // Letreiro, cartazes e relógio na parede do fundo
    const placa = texturaCanvas(256, 64, (g, cw, ch) => {
        g.fillStyle = "#2f5bd3";
        g.fillRect(0, 0, cw, ch);
        g.strokeStyle = "#1c1b22";
        g.lineWidth = 8;
        g.strokeRect(4, 4, cw - 8, ch - 8);
        g.fillStyle = "#fff";
        g.font = "bold 38px sans-serif";
        g.textAlign = "center";
        g.textBaseline = "middle";
        g.fillText("POKÉMART", cw / 2, ch / 2 + 2);
    });
    const letreiro = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.36, 0.05), [mat(0x2f5bd3), mat(0x2f5bd3), mat(0x2f5bd3), mat(0x2f5bd3), new THREE.MeshStandardMaterial({ map: placa, emissive: 0x2f5bd3, emissiveIntensity: 0.25 }), mat(0x2f5bd3)]);
    letreiro.position.set(w / 2, 1.3, 0.03);
    sala.add(letreiro);
    const cartaz = (titulo, cor, pid, x) => {
        const c = new THREE.Group();
        c.position.set(x, 0.98, 0.01);
        const fundoCartaz = texturaCanvas(96, 128, (g, cw, ch) => {
            g.fillStyle = "#fff8dc";
            g.fillRect(0, 0, cw, ch);
            g.fillStyle = cor;
            g.fillRect(0, 0, cw, 30);
            g.strokeStyle = "#1c1b22";
            g.lineWidth = 5;
            g.strokeRect(2, 2, cw - 4, ch - 4);
            g.fillStyle = cor === "#ffcb05" ? "#1c1b22" : "#fff";
            g.font = "bold 15px sans-serif";
            g.textAlign = "center";
            g.fillText(titulo, cw / 2, 21);
        });
        c.add(new THREE.Mesh(new THREE.PlaneGeometry(0.48, 0.64), new THREE.MeshStandardMaterial({ map: fundoCartaz, roughness: 0.8 })));
        const arte = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.4), new THREE.MeshBasicMaterial({ map: texturaUrl(`${SPRITES}/${pid}.png`), transparent: true, alphaTest: 0.4 }));
        arte.position.set(0, -0.06, 0.005);
        c.add(arte);
        c.rotation.z = x < w / 2 ? 0.04 : -0.03;
        return c;
    };
    if (w >= 6) {
        sala.add(cartaz("PROMOÇÃO", "#ffcb05", 25, w * 0.16));
        sala.add(cartaz("NOVIDADES", "#2f5bd3", 133, w * 0.8));
    }
    const relogio = new THREE.Group();
    relogio.position.set(w * 0.94, 1.15, 0.02);
    const mostrador = cilindro(0.17, 0.17, 0.04, mat(0xffffff, { rough: 0.4 }), 28);
    mostrador.rotation.x = Math.PI / 2;
    relogio.add(mostrador);
    const aroRel = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.02, 8, 28), mat(TINTA));
    relogio.add(aroRel);
    const horas = em(caixa(0.02, 0.09, 0.01, mat(TINTA)), 0, 0.045, 0.03);
    const pivoH = new THREE.Group();
    pivoH.add(horas);
    pivoH.rotation.z = -1.1;
    relogio.add(pivoH);
    const pivoS = new THREE.Group();
    pivoS.add(em(caixa(0.012, 0.13, 0.01, mat(0xdc2a3c)), 0, 0.065, 0.035));
    relogio.add(pivoS);
    sala.add(relogio);
    sala.userData.ponteiro = pivoS;

    // Entrada: tapete e portal
    const tapete = texturaCanvas(128, 96, (g, cw, ch) => {
        g.fillStyle = "#2f5bd3";
        g.fillRect(0, 0, cw, ch);
        g.strokeStyle = "#ffcb05";
        g.lineWidth = 6;
        g.strokeRect(6, 6, cw - 12, ch - 12);
        g.fillStyle = "#fff";
        g.font = "bold 18px sans-serif";
        g.textAlign = "center";
        g.textBaseline = "middle";
        g.fillText("BEM-VINDO", cw / 2, ch / 2);
    });
    const mat1 = new THREE.Mesh(new THREE.PlaneGeometry(0.86, 0.66), new THREE.MeshStandardMaterial({ map: tapete, roughness: 0.95 }));
    mat1.rotation.x = -Math.PI / 2;
    mat1.position.set(porta.x + 0.5, 0.006, porta.y + 0.55);
    mat1.receiveShadow = true;
    sala.add(mat1);
    for (const lado of [0, 1]) sala.add(em(caixa(0.08, 1.5, 0.1, mat(0xb8bcc8, { metal: 0.4, rough: 0.35 })), porta.x + lado, 0.75, h - 0.02));
    sala.add(em(caixa(1.12, 0.12, 0.12, mat(0xdc2a3c)), porta.x + 0.5, 1.52, h - 0.02));
    return sala;
};

// ---------------- Cena ----------------
export const criarCena = ({ aoClicar }) => {
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    const canvas = renderer.domElement;
    canvas.className = "ty-canvas3d";

    const cena = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    cena.add(new THREE.HemisphereLight(0xe8f4ff, 0xb08a60, 1.1));
    const sol = new THREE.DirectionalLight(0xfff1d6, 2.1);
    sol.castShadow = true;
    sol.shadow.mapSize.set(2048, 2048);
    sol.shadow.bias = -0.0005;
    sol.shadow.normalBias = 0.02;
    cena.add(sol);
    cena.add(sol.target);

    let sala = null;
    let mobilia = new THREE.Group();
    let marcas = new THREE.Group();
    const pessoas = new THREE.Group();
    cena.add(mobilia, marcas, pessoas);
    let dados = null;
    let container = null;
    let rodando = false;
    let yaw = 0.62;
    let zoom = 0.8;
    const alvoCam = new THREE.Vector3();

    const posicionarCamera = () => {
        if (!dados) return;
        const { w, h } = dados;
        alvoCam.set(w / 2, 0.35, h / 2 + 0.2);
        const dist = (Math.max(w, h) * 1.55 + 3.2) * zoom;
        const pitch = 0.78;
        camera.position.set(
            alvoCam.x + Math.sin(yaw) * Math.cos(pitch) * dist,
            alvoCam.y + Math.sin(pitch) * dist,
            alvoCam.z + Math.cos(yaw) * Math.cos(pitch) * dist,
        );
        camera.lookAt(alvoCam);
    };

    const ajustarTamanho = () => {
        if (!container) return;
        const largura = container.clientWidth;
        const altura = container.clientHeight;
        if (!largura || !altura) return;
        renderer.setSize(largura, altura, false);
        camera.aspect = largura / altura;
        camera.updateProjectionMatrix();
    };
    const observador = new ResizeObserver(ajustarTamanho);

    // ---- Clique, arrastar para girar e rodinha para aproximar ----
    const raio = new THREE.Raycaster();
    const ponteiro = new THREE.Vector2();
    let arrasto = null;
    const alvoNoPonto = (ev) => {
        const r = canvas.getBoundingClientRect();
        ponteiro.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
        raio.setFromCamera(ponteiro, camera);
        const hits = raio.intersectObjects([marcas, mobilia, pessoas], true);
        for (const hit of hits) {
            let o = hit.object;
            while (o && !o.userData.alvo) o = o.parent;
            if (o) return o.userData.alvo;
        }
        return null;
    };
    canvas.addEventListener("pointerdown", (ev) => { arrasto = { x: ev.clientX, y: ev.clientY, yaw, moveu: false }; });
    canvas.addEventListener("pointermove", (ev) => {
        if (arrasto && (ev.buttons & 1)) {
            const dx = ev.clientX - arrasto.x;
            if (Math.abs(dx) > 4) arrasto.moveu = true;
            yaw = Math.min(1.15, Math.max(0.15, arrasto.yaw - dx * 0.006));
            posicionarCamera();
            return;
        }
        const alvo = alvoNoPonto(ev);
        canvas.style.cursor = alvo && alvo.tipo !== "piso" ? "pointer" : "grab";
    });
    canvas.addEventListener("pointerup", (ev) => {
        const foiArrasto = arrasto?.moveu;
        arrasto = null;
        if (foiArrasto) return;
        const alvo = alvoNoPonto(ev);
        if (alvo && alvo.tipo !== "piso") aoClicar(alvo);
    });
    canvas.addEventListener("wheel", (ev) => {
        ev.preventDefault();
        zoom = Math.min(1.35, Math.max(0.6, zoom * (ev.deltaY > 0 ? 1.08 : 0.93)));
        posicionarCamera();
    }, { passive: false });

    // ---- Montar móveis e marcas do modo Construir ----
    const montarLoja = (novo) => {
        const mudouSala = !dados || dados.w !== novo.w || dados.h !== novo.h;
        dados = novo;
        if (mudouSala) {
            if (sala) cena.remove(sala);
            sala = montarSala(novo.w, novo.h, novo.porta);
            cena.add(sala);
            const { w, h } = novo;
            sol.position.set(-3.5, 9, h * 0.35 + 3);
            sol.target.position.set(w / 2, 0, h / 2);
            const lado = Math.max(w, h) * 0.9 + 2;
            Object.assign(sol.shadow.camera, { left: -lado, right: lado, top: lado, bottom: -lado, near: 1, far: 30 });
            sol.shadow.camera.updateProjectionMatrix();
            posicionarCamera();
        }
        cena.remove(mobilia);
        mobilia = new THREE.Group();
        for (const m of novo.moveis) {
            const modelo = (MODELOS_MOVEL[m.tipo] || planta)(m);
            modelo.position.set(m.x + 0.5, 0, m.y + 0.5);
            modelo.userData.alvo = { tipo: "movel", x: m.x, y: m.y };
            modelo.userData.chave = `${m.x},${m.y}`;
            mobilia.add(modelo);
            if (m.selecionado) {
                const sel = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(0.98, 0.02, 0.98)), new THREE.LineBasicMaterial({ color: 0x2f5bd3 }));
                sel.position.y = 0.012;
                modelo.add(sel);
            }
        }
        if (novo.pikachu) {
            const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: texturaUrl(`${SPRITES}/25.png`), alphaTest: 0.5 }));
            s.center.set(0.5, 0);
            s.scale.set(0.7, 0.7, 1);
            s.position.set(novo.porta.x + 1.5, 0, novo.porta.y + 0.5);
            mobilia.add(s);
            mobilia.userData.mascote = s;
        }
        cena.add(mobilia);
        cena.remove(marcas);
        marcas = new THREE.Group();
        const verde = new THREE.MeshBasicMaterial({ color: 0x2e9e5b, transparent: true, opacity: 0.45, depthWrite: false });
        for (const [x, y] of novo.livres || []) {
            const p = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), verde);
            p.rotation.x = -Math.PI / 2;
            p.position.set(x + 0.5, 0.012, y + 0.5);
            p.userData.alvo = { tipo: "chao", x, y };
            marcas.add(p);
        }
        cena.add(marcas);
    };

    const atualizarEstoque = (mapa) => {
        for (const m of mobilia.children) {
            const vis = mapa[m.userData.chave];
            if (vis !== undefined && m.userData.atualizar) m.userData.atualizar(vis);
        }
    };

    // ---- Clientes: treinador (sprite com 2 quadros) + Pokémon que segue ----
    const clientes = new Map();
    const emojis = new Map();
    const texEmoji = (e) => {
        if (!emojis.has(e)) {
            emojis.set(e, texturaCanvas(64, 64, (g) => {
                g.font = "48px sans-serif";
                g.textAlign = "center";
                g.textBaseline = "middle";
                g.fillText(e, 32, 36);
            }));
        }
        return emojis.get(e);
    };
    const sombraMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22, depthWrite: false });
    const sombraGeo = new THREE.CircleGeometry(0.2, 20);
    const novaSombra = (escala) => {
        const s = new THREE.Mesh(sombraGeo, sombraMat);
        s.rotation.x = -Math.PI / 2;
        s.position.y = 0.01;
        s.scale.setScalar(escala);
        return s;
    };

    const atualizarClientes = (lista) => {
        const vivos = new Set();
        for (const c of lista) {
            vivos.add(c.id);
            let o = clientes.get(c.id);
            if (!o) {
                const fonte = pegarCanvasTreinador(c.sprite);
                const tex = new THREE.CanvasTexture(fonte.c);
                tex.colorSpace = THREE.SRGBColorSpace;
                tex.magFilter = tex.minFilter = THREE.NearestFilter;
                tex.repeat.set(0.5, 1);
                fonte.lista.push(tex);
                const humano = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, alphaTest: 0.5 }));
                humano.center.set(0.5, 0);
                humano.scale.set(0.62, 0.97, 1);
                const grupo = new THREE.Group();
                grupo.add(humano, novaSombra(1));
                grupo.userData.alvo = c.rocket ? { tipo: "rocket", id: c.id } : { tipo: "cliente", id: c.id };
                const balao = new THREE.Sprite(new THREE.SpriteMaterial({ map: texEmoji("💛"), transparent: true, depthTest: false }));
                balao.scale.set(0.3, 0.3, 1);
                balao.position.y = 1.15;
                balao.visible = false;
                grupo.add(balao);
                if (c.rocket) {
                    const anel = new THREE.Mesh(new THREE.RingGeometry(0.28, 0.34, 24), new THREE.MeshBasicMaterial({ color: 0xe9557a, transparent: true, opacity: 0.85, depthWrite: false }));
                    anel.rotation.x = -Math.PI / 2;
                    anel.position.y = 0.015;
                    grupo.add(anel);
                }
                const pk = new THREE.Sprite(new THREE.SpriteMaterial({ map: texturaUrl(c.pokemon), alphaTest: 0.5 }));
                pk.center.set(0.5, 0);
                pk.scale.set(0.6, 0.6, 1);
                const pkGrupo = new THREE.Group();
                pkGrupo.add(pk, novaSombra(0.75));
                pkGrupo.position.set(c.x + 0.5, 0, c.y + 0.9);
                grupo.position.set(c.x + 0.5, 0, c.y + 0.5);
                pessoas.add(grupo, pkGrupo);
                o = { grupo, humano, tex, balao, pkGrupo, pk, alvo: new THREE.Vector3(c.x + 0.5, 0, c.y + 0.5) };
                clientes.set(c.id, o);
            }
            o.alvo.set(c.x + 0.5, 0, c.y + 0.5);
            o.andando = c.andando;
            if (c.balao) {
                o.balao.material.map = texEmoji(c.balao);
                o.balao.visible = true;
            } else o.balao.visible = false;
        }
        for (const [id, o] of clientes) {
            if (vivos.has(id)) continue;
            pessoas.remove(o.grupo, o.pkGrupo);
            o.tex.dispose();
            clientes.delete(id);
        }
    };

    // ---- Textos que sobem (+₽) ----
    const flutuar = (pos, texto, classe) => {
        if (!container) return;
        const v = new THREE.Vector3(pos.x + 0.5, 1.1, pos.y + 0.5).project(camera);
        const el = document.createElement("span");
        el.className = `ty-flutuante ty-flutuante3d ${classe}`;
        el.textContent = texto;
        el.style.left = `${((v.x + 1) / 2) * 100}%`;
        el.style.top = `${((1 - v.y) / 2) * 100}%`;
        container.appendChild(el);
        setTimeout(() => el.remove(), 1300);
    };

    // ---- Animação ----
    const relogio = new THREE.Clock();
    let passo = 0;
    const animar = () => {
        if (!rodando) return;
        if (!container?.isConnected) {
            rodando = false;
            return;
        }
        requestAnimationFrame(animar);
        const dt = Math.min(relogio.getDelta(), 0.1);
        const tempo = relogio.elapsedTime;
        passo += dt;
        const trocaQuadro = passo > 0.18;
        if (trocaQuadro) passo = 0;
        for (const o of clientes.values()) {
            o.grupo.position.lerp(o.alvo, Math.min(1, dt * 10));
            if (trocaQuadro) o.tex.offset.x = o.andando && o.tex.offset.x === 0 ? 0.5 : 0;
            // Pokémon na "coleira": chega perto se o dono se afastar
            const p = o.pkGrupo.position;
            const dx = o.grupo.position.x - p.x;
            const dz = o.grupo.position.z - p.z;
            const d = Math.hypot(dx, dz);
            if (d > 0.62) {
                p.x = o.grupo.position.x - (dx / d) * 0.62;
                p.z = o.grupo.position.z - (dz / d) * 0.62;
            }
            o.pk.position.y = o.andando ? Math.abs(Math.sin(tempo * 12)) * 0.05 : 0;
        }
        for (const m of mobilia.children) {
            if (m.userData.girar) m.userData.girar.rotation.y = Math.sin(tempo * 0.8) * 0.6;
            if (m.userData.balancar) m.userData.balancar.rotation.z = Math.sin(tempo * 1.6 + m.position.x) * 0.06;
            if (m.userData.brilho) m.userData.brilho.emissiveIntensity = 0.35 + Math.sin(tempo * 3) * 0.2;
        }
        if (mobilia.userData.mascote) mobilia.userData.mascote.position.y = Math.abs(Math.sin(tempo * 4)) * 0.06;
        if (sala?.userData.ponteiro) sala.userData.ponteiro.rotation.z = -tempo * 0.4;
        renderer.render(cena, camera);
    };

    return {
        anexar(el) {
            container = el;
            el.appendChild(canvas);
            observador.disconnect();
            observador.observe(el);
            ajustarTamanho();
            posicionarCamera();
            if (!rodando) {
                rodando = true;
                relogio.getDelta();
                requestAnimationFrame(animar);
            }
        },
        montarLoja,
        atualizarEstoque,
        atualizarClientes,
        flutuar,
        limparClientes() {
            for (const o of clientes.values()) pessoas.remove(o.grupo, o.pkGrupo);
            clientes.clear();
        },
    };
};

// Se o navegador não tiver WebGL, o jogo usa a vista 2D
export const temWebGL = () => {
    try {
        const c = document.createElement("canvas");
        return !!(c.getContext("webgl2") || c.getContext("webgl"));
    } catch (e) {
        return false;
    }
};
