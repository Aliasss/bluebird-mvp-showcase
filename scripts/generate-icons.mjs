import sharp from 'sharp';
import { readFileSync } from 'fs';
import { join } from 'path';

// SVG를 PNG로 변환하는 스크립트
async function generateIcons() {
  const svgPath = join(process.cwd(), 'public', 'icons', 'icon.svg');
  const svgBuffer = readFileSync(svgPath);

  // 192x192 생성
  await sharp(svgBuffer)
    .resize(192, 192)
    .png()
    .toFile(join(process.cwd(), 'public', 'icons', 'icon-192x192.png'));

  // 512x512 생성
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(join(process.cwd(), 'public', 'icons', 'icon-512x512.png'));

  console.log('✅ PWA 아이콘이 생성되었습니다!');
}

generateIcons().catch(console.error);
