import sharp from 'sharp';

async function findLetters() {
  const originalPath = 'public/assets/aistudio/_Hwzd8wYYJ32X46n328x2qdCejPHUGnGhSuxivWZNuiwaY8oomVVTcW0aGyrQUvIMcXKNvWxwktsj0Vt6xaBaGVkY6qG2mcTyMwBwnEpvg0OU8pnbQ9OfFbHK168h6E1xetLrX40H3_q-Ktmw2itvz8MUDYqeV6LtVprPp40zrU0eLgMlW7a_ICMeKImAiAB_627e4728.jpg';
  const cropped = await sharp(originalPath)
    .extract({ left: 187, top: 132, width: 1228, height: 1058 })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = cropped.info;
  const data = cropped.data;

  // Let's find all bright text pixels in the Bastion pill area
  let minX = 9999, maxX = -1, minY = 9999, maxY = -1;
  for (let y = 250; y < 350; y++) {
    for (let x = 180; x < 480; x++) {
      const idx = (y * width + x) * channels;
      const r = data[idx], g = data[idx+1], b = data[idx+2];
      // White/light grey text letters
      if (r > 160 && g > 160 && b > 160) {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    }
  }
  console.log('Bastion white text bounds:', { minX, maxX, minY, maxY });

  // Frostbound white text bounds
  minX = 9999; maxX = -1; minY = 9999; maxY = -1;
  for (let y = 230; y < 330; y++) {
    for (let x = 850; x < 1120; x++) {
      const idx = (y * width + x) * channels;
      const r = data[idx], g = data[idx+1], b = data[idx+2];
      if (r > 160 && g > 160 && b > 160) {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    }
  }
  console.log('Frostbound white text bounds:', { minX, maxX, minY, maxY });

  // Dark forest text bounds
  minX = 9999; maxX = -1; minY = 9999; maxY = -1;
  for (let y = 520; y < 620; y++) {
    for (let x = 500; x < 720; x++) {
      const idx = (y * width + x) * channels;
      const r = data[idx], g = data[idx+1], b = data[idx+2];
      if (r > 160 && g > 160 && b > 160) {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    }
  }
  console.log('Dark Forest white text bounds:', { minX, maxX, minY, maxY });

  // Iron mines text bounds
  minX = 9999; maxX = -1; minY = 9999; maxY = -1;
  for (let y = 620; y < 700; y++) {
    for (let x = 200; x < 400; x++) {
      const idx = (y * width + x) * channels;
      const r = data[idx], g = data[idx+1], b = data[idx+2];
      if (r > 160 && g > 160 && b > 160) {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    }
  }
  console.log('Iron mines white text bounds:', { minX, maxX, minY, maxY });

  // Dunes text bounds
  minX = 9999; maxX = -1; minY = 9999; maxY = -1;
  for (let y = 640; y < 730; y++) {
    for (let x = 900; x < 1100; x++) {
      const idx = (y * width + x) * channels;
      const r = data[idx], g = data[idx+1], b = data[idx+2];
      if (r > 160 && g > 160 && b > 160) {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    }
  }
  console.log('Dunes white text bounds:', { minX, maxX, minY, maxY });
}

findLetters();
