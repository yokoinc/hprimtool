#!/usr/bin/env python3
"""
Créer une icône macOS avec carré aux bords arrondis
"""

import os
import subprocess

def create_macos_style_svg():
    svg_content = '''<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <!-- Dégradé principal style macOS -->
    <linearGradient id="mainGradient" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#7BB3F0"/>
      <stop offset="50%" style="stop-color:#4A90E2"/>
      <stop offset="100%" style="stop-color:#2C5AA0"/>
    </linearGradient>
    
    <!-- Dégradé pour la croix -->
    <linearGradient id="crossGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#FFFFFF"/>
      <stop offset="100%" style="stop-color:#F0F0F0"/>
    </linearGradient>
    
    <!-- Ombre portée style macOS -->
    <filter id="macShadow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="12"/>
      <feOffset dx="0" dy="6" result="offsetblur"/>
      <feColorMatrix values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0"/>
      <feMerge> 
        <feMergeNode/>
        <feMergeNode in="SourceGraphic"/> 
      </feMerge>
    </filter>
    
    <!-- Reflet style macOS -->
    <linearGradient id="macGloss" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#FFFFFF;stop-opacity:0.4"/>
      <stop offset="40%" style="stop-color:#FFFFFF;stop-opacity:0.2"/>
      <stop offset="60%" style="stop-color:#FFFFFF;stop-opacity:0"/>
      <stop offset="100%" style="stop-color:#000000;stop-opacity:0.1"/>
    </linearGradient>
    
    <!-- Bordure subtile -->
    <linearGradient id="borderGradient" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#FFFFFF;stop-opacity:0.3"/>
      <stop offset="100%" style="stop-color:#000000;stop-opacity:0.2"/>
    </linearGradient>
  </defs>
  
  <!-- Carré principal avec bords arrondis style macOS (rayon ~22% de la taille) -->
  <rect x="112" y="112" width="800" height="800" rx="180" ry="180" 
        fill="url(#mainGradient)" 
        filter="url(#macShadow)"/>
  
  <!-- Bordure subtile -->
  <rect x="112" y="112" width="800" height="800" rx="180" ry="180" 
        fill="none" 
        stroke="url(#borderGradient)" 
        stroke-width="2"/>
  
  <!-- Croix médicale au centre -->
  <g transform="translate(512, 512)">
    <!-- Barre verticale de la croix -->
    <rect x="-25" y="-120" width="50" height="240" rx="8" ry="8" 
          fill="url(#crossGradient)" opacity="0.95"/>
    
    <!-- Barre horizontale de la croix -->
    <rect x="-120" y="-25" width="240" height="50" rx="8" ry="8" 
          fill="url(#crossGradient)" opacity="0.95"/>
  </g>
  
  <!-- Lettre H pour HPRIM -->
  <text x="512" y="680" 
        font-family="SF Pro Display, -apple-system, system-ui, sans-serif" 
        font-size="55" 
        font-weight="500" 
        text-anchor="middle" 
        fill="white" 
        opacity="0.9">H</text>
  
  <!-- Reflet style macOS sur tout l'icône -->
  <rect x="112" y="112" width="800" height="800" rx="180" ry="180" 
        fill="url(#macGloss)"/>
  
  <!-- Petit reflet brillant en haut -->
  <ellipse cx="400" cy="280" rx="80" ry="40" 
           fill="rgba(255,255,255,0.3)" 
           transform="rotate(-25 400 280)"/>
</svg>'''
    return svg_content

def create_macos_icon():
    print("🎨 Création d'une icône style macOS...")
    
    # Créer le SVG
    svg_content = create_macos_style_svg()
    
    # Écrire le fichier SVG
    icon_dir = "/Users/cuffel.gregory/Documents/Dev/hprimtool/hprim-electron/icons"
    os.makedirs(icon_dir, exist_ok=True)
    
    svg_path = f"{icon_dir}/icon_macos_style.svg"
    with open(svg_path, 'w') as f:
        f.write(svg_content)
    
    print(f"✅ SVG macOS créé: {svg_path}")
    
    # Convertir en PNG
    png_path = f"{icon_dir}/icon.png"
    try:
        subprocess.run([
            'rsvg-convert', '-w', '1024', '-h', '1024', '-f', 'png', '-o', png_path, svg_path
        ], check=True, capture_output=True)
        print(f"✅ PNG créé avec rsvg-convert: {png_path}")
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("rsvg-convert non disponible, utilisation de qlmanage...")
        subprocess.run([
            'qlmanage', '-t', '-s', '1024', '-o', icon_dir, svg_path
        ], check=True, capture_output=True)
        
        generated_file = f"{icon_dir}/icon_macos_style.svg.png"
        if os.path.exists(generated_file):
            os.rename(generated_file, png_path)
            print(f"✅ PNG créé avec qlmanage: {png_path}")
    
    # Créer le fichier ICNS
    iconset_dir = f"{icon_dir}/icon.iconset"
    if os.path.exists(iconset_dir):
        subprocess.run(['rm', '-rf', iconset_dir])
    os.makedirs(iconset_dir, exist_ok=True)
    
    sizes = [
        (16, "icon_16x16.png"),
        (32, "icon_16x16@2x.png"), 
        (32, "icon_32x32.png"),
        (64, "icon_32x32@2x.png"),
        (128, "icon_128x128.png"),
        (256, "icon_128x128@2x.png"),
        (256, "icon_256x256.png"),
        (512, "icon_256x256@2x.png"),
        (512, "icon_512x512.png"),
        (1024, "icon_512x512@2x.png")
    ]
    
    print("🔄 Génération des tailles ICNS...")
    for size, filename in sizes:
        output_path = f"{iconset_dir}/{filename}"
        subprocess.run([
            'sips', '-z', str(size), str(size), png_path, '--out', output_path
        ], check=True, capture_output=True)
    
    # Créer ICNS
    icns_path = f"{icon_dir}/icon.icns"
    subprocess.run([
        'iconutil', '-c', 'icns', iconset_dir, '-o', icns_path
    ], check=True)
    
    print(f"✅ ICNS créé: {icns_path}")
    
    # Nettoyer
    subprocess.run(['rm', '-rf', iconset_dir])
    
    # Créer l'icône Windows ICO
    ico_path = f"{icon_dir}/icon.ico"
    try:
        # Utiliser ImageMagick pour créer le fichier ICO avec plusieurs tailles
        subprocess.run([
            'magick', 'convert', png_path,
            '-resize', '256x256',
            '(', '-clone', '0', '-resize', '16x16', ')',
            '(', '-clone', '0', '-resize', '32x32', ')',
            '(', '-clone', '0', '-resize', '48x48', ')',
            '(', '-clone', '0', '-resize', '64x64', ')',
            '(', '-clone', '0', '-resize', '128x128', ')',
            '-delete', '0', ico_path
        ], check=True, capture_output=True)
        print(f"✅ ICO créé avec ImageMagick: {ico_path}")
    except (subprocess.CalledProcessError, FileNotFoundError):
        try:
            # Fallback: utiliser sips pour créer un ICO simple
            subprocess.run([
                'sips', '-s', 'format', 'microsoft-icon', png_path, '--out', ico_path
            ], check=True, capture_output=True)
            print(f"✅ ICO créé avec sips: {ico_path}")
        except subprocess.CalledProcessError:
            print(f"⚠️  Impossible de créer le fichier ICO automatiquement")
            print(f"   Le PNG peut être converti manuellement si nécessaire")
            ico_path = None
    
    return png_path, icns_path, ico_path

if __name__ == "__main__":
    png_path, icns_path, ico_path = create_macos_icon()
    print("\n🎉 Icônes multi-plateformes terminées!")
    print("🔧 Formats créés:")
    print(f"   • PNG (1024x1024): {png_path}")
    print(f"   • ICNS (macOS): {icns_path}")
    if ico_path:
        print(f"   • ICO (Windows): {ico_path}")
    print("\n🎨 Caractéristiques:")
    print("   • Carré avec bords arrondis (rayon 22%)")
    print("   • Dégradé bleu style macOS")
    print("   • Ombre portée douce")
    print("   • Reflets et bordures subtiles")
    print("   • Compatible macOS et Windows")