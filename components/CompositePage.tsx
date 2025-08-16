
import React from 'react';
import type { Scene, Character } from '../types';
import CompositionCanvas from './CompositionCanvas';
import { DownloadIcon } from './icons';

interface CompositePageProps {
  composition: Scene;
  allCharacters: Character[];
  onUpdate: (updatedScene: Scene) => void;
  onDownload: () => void;
  onBack: () => void;
}

const CompositePage: React.FC<CompositePageProps> = ({ composition, allCharacters, onUpdate, onDownload, onBack }) => {

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const charId = e.dataTransfer.getData('text/plain');
    const baseCharacter = allCharacters.find(c => c.id === charId);

    if (baseCharacter && composition.background) {
      const bgImg = new Image();
      bgImg.onload = () => {
          const canvasWidth = bgImg.naturalWidth;
          const canvasHeight = bgImg.naturalHeight;
          const defaultWidth = canvasWidth / 5;
          const aspectRatio = baseCharacter.originalWidth / baseCharacter.originalHeight;
          const defaultHeight = defaultWidth / aspectRatio;

          const newCharacterInstance = {
              ...baseCharacter,
              id: `${baseCharacter.id}-${composition.characters.length}-${Date.now()}`,
              width: defaultWidth,
              height: defaultHeight,
              x: (canvasWidth / 2) - (defaultWidth / 2),
              y: (canvasHeight / 2) - (defaultHeight / 2),
              flipped: false,
          };
          
          const updatedCharacters = [...composition.characters, newCharacterInstance];
          onUpdate({ ...composition, characters: updatedCharacters });
      };
      bgImg.src = composition.background;
    }
  };


  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center p-4 sm:p-8">
      <div className="w-full max-w-7xl flex-grow flex flex-col">
        <h1 className="text-4xl font-bold text-cyan-400 mb-6 text-center">Compose Your Scene</h1>
        
        <div className="flex-grow grid grid-cols-1 lg:grid-cols-4 gap-8">
            <main 
                className="lg:col-span-3 flex flex-col"
                onDragOver={handleDragOver}
                onDrop={handleDrop}
            >
                <div className="w-full aspect-video bg-gray-800 rounded-lg shadow-lg mb-6">
                   <CompositionCanvas 
                        scene={composition} 
                        onUpdate={(chars) => onUpdate({ ...composition, characters: chars })} 
                    />
                </div>

                <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-6">
                  <button
                    onClick={onBack}
                    className="w-full sm:w-auto justify-center py-3 px-6 bg-gray-600 hover:bg-gray-700 rounded-md font-semibold text-white transition-colors"
                  >
                    &larr; Back to Cine Composer
                  </button>
                  <button
                    onClick={onDownload}
                    className="flex items-center space-x-2 w-full sm:w-auto justify-center py-3 px-6 bg-green-600 hover:bg-green-700 rounded-md font-bold text-white transition-colors"
                  >
                    <DownloadIcon className="w-6 h-6" />
                    <span>Download PNG</span>
                  </button>
                </div>
            </main>

            <aside className="lg:col-span-1 bg-gray-800 rounded-lg p-4 flex flex-col space-y-4">
                <h3 className="text-xl font-bold text-cyan-400">Characters</h3>
                <p className="text-sm text-gray-400">Drag a character onto the canvas.</p>
                <div className="flex-grow overflow-y-auto grid grid-cols-3 gap-2 p-2 bg-gray-900/50 rounded-md">
                    {allCharacters.length === 0 && <p className="col-span-full text-center text-gray-400">No characters uploaded</p>}
                    {allCharacters.map((char) => (
                        <div 
                        key={char.id} 
                        className="relative aspect-square group cursor-grab" 
                        draggable="true" 
                        onDragStart={(e) => e.dataTransfer.setData('text/plain', char.id)}
                        >
                        <img src={char.src} alt="Character" className="w-full h-full object-contain rounded-md pointer-events-none" />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-center text-xs font-bold pointer-events-none">
                            Drag Me
                        </div>
                        </div>
                    ))}
                </div>
            </aside>
        </div>
      </div>
    </div>
  );
};

export default CompositePage;