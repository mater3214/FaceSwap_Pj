import { useState, useRef, useCallback, useEffect } from 'react';
import CameraCapture from './CameraCapture';
import './ImageUploader.css';

function ImageUploader({
    onSourceChange,
    onSourceFilesChange,
    onTargetChange,
    sourceFile,
    sourceFiles = [],
    targetFile,
    isMultiMode = false
}) {
    const [dragOver, setDragOver] = useState({ source: false, target: false });
    const [previewUrls, setPreviewUrls] = useState({ source: null, target: null, multi: [] });
    const [showCamera, setShowCamera] = useState({ active: false, type: null, isMulti: false }); // Camera state

    const sourceInputRef = useRef(null);
    const targetInputRef = useRef(null);

    // Cleanup object URLs on unmount or when files change
    useEffect(() => {
        return () => {
            // Revoke all URLs on cleanup
            if (previewUrls.source) URL.revokeObjectURL(previewUrls.source);
            if (previewUrls.target) URL.revokeObjectURL(previewUrls.target);
            previewUrls.multi.forEach(url => URL.revokeObjectURL(url));
        };
    }, []);

    // Update preview URLs when files change
    useEffect(() => {
        // Cleanup old URLs
        if (previewUrls.source) URL.revokeObjectURL(previewUrls.source);

        // Create new URL
        const newUrl = sourceFile ? URL.createObjectURL(sourceFile) : null;
        setPreviewUrls(prev => ({ ...prev, source: newUrl }));
    }, [sourceFile]);

    useEffect(() => {
        // Cleanup old URLs
        if (previewUrls.target) URL.revokeObjectURL(previewUrls.target);

        // Create new URL
        const newUrl = targetFile ? URL.createObjectURL(targetFile) : null;
        setPreviewUrls(prev => ({ ...prev, target: newUrl }));
    }, [targetFile]);

    useEffect(() => {
        // Cleanup old URLs
        previewUrls.multi.forEach(url => URL.revokeObjectURL(url));

        // Create new URLs
        const newUrls = sourceFiles.map(f => URL.createObjectURL(f));
        setPreviewUrls(prev => ({ ...prev, multi: newUrls }));
    }, [sourceFiles]);

    const handleDragOver = useCallback((e, type) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOver(prev => ({ ...prev, [type]: true }));
    }, []);

    const handleDragLeave = useCallback((e, type) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOver(prev => ({ ...prev, [type]: false }));
    }, []);

    const handleDrop = useCallback((e, type, onChange, isMulti = false) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOver(prev => ({ ...prev, [type]: false }));

        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            if (isMulti) {
                const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
                if (imageFiles.length > 0) {
                    onChange(imageFiles);
                }
            } else {
                const file = files[0];
                if (file.type.startsWith('image/')) {
                    onChange(file);
                }
            }
        }
    }, []);

    const handleFileChange = useCallback((e, onChange, isMulti = false) => {
        if (isMulti) {
            const files = Array.from(e.target.files || []);
            if (files.length > 0) {
                onChange(files);
            }
        } else {
            const file = e.target.files?.[0];
            if (file) {
                onChange(file);
            }
        }
        // Reset input so same file can be re-selected
        if (e.target) e.target.value = '';
    }, []);

    // Camera Handlers
    const openCamera = (type, isMulti = false) => {
        setShowCamera({ active: true, type, isMulti });
    };

    const closeCamera = () => {
        setShowCamera({ active: false, type: null, isMulti: false });
    };

    const handleCameraCapture = (file) => {
        const { type, isMulti } = showCamera;

        if (type === 'source') {
            if (isMulti) {
                // Determine existing files to append to? Or replace? 
                // Usually appending is better for multi.
                // But for simplicity let's just append this one file to existing list
                onSourceFilesChange([...sourceFiles, file]);
            } else {
                onSourceChange(file);
            }
        } else if (type === 'target') {
            onTargetChange(file);
        }

        closeCamera();
    };

    // Get preview URL from state instead of creating new ones
    const getPreviewUrl = (type, index = 0) => {
        if (type === 'source') return previewUrls.source;
        if (type === 'target') return previewUrls.target;
        if (type === 'multi') return previewUrls.multi[index];
        return null;
    };

    const UploadZone = ({
        type,
        file,
        files = [],
        onChange,
        inputRef,
        title,
        description,
        icon,
        isMulti = false
    }) => {
        const hasContent = isMulti ? files.length > 0 : file;

        return (
            <div
                className={`upload-zone ${dragOver[type] ? 'drag-over' : ''} ${hasContent ? 'has-file' : ''}`}
                onDragOver={(e) => handleDragOver(e, type)}
                onDragLeave={(e) => handleDragLeave(e, type)}
                onDrop={(e) => handleDrop(e, type, onChange, isMulti)}
            >
                <input
                    ref={inputRef}
                    type="file"
                    accept="image/*"
                    multiple={isMulti}
                    onChange={(e) => handleFileChange(e, onChange, isMulti)}
                    style={{ display: 'none' }}
                />

                {hasContent ? (
                    <div className="preview-container">
                        {isMulti ? (
                            <div className="multi-preview">
                                {files.slice(0, 4).map((f, i) => (
                                    <img
                                        key={i}
                                        src={getPreviewUrl('multi', i)}
                                        alt={`Source ${i + 1}`}
                                        className="preview-image-small"
                                    />
                                ))}
                                {files.length > 4 && (
                                    <div className="more-files">+{files.length - 4}</div>
                                )}
                            </div>
                        ) : (
                            <img
                                src={getPreviewUrl(type)}
                                alt={title}
                                className="preview-image"
                            />
                        )}
                        <div className="preview-overlay">
                            <span className="preview-filename">
                                {isMulti ? `${files.length} ไฟล์` : file.name}
                            </span>
                            <div className="preview-actions">
                                <button
                                    className="btn-change"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        inputRef.current?.click();
                                    }}
                                >
                                    อัพโหลดใหม่
                                </button>
                                <button
                                    className="btn-change btn-camera-small"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        openCamera(type, isMulti);
                                    }}
                                >
                                    Retake
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="upload-placeholder">
                        <div className="upload-icon">{icon}</div>
                        <h3 className="upload-title">{title}</h3>
                        <p className="upload-description">{description}</p>

                        <div className="upload-buttons">
                            <button
                                className="btn-upload-trigger"
                                onClick={() => inputRef.current?.click()}
                            >
                                เลือกรูปภาพ
                            </button>
                            <span className="or-divider">หรือ</span>
                            <button
                                className="btn-camera-trigger"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    openCamera(type, isMulti);
                                }}
                            >
                                ถ่ายรูป
                            </button>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="image-uploader">
            <div className="upload-grid">
                <UploadZone
                    type="source"
                    file={sourceFile}
                    files={sourceFiles}
                    onChange={isMultiMode ? onSourceFilesChange : onSourceChange}
                    inputRef={sourceInputRef}
                    title={isMultiMode ? "Source Faces" : "Source Face"}
                    description={isMultiMode
                        ? "Drop multiple face images"
                        : "Drop a face image here"
                    }
                    icon={isMultiMode ? "👥" : "👤"}
                    isMulti={isMultiMode}
                />

                <div className="arrow-connector">
                    <div className="arrow-icon">→</div>
                </div>

                <UploadZone
                    type="target"
                    file={targetFile}
                    onChange={onTargetChange}
                    inputRef={targetInputRef}
                    title="Target Image"
                    description="Drop target image here"
                    icon="🎯"
                    isMulti={false}
                />
            </div>

            {/* Camera Modal */}
            {showCamera.active && (
                <CameraCapture
                    onCapture={handleCameraCapture}
                    onCancel={closeCamera}
                />
            )}
        </div>
    );
}

export default ImageUploader;
