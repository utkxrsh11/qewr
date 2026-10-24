import sharp from 'sharp';

async function precisionInpaint() {
  const inputPath = 'public/assets/journeys/world_map_terrain.jpg';
  const outputPath = 'public/assets/journeys/world_map_terrain_clean.jpg';

  const { data, info } = await sharp(inputPath).raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const out = Buffer.from(data);

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
    out[idx] = Math.round(Math.max(0, Math.min(255, r)));
    out[idx + 1] = Math.round(Math.max(0, Math.min(255, g)));
    out[idx + 2] = Math.round(Math.max(0, Math.min(255, b)));
  }

  // Smoothstep for feathered edges
  function smoothstep(edge0, edge1, x) {
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
  }

  /**
   * Inpaint a precise UI box using a nearby donor offset (dx, dy)
   * with edge feathering and local lighting adjustment
   */
  function inpaintBox({ x1, y1, x2, y2, dx, dy, feather = 10 }) {
    const w = x2 - x1;
    const h = y2 - y1;

    // Calculate boundary color delta between target edge and donor edge
    let tEdgeSum = [0, 0, 0], sEdgeSum = [0, 0, 0], edgeCount = 0;

    for (let x = x1; x <= x2; x += 2) {
      // Top edge
      const [tRt, tGt, tBt] = getPixel(x, y1 - 2);
      const [sRt, sGt, sBt] = getPixel(x + dx, y1 + dy - 2);
      // Bottom edge
      const [tRb, tGb, tBb] = getPixel(x, y2 + 2);
      const [sRb, sGb, sBb] = getPixel(x + dx, y2 + dy + 2);

      tEdgeSum[0] += tRt + tRb;
      tEdgeSum[1] += tGt + tGb;
      tEdgeSum[2] += tBt + tBb;
      sEdgeSum[0] += sRt + sRb;
      sEdgeSum[1] += sGt + sGb;
      sEdgeSum[2] += sBt + sBb;
      edgeCount += 2;
    }

    const diffR = (tEdgeSum[0] - sEdgeSum[0]) / edgeCount;
    const diffG = (tEdgeSum[1] - sEdgeSum[1]) / edgeCount;
    const diffB = (tEdgeSum[2] - sEdgeSum[2]) / edgeCount;

    for (let y = y1; y <= y2; y++) {
      const distY = Math.min(y - y1, y2 - y);
      for (let x = x1; x <= x2; x++) {
        const distX = Math.min(x - x1, x2 - x);
        const dist = Math.min(distX, distY);
        const alpha = smoothstep(0, feather, dist);

        const [sr, sg, sb] = getPixel(x + dx, y + dy);
        const [or, og, ob] = getPixel(x, y);

        const targetR = sr + diffR;
        const targetG = sg + diffG;
        const targetB = sb + diffB;

        const finalR = or * (1 - alpha) + targetR * alpha;
        const finalG = og * (1 - alpha) + targetG * alpha;
        const finalB = ob * (1 - alpha) + targetB * alpha;

        setPixel(x, y, finalR, finalG, finalB);
      }
    }
  }

  // 1. Bastion of Storms UI pill
  // Box: x: 218..432, y: 268..318. Donor: dx = 0, dy = +55 (mountain slope directly below)
  inpaintBox({ x1: 218, y1: 268, x2: 432, y2: 318, dx: 0, dy: 55, feather: 12 });

  // 2. Frostbound Spire UI pill
  // Box: x: 865..1080, y: 232..308. Donor: dx = +85, dy = -40 (snow peaks to upper right)
  inpaintBox({ x1: 865, y1: 232, x2: 1080, y2: 308, dx: 85, dy: -40, feather: 14 });

  // 3. Frostbound Spire chests & text "x25 x2"
  // Box: x: 875..1085, y: 315..405. Donor: dx = +85, dy = -50
  inpaintBox({ x1: 875, y1: 315, x2: 1085, y2: 405, dx: 85, dy: -50, feather: 14 });

  // 4. Frostbound Spire floor badge circle text "91 / Floor"
  // Box: x: 935..1025, y: 135..220. Donor: dx = -140, dy = +10 (snowy ridge on left)
  inpaintBox({ x1: 935, y1: 135, x2: 1025, y2: 220, dx: -140, dy: 10, feather: 16 });

  // 5. Dark Forest UI pill
  // Box: x: 535..698, y: 532..612. Donor: dx = -135, dy = 0 (dense forest on left)
  inpaintBox({ x1: 535, y1: 532, x2: 698, y2: 612, dx: -135, dy: 0, feather: 12 });

  // 6. Dark Forest chests & text "x70 x10"
  // Box: x: 520..722, y: 620..710. Donor: dx = +140, dy = 0 (dense forest on right)
  inpaintBox({ x1: 520, y1: 620, x2: 722, y2: 710, dx: 140, dy: 0, feather: 14 });

  // 7. Dark Forest floor badge circle text "115 / Floor"
  // Box: x: 575..665, y: 440..530. Donor: dx = -120, dy = -20 (forest canopy)
  inpaintBox({ x1: 575, y1: 440, x2: 665, y2: 530, dx: -120, dy: -20, feather: 16 });

  // 8. Iron Mines UI pill
  // Box: x: 260..395, y: 632..685. Donor: dx = 0, dy = +55 (canyon slope directly below)
  inpaintBox({ x1: 260, y1: 632, x2: 395, y2: 685, dx: 0, dy: 55, feather: 10 });

  // 9. Iron Mines circular icon
  // Box: x: 275..365, y: 535..625. Donor: dx = -120, dy = 0 (canyon cliffs on left)
  inpaintBox({ x1: 275, y1: 535, x2: 365, y2: 625, dx: -120, dy: 0, feather: 14 });

  // 10. Dunes UI pill
  // Box: x: 930..1065, y: 645..718. Donor: dx = +90, dy = 0 (golden dunes on right)
  inpaintBox({ x1: 930, y1: 645, x2: 1065, y2: 718, dx: 90, dy: 0, feather: 12 });

  // 11. Dunes chests & text "x25 x5 x1"
  // Box: x: 855..1135, y: 725..830. Donor: dx = 0, dy = +90 (lower desert and shoreline)
  inpaintBox({ x1: 855, y1: 725, x2: 1135, y2: 830, dx: 0, dy: 90, feather: 16 });

  // 12. Dunes floor badge circle text "117 / Floor"
  // Box: x: 955..1045, y: 545..635. Donor: dx = +110, dy = -30 (desert dunes on upper right)
  inpaintBox({ x1: 955, y1: 545, x2: 1045, y2: 635, dx: 110, dy: -30, feather: 16 });

  // 13. Bastion portal circle:
  // In Bastion of Storms, the circle at (326, 213) has an old ring. Let's blend it cleanly with stormy mountain ridge:
  inpaintBox({ x1: 280, y1: 170, x2: 370, y2: 255, dx: -120, dy: 0, feather: 16 });

  await sharp(out, {
    raw: { width, height, channels },
  })
  .jpeg({ quality: 96 })
  .toFile(outputPath);

  console.log('Precision inpainting complete!');
}

precisionInpaint().catch(console.error);
