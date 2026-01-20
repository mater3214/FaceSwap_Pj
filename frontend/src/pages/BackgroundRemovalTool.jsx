import { useState, useCallback, useRef } from 'react';
import { runBackgroundRemoval, getResultImageUrl } from '../services/api';
import './BackgroundRemovalTool.css';
import '../pages/HeadNeRFTool.css';

const PRESET_COLORS = [
    { rgb: '255,255,255', hex: '#ffffff', name: 'White' },
    { rgb: '0,0,0', hex: '#000000', name: 'Black' },
    { rgb: '30,30,30', hex: '#1e1e1e', name: 'Dark Gray' },
    { rgb: '59,130,246', hex: '#3b82f6', name: 'Blue' },
    { rgb: '139,92,246', hex: '#8b5cf6', name: 'Purple' },
    { rgb: '236,72,153', hex: '#ec4899', name: 'Pink' },
    { rgb: '34,197,94', hex: '#22c55e', name: 'Green' },
    { rgb: '234,179,8', hex: '#eab308', name: 'Yellow' },
];

const GRADIENT_PRESETS = [
    { name: 'Sunset', colors: ['#f093fb', '#f5576c'] },
    { name: 'Ocean', colors: ['#667eea', '#764ba2'] },
    { name: 'Aurora', colors: ['#00d2ff', '#3a7bd5'] },
    { name: 'Forest', colors: ['#11998e', '#38ef7d'] },
];

const MODES = [
    { id: 'transparent', label: 'Transparent', icon: '🔲', desc: 'PNG with no background' },
    { id: 'color', label: 'Solid Color', icon: '🎨', desc: 'Replace with solid color' },
    { id: 'image', label: 'Custom Image', icon: '🖼️', desc: 'Use your own background' },
    { id: 'blur', label: 'Blur Effect', icon: '🌫️', desc: 'Blur the original background' },
];

function BackgroundRemovalTool() {
    const [image, setImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [mode, setMode] = useState('transparent');
    const [selectedColors, setSelectedColors] = useState(['255,255,255']);
    const [bgImage, setBgImage] = useState(null);
    const [bgImagePreview, setBgImagePreview] = useState(null);

    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState(null);
    const [results, setResults] = useState([]);
    const [originalPreview, setOriginalPreview] = useState(null);
    const [showCompare, setShowCompare] = useState(false);
    const [comparePosition, setComparePosition] = useState(50);

    const dropRef = useRef(null);
    const bgDropRef = useRef(null);

    const handleDrop = useCallback((e, type = 'main') => {
        e.preventDefault();
        const ref = type === 'main' ? dropRef : bgDropRef;
        ref.current?.classList.remove('drag-over');

        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            if (type === 'main') {
                setImage(file);
                setImagePreview(URL.createObjectURL(file));
                setOriginalPreview(URL.createObjectURL(file));
                setResults([]);
                setError(null);
            } else {
                setBgImage(file);
                setBgImagePreview(URL.createObjectURL(file));
            }
        }
    }, []);

    const handleImageChange = useCallback((e) => {
        const file = e.target.files[0];
        if (file) {
            setImage(file);
            setImagePreview(URL.createObjectURL(file));
            setOriginalPreview(URL.createObjectURL(file));
            setResults([]);
            setError(null);
        }
    }, []);

    const handleBgImageChange = useCallback((e) => {
        const file = e.target.files[0];
        if (file) {
            setBgImage(file);
            setBgImagePreview(URL.createObjectURL(file));
        }
    }, []);

    const selectColor = useCallback((rgb) => {
        setSelectedColors([rgb]);
    }, []);

    const handleProcess = async () => {
        if (!image) {
            setError('Please upload an image first.');
            return;
        }

        try {
            setIsProcessing(true);
            setError(null);
            setResults([]);

            const result = await runBackgroundRemoval(image, mode, selectedColors, bgImage);

            if (result.ok && result.results) {
                setResults(result.results.map(url => getResultImageUrl(url)));
            } else {
                throw new Error(result.detail || 'Processing failed');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDownload = (url, index) => {
        const link = document.createElement('a');
        link.href = url;
        link.download = `background-removed-${index + 1}.png`;
        link.click();
    };

    return (
        <div className="bgr-page">
            {/* Header */}
            <header className="headnerf-header">
                <h1>Background Removal</h1>
                <p>Remove backgrounds instantly with advanced AI technology</p>
            </header>

            {/* Main Content */}
            <div className="bgr-container">
                {/* Two Column Layout */}
                <div className="bgr-layout">
                    {/* Left: Upload & Settings */}
                    <div className="bgr-left">
                        {/* Upload Area */}
                        <section className="upload-area">
                            <h3 className="section-title">📷 Upload Image</h3>
                            <div
                                className={`drop-zone ${imagePreview ? 'has-image' : ''}`}
                                ref={dropRef}
                                onDragOver={(e) => {
                                    e.preventDefault();
                                    dropRef.current?.classList.add('drag-over');
                                }}
                                onDragLeave={() => dropRef.current?.classList.remove('drag-over')}
                                onDrop={(e) => handleDrop(e, 'main')}
                                onClick={() => document.getElementById('main-input').click()}
                            >
                                {imagePreview ? (
                                    <div className="preview-container">
                                        <img src={imagePreview} alt="Upload" className="main-preview" />
                                        <div className="preview-overlay">
                                            <span>Click or drop to replace</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="drop-content">
                                        <div className="drop-icon">📷</div>
                                        <h3>Drop your image here</h3>
                                        <p>or click to browse</p>
                                        <span className="supported-formats">PNG, JPG, WEBP • Max 10MB</span>
                                    </div>
                                )}
                                <input
                                    id="main-input"
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageChange}
                                    hidden
                                />
                            </div>
                        </section>

                        {/* Mode Selection */}
                        <section className="mode-section">
                            <h3 className="section-title">🎯 Output Mode</h3>
                            <div className="mode-grid">
                                {MODES.map(m => (
                                    <button
                                        key={m.id}
                                        className={`mode-card ${mode === m.id ? 'active' : ''}`}
                                        onClick={() => setMode(m.id)}
                                    >
                                        <span className="mode-icon">{m.icon}</span>
                                        <span className="mode-label">{m.label}</span>
                                        <span className="mode-desc">{m.desc}</span>
                                    </button>
                                ))}
                            </div>
                        </section>

                        {/* Color Options (for color mode) */}
                        {mode === 'color' && (
                            <section className="options-section">
                                <h3 className="section-title">🎨 Background Color</h3>
                                <div className="color-grid">
                                    {PRESET_COLORS.map(c => (
                                        <button
                                            key={c.rgb}
                                            className={`color-swatch ${selectedColors.includes(c.rgb) ? 'active' : ''}`}
                                            style={{ backgroundColor: c.hex }}
                                            onClick={() => selectColor(c.rgb)}
                                            title={c.name}
                                        />
                                    ))}
                                    <label className="color-picker-wrapper">
                                        <input
                                            type="color"
                                            className="color-picker-input"
                                            onChange={(e) => {
                                                const hex = e.target.value;
                                                const r = parseInt(hex.slice(1, 3), 16);
                                                const g = parseInt(hex.slice(3, 5), 16);
                                                const b = parseInt(hex.slice(5, 7), 16);
                                                selectColor(`${r},${g},${b}`);
                                            }}
                                        />
                                        <span className="picker-icon">+</span>
                                    </label>
                                </div>

                                {/* Gradient Presets */}
                                <div className="gradient-section">
                                    <span className="gradient-label">Or try gradients:</span>
                                    <div className="gradient-presets">
                                        {GRADIENT_PRESETS.map(g => (
                                            <button
                                                key={g.name}
                                                className="gradient-btn"
                                                style={{
                                                    background: `linear-gradient(135deg, ${g.colors[0]}, ${g.colors[1]})`
                                                }}
                                                title={g.name}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </section>
                        )}

                        {/* Custom BG Image (for image mode) */}
                        {mode === 'image' && (
                            <section className="options-section">
                                <h3 className="section-title">🖼️ Custom Background</h3>
                                <div
                                    className={`drop-zone bg-drop ${bgImagePreview ? 'has-image' : ''}`}
                                    ref={bgDropRef}
                                    onDragOver={(e) => {
                                        e.preventDefault();
                                        bgDropRef.current?.classList.add('drag-over');
                                    }}
                                    onDragLeave={() => bgDropRef.current?.classList.remove('drag-over')}
                                    onDrop={(e) => handleDrop(e, 'bg')}
                                    onClick={() => document.getElementById('bg-input').click()}
                                >
                                    {bgImagePreview ? (
                                        <img src={bgImagePreview} alt="Background" className="bg-preview" />
                                    ) : (
                                        <div className="drop-content small">
                                            <span className="drop-icon">🖼️</span>
                                            <span>Drop background image</span>
                                        </div>
                                    )}
                                    <input
                                        id="bg-input"
                                        type="file"
                                        accept="image/*"
                                        onChange={handleBgImageChange}
                                        hidden
                                    />
                                </div>
                            </section>
                        )}

                        {/* Blur Info */}
                        {mode === 'blur' && (
                            <section className="options-section">
                                <div className="info-card">
                                    <span className="info-icon">💡</span>
                                    <p>The original background will be blurred while keeping your subject sharp and in focus.</p>
                                </div>
                            </section>
                        )}
                    </div>

                    {/* Right: Results */}
                    <div className="bgr-right">
                        <section className="result-section">
                            <h3 className="section-title">✨ Result</h3>

                            {/* Process Button */}
                            <div className="action-section">
                                <button
                                    className="process-btn"
                                    onClick={handleProcess}
                                    disabled={isProcessing || !image}
                                >
                                    {isProcessing ? (
                                        <>
                                            <span className="spinner"></span>
                                            Processing...
                                        </>
                                    ) : (
                                        <>
                                            <span className="btn-icon">✨</span>
                                            Remove Background
                                        </>
                                    )}
                                </button>

                                {error && (
                                    <div className="error-message">{error}</div>
                                )}
                            </div>

                            {/* Results Display */}
                            {results.length > 0 ? (
                                <div className="results-container">
                                    <div className="results-header">
                                        <div className="result-actions">
                                            {originalPreview && (
                                                <button
                                                    className={`compare-toggle ${showCompare ? 'active' : ''}`}
                                                    onClick={() => setShowCompare(!showCompare)}
                                                >
                                                    👁️ Compare
                                                </button>
                                            )}
                                            <button
                                                className="download-btn"
                                                onClick={() => handleDownload(results[0], 0)}
                                            >
                                                ⬇️ Download
                                            </button>
                                        </div>
                                    </div>

                                    {showCompare && originalPreview ? (
                                        <div className="compare-container">
                                            <div
                                                className="compare-slider"
                                                style={{ '--position': `${comparePosition}%` }}
                                            >
                                                <img src={results[0]} alt="Result" className="compare-img result" />
                                                <img src={originalPreview} alt="Original" className="compare-img original" />
                                                <input
                                                    type="range"
                                                    min="0"
                                                    max="100"
                                                    value={comparePosition}
                                                    onChange={(e) => setComparePosition(e.target.value)}
                                                    className="compare-range"
                                                />
                                                <div className="compare-handle" style={{ left: `${comparePosition}%` }}>
                                                    <span>◀ ▶</span>
                                                </div>
                                            </div>
                                            <div className="compare-labels">
                                                <span>Original</span>
                                                <span>Result</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="result-preview">
                                            <div className="checkered-bg">
                                                <img src={results[0]} alt="Result" />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="empty-result">
                                    <div className="empty-icon">🖼️</div>
                                    <p>Upload an image and click "Remove Background" to see the result here</p>
                                </div>
                            )}
                        </section>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default BackgroundRemovalTool;
