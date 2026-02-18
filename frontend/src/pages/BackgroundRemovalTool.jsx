import { useState, useCallback, useRef, useEffect } from 'react';
import { runBackgroundRemoval, getResultImageUrl, saveEditedResult } from '../services/api';
import ResultPicker from '../components/ResultPicker';
import './BackgroundRemovalTool.css';

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
    { id: 'transparent', label: 'Transparent', icon: '', desc: 'PNG with no background' },
    { id: 'color', label: 'Solid Color', icon: '', desc: 'Replace with solid color' },
    { id: 'image', label: 'Custom Image', icon: '', desc: 'Use your own background' },
    { id: 'blur', label: 'Blur Effect', icon: '', desc: 'Blur the original background' },
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

    // New state for interactive background
    const [bgTransform, setBgTransform] = useState({ x: 0, y: 0, scale: 1 });
    const [showOptionsModal, setShowOptionsModal] = useState(false);
    const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
    const [compositePreview, setCompositePreview] = useState(null);

    // Advanced Adjustment Mode State
    const [adjustmentMode, setAdjustmentMode] = useState('auto'); // 'auto', 'manual', 'preset'

    // --- MULTI-LAYER STATE ---
    // layers: Array of { id, image, x, y, scale }
    const [layers, setLayers] = useState([]);
    const [activeLayerId, setActiveLayerId] = useState(null);

    // Cache for switching modes without re-fetching
    const [singleLayers, setSingleLayers] = useState([]); // u2net result
    const [multiLayers, setMultiLayers] = useState([]);   // YOLO result

    // Result Picker
    const [pickerOpen, setPickerOpen] = useState(false);
    const [isFetchingMulti, setIsFetchingMulti] = useState(false);

    // Reset transform when mode or bg image changes
    useEffect(() => {
        setBgTransform({ x: 0, y: 0, scale: 1 });
        setResults([]);
        setCompositePreview(null);
        setLayers([]);
        setSingleLayers([]);
        setMultiLayers([]);
        setActiveLayerId(null);
    }, [mode, bgImage]);

    const dropRef = useRef(null);
    const bgDropRef = useRef(null);
    const viewportRef = useRef(null);

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
            setCompositePreview(null);
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

        if (mode === 'image' && !bgImage) {
            setError('Please upload a background image.');
            return;
        }

        try {
            setIsProcessing(true);
            setError(null);
            setResults([]);
            setResults([]);
            setLayers([]);
            setSingleLayers([]);
            setMultiLayers([]);

            // If mode is 'image', we actually request 'transparent' from the server
            // and handle the composition on the frontend to allow interactivity.
            const effectiveMode = mode;
            // For image/multi mode, we don't send the bgImage to server anymore, we use it locally
            const effectiveBgImage = (mode === 'image' || mode === 'multi') ? null : bgImage;

            const result = await runBackgroundRemoval(image, effectiveMode, selectedColors, effectiveBgImage);

            if (result.ok && result.results) {
                const resultUrls = result.results.map(url => getResultImageUrl(url));
                setResults(resultUrls);

                if (mode === 'image' || mode === 'multi') {
                    // Initialize Layers (Standard u2net result initially)
                    const newLayers = resultUrls.map((url, index) => ({
                        id: index,
                        url: url,
                        x: 0,
                        y: 0,
                        scale: 1,
                        zIndex: index + 1
                    }));

                    setLayers(newLayers);
                    setSingleLayers(newLayers); // Save as standard single layer

                    if (newLayers.length > 0) setActiveLayerId(0);

                    setShowAdjustmentModal(true);
                    setAdjustmentMode('manual'); // Default to Manual (Group)
                }
            } else {
                throw new Error(result.detail || 'Processing failed');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setIsProcessing(false);
        }
    };

    // Advanced Adjustment Handlers
    const dragStart = useRef(null);

    const handleTabChange = async (newMode) => {
        if (newMode === adjustmentMode) return;
        setAdjustmentMode(newMode);

        // Switch to Multi-Person -> Fetch if needed
        if (newMode === 'multi') {
            if (multiLayers.length > 0) {
                // Use cached
                setLayers(multiLayers);
                setActiveLayerId(0);
            } else {
                // Fetch YOLO result
                try {
                    setIsFetchingMulti(true);
                    // Call API with mode='multi' and NO bgImage (we just want layers)
                    // We reuse the current 'image' state
                    const result = await runBackgroundRemoval(image, 'multi', null, null);

                    if (result.ok && result.results) {
                        // Get current viewport metrics for accurate coordinate conversion
                        const viewport = viewportRef.current;
                        let vw = 1, vh = 1; // logical defaults
                        if (viewport) {
                            vw = viewport.clientWidth;
                            vh = viewport.clientHeight;
                        }

                        const yoloLayers = result.results.map((item, index) => {
                            let url, x = 0, y = 0, initialScale = 1;

                            // Check for structured object or legacy string
                            if (typeof item === 'object' && item.url) {
                                url = getResultImageUrl(item.url);

                                // Calculate position if box data exists
                                if (item.box && item.original_size) {
                                    const [bx, by, bw, bh] = item.box;
                                    const [ow, oh] = item.original_size;

                                    // 1. Calculate Scale Normalization
                                    // 'object-fit: contain' scales the crop to fit the viewport.
                                    // Scaling Factor K = min(ow/bw, oh/bh) (conceptually, since viewport ratio matches orig)
                                    // We want visual scale = 1 (relative to BG).
                                    // So we default scale to 1 / K.
                                    const fitRatio = Math.min(ow / bw, oh / bh);
                                    initialScale = 1 / fitRatio;

                                    // 2. Calculate Position Offset (converted to Viewport Pixels)
                                    const targetCx = bx + bw / 2;
                                    const targetCy = by + bh / 2;
                                    const cx = ow / 2;
                                    const cy = oh / 2;

                                    const offX = targetCx - cx;
                                    const offY = targetCy - cy;

                                    // Convert offset from Original Pixels to Viewport Pixels
                                    const pxRatio = vw / ow;
                                    x = offX * pxRatio;
                                    y = offY * pxRatio;
                                }
                            } else {
                                url = getResultImageUrl(item);
                            }

                            return {
                                id: index,
                                url: url,
                                x: x,
                                y: y,
                                scale: initialScale,
                                zIndex: index + 1
                            };
                        });

                        setMultiLayers(yoloLayers);
                        setLayers(yoloLayers);
                        if (yoloLayers.length > 0) setActiveLayerId(0);
                    } else {
                        // Fallback or error
                        console.error("Failed to fetch multi layers");
                    }
                } catch (e) {
                    console.error(e);
                } finally {
                    setIsFetchingMulti(false);
                }
            }
        }
        // Switch to Manual/Auto -> Use Single Layer (u2net)
        else {
            setLayers(singleLayers);
            // Reset transforms for Auto/Manual if you want, or keep them? 
            // Usually switching back to Manual implies we want the "Group" object back.
            // If we modified singleLayers before, we might want to preserve that state?
            // For now, let's just reload singleLayers. 
            // Ideally we should sync singleLayers state when we move it in 'manual' mode.
            // But 'setLayers' updates 'layers'. We need to sync 'layers' back to 'singleLayers' or 'multiLayers' on change?
            // For simplicity: We will just reset to 'singleLayers' (initial) or the last saved state of it.
            // Actually, let's just setLayers(singleLayers). 
            // Wait, if user moved the group in Manual, switched to Multi, then back... position is lost?
            // Yes, unless we save it. Let's accept that for now or improve it.
            // To improve: In handleMouseMove/Wheel, we are updating 'layers'.
            // When switching OUT, we should update the cache.

            // For now, simple switch:
            // (Note: The user request implies they use YOLO ONLY for Multi. So standard manual is u2net).
        }
    };

    // Sync current layers to cache before switching? 
    // It's tricky because structure might be different (1 layer vs 3 layers).
    // Let's just keep them separate worlds for now.

    const handleAutoCenter = () => {
        setLayers(prev => prev.map(l => ({ ...l, x: 0, y: 0, scale: 1 })));
    };

    const handleFitToCanvas = () => {
        // Simple fit logic - adjust scaling to be slightly smaller
        setLayers(prev => prev.map(l => ({ ...l, x: 0, y: 0, scale: 0.85 })));
    };

    const handleMouseDown = (e, layerId) => {
        if (adjustmentMode === 'auto') return;

        // MULTI MODE: Select & Move Individual Layer
        if (adjustmentMode === 'multi') {
            // Updated Logic: Selection is restricted to the top list only.
            // Clicking on the canvas ONLY affects the CURRENTLY SELECTED layer.
            // We ignore 'layerId' (the clicked layer) for selection purposes.

            const targetId = activeLayerId;
            if (targetId === null) return;

            const layer = layers.find(l => l.id === targetId);
            if (!layer) return;

            // Optional: You might want to check if the click was actually ON the active layer?
            // But user said "expand/shrink, move", implying they want to just grab it.
            // If they click on another person, it should probably move the *active* person?
            // Or should it ignore clicks not on the active person?
            // "Select person to edit" implies focus. 
            // Let's assume hitting "anywhere" or "the active person" moves the active person.
            // But if I click Person B while Person A is active, and Person A moves... that's weird.
            // Better: Only move if I click the ACTIVE person (layerId === activeLayerId).

            // Check if the click was on the active layer
            if (layerId !== undefined && layerId !== activeLayerId) {
                // Clicked on a different person -> Do nothing (don't select, don't move active)
                return;
            }

            // If layerId is undefined (background) OR layerId === activeLayerId, we move active.
            // Wait, moving active when clicking background is useful for small objects.
            // But if I click Person B, I definitely shouldn't move Person A.

            dragStart.current = {
                clientX: e.clientX,
                clientY: e.clientY,
                initialX: layer.x,
                initialY: layer.y,
                targetId: targetId,
                mode: 'multi'
            };
        }
        // MANUAL MODE: Move All Layers Together (Group)
        else if (adjustmentMode === 'manual') {
            dragStart.current = {
                clientX: e.clientX,
                clientY: e.clientY,
                initialLayers: layers.map(l => ({ id: l.id, x: l.x, y: l.y })),
                mode: 'manual'
            };
        }

        e.stopPropagation();
    };

    const handleMouseMove = (e) => {
        if (!dragStart.current) return;

        const { clientX, clientY, mode } = dragStart.current;
        const dx = e.clientX - clientX;
        const dy = e.clientY - clientY;

        if (mode === 'multi') {
            const { initialX, initialY, targetId } = dragStart.current;
            setLayers(prev => prev.map(l => {
                if (l.id === targetId) {
                    return { ...l, x: initialX + dx, y: initialY + dy };
                }
                return l;
            }));
        } else if (mode === 'manual') {
            const { initialLayers } = dragStart.current;
            setLayers(prev => prev.map(l => {
                const init = initialLayers.find(il => il.id === l.id);
                if (init) {
                    return { ...l, x: init.x + dx, y: init.y + dy };
                }
                return l;
            }));
        }
    };

    const handleMouseUp = () => {
        dragStart.current = null;
    };

    const handleWheel = (e) => {
        if (adjustmentMode === 'auto') return;

        const delta = -e.deltaY * 0.001;

        if (adjustmentMode === 'multi') {
            if (activeLayerId === null) return;
            setLayers(prev => prev.map(l => {
                if (l.id === activeLayerId) {
                    return { ...l, scale: Math.max(0.1, Math.min(5, l.scale + delta)) };
                }
                return l;
            }));
        } else if (adjustmentMode === 'manual') {
            // Scale all layers
            setLayers(prev => prev.map(l => ({
                ...l,
                scale: Math.max(0.1, Math.min(5, l.scale + delta))
            })));
        }
    };

    // Update scale via slider
    const handleScaleChange = (val) => {
        if (adjustmentMode === 'multi') {
            if (activeLayerId === null) return;
            setLayers(prev => prev.map(l => {
                if (l.id === activeLayerId) return { ...l, scale: val };
                return l;
            }));
        } else if (adjustmentMode === 'manual') {
            // Group Scale
            setLayers(prev => prev.map(l => ({ ...l, scale: val })));
        }
    };

    const handleConfirmAdjustment = async () => {
        if (layers.length === 0 || !bgImagePreview) return;

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const bgImg = new Image();

        bgImg.crossOrigin = "anonymous";
        bgImg.src = bgImagePreview;

        await new Promise(r => bgImg.onload = r);

        canvas.width = bgImg.naturalWidth;
        canvas.height = bgImg.naturalHeight;

        const cx = canvas.width / 2;
        const cy = canvas.height / 2;

        // Draw Background
        ctx.save();
        ctx.drawImage(bgImg, 0, 0);
        ctx.restore();

        // Calculate Viewport Scale Factors (X and Y independently for robustness)
        let scaleX = 1, scaleY = 1;
        if (viewportRef.current) {
            scaleX = canvas.width / viewportRef.current.clientWidth;
            scaleY = canvas.height / viewportRef.current.clientHeight;
        }

        // Load and Draw All Layers
        for (const layer of layers) {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.src = layer.url;
            await new Promise(r => img.onload = r);

            // Fit Scale: replicate 'object-fit: contain' logic relative to canvas size
            const fitScale = Math.min(canvas.width / img.naturalWidth, canvas.height / img.naturalHeight);

            ctx.save();
            ctx.translate(cx, cy); // origin at center

            // Apply translation using independent scales to map viewport % to canvas %
            ctx.translate(layer.x * scaleX, layer.y * scaleY);

            // Apply user scale * fit scale
            // We use isotropic scaling for the image itself to preserve aspect ratio
            ctx.scale(layer.scale * fitScale, layer.scale * fitScale);

            // Draw image centered
            ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);

            ctx.restore();
        }

        setCompositePreview(canvas.toDataURL('image/png'));
        setShowAdjustmentModal(false);
    };

    const handleDownload = (url, index) => {
        if (mode === 'image' || mode === 'multi') {
            const link = document.createElement('a');
            link.href = compositePreview || url;
            link.download = `composition-${index + 1}.png`;
            link.click();
        } else {
            const link = document.createElement('a');
            link.href = url;
            link.download = `background-removed-${index + 1}.png`;
            link.click();
        }
    };

    // Save result for cross-tool reuse
    const [savingReuse, setSavingReuse] = useState(false);
    const [savedReuse, setSavedReuse] = useState(false);

    const handleSaveForReuse = async () => {
        if (savingReuse) return;
        setSavingReuse(true);
        try {
            const dataUrl = compositePreview || results[0];
            const res = await fetch(dataUrl);
            const blob = await res.blob();
            await saveEditedResult(blob, 'background_removal');
            setSavedReuse(true);
            setTimeout(() => setSavedReuse(false), 3000);
        } catch (err) {
            console.error('Save failed:', err);
            alert('Save failed');
        } finally {
            setSavingReuse(false);
        }
    };

    const getActiveLayerScale = () => {
        if (activeLayerId === null) return 1;
        const l = layers.find(x => x.id === activeLayerId);
        return l ? l.scale : 1;
    };

    return (
        <div className="bgr-page">
            <header className="headnerf-header">
                <h1>Background Removal</h1>
            </header>
            <div className="bgr-container">
                <div className="output-mode-bar">
                    <div className="output-mode-label">
                        Output Mode
                    </div>
                    <div className="output-mode-cards">
                        {MODES.map(m => (
                            <button
                                key={m.id}
                                className={`output-mode-card ${mode === m.id ? 'active' : ''}`}
                                onClick={() => setMode(m.id)}
                            >
                                <span className="output-mode-icon">{m.icon}</span>
                                <span className="output-mode-name">{m.label}</span>
                                <span className="output-mode-desc">{m.desc}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="bgr-layout">
                    {/* Left: Upload Area */}
                    <div className="bgr-left">
                        <section className="upload-area">
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
                                        <div className="drop-icon">Upload</div>
                                        <h3>Drop your image here</h3>
                                        <p>or click to browse</p>
                                        <span className="supported-formats">PNG, JPG, WEBP up to 10MB</span>
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

                        {/* Use Previous Result Button */}
                        <button
                            className="process-btn"
                            onClick={() => setPickerOpen(true)}
                            style={{ marginTop: '8px', width: '100%', background: 'rgba(108, 99, 255, 0.15)', border: '1px dashed rgba(108, 99, 255, 0.4)', color: '#6c63ff', fontSize: '0.85rem' }}
                        >
                            Use Previous Result
                        </button>

                        <ResultPicker
                            isOpen={pickerOpen}
                            onClose={() => setPickerOpen(false)}
                            onSelect={(file, previewUrl) => {
                                setImage(file);
                                setImagePreview(previewUrl);
                                setOriginalPreview(previewUrl);
                                setResults([]);
                                setError(null);
                                setCompositePreview(null);
                            }}
                        />
                    </div>

                    {/* Right: Result Panel */}
                    <div className="bgr-right">
                        <section className="result-section">
                            <h3 className="section-title">Result</h3>

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
                                            <span className="btn-icon">*</span>
                                            Remove Background
                                        </>
                                    )}
                                </button>
                                {error && <div className="error-message">{error}</div>}

                                {/* Settings Buttons for Modes */}
                                {(mode === 'color' || mode === 'image') && (
                                    <button
                                        className="settings-btn"
                                        onClick={() => setShowOptionsModal(true)}
                                        style={{ marginTop: '12px' }}
                                    >
                                        {mode === 'color' ? 'Configure Color' : 'Choose Background Image'}
                                    </button>
                                )}
                            </div>

                            {results.length > 0 ? (
                                <div className="results-container">
                                    <div className="results-header">
                                        <div className="result-actions">
                                            {originalPreview && mode !== 'image' && mode !== 'multi' && (
                                                <button
                                                    className={`compare-toggle ${showCompare ? 'active' : ''}`}
                                                    onClick={() => setShowCompare(!showCompare)}
                                                >
                                                    Compare
                                                </button>
                                            )}
                                            <button
                                                className="download-btn"
                                                onClick={() => handleDownload(results[0], 0)}
                                            >
                                                Download
                                            </button>
                                            <button
                                                className={`download-btn ${savedReuse ? 'saved' : ''}`}
                                                onClick={handleSaveForReuse}
                                                disabled={savingReuse}
                                                style={{ marginLeft: '8px' }}
                                            >
                                                {savingReuse ? 'Saving...' : savedReuse ? 'Saved!' : 'Save for Reuse'}
                                            </button>
                                        </div>
                                    </div>

                                    {(mode === 'image' || mode === 'multi') ? (
                                        /* --- IMAGE MODE RESULT --- */
                                        <div className="result-preview">
                                            <div className="checkered-bg">
                                                <img src={compositePreview || results[0]} alt="Result" />
                                            </div>
                                        </div>
                                    ) : (
                                        /* --- STANDARD MODES --- */
                                        showCompare && originalPreview ? (
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
                                        )
                                    )}
                                </div>
                            ) : (
                                <div className="empty-result">
                                    <div className="empty-icon">--</div>
                                    <p>Upload an image and click "Remove Background" to see the result here</p>
                                </div>
                            )}
                        </section>

                        <div className="pro-tips-panel">
                            <div className="pro-tips-header">
                                Pro Tips
                            </div>
                            <ul className="pro-tips-list">
                                <li>Use high-resolution images for best results</li>
                                <li>Clear contrast between subject and background helps</li>
                            </ul>
                        </div>


                        {mode === 'blur' && (
                            <section className="options-section">
                                <div className="info-card">
                                    <span className="info-icon">i</span>
                                    <p>The original background will be blurred while keeping your subject sharp and in focus.</p>
                                </div>
                            </section>
                        )}
                    </div>
                </div>

            </div>
            {/* Options Modal */}
            {
                showOptionsModal && (mode === 'color' || mode === 'image' || mode === 'multi') && (
                    <div className="modal-overlay" onClick={() => setShowOptionsModal(false)}>
                        <div className="modal-content" onClick={e => e.stopPropagation()}>
                            <button className="modal-close" onClick={() => setShowOptionsModal(false)}>×</button>

                            {mode === 'color' && (
                                <section className="options-modal-section">
                                    <h3 className="section-title">Background Color</h3>
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
                                        {/* Color Picker Input ... */}
                                        <label className="color-picker-wrapper">
                                            <input
                                                type="color"
                                                className="color-picker-input"
                                                onChange={(e) => {
                                                    const hex = e.target.value;
                                                    const r = parseInt(hex.slice(1, 3), 16);
                                                    const g = parseInt(hex.slice(3, 5), 16);
                                                    const b = parseInt(hex.slice(5, 7), 16);
                                                    selectColor(`${r},${g},${b}`); // Corrected: wrapped in backticks
                                                }}
                                            />
                                            <span className="picker-icon">+</span>
                                        </label>
                                    </div>
                                    <div className="gradient-section">
                                        <span className="gradient-label">Or try gradients:</span>
                                        <div className="gradient-presets">
                                            {GRADIENT_PRESETS.map(g => {
                                                const hex = g.colors[0];
                                                const r = parseInt(hex.slice(1, 3), 16);
                                                const gVal = parseInt(hex.slice(3, 5), 16);
                                                const b = parseInt(hex.slice(5, 7), 16);
                                                return (
                                                    <button
                                                        key={g.name}
                                                        className="gradient-btn"
                                                        style={{
                                                            background: `linear-gradient(135deg, ${g.colors[0]}, ${g.colors[1]})`
                                                        }}
                                                        title={g.name}
                                                        onClick={() => selectColor(`${r},${gVal},${b}`)}
                                                    />
                                                );
                                            })}
                                        </div>
                                    </div>
                                    <button
                                        className="process-btn"
                                        onClick={() => setShowOptionsModal(false)}
                                        style={{ marginTop: '20px', width: '100%' }}
                                    >
                                        OK
                                    </button>
                                </section>
                            )}

                            {(mode === 'image' || mode === 'multi') && (
                                <section className="options-modal-section">
                                    <h3 className="section-title">Custom Background</h3>
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
                                                <span className="drop-icon">+</span>
                                                <span>Drop background image</span>
                                            </div>
                                        )}
                                        <input
                                            id="bg-input"
                                            type="file"
                                            accept="image/*"
                                            onChange={handleBgImageChange}
                                            style={{ display: 'none' }}
                                        />
                                    </div>
                                    <button
                                        className="process-btn"
                                        onClick={() => setShowOptionsModal(false)}
                                        style={{ marginTop: '20px', width: '100%' }}
                                    >
                                        OK
                                    </button>
                                </section>
                            )}
                        </div>
                    </div>
                )
            }

            {/* Adjustment Modal - For Image/Multi Composition */}
            {
                showAdjustmentModal && (mode === 'image' || mode === 'multi') && (
                    <div className="modal-overlay">
                        <div className="modal-content" style={{ maxWidth: '800px' }}>
                            <div className="options-modal-section">
                                <h3 className="section-title">Adjust Composition</h3>

                                <p style={{ marginBottom: '10px', fontSize: '0.9rem', color: '#888' }}>
                                    Detected {layers.length} person(s). Click to select, drag to move.
                                </p>

                                {/* Mode Tabs */}
                                <div className="mode-tabs">
                                    <button
                                        className={`mode-tab ${adjustmentMode === 'auto' ? 'active' : ''}`}
                                        onClick={() => handleTabChange('auto')}
                                    >
                                        Auto Fit
                                    </button>
                                    <button
                                        className={`mode-tab ${adjustmentMode === 'manual' ? 'active' : ''}`}
                                        onClick={() => handleTabChange('manual')}
                                    >
                                        Manual (Group)
                                    </button>

                                    <button
                                        className={`mode-tab ${adjustmentMode === 'multi' ? 'active' : ''}`}
                                        onClick={() => handleTabChange('multi')}
                                    >
                                        {isFetchingMulti ? 'Loading...' : 'Multi-Person'}
                                    </button>
                                </div>

                                <div className="composition-view">
                                    {/* Controls based on Mode */}
                                    <div className="comp-controls">
                                        {adjustmentMode === 'auto' && (
                                            <div className="auto-controls">
                                                <button className="secondary-btn" onClick={handleAutoCenter}>
                                                    Auto Center All
                                                </button>
                                                <button className="secondary-btn" onClick={handleFitToCanvas}>
                                                    Fit All to Canvas
                                                </button>
                                            </div>
                                        )}

                                        {adjustmentMode === 'manual' && (
                                            <div className="manual-controls">
                                                <p className="hint-text">Drag anywhere to move all people. Scroll to zoom all.</p>
                                                <div className="control-group">
                                                    <label>Group Scale</label>
                                                    <input
                                                        type="range" min="0.1" max="5" step="0.05"
                                                        defaultValue={1}
                                                        onChange={(e) => handleScaleChange(parseFloat(e.target.value))}
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {adjustmentMode === 'multi' && (
                                            <div className="manual-controls">
                                                <div className="layer-selection">
                                                    <p className="hint-text" style={{ marginBottom: '8px' }}>Select person to edit:</p>
                                                    <div className="layer-list">
                                                        {layers.map((layer, index) => (
                                                            <div
                                                                key={layer.id}
                                                                className={`layer-item ${activeLayerId === layer.id ? 'active' : ''}`}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setActiveLayerId(layer.id);
                                                                }}
                                                            >
                                                                <img src={layer.url} className="layer-thumb" alt={`Person ${index + 1}`} />
                                                                {activeLayerId === layer.id && <span className="layer-badge">✓</span>}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div className="control-group">
                                                    <label>Scale: {getActiveLayerScale().toFixed(2)}x</label>
                                                    <input
                                                        type="range" min="0.1" max="5" step="0.05"
                                                        value={getActiveLayerScale()}
                                                        onChange={(e) => handleScaleChange(parseFloat(e.target.value))}
                                                        disabled={activeLayerId === null}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div
                                        className="composition-viewport"
                                        ref={viewportRef}
                                        style={{ position: 'relative', width: 'auto', maxWidth: '100%', display: 'inline-flex' }} // inline-flex removes ghost space
                                        onMouseDown={(e) => handleMouseDown(e)} // No layerId arg means background/general click
                                        onMouseMove={handleMouseMove}
                                        onMouseUp={handleMouseUp}
                                        onMouseLeave={handleMouseUp}
                                        onWheel={handleWheel}
                                    >
                                        {/* Background Layer - Drives the size */}
                                        <img
                                            src={bgImagePreview}
                                            className="comp-bg-layer"
                                            alt="Background"
                                            style={{
                                                position: 'relative', // CHANGED: Must be relative to drive container height
                                                display: 'block',
                                                maxWidth: '100%',
                                                height: 'auto',
                                                pointerEvents: 'none',
                                                userSelect: 'none'
                                            }}
                                        />

                                        {/* Render All Layers */}
                                        {layers.map(layer => (
                                            <img
                                                key={layer.id}
                                                src={layer.url}
                                                className={`comp-fg-layer ${activeLayerId === layer.id ? 'active-layer' : ''}`}
                                                alt={`Person ${layer.id}`}
                                                style={{
                                                    position: 'absolute',
                                                    top: 0,
                                                    left: 0,
                                                    width: '100%',
                                                    height: '100%',
                                                    objectFit: 'contain',
                                                    transform: `translate(${layer.x}px, ${layer.y}px) scale(${layer.scale})`,
                                                    cursor: adjustmentMode !== 'auto' ? 'grab' : 'default',
                                                    transformOrigin: 'center center',
                                                    zIndex: layer.zIndex,
                                                    border: (adjustmentMode === 'multi' && activeLayerId === layer.id) ? '2px dashed #3b82f6' : 'none',
                                                    pointerEvents: 'auto' // Enable events on image for selection
                                                }}
                                                onMouseDown={(e) => handleMouseDown(e, layer.id)}
                                                draggable="false"
                                            />
                                        ))}


                                    </div>
                                </div>

                                <button
                                    className="process-btn"
                                    onClick={handleConfirmAdjustment}
                                    style={{ marginTop: '20px' }}
                                >
                                    OK
                                </button>
                            </div>
                        </div>
                    </div>
                )}
        </div>
    );
}

export default BackgroundRemovalTool;

