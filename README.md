## 🎮 Pokédex Pocket

Um jogo de colecionar cartas Pokémon no navegador, inspirado no **Pokémon TCG Pocket**, que nasceu da minha primeira Pokédex em JavaScript.

👉 Jogue em: https://lucasbrandaocabral.github.io/Pokedex/

## 🃏 Como funciona

- **Pacotes**: escolha entre os pacotes *Charizard*, *Mewtwo* e *Pikachu* da coleção **Origem Genética**, deslize para cortar e revele as 5 cartas uma a uma. Também dá para abrir 10 ou 25 de uma vez.
- **Raridades**: ◆ Comum, ◆◆ Incomum, ◆◆◆ Rara, ◆◆◆◆ ex, ☆ Arte Rara, ☆☆ Super Rara, ☆☆☆ Arte Imersiva e ♛ Coroa. Existe até o raríssimo **God Pack**!
- **Álbum**: 200 cartas para colecionar, com filtros, efeito holográfico 3D e silhuetas das que faltam.
- **Pacotes grátis**: 5 por dia, 1 a cada 4h48, acumulando até 5.
- **Moedas**: venda cartas repetidas, resgate o bônus diário, complete missões e conquistas.
- **Loja**: compre pacotes com moedas do jogo: avulso, kits de 5 e 10 ou a **caixa com 25 pacotes**.
- **Trocas com bots**: a cada 2 minutos chegam ofertas novas: trocas 1 por 1, 3 repetidas por uma carta melhor, bots que compram suas repetidas e bots que vendem cartas.
- **Pontos de pacote**: cada pacote dá 5 pontos ✨ para pegar qualquer carta do álbum.
- **Pokédex**: a busca original por nome ou número, com evoluções, status e favoritos.

- **Conta com login**: crie uma conta com usuário e senha para salvar o progresso na nuvem e jogar em qualquer aparelho. A autenticação de 2 fatores por app autenticador (Google Authenticator, Microsoft Authenticator ou Authy) é obrigatória e vem com 8 códigos de recuperação.

- **Perfil de treinador**: apelido, avatar (qualquer um dos 151 Pokémon), bio e uma vitrine com até 3 cartas favoritas. Dá para trocar a senha pela tela de perfil.
- **Amigos**: adicione outros jogadores pelo nome de usuário e aceite ou recuse pedidos de amizade.
- **Trocas entre amigos**: escolha cartas suas e cartas do álbum do amigo, mande uma mensagem e espere a resposta. As cartas oferecidas ficam reservadas até a resposta e voltam se a troca for recusada, cancelada ou expirar (7 dias).

Sem conta, o progresso fica salvo no próprio navegador (localStorage). Ao criar uma conta, esse progresso vai junto para a nuvem.

## 🗂️ Estrutura

- `index.html`: página do jogo
- `css/style.css`: estilos (cartas, pacotes e animações)
- `Js/pokemon-data.js`: dados dos 151 Pokémon da 1ª geração
- `Js/cards.js`: monta as 200 cartas da coleção
- `Js/state.js`: save, moedas, pacotes grátis, missões
- `Js/packs.js`: sorteio das cartas dos pacotes
- `Js/trades.js`: ofertas dos bots
- `Js/conta.js`: telas de login e sincronização com a nuvem
- `Js/social.js`: perfil, amigos e trocas entre jogadores
- `Js/ui.js` e `Js/main.js`: telas e interações

- `api/`: servidor (Vercel Functions) com cadastro, login, 2FA, save na nuvem (`save.js`) e perfil, amigos e trocas (`social.js`)
- `scripts/dev.mjs`: servidor local que imita a Vercel; `scripts/*.test.mjs`: testes do login, dos amigos e das trocas

## ☁️ Publicando na Vercel (com login)

O login precisa de um servidor e de um banco de dados, então o jogo completo roda na Vercel. No GitHub Pages ele continua funcionando, só que sem o botão de conta.

1. Em [vercel.com](https://vercel.com), clique em **Add New → Project** e importe este repositório (Framework Preset: **Other**, sem build).
2. No projeto, abra **Storage → Create Database → Neon (Postgres)** e conecte ao projeto. A variável `DATABASE_URL` é criada sozinha.
3. Em **Settings → Environment Variables**, crie `SESSION_SECRET` com um texto aleatório de pelo menos 32 caracteres. Para gerar um:
   `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
4. Faça um novo deploy (**Deployments → Redeploy**). As tabelas do banco são criadas automaticamente no primeiro acesso.

### Segurança do login

- Senhas guardadas com hash `scrypt` e sal aleatório, nunca em texto puro
- 2FA obrigatório com códigos TOTP de 6 dígitos; cada código só pode ser usado uma vez
- Segredo do 2FA criptografado no banco (AES-256-GCM)
- 8 códigos de recuperação de uso único, guardados só como hash
- Conta bloqueada por 15 minutos depois de 5 erros seguidos
- Sessão em cookie `HttpOnly`, `Secure` e `SameSite=Lax`, válida por 30 dias
- Se o mesmo jogador usar dois aparelhos, o progresso mais novo nunca é sobrescrito por um aparelho desatualizado
- Nas trocas, o servidor confere as cartas dos dois lados e cada troca só pode ser aceita uma vez, então não dá para duplicar cartas

### Rodando no computador

1. Instale o Node.js 20+ e o PostgreSQL
2. `npm install`
3. Copie `.env.example` para `.env.local` e preencha `DATABASE_URL` e `SESSION_SECRET`
4. `npm run dev` e abra http://localhost:3000
5. Com o servidor ligado, `npm test` roda os testes do login

O workflow `.github/workflows/pages.yml` continua publicando a versão sem login no GitHub Pages a cada push na `main`.

## 🚀 Minha Jornada no Mundo do Desenvolvimento Web
Olá! Este é meu primeiro projeto utilizando JavaScript e consumindo uma API externa. Foi um desafio proposto por um programador que conheço no Discord, o Yan Dias. A partir desse desafio, desenvolvi uma Pokédex funcional que permite buscar informações sobre diferentes Pokémon.

## 📱 Sobre o Projeto original
- A primeira versão da Pokedex permitia:
- Buscar Pokémon por nome ou ID
- Visualizar imagens e tipos de cada Pokémon
- Ver a cadeia de evolução completa
- Favoritar seus Pokémon preferidos
- Acessar uma página de favoritos

## 🔧 Tecnologias Utilizadas
- HTML5: Estruturação da página
- CSS3: Estilização e design responsivo
- JavaScript: Lógica de programação e interatividade
- PokeAPI: API pública que fornece todos os dados e imagens dos Pokémon

## 💡 O Que Aprendi
Este projeto representou meu primeiro contato real com JavaScript e consumo de APIs. Durante o desenvolvimento, aprendi:
- Como fazer requisições assíncronas com fetch e async/await
- Manipulação do DOM para atualizar a interface dinamicamente
- Tratamento de erros em requisições de API
- Armazenamento local com localStorage para salvar favoritos
- Criação de interfaces interativas com eventos JavaScript

## 🎯 Desafios Superados
Como iniciante em JavaScript, enfrentei diversos desafios:
- Entender o funcionamento assíncrono das requisições
- Manipular os dados retornados pela API
- Implementar a lógica de exibição das evoluções
- Tratar erros quando um Pokémon não é encontrado
- Criar um sistema de favoritos persistente

## 🙏 Agradecimentos

Agradeço ao Everton Dev pelo vídeo que me ajudou a entender e implementar o uso do LocalStorage e ao Artigo Tech pelo conteúdo sobre a PokeAPI.
