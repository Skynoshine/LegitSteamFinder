const removeWords = [
    "Free Download", "Full Version", "Latest Version", "Cracked", "PC Game",
    "Torrent", "Updated", "ISO", "Setup", "Patch", "SteamGG.NET", "AtopGames", "Hotfix ", "Elamigos ", "FitGirl", "Deluxe Edition", "update"
];

// Lista de palavras bloqueadas pelo usuário (carregadas do armazenamento)
let blacklist = [];
chrome.storage.sync.get(["blacklist"], (data) => {
    if (data.blacklist) {
        blacklist = data.blacklist;
        console.log("📢 Lista negra carregada:", blacklist);
    }
});

// Função para adicionar palavra à lista negra
function addToBlacklist(word) {
    const wordLower = word.toLowerCase();
    if (!blacklist.includes(wordLower)) {
        blacklist.push(wordLower);

        chrome.storage.sync.set({ "blacklist": blacklist }, () => {
            console.log(`✅ "${word}" foi adicionado à lista negra.`);
            console.log("📢 Lista negra atualizada:", blacklist);
        });
    } else {
        console.log(`⚠️ "${word}" já está na lista negra.`);
    }
}

// Criar opções no menu de contexto
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: "searchSteamElement",
        title: "Pesquisar na Steam",
        contexts: ["selection", "image", "link", "page"]
    });

    chrome.contextMenus.create({
        id: "addToBlacklist",
        title: "🚫 Adicionar à Lista Negra",
        contexts: ["selection"]
    });

    console.log("✅ Menus de contexto criados.");
});

// Função para limpar o nome do jogo baseado na blacklist
function cleanGameTitle(title) {
    if (!title) return "Jogo Desconhecido";

    const originalTitle = title;
    const allBlacklistedWords = [...removeWords, ...blacklist];

    for (const word of allBlacklistedWords) {
        const regex = new RegExp(`\\b${word}\\b`, "gi");
        if (title.match(regex)) {
            console.log(`⚠️ Palavra bloqueada encontrada: "${word}". Removendo todo o restante do título.`);
            title = title.split(word)[0].trim(); // Remove tudo após a palavra bloqueada
            break;
        }
    }

    console.log(`📝 Texto original: "${originalTitle}"`);
    console.log(`✂️ Texto após remover blacklist: "${title}"`);

    return title || "Jogo Desconhecido";
}

// Função para capturar o melhor nome do jogo no site
function getElementText(info, tab) {
    if (!tab || !tab.id || !chrome.scripting) {
        console.error("🚨 Erro: `chrome.scripting.executeScript` não disponível ou `tab.id` inválido.");
        return;
    }

    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        args: [info],
        func: (info) => {
            let text = "";

            if (info.selectionText) {
                text = info.selectionText;
            } else if (info.mediaType === "image") {
                let images = document.querySelectorAll("img");
                let el = Array.from(images).find(img => {
                    let absoluteSrc = img.src;
                    let relativeSrc = img.getAttribute("src");
                    return absoluteSrc === info.srcUrl || (relativeSrc && new URL(relativeSrc, document.baseURI).href === info.srcUrl);
                });

                if (el) {
                    text = el.getAttribute("alt") || el.title || el.getAttribute("aria-label") || el.getAttribute("data-title") || el.getAttribute("data-name") || "";

                    // Se não encontrou nada, procurar no elemento pai (figure, div, li, ou .relative.group)
                    if (!text.trim()) {
                        let parent = el.closest("figure, div, li, .relative.group");
                        if (parent) {
                            let titleEl = parent.querySelector(".post-title a, h1, h2, h3, a[title]");
                            if (titleEl) text = titleEl.innerText || titleEl.textContent;
                        }
                    }
                }
            } else {
                let el = document.activeElement;
                if (el) {
                    // Verifica se é um post que contém o título correto
                    let postContainer = el.closest("li.post-item, div.post-details, div.relative.group");
                    if (postContainer) {
                        let titleEl = postContainer.querySelector("a[aria-label]:not(.post-cat), a[title]");
                        if (titleEl) text = titleEl.getAttribute("aria-label") || titleEl.getAttribute("title");

                        if (!text.trim()) {
                            let titleTag = postContainer.querySelector(".post-title a, h3");
                            if (titleTag) text = titleTag.innerText || titleTag.textContent;
                        }
                    }

                    // Se não encontrou nada, buscar título na página inteira
                    if (!text.trim()) {
                        let possibleText = el.querySelector("div[style*='font-size']") || el.querySelector(".vc_gitem-post-data-source-post_title") || el.closest("div");
                        if (possibleText) text = possibleText.innerText || possibleText.textContent;
                    }
                }
            }

            // Tentar pegar o primeiro título na página
            if (!text.trim()) {
                let mainTitle = document.querySelector("h1, h2, h3");
                if (mainTitle) text = mainTitle.innerText || mainTitle.textContent;
            }

            text = text.replace(/-/g, " ").trim();

            // Evita pegar categorias como "Simulation" ao remover palavras comuns irrelevantes
            const categoryWords = ["Action", "Adventure", "Simulation", "Strategy", "RPG", "Multiplayer"];
            categoryWords.forEach(word => {
                if (text.includes(word) && text.split(" ").length <= 3) {
                    text = "Jogo Desconhecido";
                }
            });

            return text || "Jogo Desconhecido";
        }
    }).then(result => {
        if (result && result[0] && result[0].result) {
            let query = cleanGameTitle(result[0].result);
            console.log(`🔎 Pesquisando na Steam: "${query}"`);
            let steamSearchUrl = `steam://openurl/https://store.steampowered.com/search/?term=${encodeURIComponent(query)}`;
            chrome.tabs.create({ url: steamSearchUrl });
        }
    }).catch(error => {
        console.error("🚨 Erro ao executar script:", error);
    });
}

// Adicionar ação ao clicar no menu de contexto
chrome.contextMenus.onClicked.addListener((info, tab) => {
    // Opção de pesquisa na Steam
    if (info.menuItemId === "searchSteamElement") {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs.length === 0) {
                console.error("🚨 Nenhuma aba ativa encontrada.");
                return;
            }
            getElementText(info, tabs[0]); // Passa a aba ativa correta
        });
    }
    // Opção de adicionar à lista negra
    else if (info.menuItemId === "addToBlacklist") {
        if (info.selectionText) {
            addToBlacklist(info.selectionText);
        }
    }
});
