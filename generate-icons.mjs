// Script para gerar ícones PWA em múltiplos tamanhos
// Usa apenas APIs nativas do Node.js (sem dependências extras)
// Execute: node generate-icons.mjs

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { createCanvas, loadImage } from 'canvas';
import path from 'path';

// Tamanhos necessários para Android e iOS PWA
const sizes = [72, 96, 128, 144, 152, 180, 192, 384, 512];

const inputPath = './public/icon-512.png';
const outputDir = './public/icons';

try {
  mkdirSync(outputDir, { recursive: true });
  const img = await loadImage(inputPath);

  for (const size of sizes) {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, size, size);
    const buffer = canvas.toBuffer('image/png');
    const outputPath = path.join(outputDir, `icon-${size}x${size}.png`);
    writeFileSync(outputPath, buffer);
    console.log(`✓ icon-${size}x${size}.png`);
  }

  // Apple touch icon (180x180)
  const canvasApple = createCanvas(180, 180);
  const ctxApple = canvasApple.getContext('2d');
  ctxApple.fillStyle = '#FFFFFF';
  ctxApple.fillRect(0, 0, 180, 180);
  ctxApple.drawImage(img, 0, 0, 180, 180);
  writeFileSync('./public/apple-touch-icon.png', canvasApple.toBuffer('image/png'));
  console.log('✓ apple-touch-icon.png');

  console.log('\n🎉 Todos os ícones gerados com sucesso!');
} catch (e) {
  console.error('Erro:', e.message);
  console.log('Usando cópia simples do ícone original para todos os tamanhos...');
  
  // Fallback: copia o ícone original
  const data = readFileSync(inputPath);
  mkdirSync(outputDir, { recursive: true });
  for (const size of sizes) {
    writeFileSync(path.join(outputDir, `icon-${size}x${size}.png`), data);
  }
  writeFileSync('./public/apple-touch-icon.png', data);
  console.log('✓ Ícones copiados (sem redimensionamento)');
}
