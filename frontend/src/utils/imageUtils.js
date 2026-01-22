/**
 * Image Utilities for FaceLab
 * Provides image compression and processing functions
 */

/**
 * Compress an image file using canvas
 * @param {File} file - Original image file
 * @param {Object} options - Compression options
 * @param {number} options.maxWidth - Maximum width (default: 1920)
 * @param {number} options.maxHeight - Maximum height (default: 1920)
 * @param {number} options.quality - JPEG quality 0-1 (default: 0.85)
 * @param {number} options.maxSizeMB - Maximum file size in MB (default: 2)
 * @returns {Promise<File>} Compressed image file
 */
export async function compressImage(file, options = {}) {
    const {
        maxWidth = 1920,
        maxHeight = 1920,
        quality = 0.85,
        maxSizeMB = 2
    } = options;

    // Return original if already small enough
    if (file.size <= maxSizeMB * 1024 * 1024) {
        return file;
    }

    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (event) => {
            const img = new Image();
            
            img.onload = () => {
                // Calculate new dimensions
                let { width, height } = img;
                
                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }
                
                if (height > maxHeight) {
                    width = (width * maxHeight) / height;
                    height = maxHeight;
                }
                
                // Create canvas and draw resized image
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                
                const ctx = canvas.getContext('2d');
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.drawImage(img, 0, 0, width, height);
                
                // Convert to blob
                canvas.toBlob(
                    (blob) => {
                        if (!blob) {
                            reject(new Error('Canvas to Blob conversion failed'));
                            return;
                        }
                        
                        // Create new file with same name
                        const compressedFile = new File(
                            [blob],
                            file.name,
                            { type: 'image/jpeg', lastModified: Date.now() }
                        );
                        
                        console.log(`Image compressed: ${(file.size / 1024).toFixed(1)}KB → ${(compressedFile.size / 1024).toFixed(1)}KB`);
                        resolve(compressedFile);
                    },
                    'image/jpeg',
                    quality
                );
            };
            
            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = event.target.result;
        };
        
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
    });
}

/**
 * Compress multiple images
 * @param {File[]} files - Array of image files
 * @param {Object} options - Compression options
 * @returns {Promise<File[]>} Array of compressed files
 */
export async function compressImages(files, options = {}) {
    return Promise.all(files.map(file => compressImage(file, options)));
}

/**
 * Check if a file is an image
 * @param {File} file - File to check
 * @returns {boolean}
 */
export function isImageFile(file) {
    return file && file.type.startsWith('image/');
}

/**
 * Get image dimensions
 * @param {File} file - Image file
 * @returns {Promise<{width: number, height: number}>}
 */
export function getImageDimensions(file) {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        
        img.onload = () => {
            URL.revokeObjectURL(url);
            resolve({ width: img.width, height: img.height });
        };
        
        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Failed to load image'));
        };
        
        img.src = url;
    });
}
