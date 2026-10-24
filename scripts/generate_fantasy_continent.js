import sharp from 'sharp';

// High-performance procedural fantasy continent generator
async function generateFantasyContinent() {
  const width = 1920;
  const height = 1080;
  const outputPath = 'public/assets/journeys/world_map_terrain.jpg';

  console.log('Generating procedural fantasy continent map...');

  // Simple pseudo-random permutation table
  const p = new Uint8Array(512);
  const permutation = [
    151,160,137,91,90,15,131,13,201,95,96,53,194,233,7,225,140,36,103,30,69,142,
    8,99,37,240,21,10,23,190,6,148,247,120,234,75,0,26,197,62,94,252,219,203,117,
    35,11,32,57,177,33,88,237,149,56,87,174,20,125,136,171,168,68,175,74,165,71,
    134,139,48,27,166,77,146,158,231,83,111,229,122,60,211,133,230,220,105,92,41,
    55,46,245,40,244,102,143,54,65,25,63,161,1,216,80,73,209,76,132,187,208,89,
    18,169,200,196,135,130,116,188,159,86,164,100,109,198,173,186,3,64,52,217,226,
    250,124,123,5,202,38,147,118,126,255,82,85,212,207,206,59,227,47,16,58,17,182,
    189,28,42,223,183,170,213,119,248,152,2,44,154,163,70,221,153,101,155,167,43,
    172,9,129,22,39,253,19,98,108,110,79,113,224,232,178,185,112,104,218,246,97,
    228,251,34,242,193,238,210,144,12,191,179,162,241,81,51,145,235,249,14,239,
    107,49,192,214,31,181,199,106,157,184,84,204,176,115,121,50,45,127,4,150,254,
    138,236,205,93,222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,180
  ];
  for (let i = 0; i < 256; i++) {
    p[i] = permutation[i];
    p[256 + i] = permutation[i];
  }

  function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
  function lerp(t, a, b) { return a + t * (b - a); }
  function grad(hash, x, y) {
    const h = hash & 7;
    const u = h < 4 ? x : y;
    const v = h < 4 ? y : x;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }

  function perlin(x, y) {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    x -= Math.floor(x);
    y -= Math.floor(y);
    const u = fade(x);
    const v = fade(y);
    const A = p[X] + Y;
    const B = p[X + 1] + Y;
    return lerp(v,
      lerp(u, grad(p[A], x, y), grad(p[B], x - 1, y)),
      lerp(u, grad(p[A + 1], x, y - 1), grad(p[B + 1], x - 1, y - 1))
    );
  }

  function fbm(x, y, octaves = 6) {
    let val = 0;
    let amp = 0.5;
    let freq = 1.0;
    for (let i = 0; i < octaves; i++) {
      val += amp * perlin(x * freq, y * freq);
      freq *= 2.05;
      amp *= 0.5;
    }
    return val;
  }

  // Precompute heightmap
  const heightmap = new Float32Array(width * height);
  for (let y = 0; y < height; y++) {
    const ny = y / height; // 0 (top) to 1 (bottom)
    for (let x = 0; x < width; x++) {
      const nx = x / width; // 0 (left) to 1 (right)

      // Base continental shelf: higher in north and center, drops to ocean at south/coast
      const landMass = 0.85 - Math.hypot(nx - 0.48, ny - 0.42) * 0.95;

      // Mountain ridges across top and center
      const mountainSpine = Math.sin(nx * Math.PI) * Math.exp(-Math.pow((ny - 0.32) / 0.22, 2)) * 0.45;

      // Fractal noise
      const noise = fbm(nx * 4.5, ny * 4.5, 6) * 0.55;
      const fineNoise = fbm(nx * 14.0, ny * 14.0, 4) * 0.15;

      // Canyon carve in bottom left
      const canyonCarve = Math.exp(-Math.pow((nx - 0.22) / 0.18, 2) - Math.pow((ny - 0.65) / 0.18, 2)) * 0.25;

      const h = landMass + mountainSpine + noise + fineNoise - canyonCarve;
      heightmap[y * width + x] = Math.max(-0.5, Math.min(1.5, h));
    }
  }

  // Output RGB buffer
  const out = Buffer.alloc(width * height * 3);

  // Light vector for 3D hillshading (illuminated from North-West)
  const lx = -0.577;
  const ly = -0.577;
  const lz = 0.577;

  for (let y = 0; y < height; y++) {
    const ny = y / height;
    for (let x = 0; x < width; x++) {
      const nx = x / width;
      const idx = y * width + x;
      const h = heightmap[idx];

      // Compute normal vector via finite differences
      const hL = heightmap[y * width + Math.max(0, x - 1)];
      const hR = heightmap[y * width + Math.min(width - 1, x + 1)];
      const hU = heightmap[Math.max(0, y - 1) * width + x];
      const hD = heightmap[Math.min(height - 1, y + 1) * width + x];

      const dx = (hR - hL) * 22.0;
      const dy = (hD - hU) * 22.0;
      const len = Math.hypot(dx, dy, 1.0);
      const nx_val = -dx / len;
      const ny_val = -dy / len;
      const nz_val = 1.0 / len;

      // Hillshade factor (diffuse lighting)
      const dot = Math.max(0.1, nx_val * lx + ny_val * ly + nz_val * lz);
      const shade = 0.45 + 0.55 * dot;

      // Biome blending based on (nx, ny, h)
      let r = 0, g = 0, b = 0;

      // 1. Water (low elevation, southern coast)
      if (h < 0.15) {
        // Deep water to coastal shallow turquoise
        const depth = Math.max(0, Math.min(1, h / 0.15));
        // Deep navy #0A192F to coastal azure #147A8E
        r = 10 + depth * 15;
        g = 25 + depth * 90;
        b = 55 + depth * 80;

        // Coastline wave foam
        if (h > 0.12) {
          const foam = (h - 0.12) / 0.03;
          r += foam * 80;
          g += foam * 95;
          b += foam * 105;
        }
      } else {
        // Landmass: Determine biome by coordinates
        // Top-Left: Bastion of Storms (Stormy, purple tempest, dark basalt rock)
        const stormWeight = Math.max(0, 1 - Math.hypot(nx - 0.22, ny - 0.25) / 0.42);
        // Top-Right: Frostbound Spire (Snow, ice, alpine peaks)
        const frostWeight = Math.max(0, 1 - Math.hypot(nx - 0.65, ny - 0.22) / 0.44);
        // Bottom-Left: Iron Mines (Red rock, canyon, ochre, excavation)
        const minesWeight = Math.max(0, 1 - Math.hypot(nx - 0.22, ny - 0.60) / 0.40);
        // Bottom-Right: Dunes (Golden sand, warm dunes)
        const dunesWeight = Math.max(0, 1 - Math.hypot(nx - 0.68, ny - 0.60) / 0.42);

        // Center / Base: Dark Forest (Deep emerald pines, lush moss)
        // Forest base colors
        let baseR = 32 + (h - 0.15) * 20;
        let baseG = 78 + (h - 0.15) * 45;
        let baseB = 36 + (h - 0.15) * 15;

        // Mountain peaks elevation check
        if (h > 0.65) {
          // Rocky high alpine ridge
          baseR = 100 + (h - 0.65) * 60;
          baseG = 95 + (h - 0.65) * 55;
          baseB = 90 + (h - 0.65) * 65;
        }

        // Apply Biome Weights
        // Frostbound Spire: Snow caps & glaciers
        if (frostWeight > 0) {
          const fw = Math.pow(frostWeight, 1.2);
          const snowR = 210 + h * 30;
          const snowG = 230 + h * 22;
          const snowB = 248 + h * 6;
          baseR = baseR * (1 - fw) + snowR * fw;
          baseG = baseG * (1 - fw) + snowG * fw;
          baseB = baseB * (1 - fw) + snowB * fw;
        }

        // Bastion of Storms: Dark volcanic stone, purple arcane tempest
        if (stormWeight > 0) {
          const sw = Math.pow(stormWeight, 1.2);
          const stormR = 55 + (1 - h) * 40;
          const stormG = 42 + (1 - h) * 30;
          const stormB = 85 + (1 - h) * 60;
          baseR = baseR * (1 - sw) + stormR * sw;
          baseG = baseG * (1 - sw) + stormG * sw;
          baseB = baseB * (1 - sw) + stormB * sw;
        }

        // Iron Mines: Red-orange canyon clay, rusty ochre
        if (minesWeight > 0) {
          const mw = Math.pow(minesWeight, 1.2);
          const canyonR = 175 - h * 40;
          const canyonG = 82 - h * 25;
          const canyonB = 42 - h * 15;
          baseR = baseR * (1 - mw) + canyonR * mw;
          baseG = baseG * (1 - mw) + canyonG * mw;
          baseB = baseB * (1 - mw) + canyonB * mw;
        }

        // Dunes: Golden sand, sunlit desert ripples
        if (dunesWeight > 0) {
          const dw = Math.pow(dunesWeight, 1.2);
          const duneR = 215 - h * 20;
          const duneG = 175 - h * 35;
          const duneB = 88 - h * 25;
          baseR = baseR * (1 - dw) + duneR * dw;
          baseG = baseG * (1 - dw) + duneG * dw;
          baseB = baseB * (1 - dw) + duneB * dw;
        }

        // Apply 3D Hillshading
        r = baseR * shade;
        g = baseG * shade;
        b = baseB * shade;

        // Winding river through dark forest
        const riverPath = Math.sin(ny * 9.0 + nx * 3.0) * 0.08 + 0.44;
        if (Math.abs(nx - riverPath) < 0.012 && ny > 0.35 && ny < 0.85 && h > 0.15) {
          const riverAlpha = 1 - Math.abs(nx - riverPath) / 0.012;
          r = r * (1 - riverAlpha) + 24 * riverAlpha;
          g = g * (1 - riverAlpha) + 115 * riverAlpha;
          b = b * (1 - riverAlpha) + 165 * riverAlpha;
        }
      }

      // Vignette effect
      const vX = (nx - 0.5) * 2;
      const vY = (ny - 0.5) * 2;
      const vignette = Math.max(0.4, 1.15 - Math.hypot(vX, vY) * 0.45);

      const pIdx = idx * 3;
      out[pIdx] = Math.round(Math.max(0, Math.min(255, r * vignette)));
      out[pIdx + 1] = Math.round(Math.max(0, Math.min(255, g * vignette)));
      out[pIdx + 2] = Math.round(Math.max(0, Math.min(255, b * vignette)));
    }
  }

  // Save the master terrain
  await sharp(out, {
    raw: { width, height, channels: 3 },
  })
  .jpeg({ quality: 95 })
  .toFile(outputPath);

  console.log('Procedural fantasy continent map successfully written to', outputPath);
}

generateFantasyContinent().catch(console.error);
