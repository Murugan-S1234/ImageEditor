from flask import Flask, request, jsonify
from flask_cors import CORS
from image_processor import ImageProcessor
import traceback

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)

# Store image history per session (in production, use Redis or database)
image_sessions = {}


@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy'})


@app.route('/api/upload', methods=['POST'])
def upload_image():
    """Upload and initialize image editing session"""
    try:
        data = request.json
        session_id = data.get('sessionId', 'default')
        image_data = data.get('image')
        
        if not image_data:
            return jsonify({'error': 'No image provided'}), 400
        
        # Decode image
        arr = ImageProcessor.decode_image(image_data)
        encoded = ImageProcessor.encode_image(arr)
        
        # Initialize session with history
        image_sessions[session_id] = {
            'current': arr,
            'history': [arr.copy()],
            'history_index': 0,
            'max_history': 50
        }
        
        return jsonify({
            'success': True,
            'image': encoded,
            'dimensions': {'width': arr.shape[1], 'height': arr.shape[0]},
            'canUndo': False,
            'canRedo': False
        })
        
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@app.route('/api/process', methods=['POST'])
def process_image():
    """Apply image processing operation"""
    try:
        data = request.json
        session_id = data.get('sessionId', 'default')
        operation = data.get('operation')
        params = data.get('params', {})
        
        if session_id not in image_sessions:
            return jsonify({'error': 'Session not found. Please upload an image first.'}), 400
        
        session = image_sessions[session_id]
        arr = session['current'].copy()
        
        # Apply operation
        operations = {
            'grayscale': lambda: ImageProcessor.grayscale(arr),
            'brightness': lambda: ImageProcessor.brightness(arr, params.get('value', 0)),
            'contrast': lambda: ImageProcessor.contrast(arr, params.get('factor', 1.0)),
            'negative': lambda: ImageProcessor.negative(arr),
            'blur': lambda: ImageProcessor.blur(arr, params.get('sigma', 2)),
            'sharpen': lambda: ImageProcessor.sharpen(arr, params.get('amount', 1.5)),
            'edges': lambda: ImageProcessor.edges(arr),
            'flip_horizontal': lambda: ImageProcessor.flip_horizontal(arr),
            'flip_vertical': lambda: ImageProcessor.flip_vertical(arr),
            'rotate_cw': lambda: ImageProcessor.rotate_90(arr, 'cw'),
            'rotate_ccw': lambda: ImageProcessor.rotate_90(arr, 'ccw'),
            'sepia': lambda: ImageProcessor.sepia(arr),
            'saturation': lambda: ImageProcessor.saturation(arr, params.get('factor', 1.0)),
            'vignette': lambda: ImageProcessor.vignette(arr, params.get('strength', 0.5)),
            'exposure': lambda: ImageProcessor.exposure(arr, params.get('value', 0)),
            'highlights': lambda: ImageProcessor.highlights(arr, params.get('value', 0)),
            'shadows': lambda: ImageProcessor.shadows(arr, params.get('value', 0)),
            'crop': lambda: ImageProcessor.crop(
                arr,
                params.get('x', 0),
                params.get('y', 0),
                params.get('width', arr.shape[1]),
                params.get('height', arr.shape[0])
            ),
        }
        
        if operation not in operations:
            return jsonify({'error': f'Unknown operation: {operation}'}), 400
        
        # Process image
        result = operations[operation]()
        
        # Update history
        # Remove any redo history
        session['history'] = session['history'][:session['history_index'] + 1]
        
        # Add new state
        session['history'].append(result.copy())
        session['history_index'] += 1
        
        # Limit history size
        if len(session['history']) > session['max_history']:
            session['history'] = session['history'][-session['max_history']:]
            session['history_index'] = len(session['history']) - 1
        
        session['current'] = result
        
        return jsonify({
            'success': True,
            'image': ImageProcessor.encode_image(result),
            'dimensions': {'width': result.shape[1], 'height': result.shape[0]},
            'canUndo': session['history_index'] > 0,
            'canRedo': session['history_index'] < len(session['history']) - 1
        })
        
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@app.route('/api/sync', methods=['POST', 'OPTIONS'])
def sync_image():
    """Sync the current image state from the frontend."""
    try:
        data = request.json
        session_id = data.get('sessionId', 'default')
        image_data = data.get('image')

        if not image_data:
            return jsonify({'error': 'No image provided'}), 400

        arr = ImageProcessor.decode_image(image_data)

        if session_id not in image_sessions:
            image_sessions[session_id] = {
                'current': arr,
                'history': [arr.copy()],
                'history_index': 0,
                'max_history': 50
            }
        else:
            session = image_sessions[session_id]
            session['current'] = arr
            session['history'] = session['history'][:session['history_index'] + 1]
            session['history'].append(arr.copy())
            session['history_index'] = len(session['history']) - 1

        return jsonify({'success': True})
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@app.route('/api/undo', methods=['POST'])
def undo():
    """Undo last operation"""
    try:
        data = request.json
        session_id = data.get('sessionId', 'default')
        
        if session_id not in image_sessions:
            return jsonify({'error': 'Session not found'}), 400
        
        session = image_sessions[session_id]
        
        if session['history_index'] > 0:
            session['history_index'] -= 1
            session['current'] = session['history'][session['history_index']].copy()
            
            return jsonify({
                'success': True,
                'image': ImageProcessor.encode_image(session['current']),
                'dimensions': {
                    'width': session['current'].shape[1],
                    'height': session['current'].shape[0]
                },
                'canUndo': session['history_index'] > 0,
                'canRedo': session['history_index'] < len(session['history']) - 1
            })
        
        return jsonify({'error': 'Nothing to undo'}), 400
        
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@app.route('/api/redo', methods=['POST'])
def redo():
    """Redo previously undone operation"""
    try:
        data = request.json
        session_id = data.get('sessionId', 'default')
        
        if session_id not in image_sessions:
            return jsonify({'error': 'Session not found'}), 400
        
        session = image_sessions[session_id]
        
        if session['history_index'] < len(session['history']) - 1:
            session['history_index'] += 1
            session['current'] = session['history'][session['history_index']].copy()
            
            return jsonify({
                'success': True,
                'image': ImageProcessor.encode_image(session['current']),
                'dimensions': {
                    'width': session['current'].shape[1],
                    'height': session['current'].shape[0]
                },
                'canUndo': session['history_index'] > 0,
                'canRedo': session['history_index'] < len(session['history']) - 1
            })
        
        return jsonify({'error': 'Nothing to redo'}), 400
        
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@app.route('/api/reset', methods=['POST'])
def reset():
    """Reset to original image"""
    try:
        data = request.json
        session_id = data.get('sessionId', 'default')
        
        if session_id not in image_sessions:
            return jsonify({'error': 'Session not found'}), 400
        
        session = image_sessions[session_id]
        original = session['history'][0].copy()
        
        # Add reset as new history entry
        session['history'] = session['history'][:session['history_index'] + 1]
        session['history'].append(original)
        session['history_index'] = len(session['history']) - 1
        session['current'] = original
        
        return jsonify({
            'success': True,
            'image': ImageProcessor.encode_image(original),
            'dimensions': {
                'width': original.shape[1],
                'height': original.shape[0]
            },
            'canUndo': session['history_index'] > 0,
            'canRedo': False
        })
        
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@app.route('/api/download', methods=['POST'])
def download():
    """Get current image for download"""
    try:
        data = request.json
        session_id = data.get('sessionId', 'default')
        format_type = data.get('format', 'png')
        
        if session_id not in image_sessions:
            return jsonify({'error': 'Session not found'}), 400
        
        session = image_sessions[session_id]
        image_data = ImageProcessor.encode_image(session['current'])
        
        return jsonify({
            'success': True,
            'image': image_data,
            'filename': f'edited_image.{format_type}'
        })
        
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    import os
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port)