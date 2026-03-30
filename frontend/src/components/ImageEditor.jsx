import React, { useState, useCallback, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';
import Toolbar from './Toolbar';
import Sidebar from './Sidebar';
import ImageCanvas from './ImageCanvas';
import { 
  Upload, Download, Undo2, Redo2, RotateCcw, 
  ZoomIn, ZoomOut, Maximize2 
} from 'lucide-react';

const API_URL = 'https://imageeditor-paud.onrender.com/api';

const ImageEditor = () => {
  const [sessionId] = useState(() => uuidv4());
  const [image, setImage] = useState(null);
  const [originalImage, setOriginalImage] = useState(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [loading, setLoading] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [activeTab, setActiveTab] = useState('adjust');

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleDownload();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canUndo, canRedo, image]);

  const handleUpload = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload a valid image file');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image size should be less than 10MB');
      return;
    }

    setLoading(true);
    const reader = new FileReader();
    
    reader.onload = async (event) => {
      try {
        const response = await axios.post(`${API_URL}/upload`, {
          sessionId,
          image: event.target.result
        });

        if (response.data.success) {
          setImage(response.data.image);
          setOriginalImage(response.data.image);
          setDimensions(response.data.dimensions);
          setCanUndo(response.data.canUndo);
          setCanRedo(response.data.canRedo);
          toast.success('Image uploaded successfully!');
        }
      } catch (error) {
        toast.error(error.response?.data?.error || 'Failed to upload image');
      } finally {
        setLoading(false);
      }
    };

    reader.readAsDataURL(file);
  }, [sessionId]);

  const applyOperation = useCallback(async (operation, params = {}) => {
    if (!image) {
      toast.error('Please upload an image first');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/process`, {
        sessionId,
        operation,
        params
      });

      if (response.data.success) {
        setImage(response.data.image);
        setDimensions(response.data.dimensions);
        setCanUndo(response.data.canUndo);
        setCanRedo(response.data.canRedo);
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Operation failed');
    } finally {
      setLoading(false);
    }
  }, [image, sessionId]);

  const handleUndo = useCallback(async () => {
    if (!canUndo) return;

    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/undo`, { sessionId });
      
      if (response.data.success) {
        setImage(response.data.image);
        setDimensions(response.data.dimensions);
        setCanUndo(response.data.canUndo);
        setCanRedo(response.data.canRedo);
        toast.success('Undo successful');
      }
    } catch (error) {
      toast.error('Nothing to undo');
    } finally {
      setLoading(false);
    }
  }, [canUndo, sessionId]);

  const handleRedo = useCallback(async () => {
    if (!canRedo) return;

    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/redo`, { sessionId });
      
      if (response.data.success) {
        setImage(response.data.image);
        setDimensions(response.data.dimensions);
        setCanUndo(response.data.canUndo);
        setCanRedo(response.data.canRedo);
        toast.success('Redo successful');
      }
    } catch (error) {
      toast.error('Nothing to redo');
    } finally {
      setLoading(false);
    }
  }, [canRedo, sessionId]);

  const handleReset = useCallback(async () => {
    if (!image) return;

    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/reset`, { sessionId });
      
      if (response.data.success) {
        setImage(response.data.image);
        setDimensions(response.data.dimensions);
        setCanUndo(response.data.canUndo);
        setCanRedo(response.data.canRedo);
        toast.success('Reset to original');
      }
    } catch (error) {
      toast.error('Failed to reset');
    } finally {
      setLoading(false);
    }
  }, [image, sessionId]);

  const handleDownload = useCallback(async () => {
    if (!image) {
      toast.error('No image to download');
      return;
    }

    try {
      const response = await axios.post(`${API_URL}/download`, {
        sessionId,
        format: 'png'
      });

      if (response.data.success) {
        const link = document.createElement('a');
        link.href = response.data.image;
        link.download = response.data.filename;
        link.click();
        toast.success('Image downloaded!');
      }
    } catch (error) {
      toast.error('Failed to download');
    }
  }, [image, sessionId]);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.25));
  const handleZoomFit = () => setZoom(1);

  return (
    <div className="editor-container">
      {/* Header */}
      <header className="editor-header">
        <div className="header-left">
          <h1 className="logo">
            <span className="logo-icon">🎨</span>
            Image Editor Pro
          </h1>
        </div>
        
        <div className="header-center">
          <div className="history-controls">
            <button 
              className={`icon-btn ${!canUndo ? 'disabled' : ''}`}
              onClick={handleUndo}
              disabled={!canUndo}
              title="Undo (Ctrl+Z)"
            >
              <Undo2 size={20} />
            </button>
            <button 
              className={`icon-btn ${!canRedo ? 'disabled' : ''}`}
              onClick={handleRedo}
              disabled={!canRedo}
              title="Redo (Ctrl+Shift+Z)"
            >
              <Redo2 size={20} />
            </button>
            <button 
              className="icon-btn"
              onClick={handleReset}
              disabled={!image}
              title="Reset to Original"
            >
              <RotateCcw size={20} />
            </button>
          </div>
        </div>

        <div className="header-right">
          <label className="upload-btn">
            <Upload size={18} />
            <span>Open</span>
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleUpload}
              hidden
            />
          </label>
          <button 
            className="download-btn"
            onClick={handleDownload}
            disabled={!image}
          >
            <Download size={18} />
            <span>Save</span>
          </button>
        </div>
      </header>

      <div className="editor-main">
        {/* Sidebar */}
        <Sidebar 
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          applyOperation={applyOperation}
          disabled={!image || loading}
        />

        {/* Canvas Area */}
        <div className="canvas-area">
          {loading && (
            <div className="loading-overlay">
              <div className="spinner"></div>
              <span>Processing...</span>
            </div>
          )}
          
          <ImageCanvas 
            image={image}
            zoom={zoom}
            onUpload={handleUpload}
          />

          {/* Zoom Controls */}
          {image && (
            <div className="zoom-controls">
              <button onClick={handleZoomOut} title="Zoom Out">
                <ZoomOut size={18} />
              </button>
              <span className="zoom-level">{Math.round(zoom * 100)}%</span>
              <button onClick={handleZoomIn} title="Zoom In">
                <ZoomIn size={18} />
              </button>
              <button onClick={handleZoomFit} title="Fit to Screen">
                <Maximize2 size={18} />
              </button>
            </div>
          )}

          {/* Image Info */}
          {image && (
            <div className="image-info">
              {dimensions.width} × {dimensions.height} px
            </div>
          )}
        </div>

        {/* Right Panel - Quick Actions */}
        <Toolbar 
          applyOperation={applyOperation}
          disabled={!image || loading}
        />
      </div>
    </div>
  );
};

export default ImageEditor;