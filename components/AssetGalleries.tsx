
import React from 'react';
import type { Character, Scene } from '../types';
import Spinner from './Spinner';
import CompositionCanvas from './CompositionCanvas';
import { ReviseIcon, PlusIcon } from './icons';

interface AssetGalleriesProps {
  backgrounds: string[];
  characters: Character[];
  isGenerating: boolean;
  scenes: Scene[];
  onStartComposition: (character: Character, sceneIndex: number) => void;
  onReviseCharacters: () => void;
  onGenerateCompositions: () => void;
  onAddCharacters: () => void;
}

const AssetGalleries: React.FC<AssetGalleriesProps> = ({
  backgrounds,
  characters,
  isGenerating,
  scenes,
  onStartComposition,
  onReviseCharacters,
  onGenerateCompositions,
  onAddCharacters,
}) => {

  const hasAssets = scenes.some(s => s.background) && characters.length > 0;
  
  const handleDrop = (e: React.DragEvent, sceneIndex: number) => {
    e.preventDefault();
    const charId = e.dataTransfer.getData('text/plain');
    const character = characters.find(c => c.id === charId);
    if (character && scenes[sceneIndex].background) {
      onStartComposition(character, sceneIndex);
    } else if (!scenes[sceneIndex].background) {
        alert("Please generate a background before adding a character.");
    }
  };

  return (
    <div className="flex flex-col p-6 bg-gray-800 rounded-lg shadow-lg h-full space-y-4 overflow-y-auto">
      <div className="flex-shrink-0">
        <h3 className="text-xl font-bold text-cyan-400 mb-2">Backgrounds</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4 p-2 bg-gray-900/50 rounded-md min-h-[100px] items-center justify-center">
          {isGenerating && <div className="col-span-full flex justify-center py-4"><Spinner size="h-10 w-10" /></div>}
          {!isGenerating && backgrounds.length === 0 && <p className="col-span-full text-center text-gray-400">Generate backgrounds to begin</p>}
          {backgrounds.map((bg, index) => (
            <div key={index} className="relative aspect-video group">
              <img src={bg} alt={`Generated Background ${index + 1}`} className="w-full h-full object-cover rounded-md" />
            </div>
          ))}
        </div>
      </div>

      <div className="flex-shrink-0">
        <h3 className="text-xl font-bold text-cyan-400 mb-2">Characters</h3>
        <p className="text-sm text-gray-400 mb-2">Drag a character onto a canvas to start composing.</p>
        <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4 p-2 bg-gray-900/50 rounded-md min-h-[100px] items-center justify-center">
          {characters.length === 0 && <p className="col-span-full text-center text-gray-400">Upload character images</p>}
          {characters.map((char) => (
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
        {characters.length > 0 && (
          <div className="flex justify-end mt-2 space-x-2">
              <button
                  onClick={onAddCharacters}
                  className="flex items-center space-x-2 py-2 px-4 bg-cyan-600 hover:bg-cyan-700 rounded-md font-semibold text-white transition-colors"
              >
                  <PlusIcon className="w-5 h-5" />
                  <span>Add New</span>
              </button>
              <button
                  onClick={onReviseCharacters}
                  className="flex items-center space-x-2 py-2 px-4 bg-yellow-600 hover:bg-yellow-700 rounded-md font-semibold text-white transition-colors"
              >
                  <ReviseIcon className="w-5 h-5" />
                  <span>Replace These</span>
              </button>
          </div>
        )}
      </div>
      
      <div className="flex-grow flex flex-col">
        <h3 className="text-xl font-bold text-cyan-400 mb-2">Canvas</h3>
        <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-900/50 rounded-md p-4 min-h-[300px]">
          {scenes.map((scene, index) => (
            <div
              key={index}
              className="rounded-md border-2 border-dashed border-gray-700"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDrop(e, index)}
            >
              <CompositionCanvas
                scene={scene}
                onUpdate={() => {}} // No-op, interaction is now on the CompositePage
              />
            </div>
          ))}
           {!scenes.some(s => s.background) && (
            <div className="col-span-full flex items-center justify-center text-gray-400">
              Generate backgrounds to start composing
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end items-center space-x-4 pt-4 border-t border-gray-700">
        <button
          onClick={onGenerateCompositions}
          disabled={!hasAssets}
          className="py-2 px-6 bg-green-600 hover:bg-green-700 rounded-md font-bold text-white transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
        >
          Generate
        </button>
      </div>
    </div>
  );
};

export default AssetGalleries;
