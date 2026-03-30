import React from 'react';
import { 
  Sun, Moon, Contrast, Palette,
  Sparkles, Focus, FlipHorizontal, 
  FlipVertical, RotateCw, Grid3X3
} from 'lucide-react';

const Toolbar = ({ applyOperation, disabled }) => {
  const quickActions = [
    { 
      name: 'Bright +', 
      icon: Sun, 
      action: () => applyOperation('brightness', { value: 30 }),
      color: '#fbbf24'
    },
    { 
      name: 'Dark -', 
      icon: Moon, 
      action: () => applyOperation('brightness', { value: -30 }),
      color: '#6366f1'
    },
    { 
      name: 'Contrast', 
      icon: Contrast, 
      action: () => applyOperation('contrast', { factor: 1.3 }),
      color: '#8b5cf6'
    },
    { 
      name: 'Saturate', 
      icon: Palette, 
      action: () => applyOperation('saturation', { factor: 1.5 }),
      color: '#ec4899'
    },
    { 
      name: 'Blur', 
      icon: Sparkles, 
      action: () => applyOperation('blur', { sigma: 3 }),
      color: '#14b8a6'
    },
    { 
      name: 'Sharpen', 
      icon: Focus, 
      action: () => applyOperation('sharpen', { amount: 1.5 }),
      color: '#f97316'
    },
    { 
      name: 'Flip H', 
      icon: FlipHorizontal, 
      action: () => applyOperation('flip_horizontal'),
      color: '#06b6d4'
    },
    { 
      name: 'Flip V', 
      icon: FlipVertical, 
      action: () => applyOperation('flip_vertical'),
      color: '#10b981'
    },
    { 
      name: 'Rotate', 
      icon: RotateCw, 
      action: () => applyOperation('rotate_cw'),
      color: '#3b82f6'
    },
    { 
      name: 'Edges', 
      icon: Grid3X3, 
      action: () => applyOperation('edges'),
      color: '#ef4444'
    },
  ];

  return (
    <aside className="toolbar">
      <h3>Quick Actions</h3>
      <div className="quick-actions">
        {quickActions.map((action, index) => (
          <button
            key={index}
            className="quick-action-btn"
            onClick={action.action}
            disabled={disabled}
            style={{ '--action-color': action.color }}
            title={action.name}
          >
            <action.icon size={20} />
            <span>{action.name}</span>
          </button>
        ))}
      </div>
    </aside>
  );
};

export default Toolbar;