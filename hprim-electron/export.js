// ============================================================================
// Export CSV : relit les résultats depuis le DOM et délègue l'écriture du
// fichier au processus principal (export-excel). Script classique : globales.
// ============================================================================

async function exportToCSV() {
    const resultsData = extractResultsData();
    if (!resultsData || resultsData.length === 0) {
        const noDataMsg = window.i18n ? window.i18n.t('messages.no_export_data') : 'Aucun résultat à exporter';
        alert(noDataMsg);
        return;
    }

    try {
        const patientNameElement = document.querySelector('.patient-name');
        const patientName = patientNameElement ? patientNameElement.textContent.trim() : 'Patient';

        const result = await window.electronAPI.exportToExcel(resultsData, patientName);

        if (result.success) {
            const successMsg = window.i18n ? window.i18n.t('messages.export_success') : 'Export réussi !';
            alert(`${successMsg}\nFichier: ${result.path}`);
        } else if (!result.cancelled) {
            const errorMsg = window.i18n ? window.i18n.t('messages.export_error') : 'Erreur lors de l\'export';
            alert(`${errorMsg}: ${result.error}`);
        }
    } catch (error) {
        const errorMsg = window.i18n ? window.i18n.t('messages.export_error') : 'Erreur lors de l\'export';
        alert(`${errorMsg}: ${error.message}`);
    }
}

function extractResultsData() {
    const results = [];
    const resultItems = document.querySelectorAll('.result-item');

    resultItems.forEach(item => {
        // Ignorer les blocs de texte libre (interprétation, conclusion…)
        if (item.classList.contains('text-result')) return;

        const name = item.querySelector('.result-name')?.textContent?.trim() || '';
        const valueElement = item.querySelector('.result-number');
        const value1 = valueElement?.textContent?.trim() || '';
        const unit1 = item.querySelector('.result-unit')?.textContent?.trim() || '';

        // Normes lues depuis les data-* (fiable), repli sur le texte des normes
        let min1 = item.dataset.min !== undefined ? parseFloat(item.dataset.min) : null;
        let max1 = item.dataset.max !== undefined ? parseFloat(item.dataset.max) : null;
        if (min1 === null && max1 === null) {
            const normsElement = item.querySelector('.result-norms');
            if (normsElement) {
                const match = normsElement.textContent.trim().match(/\(([^)]+)\)/);
                if (match) {
                    const rangeMatch = match[1].match(/([\d.,]+)\s*-\s*([\d.,]+)/);
                    if (rangeMatch) {
                        min1 = parseFloat(rangeMatch[1].replace(',', '.'));
                        max1 = parseFloat(rangeMatch[2].replace(',', '.'));
                    }
                }
            }
        }

        // Anormal : statut explicite H/L (classes is-high / is-low)
        const isAbnormal = item.classList.contains('is-high') || item.classList.contains('is-low');

        if (name) {
            results.push({
                name,
                value1,
                unit1,
                min1,
                max1,
                isAbnormal
            });
        }
    });

    return results;
}
