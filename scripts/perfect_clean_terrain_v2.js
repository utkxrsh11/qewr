import sharp from 'sharp';

async function perfectCleanTerrainV2() {
  const originalPath = 'public/assets/aistudio/_Hwzd8wYYJ32X46n328x2qdCejPHUGnGhSuxivWZNuiwaY8oomVVTcW0aGyrQUvIMcXKNvWxwktsj0Vt6xaBaGVkY6qG2mcTyMwBwnEpvg0OU8pnbQ9OfFbHK168h6E1xetLrX40H3_q-Ktmw2itvz8MUDYqeV6LtVprPp40zrU0eLgMlW7a_ICMeKImAiAB_627e4728.jpg';
  const outputPath = 'public/assets/journeys/world_map_terrain.jpg';

  // Crop the 1228 x 1058 map from clean source
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
  // Text pill is strictly at x: 200..435, y: 265..325
  // Donor is right below at x: 200..435, y: 330..390
  clonePatch({
    target: [200, 265, 435, 325],
    donor: [200, 330, 435, 390],
    feather: 12,
  });

  // 2. Frostbound Spire Text Pill:
  // Text pill is strictly at x: 865..1080, y: 235..315
  // Donor: snowy alpine slope on the right at x: 1090..1220, y: 235..315
  clonePatch({
    target: [865, 235, 1080, 315],
    donor: [1090, 235, 1220, 315],
    feather: 12,
  });

  // Frostbound Chests:
  // Chests are strictly at x: 875..1085, y: 320..415
  // Donor: snowy mountain slopes on the right at x: 1090..1220, y: 320..415
  clonePatch({
    target: [875, 320, 1085, 415],
    donor: [1090, 320, 1220, 415],
    feather: 14,
  });

  // 3. Dark Forest Text Pill:
  // Text pill is strictly at x: 535..700, y: 535..615
  // Donor: lush pine forest immediately to the left at x: 370..530, y: 535..615
  clonePatch({
    target: [535, 535, 700, 615],
    donor: [370, 535, 530, 615],
    feather: 12,
  });

  // Dark Forest Chests:
  // Chests are strictly at x: 515..725, y: 622..715
  // Donor: lush pine forest immediately to the left at x: 345..510, y: 622..715
  clonePatch({
    target: [515, 622, 725, 715],
    donor: [345, 622, 510, 715],
    feather: 12,
  });

  // 4. Iron Mines Text Pill:
  // Pill is strictly at x: 245..400, y: 635..685
  // Donor: canyon plateau right below at x: 245..400, y: 690..740
  clonePatch({
    target: [245, 635, 400, 685],
    donor: [245, 690, 400, 740],
    feather: 10,
  });

  // 5. Dunes Text Pill:
  // Text pill is strictly at x: 925..1070, y: 650..725
  // Donor: golden desert dunes immediately to the right at x: 1080..1220, y: 650..725
  clonePatch({
    target: [925, 650, 1070, 725],
    donor: [1080, 650, 1220, 725],
    feather: 12,
  });

  // Dunes Chests:
  // Chests are strictly at x: 845..1140, y: 730..835
  // Donor: golden desert dunes immediately to the right at x: 1070..1225, y: 730..835
  clonePatch({
    target: [845, 730, 1140, 835],
    donor: [1070, 730, 1225, 835],
    feather: 14,
  });

  // Floor text inside circles:
  // Let's check: The React component `JourneysNode` places a solid dark circle with the floor number right over (cx, cy)!
  // But let's smoothly clear any text inside the orb circle so nothing peeks out:
  function clearOrbText(cx, cy, r, baseR, baseG, baseB) {
    for (let y = cy - r; y <= cy + r; y++) {
      for (let x = cx - r; x <= cx + r; x++) {
        const dist = Math.hypot(x - cx, y - cy);
        if (dist > r) continue;
        const alpha = Math.max(0, 1 - dist / r);
        const [or, og, ob] = getPixel(out, x, y);
        setPixel(out, x, y, or * (1 - alpha * 0.9) + baseR * alpha * 0.9,
                            og * (1 - alpha * 0.9) + baseG * alpha * 0.9,
                            ob * (1 - alpha * 0.9) + baseB * alpha * 0.9);
      }
    }
  }

  clearOrbText(978, 178, 30, 35, 85, 115);
  clearOrbText(620, 485, 30, 25, 55, 35);
  clearOrbText(1000, 590, 30, 185, 140, 75);

  // Save the result
  await sharp(out, {
    raw: { width, height, channels },
  })
  .jpeg({ quality: 96 })
  .toFile(outputPath);

  console.log('Successfully generated clean terrain V2!');
}

perfectCleanTerrainV2().catch(console.error);
