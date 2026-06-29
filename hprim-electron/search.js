// ============================================================================
// Recherche légère dans les résultats affichés.
// Surlignage sûr via TreeWalker (pas d'innerHTML -> pas de réinjection HTML).
// Script classique : fonctions globales, appelées par la délégation data-action.
// ============================================================================

function toggleSearch() {
    const searchContainer = document.getElementById('searchContainer');
    if (searchContainer) {
        // Avant de fermer, réinitialiser l'affichage
        resetSearchDisplay();
        searchContainer.remove();
        return;
    }

    // Créer la barre de recherche
    const placeholder = window.i18n ? window.i18n.t('search.placeholder') : 'Rechercher dans les résultats...';
    const clearText = window.i18n ? window.i18n.t('search.clear') : 'Effacer';
    const closeText = window.i18n ? window.i18n.t('buttons.close') : 'Fermer';
    const searchHTML = `
        <div id="searchContainer" class="search-bar">
            <div class="search-row">
                <input type="text" id="searchInput" class="search-input" placeholder="${placeholder}">
                <button class="btn" data-action="clear-search">${clearText}</button>
                <button class="btn" data-action="toggle-search">${closeText}</button>
            </div>
            <div id="searchStats" class="search-stats" style="display: none;"></div>
        </div>
    `;

    // Insérer après l'en-tête
    const header = document.querySelector('header');
    header.insertAdjacentHTML('afterend', searchHTML);

    // Écouteurs de l'input (CSP : pas de oninput/onkeyup inline)
    const input = document.getElementById('searchInput');
    input.addEventListener('input', (e) => performSearch(e.target.value));
    input.addEventListener('keyup', handleSearchKeyup);
    input.focus();
}

function performSearch(query) {
    const results = document.querySelectorAll('.result-item');
    const searchStats = document.getElementById('searchStats');

    if (!query.trim()) {
        // Afficher tous les résultats
        results.forEach(result => {
            result.style.display = '';
            // Supprimer le highlighting
            removeHighlighting(result);
        });
        searchStats.style.display = 'none';
        return;
    }

    let visibleCount = 0;
    const queryLower = query.toLowerCase();

    results.forEach(result => {
        const text = result.textContent.toLowerCase();
        const isMatch = text.includes(queryLower);

        if (isMatch) {
            result.style.display = '';
            visibleCount++;

            // Highlighter les termes trouvés
            highlightText(result, query);
        } else {
            result.style.display = 'none';
            // Supprimer le highlighting des éléments cachés aussi
            removeHighlighting(result);
        }
    });

    // Afficher les statistiques
    const statsText = window.i18n ?
        window.i18n.t('search.results', {count: visibleCount, total: results.length}) :
        `${visibleCount} résultat(s) trouvé(s) sur ${results.length}`;
    searchStats.textContent = statsText;
    searchStats.style.display = 'block';
}

function highlightText(element, query) {
    // Supprimer ancien highlighting
    removeHighlighting(element);

    // Nouveau highlighting sécurisé qui préserve la structure HTML
    highlightTextNodes(element, query);
}

function removeHighlighting(element) {
    const marks = element.querySelectorAll('mark[data-search-highlight]');
    marks.forEach(mark => {
        const parent = mark.parentNode;
        parent.replaceChild(document.createTextNode(mark.textContent), mark);
        parent.normalize(); // Fusionner les nœuds texte adjacents
    });
}

function highlightTextNodes(element, query) {
    const regex = new RegExp(`(${escapeRegExp(query)})`, 'gi');
    const walker = document.createTreeWalker(
        element,
        NodeFilter.SHOW_TEXT,
        null,
        false
    );

    const textNodes = [];
    let node;
    while (node = walker.nextNode()) {
        if (regex.test(node.textContent)) {
            textNodes.push(node);
        }
    }

    // Traiter les nœuds texte en sens inverse pour éviter les problèmes d'index
    textNodes.reverse().forEach(textNode => {
        const text = textNode.textContent;
        const parts = text.split(regex);

        if (parts.length > 1) {
            const fragment = document.createDocumentFragment();

            for (let i = 0; i < parts.length; i++) {
                if (i % 2 === 0) {
                    // Texte normal
                    if (parts[i]) {
                        fragment.appendChild(document.createTextNode(parts[i]));
                    }
                } else {
                    // Texte à surligner
                    const mark = document.createElement('mark');
                    mark.setAttribute('data-search-highlight', 'true');
                    mark.style.background = '#ffeb3b';
                    mark.style.padding = '1px 2px';
                    mark.style.borderRadius = '2px';
                    mark.textContent = parts[i];
                    fragment.appendChild(mark);
                }
            }

            textNode.parentNode.replaceChild(fragment, textNode);
        }
    });
}

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function clearSearch() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.value = '';
        performSearch('');
    }
}

function resetSearchDisplay() {
    const results = document.querySelectorAll('.result-item');

    // Afficher tous les résultats
    results.forEach(result => {
        result.style.display = '';
        // Supprimer tous les highlighting
        removeHighlighting(result);
    });

    Logger.debug('Affichage des résultats réinitialisé - tous les résultats visibles');
}

function handleSearchKeyup(event) {
    if (event.key === 'Escape') {
        toggleSearch();
    }
}
