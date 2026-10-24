import sharp from 'sharp';

async function perfectCleanTerrain() {
  const originalPath = 'public/assets/aistudio/_Hwzd8wYYJ32X46n328x2qdCejPHUGnGhSuxivWZNuiwaY8oomVVTcW0aGyrQUvIMcXKNvWxwktsj0Vt6xaBaGVkY6qG2mcTyMwBwnEpvg0OU8pnbQ9OfFbHK168h6E1xetLrX40H3_q-Ktmw2itvz8MUDYqeV6LtVprPp40zrU0eLgMlW7a_ICMeKImAiAB_627e4728.jpg';
  const outputPath = 'public/assets/journeys/world_map_terrain.jpg';

  // Crop the 1228 x 1058 map
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

  /**
   * Seamlessly clone a donor rectangle onto a target rectangle with
   * feathered perimeter and color-mean matching
   */
  function clonePatch({
    target: [tx1, ty1, tx2, ty2],
    donor: [sx1, sy1, sx2, sy2],
    feather = 16,
    flipX = false,
  }) {
    const tw = tx2 - tx1;
    const th = ty2 - ty1;
    const sw = sx2 - sx1;
    const sh = sy2 - sy1;

    // Sample border colors
    let tSumR = 0, tSumG = 0, tSumB = 0, tCnt = 0;
    let sSumR = 0, sSumG = 0, sSumB = 0, sCnt = 0;

    for (let x = tx1; x <= tx2; x += 4) {
      const [r1, g1, b1] = getPixel(src, x, ty1 - 2);
      const [r2, g2, b2] = getPixel(src, x, ty2 + 2);
      tSumR += r1 + r2; tSumG += g1 + g2; tSumB += b1 + b2;
      tCnt += 2;
    }
    for (let y = ty1; y <= ty2; y += 4) {
      const [r1, g1, b1] = getPixel(src, tx1 - 2, y);
      const [r2, g2, b2] = getPixel(src, tx2 + 2, y);
      tSumR += r1 + r2; tSumG += g1 + g2; tSumB += b1 + b2;
      tCnt += 2;
    }

    for (let x = sx1; x <= sx2; x += 4) {
      const [r1, g1, b1] = getPixel(src, x, sy1 - 2);
      const [r2, g2, b2] = getPixel(src, x, sy2 + 2);
      sSumR += r1 + r2; sSumG += g1 + g2; sSumB += b1 + b2;
      sCnt += 2;
    }
    for (let y = sy1; y <= sy2; y += 4) {
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

        const adjR = sr + diffR * 0.9;
        const adjG = sg + diffG * 0.9;
        const adjB = sb + diffB * 0.9;

        const finalR = or * (1 - alpha) + adjR * alpha;
        const finalG = og * (1 - alpha) + adjG * alpha;
        const finalB = ob * (1 - alpha) + adjB * alpha;

        setPixel(out, x, y, finalR, finalG, finalB);
      }
    }
  }

  // Soft circular blending over orb center to remove old "Floor" text
  function blendOrbGlow(cx, cy, radius, baseColor, glowColor) {
    for (let y = cy - radius; y <= cy + radius; y++) {
      for (let x = cx - radius; x <= cx + radius; x++) {
        const dist = Math.hypot(x - cx, y - cy);
        if (dist > radius) continue;

        const normDist = dist / radius;
        const alpha = Math.max(0, Math.min(1, 1 - normDist * normDist));

        const [or, og, ob] = getPixel(out, x, y);

        // Core glow
        const glow = Math.exp(-normDist * 2.2);
        const cr = baseColor[0] * (1 - glow) + glowColor[0] * glow;
        const cg = baseColor[1] * (1 - glow) + glowColor[1] * glow;
        const cb = baseColor[2] * (1 - glow) + glowColor[2] * glow;

        const finalR = or * (1 - alpha) + cr * alpha;
        const finalG = og * (1 - alpha) + cg * alpha;
        const finalB = ob * (1 - alpha) + cb * alpha;

        setPixel(out, x, y, finalR, finalG, finalB);
      }
    }
  }

  console.log('1. Cleaning Bastion of Storms pill...');
  // Bastion text pill is at x: 175..425, y: 245..325
  // Pristine stormy mountain slope donor: x: 440..580, y: 220..300
  clonePatch({
    target: [175, 245, 425, 325],
    donor: [440, 220, 580, 300],
    feather: 16,
    flipX: true,
  });

  console.log('2. Cleaning Frostbound Spire...');
  // Frostbound text pill is at x: 840..1125, y: 225..318
  // Pristine snowy alpine ridge donor: x: 620..790, y: 160..250
  clonePatch({
    target: [840, 225, 1125, 318],
    donor: [620, 160, 790, 250],
    feather: 18,
    flipX: false,
  });

  // Frostbound chests are at x: 865..1095, y: 318..420
  // Pristine snowy slope donor: x: 650..810, y: 260..350
  clonePatch({
    target: [865, 318, 1095, 420],
    donor: [650, 260, 810, 350],
    feather: 18,
    flipX: false,
  });

  // Clean Frostbound floor text "91 Floor"
  blendOrbGlow(978, 178, 42, [25, 75, 95], [125, 220, 255]);

  console.log('3. Cleaning Dark Forest...');
  // Dark Forest text pill is at x: 530..705, y: 520..615
  // Pristine emerald pine valley donor: x: 320..460, y: 380..470
  clonePatch({
    target: [530, 520, 705, 615],
    donor: [320, 380, 460, 470],
    feather: 18,
    flipX: false,
  });

  // Dark Forest chests are at x: 510..735, y: 612..715
  // Pristine pine valley & riverbank donor: x: 330..480, y: 480..580
  clonePatch({
    target: [510, 612, 735, 715],
    donor: [330, 480, 480, 580],
    feather: 18,
    flipX: false,
  });

  // Clean Dark Forest floor text "115 Floor"
  blendOrbGlow(620, 485, 42, [20, 48, 25], [55, 135, 70]);

  console.log('4. Cleaning Iron Mines...');
  // Iron Mines text pill is at x: 205..405, y: 630..685
  // Pristine red canyon mesa donor: x: 90..215, y: 500..555
  clonePatch({
    target: [205, 630, 405, 685],
    donor: [90, 500, 215, 555],
    feather: 14,
    flipX: false,
  });

  // Clean Iron Mines orb center
  blendOrbGlow(320, 580, 38, [42, 22, 10], [185, 90, 25]);

  console.log('5. Cleaning Dunes...');
  // Dunes text pill is at x: 900..1065, y: 640..725
  // Pristine golden desert dunes donor: x: 680..820, y: 490..570
  clonePatch({
    target: [900, 640, 1065, 725],
    donor: [680, 490, 820, 570],
    feather: 18,
    flipX: false,
  });

  // Dunes chests are at x: 835..1150, y: 720..840
  // Pristine golden sand dunes & plains donor: x: 680..860, y: 580..690
  clonePatch({
    target: [835, 720, 1150, 840],
    donor: [680, 580, 860, 690],
    feather: 20,
    flipX: false,
  });

  // Clean Dunes floor text "117 Floor"
  blendOrbGlow(1000, 590, 44, [175, 135, 68], [250, 225, 155]);

  // Clean Bastion floor text/core
  blendOrbGlow(326, 213, 38, [65, 35, 95], [175, 125, 225]);

  // Save the result
  await sharp(out, {
    raw: { width, height, channels },
  })
  .jpeg({ quality: 96 })
  .toFile(outputPath);

  console.log('Perfect clean world map terrain saved to', outputPath);
}

perfectCleanTerrain().catch(console.error);
