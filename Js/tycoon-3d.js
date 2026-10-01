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

const pocao = (cor = 0x8a5cd6) => {
    const g = new THREE.Group();
    g.add(em(cilindro(0.065, 0.07, 0.17, mat(cor, { rough: 0.25 })), 0, 0.085, 0));
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

// Frasquinho de remédio (Antídoto)
const frasquinho = (cor) => {
    const g = new THREE.Group();
    g.add(em(cilindro(0.045, 0.05, 0.12, mat(cor, { rough: 0.25 })), 0, 0.06, 0));
    g.add(em(cilindro(0.03, 0.03, 0.04, mat(0xf4f4f4)), 0, 0.14, 0));
    g.add(em(cilindro(0.047, 0.047, 0.04, mat(0xf4f4f4, { rough: 0.5 })), 0, 0.06, 0));
    return g;
};
// Bebida em garrafa (vidro colorido com tampinha e rótulo)
const garrafa = (cor, rotulo = 0xf4f4f4, tampa = 0xdc2a3c) => {
    const g = new THREE.Group();
    g.add(em(cilindro(0.05, 0.055, 0.16, mat(cor, { rough: 0.15, metal: 0.1 })), 0, 0.08, 0));
    g.add(em(cilindro(0.025, 0.045, 0.06, mat(cor, { rough: 0.15 })), 0, 0.19, 0));
    g.add(em(cilindro(0.028, 0.028, 0.025, mat(tampa, { rough: 0.4 })), 0, 0.23, 0));
    g.add(em(cilindro(0.057, 0.057, 0.06, mat(rotulo, { rough: 0.6 })), 0, 0.09, 0));
    return g;
};
// Latinha de refrigerante
const lata = (cor) => {
    const g = new THREE.Group();
    g.add(em(cilindro(0.055, 0.055, 0.17, mat(cor, { rough: 0.3, metal: 0.5 })), 0, 0.085, 0));
    g.add(em(cilindro(0.045, 0.055, 0.02, mat(0xd9d9e2, { rough: 0.3, metal: 0.7 })), 0, 0.18, 0));
    g.add(em(cilindro(0.057, 0.057, 0.04, mat(0xf4f4f4, { rough: 0.4 })), 0, 0.09, 0));
    return g;
};
// Spray do Repelente
const spray = () => {
    const g = new THREE.Group();
    g.add(em(cilindro(0.055, 0.055, 0.19, mat(0x8a5cd6, { rough: 0.35, metal: 0.3 })), 0, 0.095, 0));
    g.add(em(cilindro(0.04, 0.05, 0.04, mat(0xf4f4f4)), 0, 0.21, 0));
    g.add(em(caixa(0.03, 0.03, 0.04, mat(0x2a2a33)), 0, 0.24, 0.015));
    return g;
};
// Pedra do Trovão: cristal amarelo com um raio verde
const pedraTrovao = () => {
    const g = new THREE.Group();
    const p = new THREE.Mesh(new THREE.DodecahedronGeometry(0.09), mat(0xffcb05, { rough: 0.35, emissivo: 0.15 }));
    p.scale.set(1, 1.25, 0.8);
    p.position.y = 0.11;
    p.castShadow = true;
    g.add(p);
    const raio = em(caixa(0.03, 0.12, 0.02, mat(0x2e9e5b)), 0, 0.11, 0.075);
    raio.rotation.z = 0.5;
    g.add(raio);
    return g;
};
// Doce Raro: bala azul embrulhada
const doce = () => {
    const g = new THREE.Group();
    const bala = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 10), mat(0x2f5bd3, { rough: 0.25 }));
    bala.scale.set(1.3, 1, 1);
    bala.position.y = 0.08;
    bala.castShadow = true;
    g.add(bala);
    for (const lado of [-1, 1]) {
        const ponta = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.08, 6), mat(0x9fd6ff, { rough: 0.3 }));
        ponta.rotation.z = (lado * Math.PI) / 2;
        ponta.position.set(lado * 0.12, 0.08, 0);
        g.add(ponta);
    }
    g.add(em(cilindro(0.072, 0.072, 0.03, mat(0xf4f4f4)), 0, 0.08, 0));
    return g;
};

const MODELOS_PRODUTO = {
    pokebola: () => bola(0xdc2a3c),
    grandeball: () => bola(0x2f5bd3, 0xdc2a3c),
    ultraball: () => bola(0x2a2a33, 0xffcb05),
    pocao: () => pocao(),
    superpocao: () => pocao(0xf07d2a),
    hiperpocao: () => pocao(0xf28ab0),
    antidoto: () => frasquinho(0xffcb05),
    repelente: spray,
    reviver,
    pedra: pedraTrovao,
    docerara: doce,
    pacote,
    isca,
    agua: () => garrafa(0x9fd6ff, 0x2f5bd3, 0x2f5bd3),
    refrigerante: () => lata(0x2f5bd3),
    limonada: () => garrafa(0xffe066, 0xf4f4f4, 0x2e9e5b),
    leite: () => garrafa(0xf7f7f7, 0x2f5bd3, 0x2f5bd3),
};

// ---------------- Personagens 3D ----------------
// Pokémon em voxels: cada pixel do sprite vira um cubinho. O meio fica mais grosso
// que as bordas, para o Pokémon ganhar volume ("fofinho") visto de qualquer lado.
const voxels = new Map();
const gerarVoxels = (img) => {
    const c = document.createElement("canvas");
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    const g = c.getContext("2d");
    g.drawImage(img, 0, 0);
    const W = c.width;
    const H = c.height;
    const px = g.getImageData(0, 0, W, H).data;
    const opaco = (x, y) => x >= 0 && y >= 0 && x < W && y < H && px[(y * W + x) * 4 + 3] > 127;
    let x0 = W, y0 = H, x1 = -1, y1 = -1;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        if (!opaco(x, y)) continue;
        x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
    }
    if (x1 < 0) return null;
    // Distância de cada pixel até a borda do desenho (busca em largura)
    const dist = new Int16Array(W * H).fill(-1);
    const fila = [];
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        if (opaco(x, y) && (!opaco(x + 1, y) || !opaco(x - 1, y) || !opaco(x, y + 1) || !opaco(x, y - 1))) {
            dist[y * W + x] = 1;
            fila.push(x, y);
        }
    }
    for (let i = 0; i < fila.length; i += 2) {
        const x = fila[i];
        const y = fila[i + 1];
        const d = dist[y * W + x];
        for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
            if (opaco(nx, ny) && dist[ny * W + nx] === -1) {
                dist[ny * W + nx] = d + 1;
                fila.push(nx, ny);
            }
        }
    }
    // Cada pixel vira um bloco com a cor "de dentro" do corpo. O contorno do sprite
    // (a borda escura) vira só uma placa fina na frente e atrás, para o topo e as
    // laterais ficarem da cor do Pokémon e não listrados de preto.
    const cx = (x0 + x1 + 1) / 2;
    const blocos = [];
    const corDe = (x, y) => {
        const k = (y * W + x) * 4;
        return [px[k], px[k + 1], px[k + 2]];
    };
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        if (!opaco(x, y)) continue;
        const d = dist[y * W + x];
        const r = Math.min(d, 6) / 6;
        const grossura = 3 + 7 * Math.sqrt(1 - (1 - r) * (1 - r));
        let corpo = corDe(x, y);
        if (d === 1) {
            const dentro = [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]].find(([nx, ny]) => opaco(nx, ny) && dist[ny * W + nx] > 1);
            if (dentro) {
                corpo = corDe(...dentro);
                const borda = corDe(x, y);
                blocos.push([x, y, 1.05, grossura / 2 - 0.45, borda], [x, y, 1.05, -grossura / 2 + 0.45, borda]);
            }
        }
        blocos.push([x, y, grossura, 0, corpo]);
    }
    const matriz = new Float32Array(blocos.length * 16);
    const cores = new Float32Array(blocos.length * 3);
    const m4 = new THREE.Matrix4();
    const cor = new THREE.Color();
    blocos.forEach(([x, y, prof, z, [rr, gg, bb]], i) => {
        m4.makeScale(1, 1, prof).setPosition(x + 0.5 - cx, y1 - y + 0.5, z);
        m4.toArray(matriz, i * 16);
        cor.setRGB(rr / 255, gg / 255, bb / 255, THREE.SRGBColorSpace);
        cores.set([cor.r, cor.g, cor.b], i * 3);
    });
    return {
        n: blocos.length,
        alt: y1 - y0 + 1,
        matriz: new THREE.InstancedBufferAttribute(matriz, 16),
        cores: new THREE.InstancedBufferAttribute(cores, 3),
    };
};
const carregarVoxels = (url) => {
    if (!voxels.has(url)) {
        voxels.set(url, new Promise((ok) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => {
                try {
                    ok(gerarVoxels(img));
                } catch (e) {
                    ok(null);
                }
            };
            img.onerror = () => ok(null);
            img.src = url;
        }));
    }
    return voxels.get(url);
};
const geoVoxel = new THREE.BoxGeometry(1, 1, 1);
const matVoxel = new THREE.MeshStandardMaterial({ roughness: 0.6 });

// Modelo do Pokémon (o grupo é preenchido quando o sprite termina de carregar).
// Sem "altura", o tamanho acompanha o sprite: Pokémon grandes ficam maiores.
const modeloPokemon = (url, altura = null) => {
    const g = new THREE.Group();
    carregarVoxels(url).then((v) => {
        if (!v) {
            const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: texturaUrl(url), alphaTest: 0.5 }));
            s.center.set(0.5, 0.1);
            s.scale.setScalar(altura || 0.6);
            g.add(s);
            return;
        }
        const mesh = new THREE.InstancedMesh(geoVoxel, matVoxel, v.n);
        mesh.instanceMatrix = v.matriz;
        mesh.instanceColor = v.cores;
        mesh.castShadow = true;
        const alturaFinal = altura || 0.2 + (v.alt / 96) * 0.75;
        mesh.scale.setScalar(alturaFinal / v.alt);
        mesh.computeBoundingSphere();
        g.add(mesh);
    });
    return g;
};

// Treinador em blocos, com braços e pernas que balançam ao andar (frente = +Z)
const texturasRosto = new Map();
const texRosto = (pele, sombra) => {
    if (!texturasRosto.has(pele)) {
        texturasRosto.set(pele, texturaCanvas(16, 16, (g) => {
            g.fillStyle = pele;
            g.fillRect(0, 0, 16, 16);
            g.fillStyle = "#1c1b22";
            g.fillRect(3, 6, 2, 3);
            g.fillRect(11, 6, 2, 3);
            g.fillStyle = "#ffffff";
            g.fillRect(3, 6, 1, 1);
            g.fillRect(11, 6, 1, 1);
            g.fillStyle = sombra;
            g.fillRect(6, 11, 4, 1);
            g.fillStyle = "rgba(240, 120, 120, 0.45)";
            g.fillRect(2, 10, 2, 1);
            g.fillRect(12, 10, 2, 1);
        }, true));
    }
    return texturasRosto.get(pele);
};
let texRocket = null;
const boneco = (a) => {
    const g = new THREE.Group();
    const pele = mat(a.pele, { rough: 0.7 });
    const camisa = mat(a.camisa, { rough: 0.8 });
    const calca = mat(a.calca, { rough: 0.85 });
    const sapato = mat(a.sapato, { rough: 0.6 });
    const cabelo = mat(a.cabelo, { rough: 0.9 });
    const perna = (lado) => {
        const p = new THREE.Group();
        p.position.set(lado * 0.075, 0.34, 0);
        p.add(em(caixa(0.11, 0.28, 0.12, a.saia ? pele : calca), 0, -0.14, 0));
        p.add(em(caixa(0.12, 0.07, 0.16, sapato), 0, -0.305, 0.015));
        g.add(p);
        return p;
    };
    const braco = (lado) => {
        const b = new THREE.Group();
        b.position.set(lado * 0.195, 0.62, 0);
        b.add(em(caixa(0.09, 0.12, 0.1, camisa), 0, -0.05, 0));
        b.add(em(caixa(0.08, 0.17, 0.09, pele), 0, -0.19, 0));
        g.add(b);
        return b;
    };
    const pernas = [perna(-1), perna(1)];
    const bracos = [braco(-1), braco(1)];
    let frenteCamisa = camisa;
    if (a.rocket) {
        texRocket ||= texturaCanvas(32, 32, (c) => {
            c.fillStyle = a.camisa;
            c.fillRect(0, 0, 32, 32);
            c.fillStyle = "#dc2a3c";
            c.font = "bold 22px sans-serif";
            c.textAlign = "center";
            c.textBaseline = "middle";
            c.fillText("R", 16, 17);
        });
        frenteCamisa = new THREE.MeshStandardMaterial({ map: texRocket, roughness: 0.8 });
    }
    const tronco = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.18), [camisa, camisa, camisa, camisa, frenteCamisa, camisa]);
    tronco.position.y = 0.49;
    tronco.castShadow = true;
    g.add(tronco);
    if (a.saia) g.add(em(caixa(0.34, 0.13, 0.22, calca), 0, 0.33, 0));
    if (a.mochila) {
        g.add(em(caixa(0.24, 0.26, 0.1, mat(0x6b4a2f)), 0, 0.5, -0.14));
        for (const lado of [-1, 1]) g.add(em(caixa(0.035, 0.28, 0.02, mat(0x6b4a2f)), lado * 0.08, 0.5, 0.095));
    }
    const rosto = new THREE.MeshStandardMaterial({ map: texRosto(a.pele, a.peleSombra), roughness: 0.7 });
    const cabeca = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.28, 0.28), [pele, pele, pele, pele, rosto, pele]);
    cabeca.position.y = 0.79;
    cabeca.castShadow = true;
    g.add(cabeca);
    if (a.estilo === "bone") {
        const bone = mat(a.bone, { rough: 0.6 });
        g.add(em(caixa(0.32, 0.1, 0.3, bone), 0, 0.96, 0));
        g.add(em(caixa(0.3, 0.025, 0.14, bone), 0, 0.92, 0.2));
        g.add(em(caixa(0.08, 0.06, 0.01, mat(a.detalhe)), 0, 0.97, 0.152));
        g.add(em(caixa(0.32, 0.1, 0.04, cabelo), 0, 0.86, -0.145));
    } else if (a.estilo === "longo") {
        g.add(em(caixa(0.32, 0.08, 0.3, cabelo), 0, 0.96, 0));
        g.add(em(caixa(0.32, 0.4, 0.06, cabelo), 0, 0.76, -0.15));
        for (const lado of [-1, 1]) g.add(em(caixa(0.04, 0.3, 0.24, cabelo), lado * 0.165, 0.8, -0.02));
        g.add(em(caixa(0.3, 0.05, 0.03, cabelo), 0, 0.91, 0.14));
    } else {
        g.add(em(caixa(0.32, 0.08, 0.3, cabelo), 0, 0.96, 0));
        g.add(em(caixa(0.32, 0.16, 0.04, cabelo), 0, 0.87, -0.145));
        for (const [x, z] of [[-0.09, 0.08], [0.02, -0.04], [0.1, 0.06], [-0.04, -0.1]]) {
            const tufo = em(caixa(0.08, 0.07, 0.08, cabelo), x, 1.02, z);
            tufo.rotation.z = x * 2;
            g.add(tufo);
        }
        g.add(em(caixa(0.3, 0.05, 0.03, cabelo), 0, 0.91, 0.14));
    }
    return { g, pernas, bracos };
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
    // Com acabamento escolhido, a estrutura ganha a cor; as tábuas continuam de madeira
    const madeira = m.cor ? mat(m.cor, { rough: 0.6 }) : mat(MADEIRA);
    const escura = m.cor ? mat(m.cor, { rough: 0.7 }) : mat(MADEIRA_ESC);
    const tabua = mat(MADEIRA);
    g.add(em(caixa(0.88, 0.08, 0.7, escura), 0, 0.04, 0));
    g.add(em(caixa(0.88, 1.08, 0.05, escura), 0, 0.54, -0.325));
    for (const lado of [-1, 1]) g.add(em(caixa(0.05, 1.08, 0.7, madeira), lado * 0.415, 0.54, 0));
    g.add(em(caixa(0.92, 0.05, 0.4, mat(MADEIRA_CLARA)), 0, 1.1, -0.15));
    const produtos = [];
    ALTURAS_TABUA.forEach((y, n) => {
        const fundo = FUNDOS_TABUA[n];
        const z0 = -0.3;
        g.add(em(caixa(0.78, 0.03, fundo, tabua), 0, y, z0 + fundo / 2));
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
    enfeitarNivel(g, m.nivel, 1.12);
    g.userData.produtos = produtos;
    g.userData.atualizar = (vis) => produtos.forEach((p, i) => { p.visible = i < vis; });
    g.userData.atualizar(m.visiveis);
    return g;
};

// Visual das melhorias: nível 2 ganha cantoneiras de metal; nível 3, letreiro dourado iluminado
const enfeitarNivel = (g, nivel, altura) => {
    if (nivel >= 2) {
        for (const lado of [-1, 1]) g.add(em(caixa(0.04, altura, 0.04, mat(0xb8bcc8, { metal: 0.7, rough: 0.3 })), lado * 0.44, altura / 2, 0.33));
    }
    if (nivel >= 3) {
        const luz = em(caixa(0.86, 0.06, 0.06, mat(0xffd75a, { emissivo: 0.9, rough: 0.3 })), 0, altura + 0.04, 0.3);
        g.add(luz);
        g.userData.brilho = luz.material;
    }
};

// Geladeira: armário branco com porta de vidro e 3 prateleiras de bebidas
const geladeira = (m) => {
    const g = new THREE.Group();
    const corpo = mat(m.cor || 0xe9e9ef, { rough: 0.35, metal: 0.1 });
    const H = 1.25;
    g.add(em(caixa(0.86, 0.1, 0.66, mat(0x6b7390)), 0, 0.05, -0.02));
    g.add(em(caixa(0.86, H, 0.05, corpo), 0, H / 2, -0.33));
    for (const lado of [-1, 1]) g.add(em(caixa(0.05, H, 0.66, corpo), lado * 0.405, H / 2, -0.02));
    g.add(em(caixa(0.86, 0.14, 0.66, corpo), 0, H - 0.07, -0.02));
    g.add(em(caixa(0.76, H - 0.24, 0.02, mat(0x9fd6ff, { emissivo: 0.35 })), 0, (H - 0.1) / 2 + 0.05, -0.3));
    // Letreiro aceso em cima
    const letreiro = texturaCanvas(128, 32, (c, w, h) => {
        c.fillStyle = "#2f5bd3";
        c.fillRect(0, 0, w, h);
        c.fillStyle = "#fff";
        c.font = "bold 20px sans-serif";
        c.textAlign = "center";
        c.textBaseline = "middle";
        c.fillText("GELADO", w / 2, h / 2 + 1);
    });
    const placa = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.11), new THREE.MeshStandardMaterial({ map: letreiro, emissive: 0x2f5bd3, emissiveIntensity: 0.4 }));
    placa.position.set(0, H - 0.07, 0.315);
    g.add(placa);
    const produtos = [];
    [0.16, 0.5, 0.84].forEach((y) => {
        g.add(em(caixa(0.76, 0.02, 0.56, mat(0xd9d9e2, { metal: 0.4, rough: 0.3 })), 0, y, -0.03));
        [-0.24, 0, 0.24].forEach((x) => {
            const p = (MODELOS_PRODUTO[m.produto] || MODELOS_PRODUTO.agua)();
            p.position.set(x, y + 0.01, 0.02);
            g.add(p);
            produtos.push(p);
        });
    });
    // Porta de vidro (aberta pela frente) com puxador
    const vidro = caixa(0.78, H - 0.2, 0.02, mat(0xcdeeff, { rough: 0.05, opacidade: 0.18, depthWrite: false }));
    vidro.castShadow = false;
    g.add(em(vidro, 0, (H - 0.1) / 2 + 0.05, 0.3));
    g.add(em(caixa(0.03, 0.4, 0.04, mat(0xb8bcc8, { metal: 0.7, rough: 0.3 })), 0.33, 0.62, 0.33));
    const tag = etiqueta(`₽ ${m.preco}`);
    tag.position.set(0, 0.06, 0.33);
    g.add(tag);
    enfeitarNivel(g, m.nivel, H);
    g.userData.atualizar = (vis) => produtos.forEach((p, i) => { p.visible = i < vis; });
    g.userData.atualizar(m.visiveis);
    return g;
};

const banco = (m) => {
    const g = new THREE.Group();
    const madeira = mat(m.cor || MADEIRA, { rough: 0.7 });
    g.add(em(caixa(0.86, 0.06, 0.34, madeira), 0, 0.3, 0.05));
    g.add(em(caixa(0.86, 0.22, 0.05, madeira), 0, 0.5, -0.14));
    for (const x of [-0.36, 0.36]) {
        for (const z of [-0.08, 0.18]) g.add(em(caixa(0.05, 0.28, 0.05, mat(0x3c4a66, { metal: 0.5, rough: 0.4 })), x, 0.14, z));
        g.add(em(caixa(0.05, 0.36, 0.05, mat(0x3c4a66, { metal: 0.5, rough: 0.4 })), x, 0.45, -0.14));
    }
    return g;
};

const lixeira = (m) => {
    const g = new THREE.Group();
    g.add(em(cilindro(0.17, 0.14, 0.5, mat(m.cor || 0x2e9e5b, { rough: 0.5 })), 0, 0.25, 0));
    g.add(em(cilindro(0.19, 0.19, 0.05, mat(0x1f7040, { rough: 0.5 })), 0, 0.52, 0));
    g.add(em(cilindro(0.05, 0.05, 0.05, mat(0x1f7040)), 0, 0.57, 0));
    const simbolo = texturaCanvas(32, 32, (c) => {
        c.fillStyle = "#f4f4f4";
        c.beginPath();
        c.arc(16, 16, 12, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = "#2e9e5b";
        c.font = "bold 18px sans-serif";
        c.textAlign = "center";
        c.textBaseline = "middle";
        c.fillText("♻", 16, 17);
    });
    const placa = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.16), new THREE.MeshBasicMaterial({ map: simbolo, transparent: true }));
    placa.position.set(0, 0.28, 0.165);
    g.add(placa);
    return g;
};

let texTotem = null;
const totem = (m) => {
    const g = new THREE.Group();
    g.add(em(cilindro(0.2, 0.22, 0.06, mat(TINTA)), 0, 0.03, 0));
    g.add(em(caixa(0.06, 0.6, 0.06, mat(0xb8bcc8, { metal: 0.6, rough: 0.3 })), 0, 0.33, 0));
    texTotem ||= texturaCanvas(96, 128, (c, w, h) => {
        c.fillStyle = "#ffcb05";
        c.fillRect(0, 0, w, h);
        c.fillStyle = "#dc2a3c";
        c.fillRect(0, 0, w, 40);
        c.fillStyle = "#fff";
        c.font = "bold 20px sans-serif";
        c.textAlign = "center";
        c.fillText("OFERTA", w / 2, 28);
        c.fillStyle = "#1c1b22";
        c.font = "bold 34px sans-serif";
        c.fillText("-20%", w / 2, 86);
        c.font = "bold 14px sans-serif";
        c.fillText("POKÉMART", w / 2, 116);
    });
    const placa = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.66, 0.05), [mat(m.cor || 0xdc2a3c), mat(m.cor || 0xdc2a3c), mat(m.cor || 0xdc2a3c), mat(m.cor || 0xdc2a3c), new THREE.MeshStandardMaterial({ map: texTotem, emissive: 0xffcb05, emissiveIntensity: 0.15 }), mat(m.cor || 0xdc2a3c)]);
    placa.position.y = 0.95;
    placa.castShadow = true;
    g.add(placa);
    g.userData.balancar = placa;
    return g;
};

let texAuto = null;
const caixaAutomatico = (m) => {
    const g = new THREE.Group();
    const corpo = mat(m.cor || 0xb8bcc8, { rough: 0.35, metal: 0.35 });
    g.add(em(caixa(0.7, 0.85, 0.5, corpo), 0, 0.425, -0.05));
    g.add(em(caixa(0.74, 0.06, 0.56, mat(0x3c4a66)), 0, 0.88, -0.05));
    // Tela inclinada e leitor de código de barras
    texAuto ||= texturaCanvas(96, 64, (c, w, h) => {
        c.fillStyle = "#1d2a4a";
        c.fillRect(0, 0, w, h);
        c.fillStyle = "#7fe0a0";
        c.font = "bold 16px sans-serif";
        c.textAlign = "center";
        c.fillText("PAGUE", w / 2, 26);
        c.fillText("AQUI ✓", w / 2, 48);
    });
    const tela = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.3, 0.04), [mat(0x2a2a33), mat(0x2a2a33), mat(0x2a2a33), mat(0x2a2a33), new THREE.MeshStandardMaterial({ map: texAuto, emissive: 0x3fbf6a, emissiveIntensity: 0.35 }), mat(0x2a2a33)]);
    tela.position.set(0, 1.1, -0.12);
    tela.rotation.x = -0.35;
    g.add(tela);
    g.add(em(caixa(0.06, 0.32, 0.06, mat(0x2a2a33)), 0, 0.95, -0.2));
    g.add(em(caixa(0.22, 0.03, 0.16, mat(0xdc2a3c, { emissivo: 0.6 })), 0.18, 0.92, 0.08));
    g.add(em(caixa(0.62, 0.02, 0.18, mat(0x2a2a33)), 0, 0.7, 0.22));
    return g;
};

const estatua = () => {
    const g = new THREE.Group();
    g.add(em(caixa(0.8, 0.22, 0.8, mat(0xb8bcc8, { rough: 0.8 })), 0, 0.11, 0));
    g.add(em(caixa(0.7, 0.06, 0.7, mat(0xffcb05, { metal: 0.6, rough: 0.3 })), 0, 0.25, 0));
    g.add(em(modeloPokemon(`${SPRITES}/143.png`, 1.05), 0, 0.28, 0));
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
    const lado = mat(m.cor || 0xd9d9e2, { rough: 0.5 });
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
    // Melhorias: esteira rolante no balcão (nível 2) e maquininha de cartão (nível 3)
    if (m.nivel >= 2) {
        g.add(em(caixa(0.32, 0.03, 0.5, mat(0x2a2a33, { rough: 0.6 })), -0.28, 0.565, 0.02));
        for (let i = 0; i < 5; i++) g.add(em(caixa(0.3, 0.01, 0.02, mat(0x6b7390)), -0.28, 0.585, -0.18 + i * 0.09));
    }
    if (m.nivel >= 3) {
        g.add(em(caixa(0.1, 0.04, 0.16, mat(0x2a2a33)), 0.36, 0.575, 0.18));
        g.add(em(caixa(0.07, 0.01, 0.05, mat(0x7fe0a0, { emissivo: 0.5 })), 0.36, 0.6, 0.15));
    }
    // Chansey em pé atrás do balcão, atendendo (virada para os clientes)
    if (m.chansey) g.add(em(modeloPokemon(`${SPRITES}/113.png`, 0.85), -0.05, 0, -0.52));
    return g;
};

const vitrine = (m) => {
    const g = new THREE.Group();
    g.add(em(caixa(0.78, 0.42, 0.66, mat(m.cor || 0xf4f4f4, { rough: 0.4 })), 0, 0.21, 0));
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
        const luz = new THREE.PointLight(0xffe7a0, 0.6 + (m.nivel - 1) * 0.5, 1.4 + (m.nivel - 1) * 0.6);
        luz.position.set(0, 1.0, 0.1);
        g.add(luz);
        g.userData.velocidade = m.nivel >= 3 ? 1 : 0;
    }
    // Holofote (nível 2) e base giratória dourada (nível 3)
    if (m.nivel >= 2) {
        const poste = em(caixa(0.04, 0.9, 0.04, mat(TINTA)), 0.36, 0.45, 0.36);
        g.add(poste);
        const cabeca = em(cilindro(0.06, 0.09, 0.12, mat(0x2a2a33, { metal: 0.6 })), 0.32, 0.92, 0.32);
        cabeca.rotation.x = -0.8;
        g.add(cabeca);
    }
    if (m.nivel >= 3) g.add(em(cilindro(0.3, 0.3, 0.03, mat(0xffcb05, { metal: 0.7, rough: 0.25 }), 28), 0, 0.46, 0));
    return g;
};

const planta = (m) => {
    const g = new THREE.Group();
    g.add(em(cilindro(0.17, 0.12, 0.26, mat(m.cor || 0xd2693a, { rough: 0.85 })), 0, 0.13, 0));
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
const maquina = (m) => {
    const g = new THREE.Group();
    const vermelho = mat(m.cor || 0xdc2a3c, { rough: 0.4 });
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
    // Máquina dupla (nível 3): uma segunda máquina azul ao lado
    if (m.nivel >= 2) g.add(em(caixa(0.12, 0.12, 0.02, mat(0xffcb05, { emissivo: 0.6 })), 0.24, 1.1, 0.25));
    if (m.nivel >= 3) {
        const irma = em(caixa(0.22, 1.1, 0.5, mat(0x2f5bd3, { rough: 0.4 })), 0.47, 0.58, -0.04);
        g.add(irma);
    }
    return g;
};

const MODELOS_MOVEL = {
    prateleira: estante, caixa: caixaRegistradora, vitrine, planta, maquina,
    geladeira, banco, lixeira, totem, caixarapido: caixaAutomatico, estatua,
};

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
    // Separa o que fica em cada parede, para esconder a parede que estiver na frente da câmera
    const fundoG = new THREE.Group();
    const esquerdaG = new THREE.Group();
    for (const filho of [...sala.children]) {
        if (filho === chao) continue;
        if (filho.position.z <= 0.05) fundoG.add(filho);
        else if (filho.position.x <= 0.05) esquerdaG.add(filho);
    }
    sala.add(fundoG, esquerdaG);
    sala.userData.paredes = { fundo: fundoG, esquerda: esquerdaG };
    return sala;
};

// ---------------- Cena ----------------
export const criarCena = ({ aoClicar, aoMover, podeMover }) => {
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
    let pitch = 0.78;
    let zoom = 0.8;
    const alvoCam = new THREE.Vector3();

    const posicionarCamera = () => {
        if (!dados) return;
        const { w, h } = dados;
        alvoCam.set(w / 2, 0.35, h / 2 + 0.2);
        // Tela em pé (celular) precisa de mais distância para a loja caber na largura
        const estreita = Math.max(1, (1.3 / camera.aspect) ** 0.85);
        const dist = (Math.max(w, h) * 1.55 + 3.2) * zoom * estreita;
        camera.position.set(
            alvoCam.x + Math.sin(yaw) * Math.cos(pitch) * dist,
            alvoCam.y + Math.sin(pitch) * dist,
            alvoCam.z + Math.cos(yaw) * Math.cos(pitch) * dist,
        );
        camera.lookAt(alvoCam);
        // Parede entre a câmera e a loja some (assim dá para ver de qualquer lado)
        const paredes = sala?.userData.paredes;
        if (paredes) {
            paredes.fundo.visible = camera.position.z > 0.3;
            paredes.esquerda.visible = camera.position.x > 0.3;
        }
    };

    const ajustarTamanho = () => {
        if (!container) return;
        const largura = container.clientWidth;
        const altura = container.clientHeight;
        if (!largura || !altura) return;
        renderer.setSize(largura, altura, false);
        camera.aspect = largura / altura;
        camera.updateProjectionMatrix();
        posicionarCamera();
    };
    const observador = new ResizeObserver(ajustarTamanho);
    // Se o navegador derrubar o contexto 3D, monta a loja de novo quando ele voltar
    canvas.addEventListener("webglcontextlost", (ev) => ev.preventDefault());
    canvas.addEventListener("webglcontextrestored", () => {
        const d = dados;
        dados = null;
        if (d) montarLoja(d);
    });

    // ---- Mouse/toque: arrastar gira a câmera (ou move o móvel no modo Construir) ----
    const raio = new THREE.Raycaster();
    const ponteiro = new THREE.Vector2();
    const planoChao = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const pontoChao = new THREE.Vector3();
    let arrasto = null;
    const mirar = (ev) => {
        const r = canvas.getBoundingClientRect();
        ponteiro.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
        raio.setFromCamera(ponteiro, camera);
    };
    const alvoNoPonto = (ev) => {
        mirar(ev);
        const hits = raio.intersectObjects([mobilia, pessoas], true);
        for (const hit of hits) {
            let o = hit.object;
            while (o && !o.userData.alvo) o = o.parent;
            if (o) return o.userData.alvo;
        }
        return null;
    };
    // Casa do chão que está embaixo do mouse (ignora pessoas, móveis e paredes no caminho)
    const casaNoPonto = (ev) => {
        mirar(ev);
        if (!dados || !raio.ray.intersectPlane(planoChao, pontoChao)) return null;
        const x = Math.floor(pontoChao.x);
        const y = Math.floor(pontoChao.z);
        return x >= 0 && y >= 0 && x < dados.w && y < dados.h ? { x, y } : null;
    };
    const livre = (casa) => casa && (dados.livres || []).some(([x, y]) => x === casa.x && y === casa.y);

    // Quadrado que mostra onde o móvel vai cair
    const mira = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(0.96, 0.02, 0.96)), new THREE.LineBasicMaterial({ color: 0xffffff }));
    const miraFundo = new THREE.Mesh(new THREE.PlaneGeometry(0.96, 0.96), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, depthWrite: false }));
    miraFundo.rotation.x = -Math.PI / 2;
    const miraG = new THREE.Group();
    miraG.add(mira, miraFundo);
    miraG.visible = false;
    cena.add(miraG);
    const mostrarMira = (casa, ok) => {
        miraG.visible = !!casa;
        if (!casa) return;
        miraG.position.set(casa.x + 0.5, 0.02, casa.y + 0.5);
        const cor = ok ? 0x2ecc71 : 0xe74c3c;
        mira.material.color.setHex(cor);
        miraFundo.material.color.setHex(cor);
    };

    // Dois dedos na tela: pinça para aproximar/afastar
    const dedos = new Map();
    let pinca = null;
    const distanciaDedos = () => {
        const [a, b] = [...dedos.values()];
        return Math.hypot(a.x - b.x, a.y - b.y);
    };
    canvas.addEventListener("pointerdown", (ev) => {
        canvas.setPointerCapture?.(ev.pointerId);
        dedos.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
        if (dedos.size === 2) {
            pinca = { d: distanciaDedos(), zoom };
            arrasto = null;
            return;
        }
        arrasto = { x: ev.clientX, y: ev.clientY, yaw, pitch, moveu: false, movel: null };
        // No modo Construir, apertar num móvel e arrastar leva o móvel junto
        if (dados?.construir) {
            const alvo = alvoNoPonto(ev);
            if (alvo?.tipo === "movel") {
                const modelo = mobilia.children.find((m) => m.userData.chave === `${alvo.x},${alvo.y}`);
                arrasto.movel = { ...alvo, modelo };
            }
        }
    });
    canvas.addEventListener("pointermove", (ev) => {
        if (dedos.has(ev.pointerId)) dedos.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
        if (pinca && dedos.size === 2) {
            zoom = Math.min(1.5, Math.max(0.45, pinca.zoom * (pinca.d / Math.max(20, distanciaDedos()))));
            posicionarCamera();
            return;
        }
        if (arrasto && ev.buttons) {
            const dx = ev.clientX - arrasto.x;
            const dy = ev.clientY - arrasto.y;
            if (Math.hypot(dx, dy) > 5) arrasto.moveu = true;
            if (!arrasto.moveu) return;
            if (arrasto.movel) {
                const casa = casaNoPonto(ev);
                const ok = casa && podeMover?.(arrasto.movel.x, arrasto.movel.y, casa.x, casa.y);
                if (casa && arrasto.movel.modelo) arrasto.movel.modelo.position.set(casa.x + 0.5, 0.12, casa.y + 0.5);
                mostrarMira(casa, ok);
                return;
            }
            // Gira em volta da loja (360°) e inclina para cima/baixo
            yaw = arrasto.yaw - dx * 0.008;
            pitch = Math.min(1.45, Math.max(0.35, arrasto.pitch + dy * 0.005));
            posicionarCamera();
            return;
        }
        if (dados?.construir) {
            const casa = casaNoPonto(ev);
            const temLivres = (dados.livres || []).length > 0;
            if (temLivres && casa) mostrarMira(casa, livre(casa));
            else miraG.visible = false;
            const alvo = !temLivres || !livre(casa) ? alvoNoPonto(ev) : null;
            canvas.style.cursor = (temLivres && livre(casa)) || alvo?.tipo === "movel" ? "pointer" : "grab";
            return;
        }
        const alvo = alvoNoPonto(ev);
        canvas.style.cursor = alvo && alvo.tipo !== "cliente" ? "pointer" : "grab";
    });
    const soltarDedo = (ev) => {
        dedos.delete(ev.pointerId);
        if (dedos.size < 2) pinca = null;
    };
    canvas.addEventListener("pointercancel", (ev) => {
        soltarDedo(ev);
        arrasto = null;
    });
    canvas.addEventListener("pointerup", (ev) => {
        const eraPinca = !!pinca;
        soltarDedo(ev);
        if (eraPinca) {
            arrasto = null;
            return;
        }
        const a = arrasto;
        arrasto = null;
        if (!a) return;
        if (a.movel && a.moveu) {
            // Soltou o móvel: vai para a casa nova se puder; senão volta
            miraG.visible = false;
            const casa = casaNoPonto(ev);
            if (casa && podeMover?.(a.movel.x, a.movel.y, casa.x, casa.y)) aoMover(a.movel.x, a.movel.y, casa.x, casa.y);
            else if (a.movel.modelo) a.movel.modelo.position.set(a.movel.x + 0.5, 0, a.movel.y + 0.5);
            return;
        }
        if (a.moveu) return;
        // Construindo ou movendo: o clique vale para a casa do chão embaixo do mouse
        if (dados?.construir && (dados.livres || []).length) {
            const casa = casaNoPonto(ev);
            // Se um móvel estiver na frente do chão tocado, o toque é no móvel
            const hit = raio.intersectObject(mobilia, true)[0];
            const distChao = raio.ray.origin.distanceTo(pontoChao);
            if (livre(casa) && !(hit && hit.distance < distChao - 0.05)) return aoClicar({ tipo: "chao", x: casa.x, y: casa.y });
        }
        const alvo = alvoNoPonto(ev);
        if (alvo && alvo.tipo !== "cliente") aoClicar(alvo);
    });
    canvas.addEventListener("pointerleave", () => { miraG.visible = false; });
    canvas.addEventListener("wheel", (ev) => {
        ev.preventDefault();
        zoom = Math.min(1.5, Math.max(0.45, zoom * (ev.deltaY > 0 ? 1.08 : 0.93)));
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
            // A frente gira de 90 em 90 graus (0 = para a frente da loja)
            modelo.rotation.y = (m.rot || 0) * (Math.PI / 2);
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
            const s = modeloPokemon(`${SPRITES}/25.png`, 0.55);
            s.position.set(novo.porta.x + 1.5, 0, novo.porta.y + 0.5);
            s.rotation.y = 0.5;
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

    // ---- Clientes: treinador em blocos + Pokémon em voxels que segue o dono ----
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
                const { g: corpo, pernas, bracos } = boneco(c.aparencia);
                const grupo = new THREE.Group();
                grupo.add(corpo, novaSombra(1));
                grupo.userData.alvo = c.rocket ? { tipo: "rocket", id: c.id } : { tipo: "cliente", id: c.id };
                const balao = new THREE.Sprite(new THREE.SpriteMaterial({ map: texEmoji("💛"), transparent: true, depthTest: false }));
                balao.scale.set(0.3, 0.3, 1);
                balao.position.y = 1.28;
                balao.visible = false;
                grupo.add(balao);
                if (c.rocket) {
                    const anel = new THREE.Mesh(new THREE.RingGeometry(0.28, 0.34, 24), new THREE.MeshBasicMaterial({ color: 0xe9557a, transparent: true, opacity: 0.85, depthWrite: false }));
                    anel.rotation.x = -Math.PI / 2;
                    anel.position.y = 0.015;
                    grupo.add(anel);
                }
                const pk = modeloPokemon(c.pokemon);
                const pkGrupo = new THREE.Group();
                pkGrupo.add(pk, novaSombra(0.75));
                pkGrupo.position.set(c.x + 0.5, 0, c.y + 1.1);
                grupo.position.set(c.x + 0.5, 0, c.y + 0.5);
                pessoas.add(grupo, pkGrupo);
                o = { grupo, corpo, pernas, bracos, balao, pkGrupo, pk, fase: Math.random() * 6, alvo: new THREE.Vector3(c.x + 0.5, 0, c.y + 0.5) };
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
    // Gira suavemente para o lado em que está andando
    const virar = (obj, dx, dz, forca) => {
        if (Math.hypot(dx, dz) < 0.0015) return;
        const alvo = Math.atan2(dx, dz);
        let dif = alvo - obj.rotation.y;
        dif = Math.atan2(Math.sin(dif), Math.cos(dif));
        obj.rotation.y += dif * forca;
    };
    const animar = () => {
        if (!rodando) return;
        if (!container?.isConnected) {
            rodando = false;
            return;
        }
        requestAnimationFrame(animar);
        const dt = Math.min(relogio.getDelta(), 0.1);
        const tempo = relogio.elapsedTime;
        for (const o of clientes.values()) {
            const g = o.grupo.position;
            const ax = g.x;
            const az = g.z;
            g.lerp(o.alvo, Math.min(1, dt * 10));
            virar(o.corpo, g.x - ax, g.z - az, 0.25);
            // Braços e pernas balançando ao andar
            const balanco = o.andando ? Math.sin(tempo * 11 + o.fase) * 0.6 : 0;
            o.pernas[0].rotation.x = balanco;
            o.pernas[1].rotation.x = -balanco;
            o.bracos[0].rotation.x = -balanco * 0.8;
            o.bracos[1].rotation.x = balanco * 0.8;
            o.corpo.position.y = o.andando ? Math.abs(Math.cos(tempo * 11 + o.fase)) * 0.025 : 0;
            // Pokémon na "coleira": chega perto se o dono se afastar
            const p = o.pkGrupo.position;
            const px = p.x;
            const pz = p.z;
            const dx = g.x - p.x;
            const dz = g.z - p.z;
            const d = Math.hypot(dx, dz);
            if (d > 0.62) {
                p.x = g.x - (dx / d) * 0.62;
                p.z = g.z - (dz / d) * 0.62;
            }
            virar(o.pk, p.x - px, p.z - pz, 0.2);
            o.pk.position.y = o.andando ? Math.abs(Math.sin(tempo * 12 + o.fase)) * 0.06 : 0;
        }
        for (const m of mobilia.children) {
            if (m.userData.girar) m.userData.girar.rotation.y = m.userData.velocidade ? tempo * 0.9 : Math.sin(tempo * 0.8) * 0.6;
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
        // Posição na tela (px, relativa ao canvas) do centro de uma casa do mapa
        pontoNaTela(x, y, altura = 0) {
            const v = new THREE.Vector3(x + 0.5, altura, y + 0.5).project(camera);
            const r = canvas.getBoundingClientRect();
            return { x: ((v.x + 1) / 2) * r.width, y: ((1 - v.y) / 2) * r.height };
        },
        girarCamera(passo) {
            yaw += passo;
            posicionarCamera();
        },
        centralizarCamera() {
            yaw = 0.62;
            pitch = 0.78;
            zoom = 0.8;
            posicionarCamera();
        },
        atualizarClientes,
        flutuar,
        limparClientes() {
            for (const o of clientes.values()) pessoas.remove(o.grupo, o.pkGrupo);
            clientes.clear();
        },
    };
};

// Se o navegador não tiver WebGL, o jogo usa a vista 2D
// (testa uma vez só e libera o contexto de teste: cada contexto WebGL aberto conta no limite do navegador)
let suporteWebGL = null;
export const temWebGL = () => {
    if (suporteWebGL !== null) return suporteWebGL;
    try {
        const c = document.createElement("canvas");
        const gl = c.getContext("webgl2") || c.getContext("webgl");
        suporteWebGL = !!gl;
        gl?.getExtension("WEBGL_lose_context")?.loseContext();
    } catch (e) {
        suporteWebGL = false;
    }
    return suporteWebGL;
};
