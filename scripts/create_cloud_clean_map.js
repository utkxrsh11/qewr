import sharp from 'sharp';

async function createCleanAtmosphericMap() {
  const originalPath = 'public/assets/aistudio/_Hwzd8wYYJ32X46n328x2qdCejPHUGnGhSuxivWZNuiwaY8oomVVTcW0aGyrQUvIMcXKNvWxwktsj0Vt6xaBaGVkY6qG2mcTyMwBwnEpvg0OU8pnbQ9OfFbHK168h6E1xetLrX40H3_q-Ktmw2itvz8MUDYqeV6LtVprPp40zrU0eLgMlW7a_ICMeKImAiAB_627e4728.jpg';
  const outputPath = 'public/assets/journeys/world_map_terrain.jpg';

  // Crop the clean base terrain from the high-res original screenshot
  const cropped = await sharp(originalPath)
    .extract({ left: 187, top: 132, width: 1228, height: 1058 })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = cropped.info;
  const data = Buffer.from(cropped.data);

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
    data[idx] = Math.round(Math.max(0, Math.min(255, r)));
    data[idx + 1] = Math.round(Math.max(0, Math.min(255, g)));
    data[idx + 2] = Math.round(Math.max(0, Math.min(255, b)));
  }

  // Smooth Gaussian cloud puff
  function addAtmosphericPuff({
    cx,
    cy,
    rx,
    ry,
    baseColor, // [r, g, b]
    highlightColor, // [r, g, b]
    maxAlpha = 0.96,
  }) {
    for (let y = Math.max(0, Math.floor(cy - ry * 1.3)); y <= Math.min(height - 1, Math.ceil(cy + ry * 1.3)); y++) {
      const ny = (y - cy) / ry;
      for (let x = Math.max(0, Math.floor(cx - rx * 1.3)); x <= Math.min(width - 1, Math.ceil(cx + rx * 1.3)); x++) {
        const nx = (x - cx) / rx;
        const distSq = nx * nx + ny * ny;
        if (distSq > 1.4) continue;

        // Gaussian density with soft organic edge
        const density = Math.exp(-distSq * 1.85);
        const alpha = Math.max(0, Math.min(1, density * maxAlpha));

        const [or, og, ob] = getPixel(x, y);

        // Highlight gradient (lighter on top)
        const hl = Math.max(0, Math.min(1, -ny * 0.5 + 0.5));
        const cr = baseColor[0] * (1 - hl) + highlightColor[0] * hl;
        const cg = baseColor[1] * (1 - hl) + highlightColor[1] * hl;
        const cb = baseColor[2] * (1 - hl) + highlightColor[2] * hl;

        const fr = or * (1 - alpha) + cr * alpha;
        const fg = og * (1 - alpha) + cg * alpha;
        const fb = ob * (1 - alpha) + cb * alpha;

        setPixel(x, y, fr, fg, fb);
      }
    }
  }

  console.log('Adding natural atmospheric cloud banks over old UI regions...');

  // 1. Bastion of Storms Text Pill:
  // Pill at x: 326, y: 290 (w~210, h~45). Natural dark storm cloud puff
  addAtmosphericPuff({
    cx: 326,
    cy: 292,
    rx: 115,
    ry: 26,
    baseColor: [32, 28, 48], // Dark tempest purple-grey
    highlightColor: [85, 75, 115], // Lit storm cloud rim
    maxAlpha: 0.98,
  });

  // 2. Frostbound Spire Text Pill & Chests:
  // Pill at x: 978, y: 275 (w~210, h~70). Chests at x: 980, y: 360 (w~200, h~80)
  // Alpine snow cloud & mountain fog
  addAtmosphericPuff({
    cx: 978,
    cy: 275,
    rx: 110,
    ry: 38,
    baseColor: [160, 185, 205], // Misty alpine blue-grey
    highlightColor: [235, 245, 255], // Pure snow white
    maxAlpha: 0.98,
  });
  addAtmosphericPuff({
    cx: 980,
    cy: 362,
    rx: 115,
    ry: 42,
    baseColor: [145, 175, 195],
    highlightColor: [225, 240, 252],
    maxAlpha: 0.98,
  });

  // Frostbound circular orb floor text "91 / Floor" at (978, 178)
  addAtmosphericPuff({
    cx: 978,
    cy: 178,
    rx: 40,
    ry: 40,
    baseColor: [28, 75, 95], // Deep glacial cyan
    highlightColor: [90, 195, 235], // Glowing ice core
    maxAlpha: 0.95,
  });

  // 3. Dark Forest Text Pill & Chests:
  // Pill at x: 620, y: 570 (w~160, h~70). Chests at x: 620, y: 665 (w~190, h~75)
  // Emerald valley mist and forest canopy fog
  addAtmosphericPuff({
    cx: 620,
    cy: 570,
    rx: 105,
    ry: 36,
    baseColor: [36, 68, 40], // Deep moss pine
    highlightColor: [78, 125, 68], // Sunlit misty forest glade
    maxAlpha: 0.98,
  });
  addAtmosphericPuff({
    cx: 620,
    cy: 665,
    rx: 110,
    ry: 40,
    baseColor: [32, 62, 36],
    highlightColor: [72, 118, 62],
    maxAlpha: 0.98,
  });

  // Dark Forest circular orb floor text "115 / Floor" at (620, 485)
  addAtmosphericPuff({
    cx: 620,
    cy: 485,
    rx: 38,
    ry: 38,
    baseColor: [20, 48, 26],
    highlightColor: [45, 115, 62],
    maxAlpha: 0.95,
  });

  // 4. Iron Mines Text Pill:
  // Pill at x: 320, y: 650 (w~130, h~42)
  // Warm terracotta canyon haze and quarry dust
  addAtmosphericPuff({
    cx: 320,
    cy: 652,
    rx: 85,
    ry: 26,
    baseColor: [92, 54, 32], // Red canyon rock
    highlightColor: [168, 112, 70], // Dust haze
    maxAlpha: 0.98,
  });

  // Iron Mines circular orb center at (320, 580)
  addAtmosphericPuff({
    cx: 320,
    cy: 580,
    rx: 36,
    ry: 36,
    baseColor: [35, 18, 8],
    highlightColor: [180, 85, 25],
    maxAlpha: 0.95,
  });

  // 5. Dunes Text Pill & Chests:
  // Pill at x: 1000, y: 680 (w~130, h~65). Chests at x: 1000, y: 780 (w~270, h~90)
  // Sunlit golden desert sand haze
  addAtmosphericPuff({
    cx: 1000,
    cy: 680,
    rx: 85,
    ry: 34,
    baseColor: [185, 145, 78], // Golden sand
    highlightColor: [245, 215, 140], // Sunbeam glow
    maxAlpha: 0.98,
  });
  addAtmosphericPuff({
    cx: 1000,
    cy: 780,
    rx: 145,
    ry: 45,
    baseColor: [180, 140, 72],
    highlightColor: [240, 210, 135],
    maxAlpha: 0.98,
  });

  // Dunes circular orb floor text "117 / Floor" at (1000, 590)
  addAtmosphericPuff({
    cx: 1000,
    cy: 590,
    rx: 40,
    ry: 40,
    baseColor: [175, 135, 68],
    highlightColor: [245, 220, 155],
    maxAlpha: 0.95,
  });

  // Save as final world_map_terrain.jpg
  await sharp(data, {
    raw: { width, height, channels },
  })
  .jpeg({ quality: 96 })
  .toFile(outputPath);

  console.log('Successfully generated clean atmospheric world map terrain to', outputPath);
}

createCleanAtmosphericMap().catch(console.error);
