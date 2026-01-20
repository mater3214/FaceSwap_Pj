// API Service for FaceLab
const API_BASE_URL = 'http://localhost:8000';

/**
 * Fetch all available regions
 */
export async function getRegions() {
  const response = await fetch(`${API_BASE_URL}/api/regions`);
  if (!response.ok) {
    throw new Error('Failed to fetch regions');
  }
  const data = await response.json();
  return data.regions;
}

/**
 * Fetch a specific region by ID
 */
export async function getRegionById(regionId) {
  const response = await fetch(`${API_BASE_URL}/api/regions/${regionId}`);
  if (!response.ok) {
    throw new Error(`Region '${regionId}' not found`);
  }
  return response.json();
}

/**
 * Run SimSwap face swap (single face)
 * @param {File} srcFile - Source face image
 * @param {File} dstFile - Target/destination image
 * @param {string} regionId - Selected region ID (optional, for future use)
 */
export async function runSimSwap(srcFile, dstFile, regionId = null) {
  const formData = new FormData();
  formData.append('src', srcFile);
  formData.append('dst', dstFile);

  const response = await fetch(`${API_BASE_URL}/api/simswap`, {
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
 * @param {File[]} srcFiles - Array of source face images
 * @param {File} dstFile - Target/destination image
 */
export async function runSimSwapMulti(srcFiles, dstFile) {
  const formData = new FormData();
  srcFiles.forEach(file => {
    formData.append('src', file);
  });
  formData.append('dst', dstFile);

  const response = await fetch(`${API_BASE_URL}/api/simswap_multi_upload`, {
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
    const response = await fetch(`${API_BASE_URL}/health`);
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

  const response = await fetch(`${API_BASE_URL}/api/background_removal`, {
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
  const formData = new FormData();
  formData.append('dst', dstFile);

  const response = await fetch(`${API_BASE_URL}/api/simswap_multi_detect`, {
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
  const formData = new FormData();
  srcFiles.forEach(file => formData.append('src', file));
  formData.append('dst', dstFile);

  if (mapping && Object.keys(mapping).length > 0) {
    const mapStr = Object.entries(mapping)
      .filter(([_, srcIdx]) => srcIdx !== -1)
      .map(([tgtIdx, srcIdx]) => `${tgtIdx}:${srcIdx}`)
      .join(',');
    if (mapStr) formData.append('mapping', mapStr);
  }

  const response = await fetch(`${API_BASE_URL}/api/simswap_multi_upload`, {
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
  const response = await fetch(`${API_BASE_URL}/api/headnerf/samples`);
  if (!response.ok) {
    throw new Error('Failed to fetch HeadNeRF samples');
  }
  return response.json();
}

/**
 * Get current HeadNeRF state
 */
export async function getHeadNeRFCurrent() {
  const response = await fetch(`${API_BASE_URL}/api/headnerf/current`);
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
  const response = await fetch(
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
  const response = await fetch(
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
  const response = await fetch(`${API_BASE_URL}/api/headnerf/render?${queryParams}`);

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

  const response = await fetch(`${API_BASE_URL}/api/headnerf/fit`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || 'HeadNeRF fitting failed');
  }

  return response.json();
}
