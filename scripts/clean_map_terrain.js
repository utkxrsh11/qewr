import sharp from 'sharp';

async function generateCleanTerrain() {
  const inputPath = 'public/assets/journeys/world_map_terrain.jpg';
  const outputPath = 'public/assets/journeys/world_map_terrain_clean.jpg';

  const { data, info } = await sharp(inputPath).raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  // Clone buffer so we can read from original and write to output
  const outputData = Buffer.from(data);

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

  // Smooth feather function between 0 and 1
  function smoothstep(edge0, edge1, x) {
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
  }

  /**
   * Seamless patch replacement with color transfer and feathered boundary
   */
  function patchRegion({
    targetBox, // [minX, minY, maxX, maxY]
    sourceBox, // [minX, minY, maxX, maxY]
    flipX = false,
    feather = 20,
  }) {
    const [tMinX, tMinY, tMaxX, tMaxY] = targetBox;
    const [sMinX, sMinY, sMaxX, sMaxY] = sourceBox;
    const tW = tMaxX - tMinX;
    const tH = tMaxY - tMinY;
    const sW = sMaxX - sMinX;
    const sH = sMaxY - sMinY;

    // 1. Calculate color statistics for border of target (untainted surrounding) vs border of source
    let tBorderR = 0, tBorderG = 0, tBorderB = 0, tCount = 0;
    let sBorderR = 0, sBorderG = 0, sBorderB = 0, sCount = 0;

    // Sample ring around target box
    for (let x = tMinX - 8; x <= tMaxX + 8; x += 3) {
      for (let y = tMinY - 8; y <= tMaxY + 8; y += 3) {
        if (x < tMinX || x > tMaxX || y < tMinY || y > tMaxY) {
          const [r, g, b] = getPixel(data, x, y);
          tBorderR += r; tBorderG += g; tBorderB += b;
          tCount++;
        }
      }
    }
    // Sample ring around source box
    for (let x = sMinX - 8; x <= sMaxX + 8; x += 3) {
      for (let y = sMinY - 8; y <= sMaxY + 8; y += 3) {
        if (x < sMinX || x > sMaxX || y < sMinY || y > sMaxY) {
          const [r, g, b] = getPixel(data, x, y);
          sBorderR += r; sBorderG += g; sBorderB += b;
          sCount++;
        }
      }
    }

    const tMean = [tBorderR / (tCount || 1), tBorderG / (tCount || 1), tBorderB / (tCount || 1)];
    const sMean = [sBorderR / (sCount || 1), sBorderG / (sCount || 1), sBorderB / (sCount || 1)];
    const diff = [tMean[0] - sMean[0], tMean[1] - sMean[1], tMean[2] - sMean[2]];

    for (let y = tMinY; y <= tMaxY; y++) {
      const v = (y - tMinY) / tH;
      const distY = Math.min(y - tMinY, tMaxY - y);

      for (let x = tMinX; x <= tMaxX; x++) {
        const u = flipX ? 1 - (x - tMinX) / tW : (x - tMinX) / tW;
        const distX = Math.min(x - tMinX, tMaxX - x);
        const distEdge = Math.min(distX, distY);

        // Alpha weight: 0 at outer boundary, 1 inside past feather distance
        const alpha = smoothstep(0, feather, distEdge);

        const srcX = sMinX + u * sW;
        const srcY = sMinY + v * sH;

        const [sR, sG, sB] = getPixel(data, srcX, srcY);
        const [origR, origG, origB] = getPixel(data, x, y);

        // Color-adjusted source pixel
        const adjR = sR + diff[0] * 0.85;
        const adjG = sG + diff[1] * 0.85;
        const adjB = sB + diff[2] * 0.85;

        // Blend with original at edges
        const finalR = origR * (1 - alpha) + adjR * alpha;
        const finalG = origG * (1 - alpha) + adjG * alpha;
        const finalB = origB * (1 - alpha) + adjB * alpha;

        setPixel(outputData, x, y, finalR, finalG, finalB);
      }
    }
  }

  console.log('Inpainting Bastion of Storms...');
  // Bastion has mountain peaks to left and right
  patchRegion({
    targetBox: [220, 150, 435, 325],
    sourceBox: [110, 140, 220, 315],
    flipX: true,
    feather: 22,
  });

  console.log('Inpainting Frostbound Spire...');
  // Frostbound Spire circle, pill, and chests (x: 860..1090, y: 110..425)
  // Donor: Snowy alpine peaks to right and upper mountain ridge
  patchRegion({
    targetBox: [860, 110, 1090, 425],
    sourceBox: [680, 130, 850, 400],
    flipX: true,
    feather: 28,
  });

  console.log('Inpainting Dark Forest...');
  // Dark Forest circle, pill, and chests (x: 510..740, y: 430..720)
  // Donor: dense forest valley on left (370..500, 430..710)
  patchRegion({
    targetBox: [510, 430, 740, 720],
    sourceBox: [370, 430, 500, 710],
    flipX: false,
    feather: 26,
  });

  console.log('Inpainting Iron Mines...');
  // Iron Mines circle and pill (x: 250..400, y: 520..700)
  // Donor: Canyon ridges and plateaus to left (130..245, 520..690)
  patchRegion({
    targetBox: [250, 520, 400, 700],
    sourceBox: [130, 520, 245, 690],
    flipX: true,
    feather: 22,
  });

  console.log('Inpainting Dunes...');
  // Dunes circle, pill, and chests (x: 850..1150, y: 525..840)
  // Donor: golden desert dunes from (730..840, 525..820)
  patchRegion({
    targetBox: [850, 525, 1150, 840],
    sourceBox: [720, 525, 840, 820],
    flipX: false,
    feather: 30,
  });

  // Save the cleaned terrain
  await sharp(outputData, {
    raw: {
      width,
      height,
      channels,
    },
  })
  .jpeg({ quality: 92 })
  .toFile(outputPath);

  console.log('Successfully generated clean terrain to', outputPath);
}

generateCleanTerrain().catch(console.error);
