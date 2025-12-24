import { useState, useRef, useCallback } from 'react';
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
    const sourceInputRef = useRef(null);
    const targetInputRef = useRef(null);

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
    }, []);

    const createPreview = (file) => {
        if (!file) return null;
        return URL.createObjectURL(file);
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
                onClick={() => inputRef.current?.click()}
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
                                        src={createPreview(f)}
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
                                src={createPreview(file)}
                                alt={title}
                                className="preview-image"
                            />
                        )}
                        <div className="preview-overlay">
                            <span className="preview-filename">
                                {isMulti ? `${files.length} ไฟล์` : file.name}
                            </span>
                            <button
                                className="btn-change"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    inputRef.current?.click();
                                }}
                            >
                                เปลี่ยนรูป
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="upload-placeholder">
                        <div className="upload-icon">{icon}</div>
                        <h3 className="upload-title">{title}</h3>
                        <p className="upload-description">{description}</p>
                        <span className="upload-hint">
                            ลากไฟล์มาวาง หรือคลิกเพื่อเลือก
                        </span>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="image-uploader">
            <div className="uploader-header">
                <h3 className="upload-section-title">
                    {isMultiMode ? 'Source faces (src)' : 'Source face (src)'}
                </h3>
                <p className="upload-section-desc">
                    {isMultiMode
                        ? 'Select multiple source face images'
                        : 'Select one source face image'
                    }
                </p>
            </div>

            <div className="upload-grid">
                <UploadZone
                    type="source"
                    file={sourceFile}
                    files={sourceFiles}
                    onChange={isMultiMode ? onSourceFilesChange : onSourceChange}
                    inputRef={sourceInputRef}
                    title={isMultiMode ? "รูปอ้างอิง (หลายหน้า)" : "รูปอ้างอิง (Source)"}
                    description={isMultiMode
                        ? "เลือกหลายรูปสำหรับหลายใบหน้า"
                        : "หน้าที่จะนำไปใส่ในรูปเป้าหมาย"
                    }
                    icon={isMultiMode ? "👥" : "👤"}
                    isMulti={isMultiMode}
                />

                <div className="arrow-connector">
                    <div className="arrow-line"></div>
                    <div className="arrow-icon">→</div>
                    <div className="arrow-line"></div>
                </div>

                <div className="target-section">
                    <div className="target-header">
                        <h3 className="upload-section-title">Target image (dst)</h3>
                        <p className="upload-section-desc">Select one target image</p>
                    </div>
                    <UploadZone
                        type="target"
                        file={targetFile}
                        onChange={onTargetChange}
                        inputRef={targetInputRef}
                        title="รูปเป้าหมาย (Target)"
                        description="รูปที่จะถูกเปลี่ยนหน้า"
                        icon="🎯"
                        isMulti={false}
                    />
                </div>
            </div>
        </div>
    );
}

export default ImageUploader;
