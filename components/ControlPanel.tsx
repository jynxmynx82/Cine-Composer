import React, { useState } from 'react';
import type { AspectRatio } from '../types';
import Spinner from './Spinner';
import { MAX_CHARACTER_FILE_SIZE_BYTES, MAX_CHARACTER_FILE_SIZE_MB } from '../constants';

interface ControlPanelProps {
  onGenerateBackgrounds: (prompt: string, aspectRatio: AspectRatio) => void;
  onUploadCharacters: (files: FileList) => void;
  isGenerating: boolean;
  isProcessing: boolean;
  fileInputRef: React.RefObject<HTMLInputElement>;
}

const ControlPanel: React.FC<ControlPanelProps> = ({ onGenerateBackgrounds, onUploadCharacters, isGenerating, isProcessing, fileInputRef }) => {
  const [prompt, setPrompt] = useState<string>('A well described desert landscape, a coffee shop or an amazing space station.');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');

  const handleGenerateClick = () => {
    if (prompt.trim()) {
      onGenerateBackgrounds(prompt, aspectRatio);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
        const validFiles = Array.from(e.target.files).filter(file => {
            if (file.size > MAX_CHARACTER_FILE_SIZE_BYTES) {
                alert(`File "${file.name}" is too large. Maximum size is ${MAX_CHARACTER_FILE_SIZE_MB}MB.`);
                return false;
            }
            return true;
        });
        
        const dataTransfer = new DataTransfer();
        validFiles.forEach(file => dataTransfer.items.add(file));

        if(dataTransfer.files.length > 0) {
            onUploadCharacters(dataTransfer.files);
        }
        e.target.value = ''; // Reset file input
    }
  };


  return (
    <div className="flex flex-col p-6 bg-gray-800 rounded-lg shadow-lg h-full space-y-6">
      <h2 className="text-2xl font-bold text-cyan-400">Cine Composer Controls</h2>
      
      <div className="flex flex-col space-y-2">
        <label htmlFor="prompt" className="text-lg font-semibold">1. Background Prompt</label>
        <textarea
          id="prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g., A futuristic city skyline at sunset..."
          className="w-full h-36 p-3 bg-gray-700 border border-gray-600 rounded-md focus:ring-2 focus:ring-cyan-500 focus:outline-none transition-shadow"
        />
      </div>

      <div className="flex flex-col space-y-2">
        <label htmlFor="aspectRatio" className="text-lg font-semibold">2. Aspect Ratio</label>
        <select
          id="aspectRatio"
          value={aspectRatio}
          onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
          className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md focus:ring-2 focus:ring-cyan-500 focus:outline-none"
        >
          <option value="16:9">16:9 (Widescreen)</option>
          <option value="9:16">9:16 (Vertical)</option>
        </select>
      </div>

      <button
        onClick={handleGenerateClick}
        disabled={isGenerating}
        className="w-full flex justify-center items-center py-3 px-4 bg-cyan-600 hover:bg-cyan-700 rounded-md font-bold text-white transition-all duration-300 disabled:bg-gray-500 disabled:cursor-not-allowed"
      >
        {isGenerating ? <Spinner /> : 'Generate Backgrounds'}
      </button>

      <div className="flex flex-col space-y-2">
        <label htmlFor="characterUpload" className="text-lg font-semibold">3. Upload Characters</label>
        <div className="relative">
          <input
            ref={fileInputRef}
            type="file"
            id="characterUpload"
            multiple
            accept="image/png, image/jpeg"
            onChange={handleFileChange}
            className="hidden"
            disabled={isProcessing}
          />
          <label
            htmlFor="characterUpload"
            className={`w-full flex justify-center items-center py-3 px-4 border-2 border-dashed rounded-md transition-colors ${isProcessing ? 'bg-gray-600 text-gray-400 cursor-not-allowed' : 'border-gray-500 hover:border-cyan-400 hover:bg-gray-700 cursor-pointer'}`}
          >
             {isProcessing ? <Spinner /> : 'Select Character Images'}
          </label>
        </div>
        <p className="text-xs text-gray-400 text-center">Plain backgrounds work best. Max {MAX_CHARACTER_FILE_SIZE_MB}MB per file.</p>
      </div>
    </div>
  );
};

export default ControlPanel;
