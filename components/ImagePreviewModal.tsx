
import React from 'react';
import { CloseIcon } from './icons';

interface ImagePreviewModalProps {
  src: string | null;
  onClose: () => void;
  onSelect: (src: string) => void;
}

const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({ src, onClose, onSelect }) => {
  if (!src) return null;

  const handleSelect = () => {
    onSelect(src);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onClick={onClose}>
      <div className="relative bg-gray-800 p-4 rounded-lg max-w-4xl max-h-[90vh]" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute -top-3 -right-3 p-1 bg-red-600 rounded-full text-white hover:bg-red-700">
          <CloseIcon className="w-6 h-6" />
        </button>
        <img src={src} alt="Background Preview" className="max-w-full max-h-[80vh] object-contain rounded" />
        <div className="mt-4 flex justify-center">
            <button
              onClick={handleSelect}
              className="py-2 px-6 bg-cyan-600 hover:bg-cyan-700 rounded-md font-bold text-white transition-colors"
            >
              Use This Background
            </button>
        </div>
      </div>
    </div>
  );
};

export default ImagePreviewModal;
