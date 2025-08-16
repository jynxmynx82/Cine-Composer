
import { GoogleGenAI } from "@google/genai";
import type { AspectRatio } from '../types';

if (!process.env.API_KEY) {
    console.error("API_KEY environment variable not set.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

export const generateBackgrounds = async (prompt: string, aspectRatio: AspectRatio): Promise<(string | null)[]> => {
    try {
        const basePrompting = `Cinematic, photorealistic, high detail, shallow depth of field with a soft, blurred background (bokeh).`;
        const userScene = prompt;

        // Add an explicit text hint for the aspect ratio to guide the model more effectively.
        const aspectRatioHint = aspectRatio === '9:16' ? 'Vertical 9:16 aspect ratio. ' : '';

        // "Cinematic Shots" approach: Generate an establishing shot and a complementary medium shot.
        const prompt1 = `${aspectRatioHint}Wide establishing shot of a ${userScene}. ${basePrompting}`;
        const prompt2 = `${aspectRatioHint}A medium shot from a different angle within the same scene: a ${userScene}. Maintain the exact same style, lighting, and time of day as the establishing shot. Focus on an interesting detail like a table or a counter. ${basePrompting}`;
        
        const commonConfig = { 
            numberOfImages: 1, 
            outputMimeType: 'image/jpeg' as const, 
            aspectRatio: aspectRatio 
        };

        const promises = [
            ai.models.generateImages({ model: 'imagen-3.0-generate-002', prompt: prompt1, config: commonConfig }),
            ai.models.generateImages({ model: 'imagen-3.0-generate-002', prompt: prompt2, config: commonConfig }),
        ];

        const settledResults = await Promise.allSettled(promises);

        return settledResults.map(result => {
            if (result.status === 'fulfilled' && result.value.generatedImages && result.value.generatedImages.length > 0) {
                return `data:image/jpeg;base64,${result.value.generatedImages[0].image.imageBytes}`;
            }
            console.warn("A background image generation failed.", result.status === 'rejected' ? result.reason : 'No image returned.');
            return null;
        });

    } catch (error) {
        console.error("Error generating backgrounds:", error);
        throw new Error("Failed to generate background images. Please check your API key and prompt.");
    }
};
