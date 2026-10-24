import sharp from 'sharp';

async function buildCleanPristineTerrain() {
  const inputPath = 'public/assets/journeys/world_map_terrain.jpg';
  const outputPath = 'public/assets/journeys/world_map_terrain_pristine.jpg';

  const { data, info } = await sharp(inputPath).raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const out = Buffer.from(data);

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

  /**
   * Clone a clean donor rectangle onto a target rectangle with feathered boundary
   * and boundary color matching
   */
  function cloneCleanPatch({
    target: [tx1, ty1, tx2, ty2],
    donor: [sx1, sy1, sx2, sy2],
    feather = 14,
    flipX = false,
  }) {
    const tw = tx2 - tx1;
    const th = ty2 - ty1;
    const sw = sx2 - sx1;
    const sh = sy2 - sy1;

    // Sample boundary color of target border vs donor border to adjust lighting
    let tSumR = 0, tSumG = 0, tSumB = 0, tCount = 0;
    let sSumR = 0, sSumG = 0, sSumB = 0, sCount = 0;

    for (let x = tx1; x <= tx2; x += 4) {
      const [r1, g1, b1] = getPixel(data, x, ty1 - 3);
      const [r2, g2, b2] = getPixel(data, x, ty2 + 3);
      tSumR += r1 + r2; tSumG += g1 + g2; tSumB += b1 + b2;
      tCount += 2;
    }
    for (let y = ty1; y <= ty2; y += 4) {
      const [r1, g1, b1] = getPixel(data, tx1 - 3, y);
      const [r2, g2, b2] = getPixel(data, tx2 + 3, y);
      tSumR += r1 + r2; tSumG += g1 + g2; tSumB += b1 + b2;
      tCount += 2;
    }

    for (let x = sx1; x <= sx2; x += 4) {
      const [r1, g1, b1] = getPixel(data, x, sy1 - 3);
      const [r2, g2, b2] = getPixel(data, x, sy2 + 3);
      sSumR += r1 + r2; sSumG += g1 + g2; sSumB += b1 + b2;
      sCount += 2;
    }
    for (let y = sy1; y <= sy2; y += 4) {
      const [r1, g1, b1] = getPixel(data, sx1 - 3, y);
      const [r2, g2, b2] = getPixel(data, sx2 + 3, y);
      sSumR += r1 + r2; sSumG += g1 + g2; sSumB += b1 + b2;
      sCount += 2;
    }

    const diffR = (tSumR / tCount) - (sSumR / sCount);
    const diffG = (tSumG / tCount) - (sSumG / sCount);
    const diffB = (tSumB / tCount) - (sSumB / sCount);

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

        const [sR, sG, sB] = getPixel(data, srcX, srcY);
        const [oR, oG, oB] = getPixel(out, x, y);

        const adjR = sR + diffR * 0.9;
        const adjG = sG + diffG * 0.9;
        const adjB = sB + diffB * 0.9;

        const finalR = oR * (1 - alpha) + adjR * alpha;
        const finalG = oG * (1 - alpha) + adjG * alpha;
        const finalB = oB * (1 - alpha) + adjB * alpha;

        setPixel(out, x, y, finalR, finalG, finalB);
      }
    }
  }

  console.log('Patching Bastion of Storms with pristine stormy mountain ridges...');
  // 1. Bastion circle & pill: x: 215..440, y: 165..330
  // Clean donor: x: 70..190, y: 150..315 (pristine dark stormy snowy ridges on far left)
  cloneCleanPatch({
    target: [215, 165, 440, 330],
    donor: [70, 150, 190, 315],
    feather: 16,
    flipX: false,
  });

  console.log('Patching Frostbound Spire with pristine alpine snow peaks...');
  // 2. Frostbound circle & pill: x: 865..1085, y: 120..325
  // Clean donor: x: 540..740, y: 140..345 (magnificent snowy alpine peaks in center-top)
  cloneCleanPatch({
    target: [865, 120, 1085, 325],
    donor: [540, 140, 740, 345],
    feather: 18,
    flipX: false,
  });

  // Frostbound chests & text: x: 875..1085, y: 325..420
  // Clean donor: x: 620..810, y: 310..405 (snow slopes)
  cloneCleanPatch({
    target: [875, 325, 1085, 420],
    donor: [620, 310, 810, 405],
    feather: 16,
    flipX: false,
  });

  console.log('Patching Dark Forest with pristine emerald pine valley...');
  // 3. Dark forest circle & pill: x: 520..715, y: 430..620
  // Clean donor: x: 330..510, y: 410..600 (rich lush pine forest valley on the left)
  cloneCleanPatch({
    target: [520, 430, 715, 620],
    donor: [330, 410, 510, 600],
    feather: 18,
    flipX: false,
  });

  // Dark forest chests & text: x: 515..730, y: 620..720
  // Clean donor: x: 330..525, y: 600..700 (lush forest slopes)
  cloneCleanPatch({
    target: [515, 620, 730, 720],
    donor: [330, 600, 525, 700],
    feather: 16,
    flipX: false,
  });

  console.log('Patching Iron Mines with pristine red canyon ridges...');
  // 4. Iron Mines circle & pill: x: 220..395, y: 530..700
  // Clean donor: x: 90..215, y: 510..680 (rocky canyon plateaus on far left)
  cloneCleanPatch({
    target: [220, 530, 395, 700],
    donor: [90, 510, 215, 680],
    feather: 16,
    flipX: true,
  });

  console.log('Patching Dunes with pristine golden desert dunes...');
  // 5. Dunes circle & pill: x: 920..1080, y: 535..735
  // Clean donor: x: 680..820, y: 535..735 (sunlit golden sands and hills)
  cloneCleanPatch({
    target: [920, 535, 1080, 735],
    donor: [680, 535, 820, 735],
    feather: 18,
    flipX: false,
  });

  // Dunes chests: x: 850..1150, y: 735..840
  // Clean donor: x: 680..920, y: 640..745
  cloneCleanPatch({
    target: [850, 735, 1150, 840],
    donor: [680, 640, 920, 745],
    feather: 18,
    flipX: false,
  });

  await sharp(out, {
    raw: { width, height, channels },
  })
  .jpeg({ quality: 96 })
  .toFile(outputPath);

  console.log('Pristine clean terrain generation complete!');
}

buildCleanPristineTerrain().catch(console.error);
