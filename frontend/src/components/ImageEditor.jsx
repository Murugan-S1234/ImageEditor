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
import { applyOperationLocally, getImageDimensions } from '../utils/imageProcessor';

const API_URL = 'https://imageeditor-paud.onrender.com/api';

const ImageEditor = () => {
  const [sessionId] = useState(() => uuidv4());
  const [image, setImage] = useState(null);
  const [originalImage, setOriginalImage] = useState(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [zoom, setZoom] = useState(1);
  const [activeTab, setActiveTab] = useState('adjust');
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

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
      const dataUrl = event.target.result;
      try {
        const dims = await getImageDimensions(dataUrl);
        setImage(dataUrl);
        setOriginalImage(dataUrl);
        setDimensions(dims);
        setHistory([dataUrl]);
        setHistoryIndex(0);
        toast.success('Image loaded locally. Syncing upload in background.');

        setSyncing(true);
        axios.post(`${API_URL}/upload`, {
          sessionId,
          image: dataUrl
        })
          .then((response) => {
            if (response.data.success) {
              setDimensions(response.data.dimensions);
            }
          })
          .catch((error) => {
            toast.error(error.response?.data?.error || 'Failed to sync upload');
          })
          .finally(() => setSyncing(false));
      } catch (error) {
        toast.error('Unable to load image');
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
      const newImage = await applyOperationLocally(image, operation, params);
      setImage(newImage);
      setHistory((prev) => {
        const nextHistory = prev.slice(0, historyIndex + 1);
        nextHistory.push(newImage);
        return nextHistory;
      });
      setHistoryIndex((prev) => prev + 1);

      const dims = await getImageDimensions(newImage);
      setDimensions(dims);

      setSyncing(true);
      axios.post(`${API_URL}/process`, {
        sessionId,
        operation,
        params
      })
        .then((response) => {
          if (response.data.success) {
            setDimensions(response.data.dimensions);
          }
        })
        .catch((error) => {
          toast.error(error.response?.data?.error || 'Operation sync failed');
        })
        .finally(() => setSyncing(false));
    } catch (error) {
      toast.error('Operation failed locally');
    } finally {
      setLoading(false);
    }
  }, [image, historyIndex, sessionId]);

  const handleUndo = useCallback(async () => {
    if (!canUndo) return;

    setLoading(true);
    try {
      const newIndex = historyIndex - 1;
      const nextImage = history[newIndex];
      setImage(nextImage);
      setHistoryIndex(newIndex);
      const dims = await getImageDimensions(nextImage);
      setDimensions(dims);
      toast.success('Undo successful');

      setSyncing(true);
      axios.post(`${API_URL}/undo`, { sessionId })
        .catch(() => {
          toast.error('Undo sync failed');
        })
        .finally(() => setSyncing(false));
    } catch (error) {
      toast.error('Nothing to undo');
    } finally {
      setLoading(false);
    }
  }, [canUndo, history, historyIndex, sessionId]);

  const handleRedo = useCallback(async () => {
    if (!canRedo) return;

    setLoading(true);
    try {
      const newIndex = historyIndex + 1;
      const nextImage = history[newIndex];
      setImage(nextImage);
      setHistoryIndex(newIndex);
      const dims = await getImageDimensions(nextImage);
      setDimensions(dims);
      toast.success('Redo successful');

      setSyncing(true);
      axios.post(`${API_URL}/redo`, { sessionId })
        .catch(() => {
          toast.error('Redo sync failed');
        })
        .finally(() => setSyncing(false));
    } catch (error) {
      toast.error('Nothing to redo');
    } finally {
      setLoading(false);
    }
  }, [canRedo, history, historyIndex, sessionId]);

  const handleReset = useCallback(async () => {
    if (!image || !originalImage) return;

    setLoading(true);
    try {
      setImage(originalImage);
      setHistory([originalImage]);
      setHistoryIndex(0);
      const dims = await getImageDimensions(originalImage);
      setDimensions(dims);
      toast.success('Reset to original');

      setSyncing(true);
      axios.post(`${API_URL}/reset`, { sessionId })
        .catch(() => {
          toast.error('Reset sync failed');
        })
        .finally(() => setSyncing(false));
    } catch (error) {
      toast.error('Failed to reset');
    } finally {
      setLoading(false);
    }
  }, [image, originalImage, sessionId]);

  const handleDownload = useCallback(() => {
    if (!image) {
      toast.error('No image to download');
      return;
    }

    try {
      const link = document.createElement('a');
      link.href = image;
      link.download = 'edited-image.png';
      link.click();
      toast.success('Image downloaded!');
    } catch (error) {
      toast.error('Failed to download');
    }
  }, [image]);

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

      {syncing && (
        <div className="sync-info">
          Syncing changes in background...
        </div>
      )}

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