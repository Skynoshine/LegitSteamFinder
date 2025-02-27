const API_KEY = "...";
const API_URL = "https://api.rawg.io/api/games";

export async function getPopularity(id) {
    try {
        const searchResponse = await fetch(`${API_URL}?key=${API_KEY}&search=${encodeURIComponent(id)}`);
        const searchData = await searchResponse.json();

        if (!searchData.results || searchData.results.length === 0) {
            console.warn("⚠️ Jogo não encontrado:", id);
            return { error: "Jogo não encontrado." };
        }

        const gameId = searchData.results[0].id; 

        const detailsResponse = await fetch(`${API_URL}/${gameId}?key=${API_KEY}`);
        const data = await detailsResponse.json();

        const result = {
            popularity: data.rating || data.rating_top,
            metacritic: data.metacritic,
            released: data.released,
            updated: data.updated
        };

        console.log("📜 Detalhes do Jogo:", result);
        return result;
    } catch (error) {
        console.error("❌ Erro ao buscar popularidade:", error);
        return { error: "Erro na API." };
    }
}
