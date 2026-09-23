// ====================================================
// Servidor local para testar o jogo com o login (imita a Vercel)
// Uso: crie um arquivo .env.local e rode `npm run dev`
// ====================================================
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORTA = Number(process.env.PORT) || 3000;

// Carrega variáveis do .env.local (formato CHAVE=valor)
for (const arquivo of [".env.local", ".env"]) {
    const caminho = path.join(RAIZ, arquivo);
    if (!fs.existsSync(caminho)) continue;
    for (const linha of fs.readFileSync(caminho, "utf8").split("\n")) {
        const m = linha.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
        if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
}

const TIPOS = {
    ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
    ".png": "image/png", ".json": "application/json", ".svg": "image/svg+xml", ".webmanifest": "application/manifest+json",
};

// Mesmos cabeçalhos de segurança do vercel.json
const CABECALHOS = JSON.parse(fs.readFileSync(path.join(RAIZ, "vercel.json"), "utf8")).headers[0].headers;

http.createServer(async (req, res) => {
    for (const { key, value } of CABECALHOS) res.setHeader(key, value);
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (url.pathname.startsWith("/api/")) {
        const arquivo = path.join(RAIZ, `${url.pathname.replace(/\/$/, "")}.js`);
        if (!arquivo.startsWith(path.join(RAIZ, "api")) || path.basename(arquivo).startsWith("_") || !fs.existsSync(arquivo)) {
            res.statusCode = 404;
            return res.end(JSON.stringify({ erro: "Rota não encontrada." }));
        }
        const { default: handler } = await import(pathToFileURL(arquivo).href);
        return handler(req, res);
    }
    let arquivo = path.join(RAIZ, decodeURIComponent(url.pathname));
    if (!arquivo.startsWith(RAIZ) || arquivo.includes(`${path.sep}.`) || arquivo.includes("node_modules")) {
        res.statusCode = 403;
        return res.end();
    }
    if (fs.existsSync(arquivo) && fs.statSync(arquivo).isDirectory()) arquivo = path.join(arquivo, "index.html");
    if (!fs.existsSync(arquivo)) {
        res.statusCode = 404;
        return res.end("Não encontrado");
    }
    res.setHeader("Content-Type", TIPOS[path.extname(arquivo)] || "application/octet-stream");
    fs.createReadStream(arquivo).pipe(res);
}).listen(PORTA, () => console.log(`Pokédex Pocket rodando em http://localhost:${PORTA}`));
