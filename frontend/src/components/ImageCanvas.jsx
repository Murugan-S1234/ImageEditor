import React, { useRef } from 'react';
import { Upload, Image as ImageIcon } from 'lucide-react';

const ImageCanvas = ({ image, zoom, onUpload }) => {
  const containerRef = useRef(null);

  if (!image) {
    return (
      <div className="empty-canvas">
        <div className="empty-content">
          <div className="empty-icon">
            <ImageIcon size={64} />
          </div>
          <h2>No Image Selected</h2>
          <p>Upload an image to start editing</p>
          <label className="upload-area">
            <Upload size={24} />
            <span>Click to upload or drag and drop</span>
            <input 
              type="file" 
              accept="image/*" 
              onChange={onUpload}
              hidden
            />
          </label>
          <p className="supported-formats">
            Supports: JPG, PNG, GIF, WebP (Max 10MB)
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="image-canvas" ref={containerRef}>
      <div 
        className="image-wrapper"
        style={{ transform: `scale(${zoom})` }}
      >
        <img 
          src={image} 
          alt="Editing" 
          draggable={false}
        />
      </div>
    </div>
  );
};

export default ImageCanvas;