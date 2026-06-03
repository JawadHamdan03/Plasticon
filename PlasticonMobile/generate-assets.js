// Run once: node generate-assets.js
// Generates app icon, adaptive icon, and splash screen into ./assets/

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

fs.mkdirSync('./assets', { recursive: true });

// ─── Plasticon branded icon SVG ───────────────────────────────────────────────
const ICON_SVG = `
<svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">
  <!-- Background -->
  <rect width="1024" height="1024" fill="#0D1321"/>

  <!-- Outer ring -->
  <circle cx="512" cy="480" r="260" fill="none" stroke="#FF6B35" stroke-width="28" opacity="0.25"/>

  <!-- Inner gear / cog shape (factory feel) -->
  <circle cx="512" cy="480" r="180" fill="#1a2744"/>
  <circle cx="512" cy="480" r="160" fill="none" stroke="#FF6B35" stroke-width="18"/>

  <!-- Bold "P" letter -->
  <text
    x="512" y="560"
    font-family="Arial Black, Arial, sans-serif"
    font-size="230"
    font-weight="900"
    fill="#FF6B35"
    text-anchor="middle"
    dominant-baseline="middle"
    letter-spacing="-8"
  >P</text>

  <!-- Bottom label -->
  <text
    x="512" y="870"
    font-family="Arial, sans-serif"
    font-size="72"
    font-weight="700"
    fill="#64748B"
    text-anchor="middle"
    letter-spacing="12"
  >PLASTICON</text>

  <!-- Accent dots -->
  <circle cx="260" cy="480" r="14" fill="#FF6B35" opacity="0.6"/>
  <circle cx="764" cy="480" r="14" fill="#FF6B35" opacity="0.6"/>
  <circle cx="512" cy="232" r="14" fill="#FF6B35" opacity="0.6"/>
  <circle cx="512" cy="728" r="14" fill="#FF6B35" opacity="0.4"/>
</svg>`;

// Adaptive icon — foreground only (transparent background, centered logo)
const ADAPTIVE_SVG = `
<svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">
  <circle cx="512" cy="480" r="200" fill="#1a2744"/>
  <circle cx="512" cy="480" r="182" fill="none" stroke="#FF6B35" stroke-width="20"/>
  <text
    x="512" y="558"
    font-family="Arial Black, Arial, sans-serif"
    font-size="260"
    font-weight="900"
    fill="#FF6B35"
    text-anchor="middle"
    dominant-baseline="middle"
  >P</text>
  <circle cx="302" cy="480" r="12" fill="#FF6B35" opacity="0.7"/>
  <circle cx="722" cy="480" r="12" fill="#FF6B35" opacity="0.7"/>
</svg>`;

// Splash screen
const SPLASH_SVG = `
<svg width="1242" height="2436" xmlns="http://www.w3.org/2000/svg">
  <rect width="1242" height="2436" fill="#0D1321"/>
  <circle cx="621" cy="1050" r="280" fill="none" stroke="#FF6B35" stroke-width="22" opacity="0.2"/>
  <circle cx="621" cy="1050" r="200" fill="#1a2744"/>
  <circle cx="621" cy="1050" r="182" fill="none" stroke="#FF6B35" stroke-width="18"/>
  <text
    x="621" y="1128"
    font-family="Arial Black, Arial, sans-serif"
    font-size="240"
    font-weight="900"
    fill="#FF6B35"
    text-anchor="middle"
    dominant-baseline="middle"
  >P</text>
  <text
    x="621" y="1400"
    font-family="Arial, sans-serif"
    font-size="76"
    font-weight="700"
    fill="#FF6B35"
    text-anchor="middle"
    letter-spacing="14"
  >PLASTICON</text>
  <text
    x="621" y="1500"
    font-family="Arial, sans-serif"
    font-size="44"
    font-weight="400"
    fill="#64748B"
    text-anchor="middle"
    letter-spacing="3"
  >Factory Management System</text>
</svg>`;

async function generate() {
  console.log('Generating app assets...');

  await sharp(Buffer.from(ICON_SVG))
    .resize(1024, 1024)
    .png()
    .toFile('./assets/icon.png');
  console.log('✓ assets/icon.png');

  await sharp(Buffer.from(ADAPTIVE_SVG))
    .resize(1024, 1024)
    .png()
    .toFile('./assets/adaptive-icon.png');
  console.log('✓ assets/adaptive-icon.png');

  await sharp(Buffer.from(SPLASH_SVG))
    .resize(1242, 2436)
    .png()
    .toFile('./assets/splash.png');
  console.log('✓ assets/splash.png');

  console.log('\nAll assets generated! You can now build the APK.');
}

generate().catch((err) => { console.error('Failed:', err.message); process.exit(1); });
