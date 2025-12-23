import { useState, useRef, useEffect, useCallback } from 'react';
import { getResultImageUrl } from '../services/api';
import './ColorEditor.css';

function ColorEditor({
    resultUrl,
    selectedRegion,
    onBack,
    onDownload
}) {
    const canvasRef = useRef(null);
    const originalImageRef = useRef(null);
    const [imageLoaded, setImageLoaded] = useState(false);

    // Color adjustment values
    const [adjustments, setAdjustments] = useState({
        brightness: 100,
        contrast: 100,
        saturation: 100,
        temperature: 0,
        exposure: 0,
        shadows: 0,
        highlights: 0
    });

    // Load image and apply initial region preset
    useEffect(() => {
        if (resultUrl) {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                originalImageRef.current = img;
                setImageLoaded(true);

                // Apply region preset if available
                if (selectedRegion?.colorSettings) {
                    const settings = selectedRegion.colorSettings;
                    setAdjustments(prev => ({
                        ...prev,
                        brightness: (settings.brightness || 1) * 100,
                        contrast: (settings.contrast || 1) * 100,
                        saturation: (settings.saturation || 1) * 100,
                        temperature: settings.temperature || 0
                    }));
                }
            };
            // Handle both API URLs and blob URLs
            const imageUrl = resultUrl.startsWith('blob:')
                ? resultUrl
                : getResultImageUrl(resultUrl) + '?t=' + Date.now();
            img.src = imageUrl;
        }
    }, [resultUrl, selectedRegion]);

    // Apply filters when adjustments change
    const applyFilters = useCallback(() => {
        if (!canvasRef.current || !originalImageRef.current || !imageLoaded) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const img = originalImageRef.current;

        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;

        // Build CSS filter string
        const filters = [
            `brightness(${adjustments.brightness}%)`,
            `contrast(${adjustments.contrast}%)`,
            `saturate(${adjustments.saturation}%)`,
        ];

        // Temperature simulation using sepia and hue-rotate
        if (adjustments.temperature !== 0) {
            if (adjustments.temperature > 0) {
                filters.push(`sepia(${adjustments.temperature}%)`);
            } else {
                filters.push(`hue-rotate(${adjustments.temperature * 2}deg)`);
            }
        }

        ctx.filter = filters.join(' ');
        ctx.drawImage(img, 0, 0);
    }, [adjustments, imageLoaded]);

    useEffect(() => {
        applyFilters();
    }, [applyFilters]);

    const handleSliderChange = (name, value) => {
        setAdjustments(prev => ({
            ...prev,
            [name]: parseFloat(value)
        }));
    };

    const handleReset = () => {
        if (selectedRegion?.colorSettings) {
            const settings = selectedRegion.colorSettings;
            setAdjustments({
                brightness: (settings.brightness || 1) * 100,
                contrast: (settings.contrast || 1) * 100,
                saturation: (settings.saturation || 1) * 100,
                temperature: settings.temperature || 0,
                exposure: 0,
                shadows: 0,
                highlights: 0
            });
        } else {
            setAdjustments({
                brightness: 100,
                contrast: 100,
                saturation: 100,
                temperature: 0,
                exposure: 0,
                shadows: 0,
                highlights: 0
            });
        }
    };

    const handleDownload = () => {
        if (!canvasRef.current) return;

        const canvas = canvasRef.current;
        const link = document.createElement('a');
        link.download = `facelab_edited_${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    };

    const sliders = [
        { name: 'brightness', label: 'ความสว่าง', icon: '☀️', min: 0, max: 200, default: 100 },
        { name: 'contrast', label: 'ความคมชัด', icon: '◐', min: 0, max: 200, default: 100 },
        { name: 'saturation', label: 'ความอิ่มตัว', icon: '🎨', min: 0, max: 200, default: 100 },
        { name: 'temperature', label: 'อุณหภูมิสี', icon: '🌡️', min: -50, max: 50, default: 0 },
    ];

    return (
        <div className="color-editor">
            <div className="editor-header">
                <h2 className="step-title">
                    <span className="step-number">4</span>
                    ปรับแต่งสี
                </h2>
                <p className="step-description">
                    ปรับแต่งสีและแสงให้เหมาะกับภูมิภาค
                    {selectedRegion && (
                        <span className="region-badge">
                            {selectedRegion.flag} {selectedRegion.name}
                        </span>
                    )}
                </p>
            </div>

            <div className="editor-layout">
                {/* Preview */}
                <div className="preview-panel">
                    <div className="preview-container">
                        {imageLoaded ? (
                            <canvas ref={canvasRef} className="preview-canvas" />
                        ) : (
                            <div className="loading-preview">
                                <div className="spinner"></div>
                                <span>กำลังโหลดรูปภาพ...</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Controls */}
                <div className="controls-panel">
                    <div className="controls-section">
                        <h3 className="section-title">การปรับแต่ง</h3>

                        {sliders.map((slider) => (
                            <div key={slider.name} className="slider-group">
                                <div className="slider-header">
                                    <span className="slider-icon">{slider.icon}</span>
                                    <span className="slider-label">{slider.label}</span>
                                    <span className="slider-value">{Math.round(adjustments[slider.name])}</span>
                                </div>
                                <input
                                    type="range"
                                    min={slider.min}
                                    max={slider.max}
                                    value={adjustments[slider.name]}
                                    onChange={(e) => handleSliderChange(slider.name, e.target.value)}
                                    className="slider"
                                />
                            </div>
                        ))}

                        <button className="btn btn-ghost reset-btn" onClick={handleReset}>
                            🔄 รีเซ็ตค่า
                        </button>
                    </div>

                    {/* Presets */}
                    <div className="controls-section">
                        <h3 className="section-title">พรีเซ็ตตามภูมิภาค</h3>
                        <div className="preset-grid">
                            <button
                                className="preset-btn warm"
                                onClick={() => setAdjustments(prev => ({
                                    ...prev,
                                    temperature: 20,
                                    saturation: 110
                                }))}
                            >
                                ☀️ โทนร้อน
                            </button>
                            <button
                                className="preset-btn cool"
                                onClick={() => setAdjustments(prev => ({
                                    ...prev,
                                    temperature: -20,
                                    saturation: 90
                                }))}
                            >
                                ❄️ โทนเย็น
                            </button>
                            <button
                                className="preset-btn neutral"
                                onClick={() => setAdjustments(prev => ({
                                    ...prev,
                                    temperature: 0,
                                    saturation: 100
                                }))}
                            >
                                ⚖️ โทนกลาง
                            </button>
                            <button
                                className="preset-btn vivid"
                                onClick={() => setAdjustments(prev => ({
                                    ...prev,
                                    saturation: 130,
                                    contrast: 110
                                }))}
                            >
                                🌈 สดใส
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="editor-actions">
                <button className="btn btn-secondary" onClick={onBack}>
                    ← กลับ
                </button>
                <button className="btn btn-primary" onClick={handleDownload}>
                    ⬇️ ดาวน์โหลดผลลัพธ์
                </button>
            </div>
        </div>
    );
}

export default ColorEditor;
