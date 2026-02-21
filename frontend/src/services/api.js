// API Service for FaceLab
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

import { compressImage, compressImages } from '../utils/imageUtils';

// Helper to bypass Ngrok free tier warning on all API calls
export async function fetchApi(url, options = {}) {
  const headers = new Headers(options.headers || {});
  headers.set('ngrok-skip-browser-warning', 'true');
  return fetch(url, { ...options, headers });
}

/**
 * Run SimSwap face swap (single face)
 */
export async function runSimSwap(srcFile, dstFile, regionId = null) {
  const [compressedSrc, compressedDst] = await Promise.all([
    compressImage(srcFile),
    compressImage(dstFile)
  ]);

  const formData = new FormData();
  formData.append('src', compressedSrc);
  formData.append('dst', compressedDst);

  const response = await fetchApi(`${API_BASE_URL}/api/simswap`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || 'SimSwap failed');
  }

  return response.json();
}

/**
 * Run SimSwap face swap (multiple faces)
 */
export async function runSimSwapMulti(srcFiles, dstFile) {
  const [compressedSrcFiles, compressedDst] = await Promise.all([
    compressImages(srcFiles),
    compressImage(dstFile)
  ]);

  const formData = new FormData();
  compressedSrcFiles.forEach(file => {
    formData.append('src', file);
  });
  formData.append('dst', compressedDst);

  const response = await fetchApi(`${API_BASE_URL}/api/simswap_multi_upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || 'SimSwap Multi failed');
  }

  return response.json();
}

/**
 * Check backend health status
 */
export async function checkHealth() {
  try {
    const response = await fetchApi(`${API_BASE_URL}/health`);
    if (!response.ok) return false;
    const data = await response.json();
    return data.status === 'ok';
  } catch {
    return false;
  }
}


/**
 * Get full URL for result image
 */
export function getResultImageUrl(path) {
  if (path.startsWith('http')) return path;
  return `${API_BASE_URL}${path}`;
}

// =============================================
// BACKGROUND REMOVAL API
// =============================================

/**
 * Run background removal
 * @param {File} image - Main image file
 * @param {string} mode - 'transparent' | 'color' | 'image' | 'blur'
 * @param {string[]} colors - Array of RGB colors like ['255,255,255', '0,0,0']
 * @param {File} bgImage - Custom background image (for mode='image')
 */
export async function runBackgroundRemoval(image, mode, colors = [], bgImage = null) {
  const formData = new FormData();
  formData.append('image', image);
  formData.append('mode', mode);

  if (mode === 'color' && colors.length > 0) {
    formData.append('colors', colors.join('|'));
  }

  if (mode === 'image' && bgImage) {
    formData.append('bg_image', bgImage);
  }

  const response = await fetchApi(`${API_BASE_URL}/api/background_removal`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || 'Background removal failed');
  }

  return response.json();
}

// =============================================
// SIMSWAP FACE DETECTION API
// =============================================

/**
 * Detect faces in target image for mapping
 * @param {File} dstFile - Target image file
 */
export async function detectTargetFaces(dstFile) {
  const compressedDst = await compressImage(dstFile);
  const formData = new FormData();
  formData.append('dst', compressedDst);

  const response = await fetchApi(`${API_BASE_URL}/api/simswap_multi_detect`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || 'Face detection failed');
  }

  return response.json();
}

/**
 * Run SimSwap multi with face mapping
 * @param {File[]} srcFiles - Source face images
 * @param {File} dstFile - Target image
 * @param {Object} mapping - Face mapping { targetIdx: sourceIdx }
 */
export async function runSimSwapMultiWithMapping(srcFiles, dstFile, mapping = null) {
  const [compressedSrcFiles, compressedDst] = await Promise.all([
    compressImages(srcFiles),
    compressImage(dstFile)
  ]);

  const formData = new FormData();
  compressedSrcFiles.forEach(file => formData.append('src', file));
  formData.append('dst', compressedDst);

  if (mapping && Object.keys(mapping).length > 0) {
    const mapStr = Object.entries(mapping)
      .filter(([_, srcIdx]) => srcIdx !== -1)
      .map(([tgtIdx, srcIdx]) => `${tgtIdx}:${srcIdx}`)
      .join(',');
    if (mapStr) formData.append('mapping', mapStr);
  }

  const response = await fetchApi(`${API_BASE_URL}/api/simswap_multi_upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || 'SimSwap Multi failed');
  }

  return response.json();
}

// =============================================
// HEADNERF API
// =============================================

/**
 * Get available HeadNeRF samples
 */
export async function getHeadNeRFSamples() {
  const response = await fetchApi(`${API_BASE_URL}/api/headnerf/samples`);
  if (!response.ok) {
    throw new Error('Failed to fetch HeadNeRF samples');
  }
  return response.json();
}

/**
 * Get current HeadNeRF state
 */
export async function getHeadNeRFCurrent() {
  const response = await fetchApi(`${API_BASE_URL}/api/headnerf/current`);
  if (!response.ok) {
    throw new Error('Failed to get current state');
  }
  return response.json();
}

/**
 * Set HeadNeRF source sample
 * @param {string} sampleName - Name of sample to use as source
 */
export async function setHeadNeRFSource(sampleName) {
  const response = await fetchApi(
    `${API_BASE_URL}/api/headnerf/set_source?sample_name=${encodeURIComponent(sampleName)}`,
    { method: 'POST' }
  );
  if (!response.ok) {
    throw new Error('Failed to set source');
  }
  return response.json();
}

/**
 * Set HeadNeRF target sample
 * @param {string} sampleName - Name of sample to use as target
 */
export async function setHeadNeRFTarget(sampleName) {
  const response = await fetchApi(
    `${API_BASE_URL}/api/headnerf/set_target?sample_name=${encodeURIComponent(sampleName)}`,
    { method: 'POST' }
  );
  if (!response.ok) {
    throw new Error('Failed to set target');
  }
  return response.json();
}

/**
 * Render HeadNeRF with current parameters
 * @param {Object} params - { identity, expression, albedo, illumination, pitch, yaw, roll }
 */
export async function renderHeadNeRF(params) {
  const queryParams = new URLSearchParams(params);
  const response = await fetchApi(`${API_BASE_URL}/api/headnerf/render?${queryParams}`);

  if (!response.ok) {
    throw new Error('HeadNeRF render failed');
  }
  return response.json();
}

/**
 * Fit image to HeadNeRF latent code
 * @param {File} imageFile - Face image to fit
 */
export async function fitHeadNeRF(imageFile) {
  const formData = new FormData();
  formData.append('image', imageFile);

  const response = await fetchApi(`${API_BASE_URL}/api/headnerf/fit`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || 'HeadNeRF fitting failed');
  }

  return response.json();
}

// =============================================
// RESULTS API (Cross-Tool Reuse)
// =============================================

/**
 * Get list of recent result images from all tools
 * @returns {{ results: Array<{ filename, tool, toolLabel, url, timestamp, size }> }}
 */
export async function getRecentResults() {
  const response = await fetchApi(`${API_BASE_URL}/api/results`);
  if (!response.ok) {
    throw new Error('Failed to fetch results');
  }
  return response.json();
}

/**
 * Delete a specific result file
 * @param {string} tool - Tool folder name (simswap, background_removal, headnerf)
 * @param {string} filename - File name to delete
 */
export async function deleteResult(tool, filename) {
  const response = await fetchApi(`${API_BASE_URL}/api/results/${tool}/${filename}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error('Failed to delete result');
  }
  return response.json();
}

/**
 * Convert a result URL to a File object for use as upload input
 * @param {string} url - Result image URL (relative or absolute)
 * @param {string} filename - Desired filename
 * @returns {File}
 */
export async function resultUrlToFile(url, filename = 'result.png') {
  const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
  const response = await fetchApi(fullUrl);
  const blob = await response.blob();
  return new File([blob], filename, { type: blob.type });
}

/**
 * Save an edited image (from canvas) back to shared results for cross-tool reuse
 * @param {Blob} blob - Image blob (e.g. from canvas.toBlob)
 * @param {string} tool - Tool name (simswap, background_removal, headnerf)
 * @returns {{ ok, filename, url }}
 */
export async function saveEditedResult(blob, tool = 'simswap') {
  const formData = new FormData();
  formData.append('image', blob, 'edited.png');
  formData.append('tool', tool);

  const response = await fetchApi(`${API_BASE_URL}/api/results/save`, {
    method: 'POST',
    body: formData,
  });
  if (!response.ok) {
    throw new Error('Failed to save edited result');
  }
  return response.json();
}
