// ============================================================================
// SYSTÈME DE TRADUCTION - FRANÇAIS ET ANGLAIS SEULEMENT
// ============================================================================

const translations = {
    // Français (France) - Langue par défaut
    'fr': {
        name: 'Français',
        flag: '🇫🇷',
        app: {
            title: 'HPRIM Tool',
            subtitle: 'Analyseur de résultats biologiques',
            window_title: 'HPRIM Tool - Analyseur de résultats médicaux'
        },
        buttons: {
            open: 'Ouvrir',
            print: 'Imprimer',
            print_pdf: 'Imprimer/PDF',
            export: 'Export CSV',
            theme: 'Thème',
            quit: 'Quitter',
            select_file: 'Sélectionner un fichier',
            open_another: 'Ouvrir un autre',
            language: 'Langue',
            view_raw: 'Voir fichier brut',
            close: 'Fermer'
        },
        search: {
            button: 'Rechercher',
            placeholder: 'Rechercher dans les résultats...',
            clear: 'Effacer',
            results: '{count} résultat(s) trouvé(s) sur {total}'
        },
        dropzone: {
            title: 'Glissez votre fichier HPRIM ici',
            or: 'ou',
            formats: 'Formats acceptés: .hpr, .hpm, .hpm1, .hpm2, .hpm3, .hprim, .txt',
            size_limit: 'Taille maximum: 10 MB',
            compact_title: 'Glisser un autre fichier'
        },
        menu: {
            print: 'Imprimer',
            export_pdf: 'PDF',
            export_csv: 'CSV',
            export_excel: 'Excel'
        },
        messages: {
            loading: 'Chargement du fichier',
            no_results: 'Aucun résultat trouvé',
            welcome: 'Utilisez Cmd+O pour ouvrir un fichier ou glissez-déposez un fichier .hpr dans cette fenêtre.',
            no_file: 'Aucun fichier spécifié',
            no_export_data: 'Aucun résultat à exporter',
            pdf_success: 'PDF exporté avec succès !',
            pdf_error: 'Erreur lors de l\'export PDF',
            file_error: 'Erreur lors de la lecture du fichier',
            export_success: 'Export réussi !',
            export_error: 'Erreur lors de l\'export',
            low_confidence: 'Informations extraites avec confiance réduite'
        },
        file: {
            size: 'Taille',
            characters: 'caractères',
            lines: 'Lignes'
        },
        patient: {
            born: 'Né(e) le',
            years_old: 'ans',
            sampling: 'Prélèvement',
            sampling_at: 'à',
            doctor: 'Prescripteur',
            laboratory: 'Laboratoire'
        },
        tooltip: {
            theme_dark: 'Passer en mode sombre',
            theme_light: 'Passer en mode clair',
            drag_drop: 'Zone de dépôt de fichier HPRIM',
            select_dialog: 'Ouvrir la boîte de dialogue de sélection de fichier'
        }
    },

    // English
    'en': {
        name: 'English',
        flag: '🇺🇸',
        app: {
            title: 'HPRIM Tool',
            subtitle: 'Medical Results Analyzer',
            window_title: 'HPRIM Tool - Medical Results Analyzer'
        },
        buttons: {
            open: 'Open',
            print: 'Print',
            print_pdf: 'Print/PDF',
            export: 'Export CSV',
            theme: 'Theme',
            quit: 'Quit',
            select_file: 'Select a file',
            open_another: 'Open another',
            language: 'Language',
            view_raw: 'View raw file',
            close: 'Close'
        },
        search: {
            button: 'Search',
            placeholder: 'Search in results...',
            clear: 'Clear',
            results: '{count} result(s) found of {total}'
        },
        dropzone: {
            title: 'Drop your HPRIM file here',
            or: 'or',
            formats: 'Accepted formats: .hpr, .hpm, .hpm1, .hpm2, .hpm3, .hprim, .txt',
            size_limit: 'Maximum size: 10 MB',
            compact_title: 'Drop another file'
        },
        menu: {
            print: 'Print',
            export_pdf: 'PDF',
            export_csv: 'CSV',
            export_excel: 'Excel'
        },
        messages: {
            loading: 'Loading file',
            no_results: 'No results found',
            welcome: 'Use Ctrl+O (Windows/Linux) or Cmd+O (Mac) to open a file or drag and drop a .hpr file into this window.',
            no_file: 'No file specified',
            no_export_data: 'No results to export',
            pdf_success: 'PDF exported successfully!',
            pdf_error: 'Error during PDF export',
            file_error: 'Error reading file',
            export_success: 'Export successful!',
            export_error: 'Error during export',
            low_confidence: 'Information extracted with reduced confidence'
        },
        file: {
            size: 'Size',
            characters: 'characters',
            lines: 'Lines'
        },
        patient: {
            born: 'Born',
            years_old: 'years old',
            sampling: 'Sampling',
            sampling_at: 'sampled at',
            doctor: 'Dr',
            laboratory: 'Laboratory'
        },
        tooltip: {
            theme_dark: 'Switch to dark mode',
            theme_light: 'Switch to light mode',
            drag_drop: 'HPRIM file drop zone',
            select_dialog: 'Open file selection dialog'
        }
    }
};

// ============================================================================
// SYSTÈME DE TRADUCTION
// ============================================================================

class I18n {
    constructor() {
        this.currentLang = 'fr'; // Défaut temporaire
        this.translations = translations;
        this.initialized = false;
    }

    // Obtenir une traduction avec support pour les placeholders
    t(key, params = {}, fallback = key) {
        const keys = key.split('.');
        let value = this.translations[this.currentLang];
        
        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = value[k];
            } else {
                // Fallback vers l'anglais, puis français, puis la clé
                return this.getFallback(key, params, fallback);
            }
        }
        
        // Remplacer les placeholders {key} par les valeurs
        if (typeof value === 'string' && Object.keys(params).length > 0) {
            return value.replace(/\{(\w+)\}/g, (match, key) => {
                return params[key] !== undefined ? params[key] : match;
            });
        }
        
        return value || fallback;
    }

    // Fallback system
    getFallback(key, params, fallback) {
        const fallbackLangs = ['en', 'fr'];
        
        for (const lang of fallbackLangs) {
            if (lang === this.currentLang) continue;
            
            const keys = key.split('.');
            let value = this.translations[lang];
            
            for (const k of keys) {
                if (value && typeof value === 'object' && k in value) {
                    value = value[k];
                } else {
                    value = null;
                    break;
                }
            }
            
            if (value) {
                // Remplacer les placeholders dans le fallback aussi
                if (typeof value === 'string' && Object.keys(params).length > 0) {
                    return value.replace(/\{(\w+)\}/g, (match, key) => {
                        return params[key] !== undefined ? params[key] : match;
                    });
                }
                return value;
            }
        }
        
        return fallback;
    }

    // Détecter automatiquement la langue du système d'exploitation
    async detectSystemLanguage() {
        try {
            // Utiliser directement ipcRenderer avec contextIsolation: false
            const { ipcRenderer } = require('electron');
            const systemLang = await ipcRenderer.invoke('get-system-language');
            const langCode = systemLang.split('-')[0].toLowerCase();
            
            // Vérifier si la langue est supportée (seulement fr et en)
            if (this.translations && this.translations[langCode]) {
                return langCode;
            }
            
            return 'fr';
        } catch (error) {
        }
        
        // Fallback vers français
        return 'fr';
    }

    // Détecter automatiquement la langue au démarrage
    async autoDetectLanguage() {
        if (!this.initialized) {
            const detectedLang = await this.detectSystemLanguage();
            this.currentLang = detectedLang || 'fr'; // Forcer français si aucune détection
            this.initialized = true;
            // Appliquer immédiatement la langue
            this.updateUI();
        }
    }

    // Changer de langue (méthode conservée pour compatibilité)
    setLanguage(lang) {
        if (this.translations[lang]) {
            this.currentLang = lang;
            this.updateUI();
        }
    }

    // Obtenir la langue actuelle
    getCurrentLanguage() {
        return this.currentLang;
    }

    // Obtenir la liste des langues disponibles
    getAvailableLanguages() {
        return Object.keys(this.translations).map(code => ({
            code,
            name: this.translations[code].name,
            flag: this.translations[code].flag
        }));
    }

    // Mettre à jour l'interface utilisateur
    updateUI() {
        
        // Mettre à jour le titre de la fenêtre
        if (window.electronAPI && window.electronAPI.updateWindowTitle) {
            const windowTitle = this.t('app.window_title');
            window.electronAPI.updateWindowTitle(windowTitle);
        }
        
        // D'abord mettre à jour la zone de drag and drop (qui peut recréer du HTML)
        this.updateDropZone();
        
        // Puis mettre à jour tous les éléments avec data-i18n (y compris ceux nouvellement créés)
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            const translation = this.t(key);
            element.textContent = translation;
        });

        // Mettre à jour tous les éléments avec data-i18n-attr
        document.querySelectorAll('[data-i18n-attr]').forEach(element => {
            const mapping = JSON.parse(element.getAttribute('data-i18n-attr'));
            for (const [attr, key] of Object.entries(mapping)) {
                element.setAttribute(attr, this.t(key));
            }
        });

        // Mettre à jour les placeholders de recherche si elle existe
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.placeholder = this.t('search.placeholder');
        }
        
        return 'Interface mise à jour';
    }

    // Mettre à jour la zone de drag and drop
    updateDropZone() {
        const dropZone = document.getElementById('dropZone');
        if (dropZone) {
            const isCompact = dropZone.classList.contains('compact');
            
            if (isCompact) {
                // Mode compact
                dropZone.innerHTML = `
                    <h3 data-i18n="dropzone.compact_title">${this.t('dropzone.compact_title')}</h3>
                    <button class="btn" onclick="openFile()" data-i18n="buttons.select_file">${this.t('buttons.select_file')}</button>
                `;
            } else {
                // Mode normal - Préserver les attributs data-i18n pour la cohérence
                dropZone.innerHTML = `
                    <h3 data-i18n="dropzone.title">${this.t('dropzone.title')}</h3>
                    <p data-i18n="dropzone.or">${this.t('dropzone.or')}</p>
                    <button class="btn" onclick="openFile()" data-i18n="buttons.select_file" data-i18n-attr='{"aria-label": "tooltip.select_dialog"}' aria-label="${this.t('tooltip.select_dialog')}">
                        ${this.t('buttons.select_file')}
                    </button>
                    <p style="margin-top: 15px; font-size: 0.9em; color: #666;">
                        <span data-i18n="dropzone.formats">${this.t('dropzone.formats')}</span><br>
                        <span data-i18n="dropzone.size_limit">${this.t('dropzone.size_limit')}</span>
                    </p>
                `;
            }
        }
    }
}

// Instance globale
window.i18n = new I18n();