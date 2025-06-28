#!/bin/bash

echo "🎨 Génération de toutes les icônes pour HPRIM Tool..."

ICONS_DIR="/Users/cuffel.gregory/Downloads/hprimtool/hprim-electron/icons"
SVG_FILE="$ICONS_DIR/icon_macos_style.svg"
TEMP_DIR="/tmp/hprim_iconset"

# Nettoyer le répertoire temporaire
rm -rf "$TEMP_DIR"
mkdir -p "$TEMP_DIR"

echo "📱 1. Génération de l'icône PNG principale (1024x1024)..."
rsvg-convert -w 1024 -h 1024 "$SVG_FILE" > "$ICONS_DIR/icon.png"

echo "🍎 2. Génération de l'icône macOS (.icns)..."
# Créer toutes les tailles pour macOS
mkdir -p "$TEMP_DIR/app.iconset"

# Tailles requises pour macOS
rsvg-convert -w 16 -h 16 "$SVG_FILE" > "$TEMP_DIR/app.iconset/icon_16x16.png"
rsvg-convert -w 32 -h 32 "$SVG_FILE" > "$TEMP_DIR/app.iconset/icon_16x16@2x.png"
rsvg-convert -w 32 -h 32 "$SVG_FILE" > "$TEMP_DIR/app.iconset/icon_32x32.png"
rsvg-convert -w 64 -h 64 "$SVG_FILE" > "$TEMP_DIR/app.iconset/icon_32x32@2x.png"
rsvg-convert -w 128 -h 128 "$SVG_FILE" > "$TEMP_DIR/app.iconset/icon_128x128.png"
rsvg-convert -w 256 -h 256 "$SVG_FILE" > "$TEMP_DIR/app.iconset/icon_128x128@2x.png"
rsvg-convert -w 256 -h 256 "$SVG_FILE" > "$TEMP_DIR/app.iconset/icon_256x256.png"
rsvg-convert -w 512 -h 512 "$SVG_FILE" > "$TEMP_DIR/app.iconset/icon_256x256@2x.png"
rsvg-convert -w 512 -h 512 "$SVG_FILE" > "$TEMP_DIR/app.iconset/icon_512x512.png"
rsvg-convert -w 1024 -h 1024 "$SVG_FILE" > "$TEMP_DIR/app.iconset/icon_512x512@2x.png"

# Créer le fichier .icns
iconutil -c icns "$TEMP_DIR/app.iconset" -o "$ICONS_DIR/icon.icns"

echo "🪟 3. Génération de l'icône Windows (.ico)..."
# Créer ICO avec plusieurs tailles
convert "$TEMP_DIR/app.iconset/icon_16x16.png" \
        "$TEMP_DIR/app.iconset/icon_32x32.png" \
        "$TEMP_DIR/app.iconset/icon_128x128.png" \
        "$TEMP_DIR/app.iconset/icon_256x256.png" \
        "$ICONS_DIR/icon.ico"

echo "🐧 4. Génération des icônes Linux..."
# Linux utilise généralement PNG en différentes tailles
rsvg-convert -w 48 -h 48 "$SVG_FILE" > "$ICONS_DIR/icon_48.png"
rsvg-convert -w 64 -h 64 "$SVG_FILE" > "$ICONS_DIR/icon_64.png"
rsvg-convert -w 128 -h 128 "$SVG_FILE" > "$ICONS_DIR/icon_128.png"
rsvg-convert -w 256 -h 256 "$SVG_FILE" > "$ICONS_DIR/icon_256.png"
rsvg-convert -w 512 -h 512 "$SVG_FILE" > "$ICONS_DIR/icon_512.png"

echo "📄 5. Création de l'icône pour fichiers .hpr..."
# Créer une version spéciale pour les fichiers
cat > "$TEMP_DIR/file_icon.svg" << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <!-- Dégradé pour document -->
    <linearGradient id="docGradient" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#F8F8F8"/>
      <stop offset="100%" style="stop-color:#E8E8E8"/>
    </linearGradient>
    
    <!-- Dégradé pour en-tête -->
    <linearGradient id="headerGradient" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#7BB3F0"/>
      <stop offset="100%" style="stop-color:#4A90E2"/>
    </linearGradient>
    
    <!-- Ombre -->
    <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="8"/>
      <feOffset dx="0" dy="4" result="offsetblur"/>
      <feColorMatrix values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.2 0"/>
      <feMerge> 
        <feMergeNode/>
        <feMergeNode in="SourceGraphic"/> 
      </feMerge>
    </filter>
  </defs>
  
  <!-- Document principal -->
  <rect x="200" y="150" width="624" height="800" rx="20" ry="20" 
        fill="url(#docGradient)" 
        stroke="#C0C0C0" 
        stroke-width="2"
        filter="url(#shadow)"/>
  
  <!-- Coin plié -->
  <path d="M 724 150 L 824 150 L 824 250 Z" 
        fill="#D0D0D0" 
        stroke="#C0C0C0" 
        stroke-width="2"/>
  
  <!-- En-tête coloré -->
  <rect x="200" y="150" width="624" height="120" rx="20" ry="20" 
        fill="url(#headerGradient)"/>
  <rect x="200" y="240" width="624" height="30" 
        fill="url(#headerGradient)"/>
  
  <!-- Texte H' -->
  <text x="512" y="350" 
        font-family="SF Pro Display, -apple-system, system-ui, sans-serif" 
        font-size="120" 
        font-weight="600" 
        text-anchor="middle" 
        fill="white">H'</text>
  
  <!-- Lignes de contenu -->
  <rect x="250" y="400" width="500" height="8" rx="4" fill="#4A90E2" opacity="0.6"/>
  <rect x="250" y="430" width="450" height="6" rx="3" fill="#C0C0C0"/>
  <rect x="250" y="450" width="480" height="6" rx="3" fill="#C0C0C0"/>
  <rect x="250" y="470" width="420" height="6" rx="3" fill="#C0C0C0"/>
  
  <rect x="250" y="520" width="350" height="8" rx="4" fill="#4A90E2" opacity="0.6"/>
  <rect x="250" y="550" width="380" height="6" rx="3" fill="#C0C0C0"/>
  <rect x="250" y="570" width="360" height="6" rx="3" fill="#C0C0C0"/>
  
  <rect x="250" y="620" width="400" height="8" rx="4" fill="#4A90E2" opacity="0.6"/>
  <rect x="250" y="650" width="320" height="6" rx="3" fill="#C0C0C0"/>
  <rect x="250" y="670" width="410" height="6" rx="3" fill="#C0C0C0"/>
  <rect x="250" y="690" width="290" height="6" rx="3" fill="#C0C0C0"/>
  
  <!-- Extension .hpr -->
  <text x="512" y="850" 
        font-family="SF Pro Display, -apple-system, system-ui, sans-serif" 
        font-size="48" 
        font-weight="500" 
        text-anchor="middle" 
        fill="#666">.hpr</text>
</svg>
EOF

# Générer les icônes de fichier
rsvg-convert -w 1024 -h 1024 "$TEMP_DIR/file_icon.svg" > "$ICONS_DIR/file_icon.png"
rsvg-convert -w 256 -h 256 "$TEMP_DIR/file_icon.svg" > "$ICONS_DIR/file_icon_256.png"
rsvg-convert -w 128 -h 128 "$TEMP_DIR/file_icon.svg" > "$ICONS_DIR/file_icon_128.png"
rsvg-convert -w 64 -h 64 "$TEMP_DIR/file_icon.svg" > "$ICONS_DIR/file_icon_64.png"
rsvg-convert -w 32 -h 32 "$TEMP_DIR/file_icon.svg" > "$ICONS_DIR/file_icon_32.png"
rsvg-convert -w 16 -h 16 "$TEMP_DIR/file_icon.svg" > "$ICONS_DIR/file_icon_16.png"

# Créer ICO pour fichiers Windows
convert "$ICONS_DIR/file_icon_32.png" \
        "$ICONS_DIR/file_icon_64.png" \
        "$ICONS_DIR/file_icon_128.png" \
        "$ICONS_DIR/file_icon_256.png" \
        "$ICONS_DIR/file_icon.ico"

echo "🧹 6. Nettoyage..."
rm -rf "$TEMP_DIR"

echo ""
echo "✅ Génération terminée !"
echo ""
echo "📁 Icônes créées dans: $ICONS_DIR"
echo "🍎 macOS: icon.icns"
echo "🪟 Windows: icon.ico"
echo "🐧 Linux: icon_*.png (48, 64, 128, 256, 512px)"
echo "📄 Fichiers .hpr: file_icon.* (png et ico)"
echo ""
echo "🎯 Tailles disponibles:"
ls -la "$ICONS_DIR" | grep -E '\.(png|ico|icns)$' | awk '{print "   " $9 " (" $5 " bytes)"}'