# Changelog - HPRIM Tool

## Version 1.0.7 (Dernière version)

### 🔧 Améliorations techniques
- **Builds automatisés GitHub Actions** : Pipeline complet de build pour Linux (x64/arm64), Windows et macOS
- **Releases automatiques** : Création automatique des releases GitHub avec tous les binaires
- **Support multi-architecture** : Binaires disponibles pour x64 et ARM64 sur Linux et macOS
- **Formats de distribution optimisés** :
  - Linux : .deb, .rpm, .AppImage
  - Windows : Installateur NSIS (.exe)
  - macOS : Archive ZIP universelle

### 🎨 Améliorations interface (v1.0.1)
- Interface utilisateur améliorée
- Optimisation de l'impression
- Ergonomie générale renforcée

### 🐛 Corrections importantes
- **v1.0.2** : Corrections majeures et améliorations
- **v1.0.3** : Correction du packaging Linux
- Associations de fichiers corrigées pour tous les OS
- Stabilité générale améliorée

### 📦 Formats de fichiers supportés
- `.hpr` - Fichiers HPRIM standard
- `.hpm` - Fichiers HPRIM médicaux
- `.hprim` - Fichiers HPRIM génériques

### 🔒 Sécurité et compatibilité
- Binaires non signés (distribution libre)
- Compatible macOS 10.12+ (APFS)
- Support ARM64 natif pour les nouveaux Mac
- Compatibilité étendue Linux (Ubuntu, Debian, CentOS, etc.)

---

## Depuis la version 1.0.0

Cette version apporte une **infrastructure de distribution moderne** avec des builds automatisés, un support multi-plateforme étendu, et une meilleure expérience utilisateur globale.

**Installation** : Téléchargez le binaire correspondant à votre système depuis les [Releases GitHub](https://github.com/yokoinc/hprimtool/releases).