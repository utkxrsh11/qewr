import sharp from 'sharp';

async function locateUI() {
  const inputPath = 'public/assets/journeys/world_map_terrain.jpg';
  const { data, info } = await sharp(inputPath).raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  // Let's sample colors around known locations
  const points = [
    { name: 'bastion circle', x: 326, y: 213 },
    { name: 'bastion pill', x: 326, y: 290 },
    { name: 'frostbound circle', x: 978, y: 178 },
    { name: 'frostbound pill', x: 978, y: 256 },
    { name: 'frostbound chests', x: 978, y: 350 },
    { name: 'forest circle', x: 620, y: 490 },
    { name: 'forest pill', x: 620, y: 560 },
    { name: 'forest chests', x: 620, y: 650 },
    { name: 'mines circle', x: 320, y: 580 },
    { name: 'mines pill', x: 320, y: 645 },
    { name: 'dunes circle', x: 1000, y: 590 },
    { name: 'dunes pill', x: 1000, y: 670 },
    { name: 'dunes chests', x: 1000, y: 760 },
  ];

  for (const pt of points) {
    const idx = (pt.y * width + pt.x) * channels;
    console.log(`${pt.name} at (${pt.x}, ${pt.y}): RGB(${data[idx]}, ${data[idx+1]}, ${data[idx+2]})`);
  }
}

locateUI();
