import { GoogleGenAI } from '@google/genai';
import fs from 'fs';

async function testImagen() {
  const apiKey = process.env.GEMINI_API_KEY;
  console.log('Testing with key:', apiKey ? 'Key present' : 'No key');
  const ai = new GoogleGenAI();
  try {
    const response = await ai.models.generateImages({
      model: 'imagen-3.0-generate-002',
      prompt: 'Epic fantasy tabletop RPG world map panoramic terrain illustration, 16:9 aerial landscape showing 5 biomes: stormy dark mountain fortress with purple lightning, snowy icy peaks, dense emerald pine forest valley, red rocky canyon quarry, and golden sunlit desert sand dunes. Highly detailed matte painting, clean scenic background without text or UI.',
      config: {
        numberOfImages: 1,
        aspectRatio: '16:9',
        outputMimeType: 'image/jpeg',
      },
    });

    console.log('Response generated! Images count:', response.generatedImages?.length);
    if (response.generatedImages?.[0]?.image?.imageBytes) {
      const buffer = Buffer.from(response.generatedImages[0].image.imageBytes, 'base64');
      fs.writeFileSync('public/assets/journeys/world_map_fantasy_bg.jpg', buffer);
      console.log('Saved image successfully to public/assets/journeys/world_map_fantasy_bg.jpg, size:', buffer.length);
    }
  } catch (err) {
    console.error('Error generating image via GoogleGenAI:', err);
  }
}

testImagen();
