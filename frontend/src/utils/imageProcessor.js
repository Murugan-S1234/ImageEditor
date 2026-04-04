const loadImage = (src) => new Promise((resolve, reject) => {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => resolve(img);
  img.onerror = reject;
  img.src = src;
});

const createCanvas = (width, height) => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const drawImage = async (src, drawFn, width, height, filter = 'none') => {
  const img = await loadImage(src);
  const canvas = createCanvas(width || img.width, height || img.height);
  const ctx = canvas.getContext('2d');
  ctx.filter = filter;
  drawFn(ctx, img);
  return canvas.toDataURL('image/png');
};

export const getImageDimensions = async (src) => {
  const img = await loadImage(src);
  return { width: img.width, height: img.height };
};

const getImageData = async (src) => {
  const img = await loadImage(src);
  const canvas = createCanvas(img.width, img.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  return { canvas, ctx, imageData: ctx.getImageData(0, 0, canvas.width, canvas.height) };
};

const imageDataToDataUrl = (canvas, ctx, imageData) => {
  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/png');
};

const applyConvolution = (imageData, kernel, divisor = 1, bias = 0) => {
  const { width, height, data } = imageData;
  const output = new Uint8ClampedArray(data.length);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;

      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const px = clamp(x + kx, 0, width - 1);
          const py = clamp(y + ky, 0, height - 1);
          const offset = (py * width + px) * 4;
          const weight = kernel[(ky + 1) * 3 + (kx + 1)];

          r += data[offset] * weight;
          g += data[offset + 1] * weight;
          b += data[offset + 2] * weight;
          a += data[offset + 3] * weight;
        }
      }

      const idx = (y * width + x) * 4;
      output[idx] = clamp(r / divisor + bias, 0, 255);
      output[idx + 1] = clamp(g / divisor + bias, 0, 255);
      output[idx + 2] = clamp(b / divisor + bias, 0, 255);
      output[idx + 3] = clamp(data[idx + 3], 0, 255);
    }
  }

  const result = new ImageData(output, width, height);
  imageData.data.set(result.data);
  return imageData;
};

const applySobel = async (src) => {
  const { canvas, ctx, imageData } = await getImageData(src);
  const { width, height, data } = imageData;
  const gray = new Float32Array(width * height);

  for (let i = 0; i < width * height; i++) {
    const offset = i * 4;
    gray[i] = 0.299 * data[offset] + 0.587 * data[offset + 1] + 0.114 * data[offset + 2];
  }

  const gxKernel = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
  const gyKernel = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
  const output = new Uint8ClampedArray(data.length);

  const sampleGray = (x, y) => {
    const px = clamp(x, 0, width - 1);
    const py = clamp(y, 0, height - 1);
    return gray[py * width + px];
  };

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let gx = 0;
      let gy = 0;
      let idx = 0;

      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const weightX = gxKernel[idx];
          const weightY = gyKernel[idx];
          const value = sampleGray(x + kx, y + ky);
          gx += value * weightX;
          gy += value * weightY;
          idx += 1;
        }
      }

      const edge = clamp(Math.hypot(gx, gy), 0, 255);
      const outOffset = (y * width + x) * 4;
      output[outOffset] = edge;
      output[outOffset + 1] = edge;
      output[outOffset + 2] = edge;
      output[outOffset + 3] = data[outOffset + 3];
    }
  }

  imageData.data.set(output);
  return imageDataToDataUrl(canvas, ctx, imageData);
};

const adjustHighlightsOrShadows = async (src, type, value) => {
  const { canvas, ctx, imageData } = await getImageData(src);
  const factor = value / 100;
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    for (let j = 0; j < 3; j++) {
      const channel = data[i + j];
      if (type === 'highlights') {
        const mask = channel / 255;
        data[i + j] = clamp(channel + factor * mask * (255 - channel), 0, 255);
      } else {
        const mask = 1 - channel / 255;
        data[i + j] = clamp(channel + factor * mask * channel, 0, 255);
      }
    }
  }

  return imageDataToDataUrl(canvas, ctx, imageData);
};

const applyVignette = async (src, strength = 0.5) => {
  const img = await loadImage(src);
  const canvas = createCanvas(img.width, img.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);

  const centerX = img.width / 2;
  const centerY = img.height / 2;
  const radius = Math.sqrt(centerX * centerX + centerY * centerY);
  const gradient = ctx.createRadialGradient(
    centerX,
    centerY,
    radius * 0.1,
    centerX,
    centerY,
    radius
  );

  gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
  gradient.addColorStop(1, `rgba(0, 0, 0, ${clamp(strength, 0, 1)})`);

  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, img.width, img.height);
  ctx.globalCompositeOperation = 'source-over';

  return canvas.toDataURL('image/png');
};

export const applyOperationLocally = async (src, operation, params = {}) => {
  switch (operation) {
    case 'grayscale':
      return drawImage(src, (ctx, img) => ctx.drawImage(img, 0, 0), undefined, undefined, 'grayscale(100%)');
    case 'brightness':
    case 'exposure':
      return drawImage(src, (ctx, img) => ctx.drawImage(img, 0, 0), undefined, undefined, `brightness(${clamp(100 + (params.value || 0), 0, 200)}%)`);
    case 'contrast':
      return drawImage(src, (ctx, img) => ctx.drawImage(img, 0, 0), undefined, undefined, `contrast(${clamp((params.factor || 1) * 100, 0, 300)}%)`);
    case 'saturation':
      return drawImage(src, (ctx, img) => ctx.drawImage(img, 0, 0), undefined, undefined, `saturate(${clamp((params.factor || 1) * 100, 0, 300)}%)`);
    case 'negative':
      return drawImage(src, (ctx, img) => ctx.drawImage(img, 0, 0), undefined, undefined, 'invert(100%)');
    case 'blur':
      return drawImage(src, (ctx, img) => ctx.drawImage(img, 0, 0), undefined, undefined, `blur(${clamp(params.sigma || 2, 0, 20)}px)`);
    case 'sepia':
      return drawImage(src, (ctx, img) => ctx.drawImage(img, 0, 0), undefined, undefined, 'sepia(100%)');
    case 'flip_horizontal':
      return drawImage(src, (ctx, img) => {
        ctx.translate(img.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(img, 0, 0);
      });
    case 'flip_vertical':
      return drawImage(src, (ctx, img) => {
        ctx.translate(0, img.height);
        ctx.scale(1, -1);
        ctx.drawImage(img, 0, 0);
      });
    case 'rotate_cw': {
      const img = await loadImage(src);
      const canvas = createCanvas(img.height, img.width);
      const ctx = canvas.getContext('2d');
      ctx.translate(img.height, 0);
      ctx.rotate(Math.PI / 2);
      ctx.drawImage(img, 0, 0);
      return canvas.toDataURL('image/png');
    }
    case 'rotate_ccw': {
      const img = await loadImage(src);
      const canvas = createCanvas(img.height, img.width);
      const ctx = canvas.getContext('2d');
      ctx.translate(0, img.width);
      ctx.rotate(-Math.PI / 2);
      ctx.drawImage(img, 0, 0);
      return canvas.toDataURL('image/png');
    }
    case 'vignette':
      return applyVignette(src, params.strength || 0.5);
    case 'sharpen':
      return (async () => {
        const { canvas, ctx, imageData } = await getImageData(src);
        const amount = clamp(Number(params.amount) || 0, -5, 10);
        if (amount === 0) {
          return src;
        }
        const center = 1 + 4 * amount;
        const kernel = [0, -amount, 0, -amount, center, -amount, 0, -amount, 0];
        applyConvolution(imageData, kernel, 1, 0);
        return imageDataToDataUrl(canvas, ctx, imageData);
      })();
    case 'edges':
      return applySobel(src);
    case 'highlights':
      return adjustHighlightsOrShadows(src, 'highlights', params.value || 0);
    case 'shadows':
      return adjustHighlightsOrShadows(src, 'shadows', params.value || 0);
    default:
      return src;
  }
};

export const applyAdjustmentsLocally = async (src, adjustments = {}) => {
  let result = src;
  if (!result) {
    return src;
  }

  const brightness = Number(adjustments.brightness || 0);
  const exposure = Number(adjustments.exposure || 0);
  const contrast = Number(adjustments.contrast || 1);
  const saturation = Number(adjustments.saturation || 1);
  const blur = Number(adjustments.blur || 0);
  const sharpness = Number(adjustments.sharpness || 0);
  const vignette = Number(adjustments.vignette || 0);
  const highlights = Number(adjustments.highlights || 0);
  const shadows = Number(adjustments.shadows || 0);

  if (brightness !== 0) {
    result = await applyOperationLocally(result, 'brightness', { value: brightness });
  }
  if (exposure !== 0) {
    result = await applyOperationLocally(result, 'exposure', { value: exposure });
  }
  if (contrast !== 1) {
    result = await applyOperationLocally(result, 'contrast', { factor: contrast });
  }
  if (saturation !== 1) {
    result = await applyOperationLocally(result, 'saturation', { factor: saturation });
  }
  if (blur !== 0) {
    result = await applyOperationLocally(result, 'blur', { sigma: blur });
  }
  if (sharpness !== 0) {
    result = await applyOperationLocally(result, 'sharpen', { amount: sharpness });
  }
  if (vignette !== 0) {
    result = await applyOperationLocally(result, 'vignette', { strength: vignette });
  }
  if (highlights !== 0) {
    result = await applyOperationLocally(result, 'highlights', { value: highlights });
  }
  if (shadows !== 0) {
    result = await applyOperationLocally(result, 'shadows', { value: shadows });
  }

  return result;
};
