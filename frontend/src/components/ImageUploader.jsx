import { useState, useRef, useCallback } from 'react';
import './ImageUploader.css';

function ImageUploader({ onSourceChange, onTargetChange, sourceFile, targetFile }) {
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

    const handleDrop = useCallback((e, type, onChange) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOver(prev => ({ ...prev, [type]: false }));

        const files = e.dataTransfer.files;
        if (files && files[0]) {
            const file = files[0];
            if (file.type.startsWith('image/')) {
                onChange(file);
            }
        }
    }, []);

    const handleFileChange = useCallback((e, onChange) => {
        const file = e.target.files?.[0];
        if (file) {
            onChange(file);
        }
    }, []);

    const createPreview = (file) => {
        if (!file) return null;
        return URL.createObjectURL(file);
    };

    const UploadZone = ({
        type,
        file,
        onChange,
        inputRef,
        title,
        description,
        icon
    }) => (
        <div
            className={`upload-zone ${dragOver[type] ? 'drag-over' : ''} ${file ? 'has-file' : ''}`}
            onDragOver={(e) => handleDragOver(e, type)}
            onDragLeave={(e) => handleDragLeave(e, type)}
            onDrop={(e) => handleDrop(e, type, onChange)}
            onClick={() => inputRef.current?.click()}
        >
            <input
                ref={inputRef}
                type="file"
                accept="image/*"
                onChange={(e) => handleFileChange(e, onChange)}
                style={{ display: 'none' }}
            />

            {file ? (
                <div className="preview-container">
                    <img
                        src={createPreview(file)}
                        alt={title}
                        className="preview-image"
                    />
                    <div className="preview-overlay">
                        <span className="preview-filename">{file.name}</span>
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

    return (
        <div className="image-uploader">
            <div className="uploader-header">
                <h2 className="step-title">
                    <span className="step-number">1</span>
                    อัพโหลดรูปภาพ
                </h2>
                <p className="step-description">
                    เลือกรูปหน้าอ้างอิง (Source) และรูปเป้าหมาย (Target) ที่ต้องการสลับหน้า
                </p>
            </div>

            <div className="upload-grid">
                <UploadZone
                    type="source"
                    file={sourceFile}
                    onChange={onSourceChange}
                    inputRef={sourceInputRef}
                    title="รูปอ้างอิง (Source)"
                    description="หน้าที่จะนำไปใส่ในรูปเป้าหมาย"
                    icon="👤"
                />

                <div className="arrow-connector">
                    <div className="arrow-line"></div>
                    <div className="arrow-icon">→</div>
                    <div className="arrow-line"></div>
                </div>

                <UploadZone
                    type="target"
                    file={targetFile}
                    onChange={onTargetChange}
                    inputRef={targetInputRef}
                    title="รูปเป้าหมาย (Target)"
                    description="รูปที่จะถูกเปลี่ยนหน้า + สินค้าจะยังคงเดิม"
                    icon="🎯"
                />
            </div>
        </div>
    );
}

export default ImageUploader;
