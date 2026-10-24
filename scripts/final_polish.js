import sharp from 'sharp';

async function finalPolish() {
  const inputPath = 'public/assets/journeys/world_map_terrain.jpg';
  const outputPath = 'public/assets/journeys/world_map_terrain.jpg';

  const img = await sharp(inputPath).raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = img.info;
  const out = Buffer.from(img.data);

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

  function patchSliver(tx1, ty1, tx2, ty2, dx, dy, feather = 8) {
    const tw = tx2 - tx1;
    const th = ty2 - ty1;
    for (let y = ty1; y <= ty2; y++) {
      const distY = Math.min(y - ty1, ty2 - y);
      for (let x = tx1; x <= tx2; x++) {
        const distX = Math.min(x - tx1, tx2 - x);
        const dist = Math.min(distX, distY);
        const alpha = smoothstep(0, feather, dist);

        const [sr, sg, sb] = getPixel(x + dx, y + dy);
        const [or, og, ob] = getPixel(x, y);

        setPixel(x, y, or * (1 - alpha) + sr * alpha,
                      og * (1 - alpha) + sg * alpha,
                      ob * (1 - alpha) + sb * alpha);
      }
    }
  }

  // 1. Bastion bottom line
  patchSliver(170, 310, 370, 335, 0, 35, 8);

  // 2. Iron Mines "Mines" text
  patchSliver(310, 625, 395, 670, 0, 50, 8);

  // 3. Dunes chest remnant
  patchSliver(660, 750, 725, 830, 0, -60, 10);

  // 4. Dark Forest bottom edge line
  patchSliver(420, 592, 580, 618, 0, -130, 8);

  // 5. Opaque orb vortex cores to eliminate all baked-in floor numbers
  function fillOrbCore(cx, cy, r, [r1, g1, b1], [r2, g2, b2]) {
    for (let y = cy - r; y <= cy + r; y++) {
      for (let x = cx - r; x <= cx + r; x++) {
        const dist = Math.hypot(x - cx, y - cy);
        if (dist > r) continue;
        const norm = dist / r;
        const alpha = smoothstep(1.0, 0.8, norm); // solid core, feathered at rim

        const glow = Math.exp(-norm * 2.4);
        const fr = r1 * (1 - glow) + r2 * glow;
        const fg = g1 * (1 - glow) + g2 * glow;
        const fb = b1 * (1 - glow) + b2 * glow;

        const [or, og, ob] = getPixel(x, y);
        setPixel(x, y, or * (1 - alpha) + fr * alpha,
                      og * (1 - alpha) + fg * alpha,
                      ob * (1 - alpha) + fb * alpha);
      }
    }
  }

  // Frostbound Spire
  fillOrbCore(795, 172, 38, [15, 55, 80], [120, 225, 255]);
  // Also clean the old secondary circle at (885, 250) if any
  fillOrbCore(885, 250, 30, [140, 165, 185], [215, 235, 250]);

  // Dark Forest orb
  fillOrbCore(505, 465, 38, [15, 42, 22], [50, 130, 65]);

  // Dunes orb
  fillOrbCore(815, 575, 40, [155, 115, 55], [245, 215, 135]);
  fillOrbCore(780, 635, 34, [170, 135, 75], [230, 200, 125]);

  // Bastion orb
  fillOrbCore(264, 214, 38, [55, 28, 85], [165, 115, 225]);

  await sharp(out, {
    raw: { width, height, channels },
  })
  .jpeg({ quality: 96 })
  .toFile(outputPath);

  console.log('Final polish complete!');
}

finalPolish().catch(console.error);
