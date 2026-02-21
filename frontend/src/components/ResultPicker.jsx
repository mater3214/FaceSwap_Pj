import { useState, useEffect } from 'react';
import { getRecentResults, deleteResult, fetchApi } from '../services/api';
import AuthImage from './AuthImage';
import './ResultPicker.css';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

/**
 * ResultPicker — modal that shows recent results from all tools.
 * User can select one to use as input in the current tool.
 * 
 * @param {boolean} isOpen - Whether the picker is visible
 * @param {function} onClose - Close callback
 * @param {function} onSelect - Called with (File, previewUrl) when user picks an image
 * @param {boolean} multiSelect - If true, allow selecting multiple images
 * @param {function} onMultiSelect - Called with (File[]) when multi-select confirmed
 */
function ResultPicker({ isOpen, onClose, onSelect, multiSelect = false, onMultiSelect }) {
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [converting, setConverting] = useState(null); // filename being converted
    const [selected, setSelected] = useState(new Set()); // multi-select tracking

    useEffect(() => {
        if (isOpen) {
            fetchResults();
            setSelected(new Set()); // reset selection on open
        }
    }, [isOpen]);

    const fetchResults = async () => {
        setLoading(true);
        try {
            const data = await getRecentResults();
            setResults(data.results || []);
        } catch (err) {
            console.error('Failed to load results:', err);
        } finally {
            setLoading(false);
        }
    };

    // Convert a single result item to a File via fetchApi (avoids CORS and bypasses Ngrok warning)
    const itemToFile = async (item) => {
        const imageUrl = `${API_BASE}${item.url}`;
        const response = await fetchApi(imageUrl);
        if (!response.ok) throw new Error('Failed to fetch image file');
        const blob = await response.blob();
        return new File([blob], item.filename, { type: blob.type || 'image/png' });
    };

    // Single select handler
    const handleSelect = async (item) => {
        if (multiSelect) {
            // Toggle selection in multi mode
            setSelected(prev => {
                const next = new Set(prev);
                next.has(item.filename) ? next.delete(item.filename) : next.add(item.filename);
                return next;
            });
            return;
        }
        setConverting(item.filename);
        try {
            const file = await itemToFile(item);
            onSelect(file, `${API_BASE}${item.url}`);
            onClose();
        } catch (err) {
            console.error('Failed to load image:', err);
            alert('Load failed - restart gateway');
        } finally {
            setConverting(null);
        }
    };

    // Multi-select confirm
    const handleMultiConfirm = async () => {
        if (selected.size === 0) return;
        setConverting('multi');
        try {
            const selectedItems = results.filter(r => selected.has(r.filename));
            const files = await Promise.all(selectedItems.map(itemToFile));
            if (onMultiSelect) onMultiSelect(files);
            onClose();
        } catch (err) {
            console.error('Multi-select failed:', err);
            alert('Load failed - restart gateway');
        } finally {
            setConverting(null);
        }
    };

    const handleDelete = async (e, item) => {
        e.stopPropagation();
        if (!window.confirm(`ลบ ${item.filename}?`)) return;
        try {
            await deleteResult(item.tool, item.filename);
            setResults(prev => prev.filter(r => r.filename !== item.filename));
        } catch (err) {
            console.error('Failed to delete:', err);
        }
    };

    const formatTime = (ts) => {
        const d = new Date(ts * 1000);
        return d.toLocaleString('th-TH', {
            day: '2-digit', month: 'short',
            hour: '2-digit', minute: '2-digit'
        });
    };

    const formatSize = (bytes) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} KB`;
        return `${(bytes / 1048576).toFixed(1)} MB`;
    };

    if (!isOpen) return null;

    return (
        <div className="result-picker-overlay" onClick={onClose}>
            <div className="result-picker-modal" onClick={e => e.stopPropagation()}>
                <div className="result-picker-header">
                    <h3>Previous Results</h3>
                    <span className="result-picker-subtitle">{multiSelect ? 'Select multiple images' : 'Select image to use'}</span>
                    <button className="result-picker-close" onClick={onClose}>X</button>
                </div>

                <div className="result-picker-body">
                    {loading ? (
                        <div className="result-picker-loading">
                            <div className="spinner"></div>
                            <span>กำลังโหลด...</span>
                        </div>
                    ) : results.length === 0 ? (
                        <div className="result-picker-empty">
                            <span className="empty-icon">--</span>
                            <p>No results yet</p>
                            <p className="empty-hint">Use tools to generate results first</p>
                        </div>
                    ) : (
                        <div className="result-picker-grid">
                            {results.map((item) => (
                                <div
                                    key={`${item.tool}-${item.filename}`}
                                    className={`result-picker-card ${converting === item.filename ? 'loading' : ''} ${selected.has(item.filename) ? 'selected' : ''}`}
                                    onClick={() => handleSelect(item)}
                                >
                                    {multiSelect && (
                                        <div className="result-card-checkbox">
                                            <input type="checkbox" checked={selected.has(item.filename)} readOnly />
                                        </div>
                                    )}
                                    <div className="result-card-img-wrapper">
                                        <AuthImage url={`${API_BASE}${item.url}`} alt={item.filename} />
                                        {(converting === item.filename || converting === 'multi') && selected.has(item.filename) && (
                                            <div className="result-card-loading-overlay">
                                                <div className="spinner"></div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="result-card-info">
                                        <span className="result-card-tool">{item.toolLabel}</span>
                                        <span className="result-card-meta">
                                            {formatTime(item.timestamp)} . {formatSize(item.size)}
                                        </span>
                                    </div>
                                    <button
                                        className="result-card-delete"
                                        onClick={(e) => handleDelete(e, item)}
                                        title="Delete"
                                    >
                                        X
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="result-picker-footer">
                    <button className="result-picker-refresh" onClick={fetchResults}>
                        Refresh
                    </button>
                    {multiSelect && selected.size > 0 && (
                        <button className="btn btn-primary" onClick={handleMultiConfirm} disabled={converting === 'multi'}>
                            {converting === 'multi' ? 'Loading...' : `Select ${selected.size} images`}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

export default ResultPicker;
