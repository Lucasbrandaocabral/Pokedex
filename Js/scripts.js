document.addEventListener("DOMContentLoaded", () => {
const pokedex = document.getElementById("pokedex");
const campoDePesquisa = document.getElementById("campo__de__pesquisa");
const inputPesquisa = document.getElementById("input__pesquisa");
const botaoBuscar = document.getElementById("brn__buscar");
const botaoFavoritos = document.getElementById("brn__favoritos");

const pokemons = document.getElementById("pokemons");
const qualPokemon = document.getElementById("qual__pokemon");
const botaoestrela = document.getElementById("brn__estrela");
const pokemonInfos = document.getElementById("pokemon__infos");
const nomePokemon = document.getElementById("nome__pokemon");
const pokemonImg = document.getElementById("pokemon__img");
const tipoPokemon = document.getElementById("tipo__do__pokemon");

const deuRuim = document.getElementById("deu__ruim");

const evolucoes = document.getElementById("evolucaos");
const todasAsEvolucoes = document.getElementById("todas__as__evolocoes");
const pokemonKid = document.getElementById("pokemon__kid");
const pokemonRaro = document.getElementById("pokemon__raro");
const pokemonVeio = document.getElementById("pokemon__veio");

const listaFavoritos = document.getElementById("lista__favoritos");

// ====================================================
// Carrega os favoritos salvos no navegador
// ====================================================
let favoritos = JSON.parse(localStorage.getItem("favoritos")) || [];

// ====================================================
// Função para buscar um Pokémon da API
// ====================================================
const fetchPokemin = async (identificadorPokemon) => {
    exibirPokemon();
    try {
        const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${identificadorPokemon}`);
        if (!response.ok) throw new Error();

        const pokemon = await response.json();
        preencherPokemonInfo(pokemon);
        await buscarEvolucoes(pokemon);
        if (deuRuim) deuRuim.classList.add('hidden');
        if (pokemonInfos) pokemonInfos.classList.remove('hidden');
    } catch (error) {
        exibirErro();
    }
};

// ====================================================
// Preenche os dados do Pokémon na tela
// ====================================================
const preencherPokemonInfo = (pokemon) => {
    if (nomePokemon) nomePokemon.textContent = pokemon.name;
    if (tipoPokemon) tipoPokemon.textContent = pokemon.types.map(t => t.type.name).join(", ");
    if (pokemonImg) pokemonImg.src = pokemon.sprites.front_default;
    atualizarEstrela(pokemon.name);
};

// ====================================================
// Atualiza a estrela (favoritado ou não)
// ====================================================
const atualizarEstrela = (pokemonId) => {
    if (!botaoestrela) return;
    if (favoritos.includes(pokemonId)) {
        botaoestrela.classList.remove("nao_favorito");
        botaoestrela.classList.add("favorito");
    } else {
        botaoestrela.classList.remove("favorito");
        botaoestrela.classList.add("nao_favorito");
    }
};

// ====================================================
// Evento de clique na estrela
// ====================================================
if (botaoestrela) {
    botaoestrela.addEventListener("click", () => {
        const pokemonId = nomePokemon?.textContent;
        if (!pokemonId) return;

        if (favoritos.includes(pokemonId)) {
            favoritos = favoritos.filter(p => p !== pokemonId);
        } else {
            favoritos.push(pokemonId);
        }

        localStorage.setItem("favoritos", JSON.stringify(favoritos));
        atualizarEstrela(pokemonId);
    });
}

// ====================================================
// Função para exibir informações do Pokémon
// ====================================================
const exibirPokemon = () => {
    if (qualPokemon) qualPokemon.classList.add("hidden");
    if (pokemonInfos) pokemonInfos.classList.remove("hidden");
    if (deuRuim) deuRuim.classList.add("hidden");
    if (evolucoes) evolucoes.classList.remove("hidden");
    if (pokemonKid) pokemonKid.classList.remove("hidden");
    if (pokemonRaro) pokemonRaro.classList.remove("hidden");
    if (pokemonVeio) pokemonVeio.classList.remove("hidden");
};

// ====================================================
// Função para mostrar mensagem de erro
// ====================================================
const exibirErro = () => {
    if (nomePokemon) nomePokemon.textContent = '';
    if (tipoPokemon) tipoPokemon.textContent = '';
    if (pokemonImg) pokemonImg.src = '';
    if (qualPokemon) qualPokemon.classList.add('hidden');
    if (pokemonInfos) pokemonInfos.classList.add('hidden');
    if (evolucoes) evolucoes.classList.add('hidden');
    if (deuRuim) deuRuim.classList.remove('hidden');
};

// ====================================================
// Função para buscar e mostrar evoluções
// ====================================================
const buscarEvolucoes = async (pokemon) => {
    try {
        const especieResponse = await fetch(pokemon.species.url);
        const especieData = await especieResponse.json();

        const evolucaoResponse = await fetch(especieData.evolution_chain.url);
        const evolucaoData = await evolucaoResponse.json();

        const cadeia = [];
        let atual = evolucaoData.chain;

        while (atual) {
            cadeia.push(atual.species.name);
            atual = atual.evolves_to[0];
        }

        const imagensPromises = cadeia.map(nome => fetch(`https://pokeapi.co/api/v2/pokemon/${nome}`).then(res => res.json()));
        const dados = await Promise.all(imagensPromises);

        [pokemonKid, pokemonRaro, pokemonVeio].forEach((el, idx) => {
            if (!el) return;
            if (dados[idx]) {
                el.src = dados[idx].sprites.front_default;
                el.classList.remove("hidden");
            } else {
                el.classList.add("hidden");
            }
        });

    } catch (error) {
        console.error("Erro ao buscar evoluções", error);
    }
};

// ====================================================
// Eventos do campo de pesquisa
// ====================================================
if (botaoBuscar && inputPesquisa) {
    botaoBuscar.addEventListener('click', () => {
        const query = inputPesquisa.value.trim().toLowerCase();
        if (query) {
            fetchPokemin(query);
        }
    });

    inputPesquisa.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            botaoBuscar.click();
        }
    });
}

// ====================================================
// Exibe os favoritos na favoritos.html
// ====================================================
if (window.location.pathname.includes("favoritos.html")) {
    const favoritosSalvos = JSON.parse(localStorage.getItem("favoritos")) || [];

    favoritosSalvos.forEach(async (nome) => {
        try {
            const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${nome}`);
            const pokemon = await res.json();

            const div = document.createElement("div");
            div.className = "pokemon__card";
            div.innerHTML = `
                <h2>${pokemon.name}</h2>
                <img src="${pokemon.sprites.front_default}" alt="${pokemon.name}">
                <p>${pokemon.types.map(t => t.type.name).join(", ")}</p>
            `;
            if (listaFavoritos) listaFavoritos.appendChild(div);
        } catch (e) {
            console.error("Erro ao carregar favorito:", nome);
        }
    });
}

// ====================================================
// Inicializa a tela escondendo seções
// ====================================================
if (qualPokemon) qualPokemon.classList.remove("hidden");
if (pokemonInfos) pokemonInfos.classList.add("hidden");
if (deuRuim) deuRuim.classList.add("hidden");
if (evolucoes) evolucoes.classList.add("hidden");

console.log("Favoritos atualizados:", favoritos);
});