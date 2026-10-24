import sharp from 'sharp';

async function scanBoxes() {
  const { data, info } = await sharp('public/assets/journeys/world_map_terrain.jpg').raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  function isDarkPill(x, y) {
    const idx = (y * width + x) * channels;
    const r = data[idx], g = data[idx+1], b = data[idx+2];
    // Black pills have very low R, G, B with slight blue/grey tint
    return (r < 35 && g < 35 && b < 40 && Math.abs(r - g) < 15);
  }

  // Find bounding box of dark pill for Bastion
  // Expected around x: 200..450, y: 250..350
  let minX = 9999, maxX = -1, minY = 9999, maxY = -1;
  for (let y = 260; y < 330; y++) {
    for (let x = 200; x < 450; x++) {
      if (isDarkPill(x, y)) {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    }
  }
  console.log('Bastion pill detected:', { minX, maxX, minY, maxY });

  // Iron mines pill around x: 200..400, y: 600..700
  minX = 9999; maxX = -1; minY = 9999; maxY = -1;
  for (let y = 600; y < 700; y++) {
    for (let x = 200; x < 400; x++) {
      if (isDarkPill(x, y)) {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    }
  }
  console.log('Iron Mines pill detected:', { minX, maxX, minY, maxY });

  // Dark forest pill around x: 500..720, y: 520..620
  minX = 9999; maxX = -1; minY = 9999; maxY = -1;
  for (let y = 520; y < 620; y++) {
    for (let x = 500; x < 720; x++) {
      if (isDarkPill(x, y)) {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    }
  }
  console.log('Dark Forest pill detected:', { minX, maxX, minY, maxY });

  // Frostbound pill around x: 850..1100, y: 220..320
  minX = 9999; maxX = -1; minY = 9999; maxY = -1;
  for (let y = 220; y < 320; y++) {
    for (let x = 850; x < 1100; x++) {
      if (isDarkPill(x, y)) {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    }
  }
  console.log('Frostbound pill detected:', { minX, maxX, minY, maxY });

  // Dunes pill around x: 900..1100, y: 620..740
  minX = 9999; maxX = -1; minY = 9999; maxY = -1;
  for (let y = 620; y < 740; y++) {
    for (let x = 900; x < 1100; x++) {
      if (isDarkPill(x, y)) {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    }
  }
  console.log('Dunes pill detected:', { minX, maxX, minY, maxY });
}

scanBoxes().catch(console.error);
