import sharp from 'sharp';

async function perfectCleanTerrainV3() {
  const originalPath = 'public/assets/aistudio/_Hwzd8wYYJ32X46n328x2qdCejPHUGnGhSuxivWZNuiwaY8oomVVTcW0aGyrQUvIMcXKNvWxwktsj0Vt6xaBaGVkY6qG2mcTyMwBwnEpvg0OU8pnbQ9OfFbHK168h6E1xetLrX40H3_q-Ktmw2itvz8MUDYqeV6LtVprPp40zrU0eLgMlW7a_ICMeKImAiAB_627e4728.jpg';
  const outputPath = 'public/assets/journeys/world_map_terrain.jpg';

  const cropped = await sharp(originalPath)
    .extract({ left: 187, top: 132, width: 1228, height: 1058 })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = cropped.info;
  const src = cropped.data;
  const out = Buffer.from(src);

  function getPixel(buf, x, y) {
    x = Math.max(0, Math.min(width - 1, Math.round(x)));
    y = Math.max(0, Math.min(height - 1, Math.round(y)));
    const idx = (y * width + x) * channels;
    return [buf[idx], buf[idx + 1], buf[idx + 2]];
  }

  function setPixel(buf, x, y, r, g, b) {
    x = Math.max(0, Math.min(width - 1, Math.round(x)));
    y = Math.max(0, Math.min(height - 1, Math.round(y)));
    const idx = (y * width + x) * channels;
    buf[idx] = Math.round(Math.max(0, Math.min(255, r)));
    buf[idx + 1] = Math.round(Math.max(0, Math.min(255, g)));
    buf[idx + 2] = Math.round(Math.max(0, Math.min(255, b)));
  }

  function smoothstep(edge0, edge1, x) {
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
  }

  function clonePatch({
    target: [tx1, ty1, tx2, ty2],
    donor: [sx1, sy1, sx2, sy2],
    feather = 14,
    flipX = false,
  }) {
    const tw = tx2 - tx1;
    const th = ty2 - ty1;
    const sw = sx2 - sx1;
    const sh = sy2 - sy1;

    let tSumR = 0, tSumG = 0, tSumB = 0, tCnt = 0;
    let sSumR = 0, sSumG = 0, sSumB = 0, sCnt = 0;

    for (let x = tx1; x <= tx2; x += 3) {
      const [r1, g1, b1] = getPixel(src, x, ty1 - 2);
      const [r2, g2, b2] = getPixel(src, x, ty2 + 2);
      tSumR += r1 + r2; tSumG += g1 + g2; tSumB += b1 + b2;
      tCnt += 2;
    }
    for (let y = ty1; y <= ty2; y += 3) {
      const [r1, g1, b1] = getPixel(src, tx1 - 2, y);
      const [r2, g2, b2] = getPixel(src, tx2 + 2, y);
      tSumR += r1 + r2; tSumG += g1 + g2; tSumB += b1 + b2;
      tCnt += 2;
    }

    for (let x = sx1; x <= sx2; x += 3) {
      const [r1, g1, b1] = getPixel(src, x, sy1 - 2);
      const [r2, g2, b2] = getPixel(src, x, sy2 + 2);
      sSumR += r1 + r2; sSumG += g1 + g2; sSumB += b1 + b2;
      sCnt += 2;
    }
    for (let y = sy1; y <= sy2; y += 3) {
      const [r1, g1, b1] = getPixel(src, sx1 - 2, y);
      const [r2, g2, b2] = getPixel(src, sx2 + 2, y);
      sSumR += r1 + r2; sSumG += g1 + g2; sSumB += b1 + b2;
      sCnt += 2;
    }

    const diffR = (tSumR / tCnt) - (sSumR / sCnt);
    const diffG = (tSumG / tCnt) - (sSumG / sCnt);
    const diffB = (tSumB / tCnt) - (sSumB / sCnt);

    for (let y = ty1; y <= ty2; y++) {
      const v = (y - ty1) / th;
      const distY = Math.min(y - ty1, ty2 - y);

      for (let x = tx1; x <= tx2; x++) {
        const u = flipX ? 1 - (x - tx1) / tw : (x - tx1) / tw;
        const distX = Math.min(x - tx1, tx2 - x);
        const dist = Math.min(distX, distY);
        const alpha = smoothstep(0, feather, dist);

        const srcX = sx1 + u * sw;
        const srcY = sy1 + v * sh;

        const [sr, sg, sb] = getPixel(src, srcX, srcY);
        const [or, og, ob] = getPixel(out, x, y);

        const adjR = sr + diffR * 0.95;
        const adjG = sg + diffG * 0.95;
        const adjB = sb + diffB * 0.95;

        const finalR = or * (1 - alpha) + adjR * alpha;
        const finalG = og * (1 - alpha) + adjG * alpha;
        const finalB = ob * (1 - alpha) + adjB * alpha;

        setPixel(out, x, y, finalR, finalG, finalB);
      }
    }
  }

  // 1. Bastion of Storms Text Pill:
  // Target: [170, 250, 445, 335]. Clean mountain slope below: [170, 345, 445, 430]
  clonePatch({
    target: [170, 250, 445, 335],
    donor: [170, 345, 445, 430],
    feather: 14,
  });

  // 2. Frostbound Spire:
  // Text pill: [860, 230, 1085, 318]. Clean alpine slope on right: [1090, 230, 1220, 318]
  clonePatch({
    target: [860, 230, 1085, 318],
    donor: [1090, 230, 1220, 318],
    feather: 14,
  });
  // Chests: [865, 318, 1090, 420]. Clean snowy mountain slope: [1090, 320, 1220, 420]
  clonePatch({
    target: [865, 318, 1090, 420],
    donor: [1090, 320, 1220, 420],
    feather: 14,
  });

  // 3. Dark Forest:
  // Text pill & Gladiator: [490, 520, 715, 620]. Clean lush pine forest above: [360, 390, 510, 490]
  clonePatch({
    target: [490, 520, 715, 620],
    donor: [360, 390, 510, 490],
    feather: 14,
  });
  // Chests & x70 x10: [460, 620, 735, 725]. Clean lush forest to lower left: [320, 700, 460, 805]
  clonePatch({
    target: [460, 620, 735, 725],
    donor: [320, 700, 460, 805],
    feather: 14,
  });
  // Stray middle box: [405, 610, 475, 675]. Clean forest: [330, 610, 400, 675]
  clonePatch({
    target: [405, 610, 475, 675],
    donor: [330, 610, 400, 675],
    feather: 10,
  });

  // 4. Iron Mines:
  // Text pill: [230, 630, 405, 690]. Canyon slope below: [230, 695, 405, 755]
  clonePatch({
    target: [230, 630, 405, 690],
    donor: [230, 695, 405, 755],
    feather: 12,
  });

  // 5. Dunes:
  // Text pill & Main team: [885, 635, 1080, 730]. Golden sand dunes in upper desert: [690, 480, 840, 575]
  clonePatch({
    target: [885, 635, 1080, 730],
    donor: [690, 480, 840, 575],
    feather: 14,
  });
  // All 3 chests & x25 x5 x1: [825, 715, 1170, 845]. Golden sand dunes & plains: [670, 470, 860, 600]
  clonePatch({
    target: [825, 715, 1170, 845],
    donor: [670, 470, 860, 600],
    feather: 16,
  });

  // Floor text inside circles:
  function clearOrbText(cx, cy, r, baseR, baseG, baseB) {
    for (let y = cy - r; y <= cy + r; y++) {
      for (let x = cx - r; x <= cx + r; x++) {
        const dist = Math.hypot(x - cx, y - cy);
        if (dist > r) continue;
        const alpha = Math.max(0, 1 - dist / r);
        const [or, og, ob] = getPixel(out, x, y);
        setPixel(out, x, y, or * (1 - alpha * 0.92) + baseR * alpha * 0.92,
                            og * (1 - alpha * 0.92) + baseG * alpha * 0.92,
                            ob * (1 - alpha * 0.92) + baseB * alpha * 0.92);
      }
    }
  }

  clearOrbText(978, 178, 30, 30, 80, 110);
  clearOrbText(620, 485, 30, 20, 50, 30);
  clearOrbText(1000, 590, 30, 180, 135, 70);

  // Save the result
  await sharp(out, {
    raw: { width, height, channels },
  })
  .jpeg({ quality: 96 })
  .toFile(outputPath);

  console.log('Successfully generated clean terrain V3!');
}

perfectCleanTerrainV3().catch(console.error);
