
import React, { useState, useCallback, useRef } from 'react';
import ControlPanel from './components/ControlPanel';
import AssetGalleries from './components/AssetGalleries';
import ResultsPage from './components/ResultsPage';
import CompositePage from './components/CompositePage';
import { generateBackgrounds } from './services/geminiService';
import { removeBackground } from './services/imageProcessor';
import type { AspectRatio, Character, Scene } from './types';

declare const JSZip: any;

const initialScenes: [Scene, Scene] = [
    { background: null, characters: [] },
    { background: null, characters: [] },
];

const App: React.FC = () => {
    const [view, setView] = useState<'editor' | 'composite' | 'results'>('editor');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [characters, setCharacters] = useState<Character[]>([]);
    const [scenes, setScenes] = useState<[Scene, Scene]>(initialScenes);
    const [activeComposition, setActiveComposition] = useState<{ scene: Scene, index: number } | null>(null);
    const [finalCompositions, setFinalCompositions] = useState<string[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleGenerateBackgrounds = useCallback(async (prompt: string, aspectRatio: AspectRatio) => {
        setIsGenerating(true);
        setError(null);
        try {
            const generatedBgs = await generateBackgrounds(prompt, aspectRatio);
            setScenes([
                { background: generatedBgs[0] || null, characters: [] },
                { background: generatedBgs[1] || null, characters: [] }
            ]);
        } catch (err: any) {
            setError(err.message || 'An unknown error occurred.');
        } finally {
            setIsGenerating(false);
        }
    }, []);

    const handleUploadCharacters = useCallback(async (files: FileList) => {
        setIsProcessing(true);
        setError(null);
        const newCharacters: Character[] = [];
        try {
            for (const file of Array.from(files)) {
                const processedSrc = await removeBackground(file);
                const img = new Image();
                img.src = processedSrc;
                await new Promise(resolve => { img.onload = resolve; });
                const id = `${Date.now()}-${Math.random()}`;

                newCharacters.push({
                    id,
                    src: processedSrc,
                    x: 0, y: 0, width: 0, height: 0, // Placeholder values
                    originalWidth: img.width,
                    originalHeight: img.height
                });
            }
            setCharacters(prev => [...prev, ...newCharacters]);
        } catch (err: any) {
            setError(err.message || 'Failed to process one or more images.');
        } finally {
            setIsProcessing(false);
        }
    }, []);

    const handleTriggerUpload = useCallback(() => {
        fileInputRef.current?.click();
    }, []);

    const handleStartComposition = useCallback(async (character: Character, sceneIndex: number) => {
        const targetScene = scenes[sceneIndex];
        if (!targetScene.background) {
            alert("Please select a background for this canvas first.");
            return;
        }

        const bgImg = new Image();
        await new Promise<void>(resolve => {
            bgImg.onload = () => resolve();
            bgImg.onerror = () => resolve(); // Continue even if bg fails
            bgImg.src = targetScene.background!;
        });

        const canvasWidth = bgImg.naturalWidth || 1920;
        const canvasHeight = bgImg.naturalHeight || 1080;
        const defaultWidth = canvasWidth / 5;
        const aspectRatio = character.originalWidth / character.originalHeight;
        const defaultHeight = defaultWidth / aspectRatio;

        const newCharacterInstance = {
            ...character,
            id: `${character.id}-${sceneIndex}-${Date.now()}`,
            width: defaultWidth,
            height: defaultHeight,
            x: (canvasWidth / 2) - (defaultWidth / 2),
            y: (canvasHeight / 2) - (defaultHeight / 2),
            flipped: false,
        };

        const updatedCharacters = [...targetScene.characters, newCharacterInstance];
        const updatedScene = { ...targetScene, characters: updatedCharacters };

        setScenes(prevScenes => {
            const newScenes = [...prevScenes] as [Scene, Scene];
            newScenes[sceneIndex] = updatedScene;
            return newScenes;
        });
        
        setActiveComposition({ scene: updatedScene, index: sceneIndex });
        setView('composite');
    }, [scenes]);


    const renderSceneToBlob = async (scene: Scene): Promise<Blob | null> => {
        if (!scene.background) return null;

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        const bgImg = new Image();
        bgImg.crossOrigin = "anonymous";
        await new Promise(resolve => { bgImg.onload = resolve; bgImg.src = scene.background!; });

        canvas.width = bgImg.naturalWidth;
        canvas.height = bgImg.naturalHeight;
        ctx.drawImage(bgImg, 0, 0);

        for (const char of scene.characters) {
            const charImg = new Image();
            charImg.crossOrigin = "anonymous";
            await new Promise(resolve => { charImg.onload = resolve; charImg.src = char.src; });
            
            ctx.save();
            if (char.flipped) {
                ctx.translate(char.x + char.width, char.y);
                ctx.scale(-1, 1);
                ctx.drawImage(charImg, 0, 0, char.width, char.height);
            } else {
                ctx.drawImage(charImg, char.x, char.y, char.width, char.height);
            }
            ctx.restore();
        }
        return new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    };

    const handleGenerateCompositions = async () => {
        const compositions: string[] = [];
        for (const scene of scenes) {
            const blob = await renderSceneToBlob(scene);
            if (blob) {
                compositions.push(URL.createObjectURL(blob));
            }
        }
        setFinalCompositions(compositions);
        setView('results');
    };

    const handleDownloadAll = useCallback(() => {
        if (typeof JSZip === 'undefined') {
            setError("Could not initiate download. JSZip library not found.");
            return;
        }
        const zip = new JSZip();
        const promises = finalCompositions.map(async (url, i) => {
            const response = await fetch(url);
            const blob = await response.blob();
            zip.file(`composition_${i + 1}.png`, blob);
        });

        Promise.all(promises).then(() => {
            zip.generateAsync({ type: 'blob' }).then((content: Blob) => {
                const link = document.createElement('a');
                link.href = URL.createObjectURL(content);
                link.download = 'cine-compo-scenes.zip';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            });
        });
    }, [finalCompositions]);

    const handleReviseCharacters = useCallback(() => {
        setCharacters([]);
        setScenes(prev => ([
            { ...prev[0], characters: [] },
            { ...prev[1], characters: [] }
        ]));
    }, []);

    const handleFullRevise = useCallback(() => {
        setCharacters([]);
        setScenes(initialScenes);
        setFinalCompositions([]);
        setError(null);
        setView('editor');
    }, []);

    const handleUpdateComposition = useCallback((updatedScene: Scene) => {
        if (activeComposition === null) return;

        setScenes(prevScenes => {
            const newScenes = [...prevScenes] as [Scene, Scene];
            newScenes[activeComposition.index] = updatedScene;
            return newScenes;
        });

        setActiveComposition(prev => prev ? { ...prev, scene: updatedScene } : null);
    }, [activeComposition]);

    const handleBackFromComposite = useCallback(() => {
        // Reset characters in all scenes to provide a clean slate for re-composition
        setScenes(prev => ([
            { ...prev[0], characters: [] },
            { ...prev[1], characters: [] }
        ]));
        setActiveComposition(null);
        setView('editor');
    }, []);

    const handleDownloadComposite = useCallback(async () => {
        if (!activeComposition) return;
        const blob = await renderSceneToBlob(activeComposition.scene);
        if (blob) {
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `composition_${activeComposition.index + 1}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }, [activeComposition]);


    if (view === 'composite' && activeComposition) {
        return (
            <CompositePage
                composition={activeComposition.scene}
                allCharacters={characters}
                onUpdate={handleUpdateComposition}
                onDownload={handleDownloadComposite}
                onBack={handleBackFromComposite}
            />
        );
    }
    
    if (view === 'results') {
        return <ResultsPage images={finalCompositions} onDownload={handleDownloadAll} onRevise={handleFullRevise} />;
    }

    return (
        <>
            <main className="min-h-screen p-4 sm:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 bg-gray-900">
                <div className="lg:col-span-1">
                    <ControlPanel
                        onGenerateBackgrounds={handleGenerateBackgrounds}
                        onUploadCharacters={handleUploadCharacters}
                        isGenerating={isGenerating}
                        isProcessing={isProcessing}
                        fileInputRef={fileInputRef}
                    />
                </div>
                <div className="lg:col-span-2 h-[calc(100vh-2rem)]">
                    <AssetGalleries
                        backgrounds={scenes.map(s => s.background).filter(Boolean) as string[]}
                        characters={characters}
                        isGenerating={isGenerating}
                        scenes={scenes}
                        onStartComposition={handleStartComposition}
                        onReviseCharacters={handleReviseCharacters}
                        onGenerateCompositions={handleGenerateCompositions}
                        onAddCharacters={handleTriggerUpload}
                    />
                </div>
                {error && (
                    <div className="fixed bottom-4 right-4 bg-red-600 text-white p-4 rounded-lg shadow-lg z-50">
                        <p><strong>Error:</strong> {error}</p>
                        <button onClick={() => setError(null)} className="absolute top-1 right-2 text-xl font-bold">&times;</button>
                    </div>
                )}
            </main>
        </>
    );
};

export default App;