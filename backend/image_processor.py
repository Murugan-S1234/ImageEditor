import numpy as np
from scipy.ndimage import gaussian_filter, sobel
from PIL import Image
import io
import base64


class ImageProcessor:
    """Handles all image manipulation operations using NumPy"""
    
    @staticmethod
    def decode_image(base64_string):
        """Convert base64 string to numpy array"""
        # Remove data URL prefix if present
        if ',' in base64_string:
            base64_string = base64_string.split(',')[1]
        
        image_data = base64.b64decode(base64_string)
        image = Image.open(io.BytesIO(image_data))
        
        # Convert to RGB if necessary
        if image.mode == 'RGBA':
            # Create white background
            background = Image.new('RGB', image.size, (255, 255, 255))
            background.paste(image, mask=image.split()[3])
            image = background
        elif image.mode != 'RGB':
            image = image.convert('RGB')
            
        return np.array(image)
    
    @staticmethod
    def encode_image(arr):
        """Convert numpy array to base64 string"""
        # Ensure valid range
        arr = np.clip(arr, 0, 255).astype(np.uint8)
        
        # Handle grayscale images
        if len(arr.shape) == 2:
            image = Image.fromarray(arr, mode='L').convert('RGB')
        else:
            image = Image.fromarray(arr)
            
        buffer = io.BytesIO()
        image.save(buffer, format='PNG')
        return f"data:image/png;base64,{base64.b64encode(buffer.getvalue()).decode()}"
    
    @staticmethod
    def grayscale(arr):
        """Convert to grayscale using luminosity method"""
        if len(arr.shape) == 3:
            gray = np.dot(arr[..., :3], [0.299, 0.587, 0.114])
            # Convert back to RGB for consistency
            return np.stack([gray, gray, gray], axis=-1)
        return arr
    
    @staticmethod
    def brightness(arr, value):
        """Adjust brightness by adding/subtracting value"""
        return np.clip(arr.astype(np.float64) + value, 0, 255)
    
    @staticmethod
    def contrast(arr, factor):
        """Adjust contrast using factor"""
        return np.clip(128 + factor * (arr.astype(np.float64) - 128), 0, 255)
    
    @staticmethod
    def negative(arr):
        """Invert colors"""
        return 255 - arr
    
    @staticmethod
    def blur(arr, sigma=2):
        """Apply Gaussian blur"""
        if len(arr.shape) == 3:
            return gaussian_filter(arr, sigma=(sigma, sigma, 0))
        return gaussian_filter(arr, sigma=sigma)
    
    @staticmethod
    def sharpen(arr, amount=1.5):
        """Sharpen image using unsharp mask"""
        blurred = ImageProcessor.blur(arr, sigma=1)
        return np.clip(arr + (arr - blurred) * amount, 0, 255)
    
    @staticmethod
    def edges(arr):
        """Detect edges using Sobel operator"""
        if len(arr.shape) == 3:
            gray = np.dot(arr[..., :3], [0.299, 0.587, 0.114])
        else:
            gray = arr
            
        sx = sobel(gray, axis=0)
        sy = sobel(gray, axis=1)
        edges = np.hypot(sx, sy)
        
        # Normalize to 0-255
        edges = (edges / edges.max() * 255) if edges.max() > 0 else edges
        
        # Convert to RGB
        return np.stack([edges, edges, edges], axis=-1)
    
    @staticmethod
    def flip_horizontal(arr):
        """Flip image horizontally"""
        return np.fliplr(arr)
    
    @staticmethod
    def flip_vertical(arr):
        """Flip image vertically"""
        return np.flipud(arr)
    
    @staticmethod
    def rotate_90(arr, direction='cw'):
        """Rotate image 90 degrees"""
        k = -1 if direction == 'cw' else 1
        return np.rot90(arr, k=k)
    
    @staticmethod
    def sepia(arr):
        """Apply sepia tone effect"""
        if len(arr.shape) == 2:
            arr = np.stack([arr, arr, arr], axis=-1)
            
        sepia_matrix = np.array([
            [0.393, 0.769, 0.189],
            [0.349, 0.686, 0.168],
            [0.272, 0.534, 0.131]
        ])
        
        sepia_img = arr.dot(sepia_matrix.T)
        return np.clip(sepia_img, 0, 255)
    
    @staticmethod
    def saturation(arr, factor):
        """Adjust color saturation"""
        if len(arr.shape) == 2:
            return arr
            
        gray = np.dot(arr[..., :3], [0.299, 0.587, 0.114])
        gray = np.stack([gray, gray, gray], axis=-1)
        
        return np.clip(gray + factor * (arr - gray), 0, 255)
    
    @staticmethod
    def crop(arr, x, y, width, height):
        """Crop image to specified region"""
        return arr[y:y+height, x:x+width]
    
    @staticmethod
    def resize(arr, width, height):
        """Resize image"""
        img = Image.fromarray(arr.astype(np.uint8))
        img = img.resize((width, height), Image.Resampling.LANCZOS)
        return np.array(img)
    
    @staticmethod
    def vignette(arr, strength=0.5):
        """Apply vignette effect"""
        rows, cols = arr.shape[:2]
        
        # Create vignette mask
        X = np.arange(0, cols)
        Y = np.arange(0, rows)
        X, Y = np.meshgrid(X, Y)
        
        centerX = cols / 2
        centerY = rows / 2
        
        # Calculate distance from center
        distance = np.sqrt((X - centerX)**2 + (Y - centerY)**2)
        max_dist = np.sqrt(centerX**2 + centerY**2)
        
        # Normalize and create mask
        mask = 1 - (distance / max_dist) * strength
        mask = np.clip(mask, 0, 1)
        
        if len(arr.shape) == 3:
            mask = np.stack([mask, mask, mask], axis=-1)
            
        return np.clip(arr * mask, 0, 255)
    
    @staticmethod
    def exposure(arr, value):
        """Adjust exposure"""
        factor = 2 ** (value / 100)
        return np.clip(arr * factor, 0, 255)
    
    @staticmethod
    def highlights(arr, value):
        """Adjust highlights"""
        factor = value / 100
        mask = arr / 255.0
        adjustment = factor * mask * (255 - arr)
        return np.clip(arr + adjustment, 0, 255)
    
    @staticmethod
    def shadows(arr, value):
        """Adjust shadows"""
        factor = value / 100
        mask = 1 - (arr / 255.0)
        adjustment = factor * mask * arr
        return np.clip(arr + adjustment, 0, 255)