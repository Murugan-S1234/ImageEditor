import React, { useState } from 'react';
import { 
  Sun, Contrast, Palette, Sparkles, 
  FlipHorizontal, FlipVertical, RotateCw, RotateCcw,
  SlidersHorizontal, Wand2, Image, Layers
} from 'lucide-react';

const Sidebar = ({ activeTab, setActiveTab, applyOperation, disabled }) => {
  const [sliders, setSliders] = useState({
    brightness: 0,
    contrast: 1,
    saturation: 1,
    exposure: 0,
    highlights: 0,
    shadows: 0,
    blur: 0,
    sharpness: 0,
    vignette: 0
  });

  const handleSliderChange = (name, value) => {
    setSliders(prev => ({ ...prev, [name]: value }));
  };

  const applySlider = (operation, paramName, value) => {
    const parsedValue = parseFloat(value);
    applyOperation(operation, { [paramName]: parsedValue });
  };

  const tabs = [
    { id: 'adjust', icon: SlidersHorizontal, label: 'Adjust' },
    { id: 'filters', icon: Wand2, label: 'Filters' },
    { id: 'transform', icon: Layers, label: 'Transform' },
  ];

  const adjustments = [
    { 
      name: 'Brightness', 
      key: 'brightness',
      icon: Sun,
      min: -100, 
      max: 100, 
      step: 5,
      operation: 'brightness',
      param: 'value'
    },
    { 
      name: 'Contrast', 
      key: 'contrast',
      icon: Contrast,
      min: 0.5, 
      max: 2, 
      step: 0.1,
      operation: 'contrast',
      param: 'factor'
    },
    { 
      name: 'Saturation', 
      key: 'saturation',
      icon: Palette,
      min: 0, 
      max: 2, 
      step: 0.1,
      operation: 'saturation',
      param: 'factor'
    },
    { 
      name: 'Exposure', 
      key: 'exposure',
      icon: Sun,
      min: -100, 
      max: 100, 
      step: 5,
      operation: 'exposure',
      param: 'value'
    },
    { 
      name: 'Blur', 
      key: 'blur',
      icon: Sparkles,
      min: 0, 
      max: 10, 
      step: 0.5,
      operation: 'blur',
      param: 'sigma'
    },
    { 
      name: 'Sharpen', 
      key: 'sharpness',
      icon: Sparkles,
      min: 0, 
      max: 3, 
      step: 0.25,
      operation: 'sharpen',
      param: 'amount'
    },
    { 
      name: 'Vignette', 
      key: 'vignette',
      icon: Image,
      min: 0, 
      max: 1, 
      step: 0.1,
      operation: 'vignette',
      param: 'strength'
    },
  ];

  const filters = [
    { name: 'Grayscale', operation: 'grayscale', icon: '🖤' },
    { name: 'Sepia', operation: 'sepia', icon: '🟤' },
    { name: 'Negative', operation: 'negative', icon: '🔄' },
    { name: 'Edge Detect', operation: 'edges', icon: '📐' },
  ];

  const transforms = [
    { name: 'Flip Horizontal', operation: 'flip_horizontal', icon: FlipHorizontal },
    { name: 'Flip Vertical', operation: 'flip_vertical', icon: FlipVertical },
    { name: 'Rotate CW', operation: 'rotate_cw', icon: RotateCw },
    { name: 'Rotate CCW', operation: 'rotate_ccw', icon: RotateCcw },
  ];

  return (
    <aside className="sidebar">
      {/* Tab Navigation */}
      <div className="sidebar-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`sidebar-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <tab.icon size={18} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="sidebar-content">
        {/* Adjustments Tab */}
        {activeTab === 'adjust' && (
          <div className="adjustments-panel">
            <h3>Adjustments</h3>
            {adjustments.map(adj => (
              <div key={adj.key} className="slider-group">
                <div className="slider-header">
                  <label>
                    <adj.icon size={14} />
                    {adj.name}
                  </label>
                  <span className="slider-value">
                    {sliders[adj.key]}
                  </span>
                </div>
                <div className="slider-row">
                  <input
                    type="range"
                    min={adj.min}
                    max={adj.max}
                    step={adj.step}
                    value={sliders[adj.key]}
                    onChange={(e) => handleSliderChange(adj.key, e.target.value)}
                    disabled={disabled}
                    className="slider"
                  />
                  <button
                    className="apply-btn"
                    onClick={() => applySlider(adj.operation, adj.param, sliders[adj.key])}
                    disabled={disabled}
                  >
                    Apply
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Filters Tab */}
        {activeTab === 'filters' && (
          <div className="filters-panel">
            <h3>Filters</h3>
            <div className="filter-grid">
              {filters.map(filter => (
                <button
                  key={filter.operation}
                  className="filter-btn"
                  onClick={() => applyOperation(filter.operation)}
                  disabled={disabled}
                >
                  <span className="filter-icon">{filter.icon}</span>
                  <span>{filter.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Transform Tab */}
        {activeTab === 'transform' && (
          <div className="transform-panel">
            <h3>Transform</h3>
            <div className="transform-grid">
              {transforms.map(transform => (
                <button
                  key={transform.operation}
                  className="transform-btn"
                  onClick={() => applyOperation(transform.operation)}
                  disabled={disabled}
                >
                  <transform.icon size={24} />
                  <span>{transform.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;