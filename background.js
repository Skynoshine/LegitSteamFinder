import { getPopularity } from "./api/rawg_api.js";

const removeWords = [
    "Free Download", "Full Version", "Latest Version", "Cracked", "PC Game",
    "Torrent", "Updated", "ISO", "Setup", "Patch", "SteamGG.NET", "AtopGames", "Hotfix ", "Elamigos ", "FitGirl", "Deluxe Edition", "update"
];

let blacklist = [];
chrome.storage.sync.get(["blacklist"], (data) => {
    if (data.blacklist) {
        blacklist = data.blacklist;
        console.log("📢 Lista negra carregada:", blacklist);
    }
});

function addToBlacklist(word) {
    const wordLower = word.toLowerCase();
    if (!blacklist.includes(wordLower)) {
        blacklist.push(wordLower);
        chrome.storage.sync.set({ "blacklist": blacklist }, () => {
            console.log(`✅ "${word}" foi adicionado à lista negra.`);
        });
    }
}

chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({ id: "searchSteamElement", title: "🔍 Pesquisar na Steam", contexts: ["selection", "image", "link", "page"] });
    chrome.contextMenus.create({ id: "viewPopularity", title: "⭐ Ver popularidade", contexts: ["selection"] });
    chrome.contextMenus.create({ id: "addToBlacklist", title: "🚫 Adicionar à Lista Negra", contexts: ["selection"] });
    chrome.contextMenus.create({ id: "viewTrailer", title: "📺 Ver Trailer", contexts: ["selection"] });
});

function cleanGameTitle(title) {
    if (!title) return "Jogo Desconhecido";
    const allBlacklistedWords = [...removeWords, ...blacklist];
    for (const word of allBlacklistedWords) {
        const regex = new RegExp(`\\b${word}\\b`, "gi");
        if (title.match(regex)) {
            title = title.split(word)[0].trim();
            break;
        }
    }
    return title || "Jogo Desconhecido";
}

function findTrailer(info, tab) {
    if (!tab || !tab.id || !chrome.scripting) return;
    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        args: [info],
        func: (info) => info.selectionText || ''
    }).then(result => {
        if (result?.[0]?.result) {
            let query = cleanGameTitle(result[0].result);
            let trailerUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}+trailer`;
            chrome.tabs.create({ url: trailerUrl });
        }
    });
}

function getElementText(info, tab) {
    if (!tab || !tab.id || !chrome.scripting) return;

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
                    let postContainer = el.closest("li.post-item, div.post-details, div.relative.group");
                    if (postContainer) {
                        let titleEl = postContainer.querySelector("a[aria-label]:not(.post-cat), a[title]");
                        if (titleEl) text = titleEl.getAttribute("aria-label") || titleEl.getAttribute("title");

                        if (!text.trim()) {
                            let titleTag = postContainer.querySelector(".post-title a, h3");
                            if (titleTag) text = titleTag.innerText || titleTag.textContent;
                        }
                    }

                    if (!text.trim()) {
                        let possibleText = el.querySelector("div[style*='font-size']") || el.querySelector(".vc_gitem-post-data-source-post_title") || el.closest("div");
                        if (possibleText) text = possibleText.innerText || possibleText.textContent;
                    }
                }
            }

            if (!text.trim()) {
                let mainTitle = document.querySelector("h1, h2, h3");
                if (mainTitle) text = mainTitle.innerText || mainTitle.textContent;
            }

            text = text.replace(/-/g, " ").trim();

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

chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "searchSteamElement") {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs.length > 0) getElementText(info, tabs[0]);
        });
    } else if (info.menuItemId === "addToBlacklist" && info.selectionText) {
        addToBlacklist(info.selectionText);
    } else if (info.menuItemId === "viewTrailer") {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs.length > 0) findTrailer(info, tabs[0]);
        });
    } else if (info.menuItemId === "viewPopularity") {
        if (info.selectionText) {
            let query = cleanGameTitle(info.selectionText);
            getPopularity(query).then(popularity => {
                chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    args: [popularity],
                    func: (popularity) => {
                        alert(`⭐ Nota média (RAWG): ${popularity.popularity}\n👾 Nota Metacritics: ${popularity.metacritic}\n 📅 Lançado em: ${popularity.released}\n 📑Atualizado em: ${popularity.updated}   
                            `);
                    }
                });
            });
        }
    }
});
