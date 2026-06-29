// ============================================================================
// Rendu des résultats : construit le DOM à partir des données parsées
// (parser.js). Carte patient, bandeau de synthèse, lignes de résultats,
// colonne de position dans l'intervalle. Script classique : fonctions globales.
// ============================================================================

function parseAndDisplay(content) {
    Logger.debug('parseAndDisplay called with content length:', content.length);

    // Effacer immédiatement le message de chargement et réinitialiser le curseur
    results.innerHTML = '';
    document.body.style.cursor = 'default';

    // Réinitialiser l'état d'ouverture de fichier
    isOpeningFile = false;

    // Stocker le contenu brut pour l'affichage éventuel
    currentFileContent = content;

    // Passer la zone de drag & drop en mode compact une fois qu'un fichier est ouvert
    dropZone.classList.add('compact');

    // Utiliser les traductions pour le mode compact
    if (window.i18n) {
        window.i18n.updateDropZone();
    } else {
        // Fallback si i18n n'est pas encore chargé
        const compactContent = `
            <h3 data-i18n="dropzone.compact_title">Glisser un autre fichier</h3>
            <button class="btn" data-action="open" data-i18n="buttons.select_file">Sélectionner un fichier</button>
        `;
        dropZone.innerHTML = compactContent;
    }

    // Extraire les informations patient
    const patientInfo = extractPatientInfo(content);
    Logger.debug('Patient info:', patientInfo);

    const parsed = parseHPRIM(content);
    Logger.debug('Parsed results:', parsed);

    let html = '';

    // Ajouter l'en-tête patient si disponible
    if (patientInfo.patientName || patientInfo.samplingDate) {
        html += generatePatientHeader(patientInfo);
    }

    // Bandeau de synthèse (valeurs élevées / basses / normales)
    html += generateSummaryBar(parsed);

    let rowsHtml = '';
    for (const result of parsed) {

        // Détecter si c'est un commentaire/conclusion/résultats textuels (texte libre)
        const isTextResult = result.name.toLowerCase().includes('commentaire') ||
                            result.name.toLowerCase().includes('conclusion') ||
                            result.name.toLowerCase().includes('interprétation') ||
                            result.name.toLowerCase().includes('observation') ||
                            result.name.toLowerCase().includes('résultats') ||
                            result.name.toLowerCase().includes('technique') ||
                            result.name.toLowerCase().includes('mise en garde') ||
                            (result.unit1 && result.unit1.length > 50) || // Texte long dans l'unité = probablement du texte libre
                            (result.value1 && result.value1.length > 50 && !result.value1.match(/^\d/)); // Valeur1 est un long texte (pas numérique)

        if (isTextResult) {
            // Affichage spécial pour les commentaires/conclusions sur toute la largeur.
            // On échappe chaque fragment de données du fichier, puis on assemble avec
            // notre propre balisage <br> (anti-XSS sans casser la mise en forme).
            let textContent = escapeHtml(result.unit1 || result.value1 || '');

            // Pour "Mise en garde", le contenu est dans value1, pas unit1
            if (result.name.toLowerCase().includes('mise en garde')) {
                textContent = escapeHtml(result.value1 || '');
                // Forcer le titre en majuscules sans le contenu
                result.name = 'MISE EN GARDE :';
            }

            // Inclure aussi les commentaires associés s'il y en a
            if (result.comments && result.comments.length > 0) {
                const additionalComments = result.comments
                    .filter(comment => comment.trim())
                    .map(escapeHtml)
                    .join('<br>• ');
                if (additionalComments) {
                    textContent += '<br>• ' + additionalComments;
                }
            }

            rowsHtml += `
                <div class="result-item text-result">
                    <div class="text-result-title">${svgIcon('message')}<span>${escapeHtml(result.name)}</span></div>
                    <div class="text-result-body">${textContent}</div>
                </div>
            `;
        } else {
            // Affichage normal pour les résultats avec valeurs numériques

            // État (statut explicite H/L OU comparaison numérique aux normes).
            // L'anomalie reste signalée par la valeur colorée + la ligne teintée + la barre.
            const status = getResultState(result);
            const stateClass = (status === 'high' || status === 'low') ? ` is-${status}` : '';

            // Valeur texte (qualitative, ex. "Diabète", "négatif") -> alignée à gauche
            const v1 = (result.value1 === null || result.value1 === undefined) ? '' : String(result.value1).trim();
            const qualClass = (v1 !== '' && !isFinite(parseFloat(v1.replace(',', '.')))) ? ' qualitative' : '';

            const formattedValue1 = formatValue(result.value1, result.operator1 || null, result.isHighlighted1 || false);
            const formattedNormes1 = formatNorms(result.min1, result.max1, result);

            let valuesColumn = `<div class="value-line">
                <span class="result-number">${formattedValue1}</span>
                <span class="result-unit">${escapeHtml(result.unit1)}</span>
            </div>`;

            if (result.hasMultipleUnits) {
                const formattedValue2 = formatValue(result.value2, result.operator2 || null, result.isHighlighted2 || false);
                valuesColumn += `<div class="value-line">
                    <span class="result-number">${formattedValue2}</span>
                    <span class="result-unit">${escapeHtml(result.unit2)}</span>
                </div>`;
            }

            // Colonne centrale : barre de position si intervalle numérique, sinon normes en texte
            const midColumn = buildRangeColumn(result.value1, result.min1, result.max1, result.unit1, status, formattedNormes1);

            // Commentaires associés
            let commentsHtml = '';
            if (result.comments && result.comments.length > 0) {
                const allComments = result.comments.filter(comment => comment.trim()).join(' ');
                if (allComments) {
                    commentsHtml += `<div class="result-comment">${escapeHtml(allComments)}</div>`;
                }
            }

            const loVal = parseFloat(result.min1);
            const hiVal = parseFloat(result.max1);
            const dataAttrs = `data-status="${escapeHtml(result.status || '')}"`
                + (isFinite(loVal) ? ` data-min="${loVal}"` : '')
                + (isFinite(hiVal) ? ` data-max="${hiVal}"` : '');

            rowsHtml += `
                <div class="result-item${stateClass}${qualClass}" ${dataAttrs}>
                    <div class="result-name">${escapeHtml(result.name)}</div>
                    <div class="result-mid">${midColumn}</div>
                    <div class="result-value-container">${valuesColumn}</div>
                    ${commentsHtml}
                </div>
            `;
        }
    }

    if (rowsHtml) {
        html += `<div class="results-card">${rowsHtml}</div>`;
    }

    const noResultsMsg = window.i18n ? window.i18n.t('messages.no_results') : 'Aucun résultat trouvé';
    results.innerHTML = html || `<p style="text-align:center;color:var(--text-3);padding:24px 0;">${noResultsMsg}</p>`;

    // Activer les boutons imprimer/export s'il y a des résultats
    const printBtn = document.getElementById('printBtn');
    const exportBtn = document.getElementById('exportBtn');

    if (html && html.trim() !== '') {
        if (printBtn) {
            printBtn.disabled = false;
            printBtn.style.opacity = '1';
        }
        if (exportBtn) {
            exportBtn.disabled = false;
            exportBtn.style.opacity = '1';
        }
        Logger.debug('✅ Boutons export activés');
    } else {
        if (printBtn) {
            printBtn.disabled = true;
            printBtn.style.opacity = '0.5';
        }
        if (exportBtn) {
            exportBtn.disabled = true;
            exportBtn.style.opacity = '0.5';
        }
        Logger.debug('❌ Boutons export désactivés (aucun résultat)');
    }

    // Ajouter le bouton "Voir fichier brut" en bas de la page si un fichier est chargé
    if (currentFileContent) {
        const viewRawText = window.i18n ? window.i18n.t('buttons.view_raw') : 'Voir fichier brut';
        const rawButton = `
            <div class="raw-footer">
                <button class="btn" data-action="view-raw">
                    ${svgIcon('file')}<span>${viewRawText}</span>
                </button>
            </div>
        `;
        results.innerHTML += rawButton;
    }
}

// ============================================================================
// HELPERS UI — barre de position, bandeau de synthèse, en-tête patient
// ============================================================================

// Icônes retirées : interface uniforme, texte uniquement. Conservé en no-op
// pour ne pas casser les points d'appel qui l'utilisaient.
function svgIcon() {
    return '';
}

// Construit la colonne centrale : barre de position si l'intervalle est numérique,
// sinon repli sur les normes affichées en texte.
function buildRangeColumn(value1, min1, max1, unit1, status, normsText) {
    const norms = `<div class="result-norms">${normsText || ''}</div>`;
    const v = parseFloat(String(value1).replace(',', '.'));
    const lo = parseFloat(min1);
    const hi = parseFloat(max1);

    // Barre uniquement si l'intervalle est numérique et borné des deux côtés.
    if (!(isFinite(v) && isFinite(lo) && isFinite(hi) && hi > lo)) return norms;

    // La bande verte (normes) occupe 18%..82% ; on place le marqueur en conséquence.
    const frac = (v - lo) / (hi - lo);
    let left = 18 + frac * 64;
    if (left < 3) left = 3;
    if (left > 97) left = 97;
    const markerClass = status === 'high' ? ' is-high' : (status === 'low' ? ' is-low' : '');
    const unitLabel = unit1 ? ` ${escapeHtml(unit1)}` : '';

    return `
        <div class="result-range">
            <div class="range-track">
                <div class="range-band"></div>
                <div class="range-marker${markerClass}" style="left: ${left}%"></div>
            </div>
            <div class="range-scale"><span>${lo}</span><span>${hi}${unitLabel}</span></div>
        </div>
        ${norms}
    `;
}


// Compte les valeurs élevées / basses / normales et construit le bandeau de synthèse.
function generateSummaryBar(parsed) {
    let high = 0, low = 0, normal = 0;
    for (const r of parsed) {
        const state = getResultState(r);
        if (state === 'high') high++;
        else if (state === 'low') low++;
        else if (state === 'normal') normal++;
    }
    if (high + low + normal === 0) return '';

    const lang = window.i18n ? window.i18n.getCurrentLanguage() : 'fr';
    const label = (n, kind, fallback) => {
        let base = window.i18n ? window.i18n.t('summary.' + kind, {}, fallback) : fallback;
        if (lang === 'fr' && n > 1) base += 's';
        return base;
    };

    const chip = (kind, n, text) =>
        `<div class="summary-chip ${kind}"><span class="summary-num">${n}</span><span class="summary-label">${text}</span></div>`;

    let chips = '';
    if (high) chips += chip('high', high, label(high, 'high', 'élevée'));
    if (low) chips += chip('low', low, label(low, 'low', 'basse'));
    if (normal) chips += chip('ok', normal, label(normal, 'normal', 'normale'));
    return `<div class="summary-bar">${chips}</div>`;
}

function getPatientInitials(name) {
    if (!name) return '?';
    const words = name.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) return '?';
    if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
    return (words[0][0] + words[1][0]).toUpperCase();
}

function generatePatientHeader(patientInfo) {
    const name = patientInfo.patientName || '';
    const initials = getPatientInitials(name);

    // Sous-titre : âge + date de naissance
    const subParts = [];
    if (patientInfo.age !== null && patientInfo.age !== undefined) {
        const ageText = window.i18n ? window.i18n.t('patient.years_old') : 'ans';
        subParts.push(`${patientInfo.age} ${ageText}`);
    }
    if (patientInfo.birthDate) {
        const bornText = window.i18n ? window.i18n.t('patient.born') : 'Né(e) le';
        subParts.push(`${bornText} ${formatDate(patientInfo.birthDate)}`);
    }
    const subLine = subParts.join(' · ');

    // Ligne de méta : prescripteur, laboratoire, prélèvement
    const metaItems = [];
    if (patientInfo.doctorName) {
        const prescripteurDisplay = patientInfo.doctorName.toLowerCase().startsWith('dr')
            ? patientInfo.doctorName
            : `Dr ${patientInfo.doctorName}`;
        metaItems.push(`<span>${svgIcon('stethoscope')}${escapeHtml(prescripteurDisplay)}</span>`);
    }
    if (patientInfo.laboratoryName) {
        const labDisplay = patientInfo.laboratoryName.toLowerCase().includes('laboratoire')
            ? patientInfo.laboratoryName
            : `${window.i18n ? window.i18n.t('patient.laboratory') : 'Laboratoire'} : ${patientInfo.laboratoryName}`;
        metaItems.push(`<span>${svgIcon('flask')}${escapeHtml(labDisplay)}</span>`);
    }
    if (patientInfo.phone) {
        metaItems.push(`<span>Tél : ${escapeHtml(patientInfo.phone)}</span>`);
    }
    if (patientInfo.samplingDate) {
        const samplingText = window.i18n ? window.i18n.t('patient.sampling') : 'Prélèvement';
        let samplingLine = `${samplingText} ${formatDate(patientInfo.samplingDate)}`;
        if (patientInfo.samplingTime) {
            const atText = window.i18n ? window.i18n.t('patient.sampling_at') : 'à';
            samplingLine += ` ${atText} ${escapeHtml(patientInfo.samplingTime)}`;
        }
        metaItems.push(`<span>${svgIcon('calendar')}${samplingLine}</span>`);
    }

    let warning = '';
    if (patientInfo.confidence < 0.8) {
        const warningText = window.i18n ? window.i18n.t('messages.low_confidence') : 'Informations extraites avec confiance réduite';
        warning = `<div class="patient-warning">${svgIcon('alert')}${warningText}</div>`;
    }

    return `
        <div class="patient-card">
            <div class="patient-avatar" aria-hidden="true">${escapeHtml(initials)}</div>
            <div class="patient-info">
                <div class="patient-identity">
                    ${name ? `<span class="patient-name">${escapeHtml(name)}</span>` : ''}
                    ${subLine ? `<span class="patient-sub">${escapeHtml(subLine)}</span>` : ''}
                </div>
                ${metaItems.length ? `<div class="patient-meta">${metaItems.join('')}</div>` : ''}
                ${warning}
            </div>
        </div>
    `;
}

function formatDate(date) {
    if (!date) return '';
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}
