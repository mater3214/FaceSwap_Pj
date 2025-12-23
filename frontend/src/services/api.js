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
