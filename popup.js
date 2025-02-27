document.getElementById("searchButton").addEventListener("click", function () {
    let query = document.getElementById("search").value;
    if (query) {
        let steamSearchUrl = `steam://openurl/https://store.steampowered.com/search/?term=${encodeURIComponent(query)}`;
        chrome.tabs.create({ url: steamSearchUrl });
    }
});

// Carregar lista negra ao abrir o popup
document.addEventListener("DOMContentLoaded", function () {
    loadBlacklist();
});

function loadBlacklist() {
    chrome.storage.sync.get(["blacklist"], (data) => {
        const blacklist = data.blacklist || [];
        const listElement = document.getElementById("blacklist");
        listElement.innerHTML = ""; // Limpa a lista antes de carregar

        blacklist.forEach((word, index) => {
            const listItem = document.createElement("li");

            const textSpan = document.createElement("span");
            textSpan.className = "blacklist-item";
            textSpan.textContent = word;
            textSpan.contentEditable = true; 
            textSpan.addEventListener("focus", function () {
                textSpan.style.backgroundColor = "rgba(255, 255, 255, 0.2)"; // Efeito ao clicar para editar
            });
            textSpan.addEventListener("blur", function () {
                textSpan.style.backgroundColor = "transparent"; 
                editBlacklist(index, textSpan.textContent);
            });

            const removeButton = document.createElement("button");
            removeButton.className = "remove-btn";
            removeButton.textContent = "X";
            removeButton.addEventListener("click", function () {
                removeFromBlacklist(index);
            });

            listItem.appendChild(textSpan);
            listItem.appendChild(removeButton);
            listElement.appendChild(listItem);
        });
    });
}

// Função para remover uma palavra da blacklist
function removeFromBlacklist(index) {
    chrome.storage.sync.get(["blacklist"], (data) => {
        let blacklist = data.blacklist || [];
        blacklist.splice(index, 1); // Remove pelo índice

        chrome.storage.sync.set({ "blacklist": blacklist }, () => {
            console.log("🚫 Palavra removida da lista negra:", blacklist);
            loadBlacklist();
        });
    });
}

// Função para editar uma palavra da blacklist
function editBlacklist(index, newWord) {
    chrome.storage.sync.get(["blacklist"], (data) => {
        let blacklist = data.blacklist || [];
        blacklist[index] = newWord.trim();

        chrome.storage.sync.set({ "blacklist": blacklist }, () => {
            console.log("✏️ Palavra editada na lista negra:", blacklist);
            loadBlacklist();
        });
    });
}
