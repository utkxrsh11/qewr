import sharp from 'sharp';

async function flawlessCleanMap() {
  const originalPath = 'public/assets/aistudio/_Hwzd8wYYJ32X46n328x2qdCejPHUGnGhSuxivWZNuiwaY8oomVVTcW0aGyrQUvIMcXKNvWxwktsj0Vt6xaBaGVkY6qG2mcTyMwBwnEpvg0OU8pnbQ9OfFbHK168h6E1xetLrX40H3_q-Ktmw2itvz8MUDYqeV6LtVprPp40zrU0eLgMlW7a_ICMeKImAiAB_627e4728.jpg';
  const outputPath = 'public/assets/journeys/world_map_terrain.jpg';

  // Crop the raw map from original screenshot
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
    return [cropped.data[idx], cropped.data[idx + 1], cropped.data[idx + 2]];
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
   * Clone a clean nearby region over the target box with feathered boundary & lighting adjustment
   */
  function cloneTerrainPatch({
    target: [tx1, ty1, tx2, ty2],
    donorOffset: [dx, dy],
    feather = 12,
  }) {
    const tw = tx2 - tx1;
    const th = ty2 - ty1;

    // Sample border colors to match lighting
    let tSumR = 0, tSumG = 0, tSumB = 0;
    let sSumR = 0, sSumG = 0, sSumB = 0;
    let count = 0;

    for (let x = tx1; x <= tx2; x += 3) {
      const [tr1, tg1, tb1] = getPixel(x, ty1 - 2);
      const [sr1, sg1, sb1] = getPixel(x + dx, ty1 + dy - 2);
      const [tr2, tg2, tb2] = getPixel(x, ty2 + 2);
      const [sr2, sg2, sb2] = getPixel(x + dx, ty2 + dy + 2);
      tSumR += tr1 + tr2; tSumG += tg1 + tg2; tSumB += tb1 + tb2;
      sSumR += sr1 + sr2; sSumG += sg1 + sg2; sSumB += sb1 + sb2;
      count += 2;
    }

    const diffR = (tSumR - sSumR) / (count || 1);
    const diffG = (tSumG - sSumG) / (count || 1);
    const diffB = (tSumB - sSumB) / (count || 1);

    for (let y = ty1; y <= ty2; y++) {
      const distY = Math.min(y - ty1, ty2 - y);
      for (let x = tx1; x <= tx2; x++) {
        const distX = Math.min(x - tx1, tx2 - x);
        const dist = Math.min(distX, distY);
        const alpha = smoothstep(0, feather, dist);

        const [sr, sg, sb] = getPixel(x + dx, y + dy);
        const [or, og, ob] = getPixel(x, y);

        const adjR = sr + diffR;
        const adjG = sg + diffG;
        const adjB = sb + diffB;

        const finalR = or * (1 - alpha) + adjR * alpha;
        const finalG = og * (1 - alpha) + adjG * alpha;
        const finalB = ob * (1 - alpha) + adjB * alpha;

        setPixel(x, y, finalR, finalG, finalB);
      }
    }
  }

  // Clean the inner text of a portal orb
  function cleanOrbCenter(cx, cy, radius, baseColor, glowColor) {
    for (let y = cy - radius; y <= cy + radius; y++) {
      for (let x = cx - radius; x <= cx + radius; x++) {
        const dist = Math.hypot(x - cx, y - cy);
        if (dist > radius) continue;

        const normDist = dist / radius;
        const alpha = smoothstep(1.0, 0.75, normDist); // soft outer edge

        const [or, og, ob] = getPixel(x, y);

        // Core glow
        const glow = Math.exp(-normDist * 2.5);
        const cr = baseColor[0] * (1 - glow) + glowColor[0] * glow;
        const cg = baseColor[1] * (1 - glow) + glowColor[1] * glow;
        const cb = baseColor[2] * (1 - glow) + glowColor[2] * glow;

        const finalR = or * (1 - alpha) + cr * alpha;
        const finalG = og * (1 - alpha) + cg * alpha;
        const finalB = ob * (1 - alpha) + cb * alpha;

        setPixel(x, y, finalR, finalG, finalB);
      }
    }
  }

  console.log('1. Cleaning Bastion of Storms...');
  // Pill bounds: x: 175..425, y: 245..325. Donor: mountain ridge 70px below
  cloneTerrainPatch({
    target: [175, 245, 425, 325],
    donorOffset: [0, 68],
    feather: 14,
  });

  console.log('2. Cleaning Frostbound Spire...');
  // Pill bounds: x: 840..1125, y: 225..318. Donor: upper alpine ridge 70px higher & 30px left
  cloneTerrainPatch({
    target: [840, 225, 1125, 318],
    donorOffset: [-120, -75],
    feather: 14,
  });
  // Chests bounds: x: 865..1095, y: 318..420. Donor: snowy slope 100px higher
  cloneTerrainPatch({
    target: [865, 318, 1095, 420],
    donorOffset: [-150, -110],
    feather: 14,
  });
  // Clean Frostbound orb core
  cleanOrbCenter(978, 178, 34, [20, 65, 85], [110, 215, 255]);

  console.log('3. Cleaning Dark Forest...');
  // Pill bounds: x: 530..705, y: 520..615. Donor: lush forest 110px to left
  cloneTerrainPatch({
    target: [530, 520, 705, 615],
    donorOffset: [-145, 0],
    feather: 14,
  });
  // Chests bounds: x: 510..735, y: 612..715. Donor: lush forest 145px to left
  cloneTerrainPatch({
    target: [510, 612, 735, 715],
    donorOffset: [-155, 0],
    feather: 14,
  });
  // Clean Dark Forest orb core
  cleanOrbCenter(620, 485, 34, [18, 42, 22], [45, 120, 60]);

  console.log('4. Cleaning Iron Mines...');
  // Pill bounds: x: 205..405, y: 630..685. Donor: canyon slope 55px below
  cloneTerrainPatch({
    target: [205, 630, 405, 685],
    donorOffset: [0, 58],
    feather: 12,
  });
  // Clean Iron Mines orb core
  cleanOrbCenter(320, 580, 32, [35, 18, 8], [175, 80, 20]);

  console.log('5. Cleaning Dunes...');
  // Pill bounds: x: 900..1065, y: 640..725. Donor: golden dunes 75px higher & 30px right
  cloneTerrainPatch({
    target: [900, 640, 1065, 725],
    donorOffset: [40, -65],
    feather: 14,
  });
  // Chests bounds: x: 835..1150, y: 720..840. Donor: desert sands 80px lower
  cloneTerrainPatch({
    target: [835, 720, 1150, 840],
    donorOffset: [0, 75],
    feather: 16,
  });
  // Clean Dunes orb core
  cleanOrbCenter(1000, 590, 34, [165, 125, 60], [245, 215, 140]);

  // Save the pristine result
  await sharp(out, {
    raw: { width, height, channels },
  })
  .jpeg({ quality: 96 })
  .toFile(outputPath);

  console.log('Flawless clean world map saved to', outputPath);
}

flawlessCleanMap().catch(console.error);
