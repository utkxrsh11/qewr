import sharp from 'sharp';

async function runPoissonInpainting() {
  const inputPath = 'public/assets/journeys/world_map_terrain.jpg';
  const outputPath = 'public/assets/journeys/world_map_terrain_clean.jpg';

  const { data, info } = await sharp(inputPath).raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  // Working float buffers for RGB
  const imgR = new Float32Array(width * height);
  const imgG = new Float32Array(width * height);
  const imgB = new Float32Array(width * height);

  for (let i = 0; i < width * height; i++) {
    imgR[i] = data[i * channels];
    imgG[i] = data[i * channels + 1];
    imgB[i] = data[i * channels + 2];
  }

  // Mask buffer: 1 = needs inpainting, 0 = known natural terrain
  const mask = new Uint8Array(width * height);

  function markCircle(cx, cy, radius) {
    for (let y = Math.max(0, cy - radius); y <= Math.min(height - 1, cy + radius); y++) {
      for (let x = Math.max(0, cx - radius); x <= Math.min(width - 1, cx + radius); x++) {
        const dx = x - cx;
        const dy = y - cy;
        if (dx * dx + dy * dy <= radius * radius) {
          mask[y * width + x] = 1;
        }
      }
    }
  }

  function markRect(x1, y1, x2, y2) {
    x1 = Math.max(0, Math.min(width - 1, x1));
    x2 = Math.max(0, Math.min(width - 1, x2));
    y1 = Math.max(0, Math.min(height - 1, y1));
    y2 = Math.max(0, Math.min(height - 1, y2));
    for (let y = y1; y <= y2; y++) {
      for (let x = x1; x <= x2; x++) {
        mask[y * width + x] = 1;
      }
    }
  }

  // 1. Bastion of Storms
  // Circular portal: center (326, 213), r = 46
  markCircle(326, 213, 46);
  // Pill: x: 220..440, y: 260..330
  markRect(220, 260, 440, 330);

  // 2. Frostbound Spire
  // Circular portal: center (978, 178), r = 52
  markCircle(978, 178, 52);
  // Pill: x: 870..1080, y: 240..325
  markRect(870, 240, 1080, 325);
  // Chests: x: 875..1085, y: 325..415
  markRect(875, 325, 1085, 415);

  // 3. Dark Forest
  // Circular portal: center (620, 485), r = 48
  markCircle(620, 485, 48);
  // Pill: x: 530..705, y: 525..620
  markRect(530, 525, 705, 620);
  // Chests: x: 515..730, y: 620..715
  markRect(515, 620, 730, 715);

  // 4. Iron Mines
  // Circular portal: center (320, 580), r = 46
  markCircle(320, 580, 46);
  // Pill: x: 260..395, y: 630..695
  markRect(260, 630, 395, 695);

  // 5. Dunes
  // Circular portal: center (1000, 590), r = 50
  markCircle(1000, 590, 50);
  // Pill: x: 925..1070, y: 640..730
  markRect(925, 640, 1070, 730);
  // Chests: x: 855..1140, y: 730..835
  markRect(855, 730, 1140, 835);

  // Dilate mask slightly by 4px so border edges of UI anti-aliasing are fully absorbed
  const dilatedMask = new Uint8Array(width * height);
  const dRad = 4;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (mask[y * width + x] === 1) {
        for (let dy = -dRad; dy <= dRad; dy++) {
          const ny = y + dy;
          if (ny < 0 || ny >= height) continue;
          for (let dx = -dRad; dx <= dRad; dx++) {
            const nx = x + dx;
            if (nx < 0 || nx >= width) continue;
            if (dx * dx + dy * dy <= dRad * dRad) {
              dilatedMask[ny * width + nx] = 1;
            }
          }
        }
      }
    }
  }

  console.log('Solving harmonic Laplacian field for smooth boundary continuity...');

  // Initialize masked pixels to average of surrounding boundary pixels
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (dilatedMask[y * width + x] === 1) {
        // Find nearest unmasked pixels
        let rSum = 0, gSum = 0, bSum = 0, cnt = 0;
        for (let d = 5; d <= 40; d += 10) {
          for (const [ox, oy] of [[d, 0], [-d, 0], [0, d], [0, -d], [d, d], [-d, -d]]) {
            const sx = Math.max(0, Math.min(width - 1, x + ox));
            const sy = Math.max(0, Math.min(height - 1, y + oy));
            if (dilatedMask[sy * width + sx] === 0) {
              const idx = sy * width + sx;
              rSum += imgR[idx];
              gSum += imgG[idx];
              bSum += imgB[idx];
              cnt++;
            }
          }
          if (cnt > 0) break;
        }
        if (cnt > 0) {
          const idx = y * width + x;
          imgR[idx] = rSum / cnt;
          imgG[idx] = gSum / cnt;
          imgB[idx] = bSum / cnt;
        }
      }
    }
  }

  // Run Gauss-Seidel iterations (120 iterations produces smooth harmonic solution)
  for (let iter = 0; iter < 120; iter++) {
    for (let y = 1; y < height - 1; y++) {
      const row = y * width;
      for (let x = 1; x < width - 1; x++) {
        const idx = row + x;
        if (dilatedMask[idx] === 1) {
          const up = idx - width;
          const down = idx + width;
          const left = idx - 1;
          const right = idx + 1;

          imgR[idx] = 0.25 * (imgR[up] + imgR[down] + imgR[left] + imgR[right]);
          imgG[idx] = 0.25 * (imgG[up] + imgG[down] + imgG[left] + imgG[right]);
          imgB[idx] = 0.25 * (imgB[up] + imgB[down] + imgB[left] + imgB[right]);
        }
      }
    }
  }

  console.log('Injecting natural high-frequency terrain texture from adjacent donors...');

  // Inject high-frequency texture from neighboring clean terrain
  // Region definitions with appropriate donor offsets (dx, dy)
  const regions = [
    // Bastion: rocky mountain texture from lower-left slope
    { cx: 326, cy: 260, rx: 120, ry: 80, dx: -120, dy: 70 },
    // Frostbound: snowy alpine texture from upper-right peaks
    { cx: 978, cy: 280, rx: 120, ry: 140, dx: 110, dy: -40 },
    // Dark Forest: dense lush canopy texture from left forest
    { cx: 620, cy: 580, rx: 120, ry: 140, dx: -130, dy: 0 },
    // Iron Mines: canyon rock texture from lower-left canyon
    { cx: 320, cy: 620, rx: 80, ry: 90, dx: -100, dy: 60 },
    // Dunes: sand dunes texture from right desert
    { cx: 1000, cy: 700, rx: 150, ry: 150, dx: 100, dy: 0 },
  ];

  for (const reg of regions) {
    for (let y = Math.max(1, reg.cy - reg.ry); y <= Math.min(height - 2, reg.cy + reg.ry); y++) {
      for (let x = Math.max(1, reg.cx - reg.rx); x <= Math.min(width - 2, reg.cx + reg.rx); x++) {
        const idx = y * width + x;
        if (dilatedMask[idx] === 1) {
          // Donor pixel
          const donorX = Math.max(1, Math.min(width - 2, x + reg.dx));
          const donorY = Math.max(1, Math.min(height - 2, y + reg.dy));
          const donorIdx = donorY * width + donorX;

          // Compute donor high-frequency detail = donor - local_donor_blur
          const donorUp = donorIdx - width;
          const donorDown = donorIdx + width;
          const donorLeft = donorIdx - 1;
          const donorRight = donorIdx + 1;

          const donorBlurR = 0.25 * (data[donorUp * channels] + data[donorDown * channels] + data[donorLeft * channels] + data[donorRight * channels]);
          const donorBlurG = 0.25 * (data[donorUp * channels + 1] + data[donorDown * channels + 1] + data[donorLeft * channels + 1] + data[donorRight * channels + 1]);
          const donorBlurB = 0.25 * (data[donorUp * channels + 2] + data[donorDown * channels + 2] + data[donorLeft * channels + 2] + data[donorRight * channels + 2]);

          const hfR = data[donorIdx * channels] - donorBlurR;
          const hfG = data[donorIdx * channels + 1] - donorBlurG;
          const hfB = data[donorIdx * channels + 2] - donorBlurB;

          // Add high-frequency texture with slight gain for crispness
          imgR[idx] += hfR * 1.8;
          imgG[idx] += hfG * 1.8;
          imgB[idx] += hfB * 1.8;
        }
      }
    }
  }

  // Write back to buffer
  const finalBuffer = Buffer.alloc(width * height * channels);
  for (let i = 0; i < width * height; i++) {
    finalBuffer[i * channels] = Math.round(Math.max(0, Math.min(255, imgR[i])));
    finalBuffer[i * channels + 1] = Math.round(Math.max(0, Math.min(255, imgG[i])));
    finalBuffer[i * channels + 2] = Math.round(Math.max(0, Math.min(255, imgB[i])));
  }

  await sharp(finalBuffer, {
    raw: { width, height, channels },
  })
  .jpeg({ quality: 95 })
  .toFile(outputPath);

  console.log('Poisson inpainting finished successfully!');
}

runPoissonInpainting().catch(console.error);
