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

O progresso fica salvo no próprio navegador (localStorage).

## 🗂️ Estrutura

- `index.html`: página do jogo
- `css/style.css`: estilos (cartas, pacotes e animações)
- `Js/pokemon-data.js`: dados dos 151 Pokémon da 1ª geração
- `Js/cards.js`: monta as 200 cartas da coleção
- `Js/state.js`: save, moedas, pacotes grátis, missões
- `Js/packs.js`: sorteio das cartas dos pacotes
- `Js/trades.js`: ofertas dos bots
- `Js/ui.js` e `Js/main.js`: telas e interações

O deploy no GitHub Pages é feito pelo workflow `.github/workflows/pages.yml` a cada push na `main`.

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
