import sharp from 'sharp';

async function seamlessBiomeComposite() {
  const width = 1920;
  const height = 1080;
  const outputPath = 'public/assets/journeys/world_map_terrain.jpg';

  console.log('Resizing all 5 biomes to full 1920x1080 canvas...');

  // 1. Center / Forest Base
  const forest = await sharp('/tmp/test_unsplash.jpg')
    .resize(width, height, { fit: 'cover' })
    .modulate({ brightness: 0.92, saturation: 1.25 })
    .raw()
    .toBuffer();

  // 2. Top-Left Storm & Lightning
  const storm = await sharp('/tmp/storm.jpg')
    .resize(width, height, { fit: 'cover', position: 'top' })
    .modulate({ brightness: 0.85, saturation: 1.35, hue: -30 }) // Arcane purple/indigo tempest
    .raw()
    .toBuffer();

  // 3. Top-Right Snowy Alpine Peaks
  const snow = await sharp('/tmp/snow.jpg')
    .resize(width, height, { fit: 'cover', position: 'top' })
    .modulate({ brightness: 1.08, saturation: 1.15, hue: 12 }) // Crystalline cyan ice
    .raw()
    .toBuffer();

  // 4. Bottom-Left Red Rock Canyon
  const canyon = await sharp('/tmp/canyon.jpg')
    .resize(width, height, { fit: 'cover', position: 'bottom' })
    .modulate({ brightness: 0.95, saturation: 1.35, hue: -8 }) // Rich terra-cotta clay
    .raw()
    .toBuffer();

  // 5. Bottom-Right Golden Dunes
  const dunes = await sharp('/tmp/dunes.jpg')
    .resize(width, height, { fit: 'cover', position: 'bottom' })
    .modulate({ brightness: 1.05, saturation: 1.25, hue: 6 }) // Warm golden sunlight
    .raw()
    .toBuffer();

  const out = Buffer.alloc(width * height * 3);

  function smoothstep(edge0, edge1, x) {
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
  }

  for (let y = 0; y < height; y++) {
    const ny = y / height;
    for (let x = 0; x < width; x++) {
      const nx = x / width;
      const idx = (y * width + x) * 3;

      // Base: Forest valley
      let r = forest[idx];
      let g = forest[idx + 1];
      let b = forest[idx + 2];

      // Top-Left: Storm (centered at x=0.18, y=0.20)
      const distStorm = Math.hypot((nx - 0.16) * 1.1, (ny - 0.18) * 1.3);
      const wStorm = 1 - smoothstep(0.12, 0.58, distStorm);
      if (wStorm > 0) {
        const sr = storm[idx];
        const sg = storm[idx + 1];
        const sb = storm[idx + 2];
        r = r * (1 - wStorm) + sr * wStorm;
        g = g * (1 - wStorm) + sg * wStorm;
        b = b * (1 - wStorm) + sb * wStorm;
      }

      // Top-Right: Snow peaks (centered at x=0.82, y=0.18)
      const distSnow = Math.hypot((nx - 0.82) * 1.1, (ny - 0.18) * 1.3);
      const wSnow = 1 - smoothstep(0.12, 0.58, distSnow);
      if (wSnow > 0) {
        const sr = snow[idx];
        const sg = snow[idx + 1];
        const sb = snow[idx + 2];
        r = r * (1 - wSnow) + sr * wSnow;
        g = g * (1 - wSnow) + sg * wSnow;
        b = b * (1 - wSnow) + sb * wSnow;
      }

      // Bottom-Left: Red Canyon (centered at x=0.18, y=0.80)
      const distCanyon = Math.hypot((nx - 0.18) * 1.1, (ny - 0.80) * 1.25);
      const wCanyon = 1 - smoothstep(0.12, 0.55, distCanyon);
      if (wCanyon > 0) {
        const cr = canyon[idx];
        const cg = canyon[idx + 1];
        const cb = canyon[idx + 2];
        r = r * (1 - wCanyon) + cr * wCanyon;
        g = g * (1 - wCanyon) + cg * wCanyon;
        b = b * (1 - wCanyon) + cb * wCanyon;
      }

      // Bottom-Right: Dunes (centered at x=0.82, y=0.80)
      const distDunes = Math.hypot((nx - 0.82) * 1.1, (ny - 0.80) * 1.25);
      const wDunes = 1 - smoothstep(0.12, 0.55, distDunes);
      if (wDunes > 0) {
        const dr = dunes[idx];
        const dg = dunes[idx + 1];
        const db = dunes[idx + 2];
        r = r * (1 - wDunes) + dr * wDunes;
        g = g * (1 - wDunes) + dg * wDunes;
        b = b * (1 - wDunes) + db * wDunes;
      }

      // Ambient cinematic vignette
      const vDist = Math.hypot((nx - 0.5) * 1.8, (ny - 0.5) * 1.8);
      const vignette = Math.max(0.48, Math.min(1.0, 1.25 - vDist * 0.42));

      out[idx] = Math.round(Math.max(0, Math.min(255, r * vignette)));
      out[idx + 1] = Math.round(Math.max(0, Math.min(255, g * vignette)));
      out[idx + 2] = Math.round(Math.max(0, Math.min(255, b * vignette)));
    }
  }

  await sharp(out, {
    raw: { width, height, channels: 3 },
  })
  .jpeg({ quality: 95 })
  .toFile(outputPath);

  console.log('Seamless 5-biome world map generated successfully to', outputPath);
}

seamlessBiomeComposite().catch(console.error);
