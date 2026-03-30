import React from 'react';
import './App.css';
import { Toaster } from 'react-hot-toast';
import ImageEditor from './components/ImageEditor';

function App() {
  return (
    <div className="app">
      <Toaster 
        position="top-right"
        toastOptions={{
          style: {
            background: '#1e1e2e',
            color: '#fff',
            borderRadius: '12px',
          },
        }}
      />
      <ImageEditor />
    </div>
  );
}

export default App;