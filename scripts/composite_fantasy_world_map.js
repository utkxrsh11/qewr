import sharp from 'sharp';
import fs from 'fs';

async function compositeFantasyWorldMap() {
  const width = 1920;
  const height = 1080;
  const outputPath = 'public/assets/journeys/world_map_terrain.jpg';

  console.log('Preparing biome layers...');

  // 1. Base Layer: Deep forest valley (Center / Global landscape)
  const forestBuffer = await sharp('/tmp/test_unsplash.jpg')
    .resize(width, height, { fit: 'cover', position: 'center' })
    .modulate({ brightness: 0.95, saturation: 1.15 })
    .raw()
    .toBuffer({ resolveWithObject: true });

  // 2. Stormy peaks (Top-Left)
  const stormBuffer = await sharp('/tmp/storm.jpg')
    .resize(Math.round(width * 0.55), Math.round(height * 0.55), { fit: 'cover', position: 'top' })
    .modulate({ brightness: 0.85, saturation: 1.25, hue: -25 }) // Rich stormy purple-blue tint
    .raw()
    .toBuffer({ resolveWithObject: true });

  // 3. Snowy alpine peaks (Top-Right)
  const snowBuffer = await sharp('/tmp/snow.jpg')
    .resize(Math.round(width * 0.58), Math.round(height * 0.55), { fit: 'cover', position: 'top' })
    .modulate({ brightness: 1.05, saturation: 1.1, hue: 10 }) // Crisp cold icy tint
    .raw()
    .toBuffer({ resolveWithObject: true });

  // 4. Red canyon (Bottom-Left)
  const canyonBuffer = await sharp('/tmp/canyon.jpg')
    .resize(Math.round(width * 0.5), Math.round(height * 0.52), { fit: 'cover', position: 'bottom' })
    .modulate({ brightness: 0.9, saturation: 1.3, hue: -10 }) // Warm terra-cotta / iron canyon
    .raw()
    .toBuffer({ resolveWithObject: true });

  // 5. Desert dunes (Bottom-Right)
  const dunesBuffer = await sharp('/tmp/dunes.jpg')
    .resize(Math.round(width * 0.52), Math.round(height * 0.52), { fit: 'cover', position: 'center' })
    .modulate({ brightness: 1.0, saturation: 1.2, hue: 5 }) // Golden amber sand
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Master RGB buffer
  const out = Buffer.alloc(width * height * 3);

  // Initialize with forest buffer
  forestBuffer.data.copy(out);

  function getPixel(buf, w, h, x, y) {
    x = Math.max(0, Math.min(w - 1, Math.round(x)));
    y = Math.max(0, Math.min(h - 1, Math.round(y)));
    const idx = (y * w + x) * 3;
    return [buf[idx], buf[idx + 1], buf[idx + 2]];
  }

  function setPixel(x, y, r, g, b) {
    x = Math.max(0, Math.min(width - 1, Math.round(x)));
    y = Math.max(0, Math.min(height - 1, Math.round(y)));
    const idx = (y * width + x) * 3;
    out[idx] = Math.round(Math.max(0, Math.min(255, r)));
    out[idx + 1] = Math.round(Math.max(0, Math.min(255, g)));
    out[idx + 2] = Math.round(Math.max(0, Math.min(255, b)));
  }

  function blendLayer(layerBuf, lw, lh, startX, startY, weightFn) {
    for (let ly = 0; ly < lh; ly++) {
      const my = startY + ly;
      if (my < 0 || my >= height) continue;
      for (let lx = 0; lx < lw; lx++) {
        const mx = startX + lx;
        if (mx < 0 || mx >= width) continue;

        const weight = Math.max(0, Math.min(1, weightFn(lx / lw, ly / lh, mx / width, my / height)));
        if (weight <= 0.001) continue;

        const [lr, lg, lb] = getPixel(layerBuf, lw, lh, lx, ly);
        const [mr, mg, mb] = getPixel(out, width, height, mx, my);

        const fr = mr * (1 - weight) + lr * weight;
        const fg = mg * (1 - weight) + lg * weight;
        const fb = mb * (1 - weight) + lb * weight;

        setPixel(mx, my, fr, fg, fb);
      }
    }
  }

  console.log('Blending Top-Left Stormy Bastion...');
  // Stormy mountains in top-left (fades towards center x=0.45, y=0.5)
  blendLayer(
    stormBuffer.data,
    stormBuffer.info.width,
    stormBuffer.info.height,
    0,
    0,
    (u, v, gx, gy) => {
      // Radial falloff from top-left (0.15, 0.15)
      const dist = Math.hypot(gx - 0.12, gy - 0.12);
      const alpha = Math.max(0, Math.min(1, 1 - (dist - 0.15) / 0.35));
      return alpha * 0.95;
    }
  );

  console.log('Blending Top-Right Frostbound Snowy Peaks...');
  // Snowy peaks in top-right (fades towards center x=0.55, y=0.5)
  blendLayer(
    snowBuffer.data,
    snowBuffer.info.width,
    snowBuffer.info.height,
    Math.round(width * 0.44),
    0,
    (u, v, gx, gy) => {
      const dist = Math.hypot(gx - 0.78, gy - 0.15);
      const alpha = Math.max(0, Math.min(1, 1 - (dist - 0.18) / 0.38));
      return alpha * 0.95;
    }
  );

  console.log('Blending Bottom-Left Red Iron Canyon...');
  // Red rock canyon in bottom-left
  blendLayer(
    canyonBuffer.data,
    canyonBuffer.info.width,
    canyonBuffer.info.height,
    0,
    Math.round(height * 0.48),
    (u, v, gx, gy) => {
      const dist = Math.hypot(gx - 0.18, gy - 0.75);
      const alpha = Math.max(0, Math.min(1, 1 - (dist - 0.16) / 0.36));
      return alpha * 0.92;
    }
  );

  console.log('Blending Bottom-Right Golden Sand Dunes...');
  // Golden desert dunes in bottom-right
  blendLayer(
    dunesBuffer.data,
    dunesBuffer.info.width,
    dunesBuffer.info.height,
    Math.round(width * 0.5),
    Math.round(height * 0.48),
    (u, v, gx, gy) => {
      const dist = Math.hypot(gx - 0.8, gy - 0.76);
      const alpha = Math.max(0, Math.min(1, 1 - (dist - 0.16) / 0.38));
      return alpha * 0.92;
    }
  );

  console.log('Applying fantasy painterly tone mapping, vignette, and ambient atmosphere...');
  // Apply vignette, rich fantasy contrast, and atmospheric lighting
  for (let y = 0; y < height; y++) {
    const ny = (y / height) * 2 - 1; // -1 to 1
    for (let x = 0; x < width; x++) {
      const nx = (x / width) * 2 - 1; // -1 to 1

      // Subtle edge vignette
      const rad = Math.hypot(nx, ny);
      const vig = Math.max(0.45, Math.min(1.0, 1.15 - rad * 0.45));

      const [r, g, b] = getPixel(out, width, height, x, y);

      // Contrast enhancement: s-curve
      let cr = r / 255;
      let cg = g / 255;
      let cb = b / 255;

      // Color grade: subtle warmth in bottom, cool mystical purple/cyan at top
      if (y < height * 0.4) {
        if (x < width * 0.5) {
          // Bastion storm: purple tint
          cr = cr * 1.05;
          cb = cb * 1.15;
        } else {
          // Frostbound: cyan tint
          cg = cg * 1.05;
          cb = cb * 1.18;
        }
      } else {
        if (x > width * 0.5) {
          // Dunes: warm golden glow
          cr = cr * 1.12;
          cg = cg * 1.06;
          cb = cb * 0.92;
        } else {
          // Iron mines: terra-cotta warmth
          cr = cr * 1.14;
          cg = cg * 1.02;
          cb = cb * 0.94;
        }
      }

      setPixel(
        x,
        y,
        Math.min(255, cr * 255 * vig),
        Math.min(255, cg * 255 * vig),
        Math.min(255, cb * 255 * vig)
      );
    }
  }

  // Save the master world map terrain
  await sharp(out, {
    raw: { width, height, channels: 3 },
  })
  .jpeg({ quality: 94 })
  .toFile(outputPath);

  console.log('Fantasy World Map composite complete! Saved to', outputPath);
}

compositeFantasyWorldMap().catch(console.error);
