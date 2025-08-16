
import React from 'react';
import { DownloadIcon, ReviseIcon } from './icons';

interface ResultsPageProps {
  images: string[];
  onDownload: () => void;
  onRevise: () => void;
}

const ResultsPage: React.FC<ResultsPageProps> = ({ images, onDownload, onRevise }) => {
  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-6xl">
        <h1 className="text-4xl font-bold text-cyan-400 mb-8 text-center">Your Compositions</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {images.map((img, index) => (
            <div key={index} className="bg-gray-800 p-4 rounded-lg shadow-lg">
              <img src={img} alt={`Composition ${index + 1}`} className="w-full h-auto object-contain rounded-md" />
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-6">
          <button
            onClick={onRevise}
            className="flex items-center space-x-2 w-full sm:w-auto justify-center py-3 px-6 bg-yellow-600 hover:bg-yellow-700 rounded-md font-semibold text-white transition-colors"
          >
            <ReviseIcon className="w-6 h-6" />
            <span>Revise?</span>
          </button>
          <button
            onClick={onDownload}
            className="flex items-center space-x-2 w-full sm:w-auto justify-center py-3 px-6 bg-green-600 hover:bg-green-700 rounded-md font-bold text-white transition-colors"
          >
            <DownloadIcon className="w-6 h-6" />
            <span>Download All (.zip)</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResultsPage;
