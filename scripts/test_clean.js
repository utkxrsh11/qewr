import sharp from 'sharp';
import fs from 'fs';

async function cleanMap() {
  const inputPath = 'public/assets/journeys/world_map_terrain.jpg';
  const outputPath = 'public/assets/journeys/world_map_terrain_clean.jpg';

  // Read metadata
  const metadata = await sharp(inputPath).metadata();
  console.log('Original dimensions:', metadata.width, metadata.height);

  const { width, height } = metadata;
  const rawImage = await sharp(inputPath).raw().toBuffer({ resolveWithObject: true });
  const { data, info } = rawImage;
  const channels = info.channels; // usually 3 (RGB)

  // Helper to get pixel
  function getPixel(x, y) {
    x = Math.max(0, Math.min(width - 1, Math.round(x)));
    y = Math.max(0, Math.min(height - 1, Math.round(y)));
    const idx = (y * width + x) * channels;
    return [data[idx], data[idx + 1], data[idx + 2]];
  }

  function setPixel(x, y, r, g, b) {
    x = Math.max(0, Math.min(width - 1, Math.round(x)));
    y = Math.max(0, Math.min(height - 1, Math.round(y)));
    const idx = (y * width + x) * channels;
    data[idx] = r;
    data[idx + 1] = g;
    data[idx + 2] = b;
  }

  console.log('Writing clean map inpainting script...');
}

cleanMap().catch(console.error);
