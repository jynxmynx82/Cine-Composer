export const removeBackground = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const { width, height } = img;
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error('Could not get canvas context'));
        }

        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;

        const getPixel = (x: number, y: number): [number, number, number] => {
            const index = (Math.floor(y) * width + Math.floor(x)) * 4;
            return [data[index], data[index + 1], data[index + 2]];
        };

        // --- New Perimeter Scanning Logic ---
        const chromaDominance = 1.2;
        const chromaIntensityThreshold = 60;

        const isChromaGreen = (r: number, g: number, b: number) => g > r * chromaDominance && g > b * chromaDominance && g > chromaIntensityThreshold;
        const isChromaBlue = (r: number, g: number, b: number) => b > r * chromaDominance && b > g * chromaDominance && b > chromaIntensityThreshold;
        
        const perimeterChromaSamples: { r: number, g: number, b: number, type: 'green' | 'blue' }[] = [];

        // Scan top and bottom edges
        for (let x = 0; x < width; x++) {
            const topPixel = getPixel(x, 0);
            const bottomPixel = getPixel(x, height - 1);

            if (isChromaGreen(...topPixel)) perimeterChromaSamples.push({ r: topPixel[0], g: topPixel[1], b: topPixel[2], type: 'green' });
            else if (isChromaBlue(...topPixel)) perimeterChromaSamples.push({ r: topPixel[0], g: topPixel[1], b: topPixel[2], type: 'blue' });

            if (isChromaGreen(...bottomPixel)) perimeterChromaSamples.push({ r: bottomPixel[0], g: bottomPixel[1], b: bottomPixel[2], type: 'green' });
            else if (isChromaBlue(...bottomPixel)) perimeterChromaSamples.push({ r: bottomPixel[0], g: bottomPixel[1], b: bottomPixel[2], type: 'blue' });
        }

        // Scan left and right edges
        for (let y = 1; y < height - 1; y++) {
            const leftPixel = getPixel(0, y);
            const rightPixel = getPixel(width - 1, y);

            if (isChromaGreen(...leftPixel)) perimeterChromaSamples.push({ r: leftPixel[0], g: leftPixel[1], b: leftPixel[2], type: 'green' });
            else if (isChromaBlue(...leftPixel)) perimeterChromaSamples.push({ r: leftPixel[0], g: leftPixel[1], b: leftPixel[2], type: 'blue' });

            if (isChromaGreen(...rightPixel)) perimeterChromaSamples.push({ r: rightPixel[0], g: rightPixel[1], b: rightPixel[2], type: 'green' });
            else if (isChromaBlue(...rightPixel)) perimeterChromaSamples.push({ r: rightPixel[0], g: rightPixel[1], b: rightPixel[2], type: 'blue' });
        }
        
        const perimeterLength = 2 * width + 2 * height - 4;
        const chromaThreshold = 0.1; // 10% of perimeter must be chroma key color

        let isGreenScreen = false;
        let isBlueScreen = false;
        let keyColors: [number, number, number][] = [];

        if (perimeterLength > 0 && perimeterChromaSamples.length / perimeterLength > chromaThreshold) {
            // Chroma key background detected by perimeter scan
            const greenSamples = perimeterChromaSamples.filter(p => p.type === 'green');
            const blueSamples = perimeterChromaSamples.filter(p => p.type === 'blue');

            if (greenSamples.length > blueSamples.length) {
                isGreenScreen = true;
                const avgColor = greenSamples.reduce((acc, c) => {
                    acc[0] += c.r; acc[1] += c.g; acc[2] += c.b; return acc;
                }, [0, 0, 0]);
                keyColors.push([avgColor[0] / greenSamples.length, avgColor[1] / greenSamples.length, avgColor[2] / greenSamples.length]);
            } else {
                isBlueScreen = true;
                const avgColor = blueSamples.reduce((acc, c) => {
                    acc[0] += c.r; acc[1] += c.g; acc[2] += c.b; return acc;
                }, [0, 0, 0]);
                keyColors.push([avgColor[0] / blueSamples.length, avgColor[1] / blueSamples.length, avgColor[2] / blueSamples.length]);
            }
        } else {
            // Fallback to corner sampling for non-chroma or ambiguous backgrounds
            const cornerSamples: [number, number, number][] = [
                getPixel(0, 0), getPixel(width - 1, 0),
                getPixel(0, height - 1), getPixel(width - 1, height - 1),
                getPixel(Math.floor(width / 2), 0), getPixel(0, Math.floor(height / 2)),
                getPixel(width - 1, Math.floor(height / 2)), getPixel(Math.floor(width / 2), height - 1),
            ];
            keyColors = Array.from(new Set(cornerSamples.map(c => c.join(','))))
                .map(s => s.split(',').map(Number) as [number, number, number]);
        }

        const baseTolerance = 85; 
        const centerTolerance = 15;
        const featherStartPercent = 0.05;
        const featherEndPercent = 0.30;

        for (let i = 0; i < data.length; i += 4) {
          const x = (i / 4) % width;
          const y = Math.floor((i / 4) / width);

          const distFromLeft = x / (width / 2);
          const distFromRight = (width - x) / (width / 2);
          const distFromTop = y / (height / 2);
          const distFromBottom = (height - y) / (height / 2);
          const normalizedDist = Math.min(distFromLeft, distFromRight, distFromTop, distFromBottom);

          let currentTolerance;
          if (normalizedDist < featherStartPercent) {
              currentTolerance = baseTolerance;
          } else if (normalizedDist > featherEndPercent) {
              currentTolerance = centerTolerance;
          } else {
              const progress = (normalizedDist - featherStartPercent) / (featherEndPercent - featherStartPercent);
              currentTolerance = baseTolerance - (baseTolerance - centerTolerance) * progress;
          }
          
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          let isMatch = false;

          let minDiff = Infinity;
          for (const keyColor of keyColors) {
              const [keyR, keyG, keyB] = keyColor;
              const diff = Math.abs(r - keyR) + Math.abs(g - keyG) + Math.abs(b - keyB);
              minDiff = Math.min(minDiff, diff);
          }

          if (minDiff < currentTolerance) {
            if (isGreenScreen) {
                const chromaFactor = 1.3; // Green must be 30% more dominant
                if (g > r * chromaFactor && g > b * chromaFactor) {
                    isMatch = true;
                }
            } else if (isBlueScreen) {
                const chromaFactor = 1.3; // Blue must be 30% more dominant
                if (b > r * chromaFactor && b > g * chromaFactor) {
                    isMatch = true;
                }
            } else {
                // Not a chroma screen, so any color match is enough.
                isMatch = true;
            }
          }

          if (isMatch) {
            data[i + 3] = 0; // Set alpha to 0 (transparent)
          }
        }

        // --- De-spill logic to handle chroma key color bleed ---
        if (isGreenScreen || isBlueScreen) {
            const originalData = new Uint8ClampedArray(data); // Copy for safe reading

            for (let i = 0; i < data.length; i += 4) {
                // Only process non-transparent pixels (foreground)
                if (originalData[i + 3] === 0) {
                    continue;
                }

                const x = (i / 4) % width;
                const y = Math.floor((i / 4) / width);

                const r = originalData[i];
                const g = originalData[i + 1];
                const b = originalData[i + 2];

                let hasSpill = false;
                if (isGreenScreen && g > r && g > b) {
                    hasSpill = true;
                } else if (isBlueScreen && b > r && b > g) {
                    hasSpill = true;
                }

                if (hasSpill) {
                    let totalG = 0, totalB = 0;
                    let neighborCount = 0;
                    const kernelSize = 3; // Search in a 7x7 grid (Increased from 2)

                    for (let ky = -kernelSize; ky <= kernelSize; ky++) {
                        for (let kx = -kernelSize; kx <= kernelSize; kx++) {
                            if (kx === 0 && ky === 0) continue;

                            const nx = x + kx;
                            const ny = y + ky;

                            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                                const neighborIndex = (ny * width + nx) * 4;
                                if (originalData[neighborIndex + 3] > 0) { // Is foreground
                                    const nr = originalData[neighborIndex];
                                    const ng = originalData[neighborIndex + 1];
                                    const nb = originalData[neighborIndex + 2];

                                    let isNonSpill = false;
                                    // A pixel is "non-spill" if its dominant color is not the chroma key color.
                                    // Adding a small tolerance (1.05) to avoid misclassifying near-neutral colors.
                                    if (isGreenScreen && ng <= Math.max(nr, nb) * 1.05) isNonSpill = true;
                                    if (isBlueScreen && nb <= Math.max(nr, ng) * 1.05) isNonSpill = true;

                                    if (isNonSpill) {
                                        totalG += ng;
                                        totalB += nb;
                                        neighborCount++;
                                    }
                                }
                            }
                        }
                    }

                    if (neighborCount > 0) {
                        if (isGreenScreen) {
                            const avgG = totalG / neighborCount;
                            const spillAmount = g - Math.max(r, b);
                            // The blend factor is proportional to how much spill there is.
                            // A spill of 80 or more results in full correction towards the neighbor average.
                            const blendFactor = Math.min(1.0, spillAmount / 80.0); // More sensitive (was 128.0)
                            const newG = g * (1 - blendFactor) + avgG * blendFactor;
                            data[i + 1] = newG;
                        } else if (isBlueScreen) {
                            const avgB = totalB / neighborCount;
                            const spillAmount = b - Math.max(r, g);
                            const blendFactor = Math.min(1.0, spillAmount / 80.0); // More sensitive (was 128.0)
                            const newB = b * (1 - blendFactor) + avgB * blendFactor;
                            data[i + 2] = newB;
                        }
                    } else {
                        // Fallback: if no good neighbors, use a more robust method that preserves color better
                        if (isGreenScreen) {
                            data[i + 1] = Math.max(r, b); // Clamp green to highest of red/blue
                        } else if (isBlueScreen) {
                            data[i + 2] = Math.max(r, g); // Clamp blue to highest of red/green
                        }
                    }
                }
            }
        }

        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = reject;
      img.src = event.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};