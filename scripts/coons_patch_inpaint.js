import sharp from 'sharp';

async function coonsPatchInpaint() {
  const originalPath = 'public/assets/aistudio/_Hwzd8wYYJ32X46n328x2qdCejPHUGnGhSuxivWZNuiwaY8oomVVTcW0aGyrQUvIMcXKNvWxwktsj0Vt6xaBaGVkY6qG2mcTyMwBwnEpvg0OU8pnbQ9OfFbHK168h6E1xetLrX40H3_q-Ktmw2itvz8MUDYqeV6LtVprPp40zrU0eLgMlW7a_ICMeKImAiAB_627e4728.jpg';
  const outputPath = 'public/assets/journeys/world_map_terrain.jpg';

  // Crop the 1228 x 1058 map from clean source
  const cropped = await sharp(originalPath)
    .extract({ left: 187, top: 132, width: 1228, height: 1058 })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = cropped.info;
  const out = Buffer.from(cropped.data);

  function getPixel(x, y) {
    x = Math.max(0, Math.min(width - 1, Math.round(x)));
    y = Math.max(0, Math.min(height - 1, Math.round(y)));
    const idx = (y * width + x) * channels;
    return [out[idx], out[idx + 1], out[idx + 2]];
  }

  function setPixel(x, y, r, g, b) {
    x = Math.max(0, Math.min(width - 1, Math.round(x)));
    y = Math.max(0, Math.min(height - 1, Math.round(y)));
    const idx = (y * width + x) * channels;
    out[idx] = Math.round(Math.max(0, Math.min(255, r)));
    out[idx + 1] = Math.round(Math.max(0, Math.min(255, g)));
    out[idx + 2] = Math.round(Math.max(0, Math.min(255, b)));
  }

  function smoothstep(edge0, edge1, x) {
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
  }

  /**
   * Coons patch boundary interpolation:
   * Perfectly interpolates all 4 borders (top, bottom, left, right)
   * with zero seam, and injects organic local terrain noise.
   */
  function inpaintCoonsPatch(x1, y1, x2, y2, grainGain = 1.0) {
    const w = x2 - x1;
    const h = y2 - y1;

    // Corner samples
    const c00 = getPixel(x1 - 1, y1 - 1);
    const c10 = getPixel(x2 + 1, y1 - 1);
    const c01 = getPixel(x1 - 1, y2 + 1);
    const c11 = getPixel(x2 + 1, y2 + 1);

    for (let y = y1; y <= y2; y++) {
      const v = (y - y1) / h;
      const sv = smoothstep(0, 1, v);

      const pLeft = getPixel(x1 - 1, y);
      const pRight = getPixel(x2 + 1, y);

      for (let x = x1; x <= x2; x++) {
        const u = (x - x1) / w;
        const su = smoothstep(0, 1, u);

        const pTop = getPixel(x, y1 - 1);
        const pBottom = getPixel(x, y2 + 1);

        // Coons patch formula
        for (let ch = 0; ch < 3; ch++) {
          const rBilinear =
            (1 - su) * (1 - sv) * c00[ch] +
            su * (1 - sv) * c10[ch] +
            (1 - su) * sv * c01[ch] +
            su * sv * c11[ch];

          const rLoft =
            (1 - su) * pLeft[ch] + su * pRight[ch] +
            (1 - sv) * pTop[ch] + sv * pBottom[ch] -
            rBilinear;

          // Local texture noise from the top/bottom boundary
          const grainY = y1 - 2 - ((x + y * 3) % 7);
          const [gr, gg, gb] = getPixel(x, grainY);
          const grainVal = [gr, gg, gb][ch];
          const localMean = 0.5 * (pTop[ch] + pBottom[ch]);
          const noise = (grainVal - localMean) * grainGain;

          const edgeDist = Math.min(x - x1, x2 - x, y - y1, y2 - y);
          const noiseWeight = smoothstep(0, 6, edgeDist);

          const finalVal = rLoft + noise * noiseWeight;
          if (ch === 0) var rOut = finalVal;
          if (ch === 1) var gOut = finalVal;
          if (ch === 2) var bOut = finalVal;
        }

        setPixel(x, y, rOut, gOut, bOut);
      }
    }
  }

  console.log('Applying seamless Coons patch inpainting...');

  // 1. Bastion of Storms Text Pill:
  // x: 180..435, y: 265..325
  inpaintCoonsPatch(180, 265, 435, 325, 0.85);

  // 2. Frostbound Spire Text Pill:
  // x: 865..1080, y: 240..318
  inpaintCoonsPatch(865, 240, 1080, 318, 0.7);

  // Frostbound Spire Chests:
  // x: 875..1085, y: 320..415
  inpaintCoonsPatch(875, 320, 1085, 415, 0.75);

  // 3. Dark Forest Text Pill & Gladiator:
  // x: 525..705, y: 535..615
  inpaintCoonsPatch(525, 535, 705, 615, 0.8);

  // Dark Forest Chests:
  // x: 510..725, y: 620..715
  inpaintCoonsPatch(510, 620, 725, 715, 0.8);

  // 4. Iron Mines Text Pill:
  // x: 235..400, y: 635..685
  inpaintCoonsPatch(235, 635, 400, 685, 0.85);

  // 5. Dunes Text Pill & Main Team:
  // x: 920..1070, y: 648..725
  inpaintCoonsPatch(920, 648, 1070, 725, 0.75);

  // Dunes Chests:
  // x: 840..1140, y: 730..835
  inpaintCoonsPatch(840, 730, 1140, 835, 0.8);

  // 6. Clean all baked-in floor numbers inside the 5 portal circles:
  function cleanCircleText(cx, cy, r, baseR, baseG, baseB) {
    for (let y = cy - r; y <= cy + r; y++) {
      for (let x = cx - r; x <= cx + r; x++) {
        const dist = Math.hypot(x - cx, y - cy);
        if (dist > r) continue;
        const norm = dist / r;
        const alpha = smoothstep(1.0, 0.7, norm);

        const [or, og, ob] = getPixel(x, y);
        setPixel(x, y, or * (1 - alpha * 0.95) + baseR * alpha * 0.95,
                      og * (1 - alpha * 0.95) + baseG * alpha * 0.95,
                      ob * (1 - alpha * 0.95) + baseB * alpha * 0.95);
      }
    }
  }

  cleanCircleText(978, 178, 30, 30, 85, 115);
  cleanCircleText(620, 485, 30, 20, 50, 30);
  cleanCircleText(1000, 590, 30, 185, 140, 75);
  cleanCircleText(326, 213, 28, 65, 35, 95);
  cleanCircleText(320, 580, 28, 38, 20, 10);

  await sharp(out, {
    raw: { width, height, channels },
  })
  .jpeg({ quality: 96 })
  .toFile(outputPath);

  console.log('Coons patch inpainting complete! Output saved to', outputPath);
}

coonsPatchInpaint().catch(console.error);
