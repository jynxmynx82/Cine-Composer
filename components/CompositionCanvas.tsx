
import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { Character, Scene } from '../types';
import { CloseIcon, FlipHorizontalIcon } from './icons';

interface CompositionCanvasProps {
  scene: Scene;
  onUpdate: (characters: Character[]) => void;
}

const CompositionCanvas: React.FC<CompositionCanvasProps> = ({ scene, onUpdate }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null);
  const [charImages, setCharImages] = useState<Map<string, HTMLImageElement>>(new Map());
  const [draggingCharId, setDraggingCharId] = useState<string | null>(null);
  const [resizingCharId, setResizingCharId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [hoveredCharId, setHoveredCharId] = useState<string | null>(null);

  const CORNER_SIZE = 24; // Visual size of the handle
  const CORNER_HITBOX_PADDING = 8; // Invisible padding to make it easier to grab
  const HANDLE_HITBOX_SIZE = CORNER_SIZE + CORNER_HITBOX_PADDING;

  const isInteractive = onUpdate.toString() !== '() => {}';

  const getCanvasCoords = (e: React.MouseEvent): { x: number; y: number } => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (bgImage) {
      canvas.width = bgImage.naturalWidth;
      canvas.height = bgImage.naturalHeight;
      ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);
    } else {
      // Set a default canvas size if there's no background
      const defaultWidth = 1920;
      const defaultHeight = 1080;
      if (canvas.width !== defaultWidth || canvas.height !== defaultHeight) {
          canvas.width = defaultWidth;
          canvas.height = defaultHeight;
      }
      ctx.fillStyle = '#111827'; // bg-gray-900
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#6b7280'; // text-gray-500
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No Background Selected', canvas.width / 2, canvas.height / 2);
      return;
    }

    scene.characters.forEach(char => {
      const charImg = charImages.get(char.id);
      if (charImg) {
        ctx.save();
        if (char.flipped) {
          ctx.translate(char.x + char.width, char.y);
          ctx.scale(-1, 1);
          ctx.drawImage(charImg, 0, 0, char.width, char.height);
        } else {
          ctx.drawImage(charImg, char.x, char.y, char.width, char.height);
        }
        ctx.restore();

        if (isInteractive && (hoveredCharId === char.id || draggingCharId === char.id || resizingCharId === char.id)) {
          ctx.strokeStyle = '#06b6d4'; // cyan-500
          ctx.lineWidth = 2;
          ctx.strokeRect(char.x, char.y, char.width, char.height);
          
          // Draw resize handle with border for visibility
          const handleX = char.x + char.width - CORNER_SIZE / 2;
          const handleY = char.y + char.height - CORNER_SIZE / 2;
          ctx.fillStyle = '#06b6d4';
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 3;
          ctx.fillRect(handleX, handleY, CORNER_SIZE, CORNER_SIZE);
          ctx.strokeRect(handleX, handleY, CORNER_SIZE, CORNER_SIZE);
        }
      }
    });
  }, [bgImage, scene.characters, charImages, hoveredCharId, draggingCharId, resizingCharId, isInteractive]);
  
  useEffect(() => {
    draw();
  }, [draw]);

  useEffect(() => {
    if (scene.background) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = scene.background;
      img.onload = () => setBgImage(img);
    } else {
      setBgImage(null);
      // Manually trigger a redraw with default background
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (ctx) {
          draw();
      }
    }
  }, [scene.background, draw]);

  useEffect(() => {
    const newCharImages = new Map(charImages);
    let updated = false;
    scene.characters.forEach(char => {
      if (!newCharImages.has(char.id) || newCharImages.get(char.id)?.src !== char.src) {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = char.src;
        img.onload = () => {
          setCharImages(prev => new Map(prev).set(char.id, img));
        };
        newCharImages.set(char.id, img); // placeholder
        updated = true;
      }
    });
     // Prune images that are no longer in the scene
    for (const key of newCharImages.keys()) {
        if (!scene.characters.some(c => c.id === key)) {
            newCharImages.delete(key);
            updated = true;
        }
    }
    if (updated) {
        setCharImages(newCharImages);
    }
  }, [scene.characters, charImages]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if(!isInteractive) return;

    // If the click is on a button, let its onClick handler manage it and don't start a drag/resize.
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }

    const { x, y } = getCanvasCoords(e);
    const clickedChar = [...scene.characters].reverse().find(char => 
        x >= char.x && x <= char.x + char.width && y >= char.y && y <= char.y + char.height
    );
    if (clickedChar) {
      const isResizing = x > clickedChar.x + clickedChar.width - HANDLE_HITBOX_SIZE && y > clickedChar.y + clickedChar.height - HANDLE_HITBOX_SIZE;

      // Bring clicked character to the front for better manipulation
      const otherChars = scene.characters.filter(c => c.id !== clickedChar.id);
      onUpdate([...otherChars, clickedChar]);

      if (isResizing) {
        setResizingCharId(clickedChar.id);
      } else {
        setDraggingCharId(clickedChar.id);
        setDragOffset({ x: x - clickedChar.x, y: y - clickedChar.y });
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if(!isInteractive) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { x, y } = getCanvasCoords(e);
    
    if (resizingCharId) {
        canvas.style.cursor = 'se-resize';
        const updatedChars = scene.characters.map(char => {
            if (char.id === resizingCharId) {
                const newWidth = Math.max(20, x - char.x);
                const aspectRatio = char.originalWidth / char.originalHeight;
                const newHeight = newWidth / aspectRatio;
                return {...char, width: newWidth, height: newHeight};
            }
            return char;
        });
        onUpdate(updatedChars);
    } else if (draggingCharId) {
        canvas.style.cursor = 'grabbing';
        const updatedChars = scene.characters.map(char => 
            char.id === draggingCharId ? { ...char, x: x - dragOffset.x, y: y - dragOffset.y } : char
        );
        onUpdate(updatedChars);
    } else {
        const foundChar = [...scene.characters].reverse().find(char => 
            x >= char.x && x <= char.x + char.width && y >= char.y && y <= char.y + char.height
        );
        
        if (foundChar) {
            const isOverResizeHandle = x > foundChar.x + foundChar.width - HANDLE_HITBOX_SIZE && y > foundChar.y + foundChar.height - HANDLE_HITBOX_SIZE;
            canvas.style.cursor = isOverResizeHandle ? 'se-resize' : 'grab';
            setHoveredCharId(foundChar.id);
        } else {
            canvas.style.cursor = 'default';
            setHoveredCharId(null);
        }
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if(!isInteractive) return;
    setDraggingCharId(null);
    setResizingCharId(null);
    // Trigger a mouse move to update the cursor to 'grab' if still hovering
    const canvas = canvasRef.current;
    if(canvas){
        const ev = new MouseEvent('mousemove', {
            bubbles: true,
            cancelable: false,
            clientX: e.clientX,
            clientY: e.clientY,
        });
        canvas.dispatchEvent(ev);
    }
  };
  
  const handleMouseLeave = () => {
    if(!isInteractive) return;
    const canvas = canvasRef.current;
    if (canvas) {
        canvas.style.cursor = 'default';
    }
    setHoveredCharId(null);
    setDraggingCharId(null);
    setResizingCharId(null);
  };

  const handleRemoveCharacter = (e: React.MouseEvent, charId: string) => {
      e.stopPropagation();
      onUpdate(scene.characters.filter(c => c.id !== charId));
  }

  const handleFlipCharacter = (e: React.MouseEvent, charId: string) => {
    e.stopPropagation();
    onUpdate(scene.characters.map(c => c.id === charId ? { ...c, flipped: !c.flipped } : c));
  }
  
  const hoveredCharacter = scene.characters.find(c => c.id === hoveredCharId);

  return (
    <div className="relative w-full h-full aspect-video bg-gray-900 rounded-md overflow-hidden" onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseLeave}>
      <canvas ref={canvasRef} className="w-full h-full object-contain" />
       {isInteractive && hoveredCharId && !draggingCharId && !resizingCharId && hoveredCharacter && (
        <>
          <button 
            onClick={(e) => handleRemoveCharacter(e, hoveredCharId)}
            className="absolute p-1 bg-red-600 rounded-full text-white hover:bg-red-700 z-10"
            style={(() => {
                const canvas = canvasRef.current;
                if (!canvas) return { display: 'none' };
                const rect = canvas.getBoundingClientRect();
                if (!rect.width || !rect.height || !canvas.width || !canvas.height) return { display: 'none' };
                
                const scaleY = rect.height / canvas.height;
                const scaleX = rect.width / canvas.width;
                const top = hoveredCharacter.y * scaleY;
                const left = hoveredCharacter.x * scaleX;
                const offset = 4; // Move 4px inside the corner
    
                return {
                    top: `${top + offset}px`,
                    left: `${left + offset}px`
                };
            })()}
          >
            <CloseIcon className="w-5 h-5" />
          </button>
          <button
            onClick={(e) => handleFlipCharacter(e, hoveredCharId)}
            className="absolute p-1 bg-cyan-600 rounded-full text-white hover:bg-cyan-700 z-10"
            style={(() => {
              const canvas = canvasRef.current;
              if (!canvas) return { display: 'none' };
              const rect = canvas.getBoundingClientRect();
              if (!rect.width || !rect.height || !canvas.width || !canvas.height) return { display: 'none' };

              const scaleY = rect.height / canvas.height;
              const scaleX = rect.width / canvas.width;
              const top = hoveredCharacter.y * scaleY;
              const right = (hoveredCharacter.x + hoveredCharacter.width) * scaleX;
              const offset = 4; // Move 4px inside the corner

              return {
                top: `${top + offset}px`,
                left: `${right - offset}px`,
                transform: 'translateX(-100%)'
              };
            })()}
          >
            <FlipHorizontalIcon className="w-5 h-5" />
          </button>
        </>
      )}
    </div>
  );
};

export default CompositionCanvas;
