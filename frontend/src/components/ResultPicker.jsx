import { useState, useEffect } from 'react';
import { getRecentResults, deleteResult, fetchApi } from '../services/api';
import AuthImage from './AuthImage';
import './ResultPicker.css';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

/**
 * ResultPicker — modal that shows recent results from all tools.
 * User can select one to use as input in the current tool.
 */
function ResultPicker({ isOpen, onClose, onSelect, multiSelect = false, onMultiSelect }) {
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [converting, setConverting] = useState(null);
    const [selected, setSelected] = useState(new Set());

    // Delete mode state
    const [deleteMode, setDeleteMode] = useState(false);
    const [toDelete, setToDelete] = useState(new Set());
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchResults();
            setSelected(new Set());
            setDeleteMode(false);
            setToDelete(new Set());
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

    const itemToFile = async (item) => {
        const imageUrl = `${API_BASE}${item.url}`;
        const response = await fetchApi(imageUrl);
        if (!response.ok) throw new Error('Failed to fetch image file');
        const blob = await response.blob();
        return new File([blob], item.filename, { type: blob.type || 'image/png' });
    };

    // Card click handler — branches by mode
    const handleCardClick = async (item) => {
        if (deleteMode) {
            setToDelete(prev => {
                const next = new Set(prev);
                next.has(item.filename) ? next.delete(item.filename) : next.add(item.filename);
                return next;
            });
            return;
        }

        if (multiSelect) {
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
            alert('โหลดรูปไม่สำเร็จ กรุณาลองใหม่');
        } finally {
            setConverting(null);
        }
    };

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
            alert('โหลดรูปไม่สำเร็จ กรุณาลองใหม่');
        } finally {
            setConverting(null);
        }
    };

    // Single item delete (hover X button)
    const handleDelete = async (e, item) => {
        e.stopPropagation();
        if (!window.confirm(`ลบ ${item.filename}?`)) return;
        try {
            await deleteResult(item.tool, item.filename);
            setResults(prev => prev.filter(r => r.filename !== item.filename));
            setToDelete(prev => { const n = new Set(prev); n.delete(item.filename); return n; });
        } catch (err) {
            console.error('Failed to delete:', err);
            alert('ลบไม่สำเร็จ กรุณาลองใหม่');
        }
    };

    // Delete selected items
    const handleDeleteSelected = async () => {
        if (toDelete.size === 0) return;
        if (!window.confirm(`ลบรูปที่เลือก ${toDelete.size} รูป?`)) return;
        setDeleting(true);
        try {
            const itemsToRemove = results.filter(r => toDelete.has(r.filename));
            await Promise.all(itemsToRemove.map(item =>
                deleteResult(item.tool, item.filename).catch(err =>
                    console.error(`Failed to delete ${item.filename}:`, err)
                )
            ));
            setResults(prev => prev.filter(r => !toDelete.has(r.filename)));
            setToDelete(new Set());
        } catch (err) {
            console.error('Delete selected failed:', err);
            alert('ลบบางรูปไม่สำเร็จ');
        } finally {
            setDeleting(false);
        }
    };

    // Delete all
    const handleDeleteAll = async () => {
        if (results.length === 0) return;
        if (!window.confirm(`ลบรูปทั้งหมด ${results.length} รูป?`)) return;
        setDeleting(true);
        try {
            await Promise.all(results.map(item =>
                deleteResult(item.tool, item.filename).catch(err =>
                    console.error(`Failed to delete ${item.filename}:`, err)
                )
            ));
            setResults([]);
            setToDelete(new Set());
        } catch (err) {
            console.error('Delete all failed:', err);
            alert('ลบบางรูปไม่สำเร็จ');
        } finally {
            setDeleting(false);
        }
    };

    const toggleDeleteMode = () => {
        setDeleteMode(prev => !prev);
        setToDelete(new Set());
    };

    const formatTime = (ts) => {
        try {
            const d = new Date(ts * 1000);
            return d.toLocaleString('th-TH', {
                day: '2-digit', month: 'short',
                hour: '2-digit', minute: '2-digit'
            });
        } catch { return ''; }
    };

    const formatSize = (bytes) => {
        if (!bytes || bytes < 0) return '0 B';
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
                    <span className="result-picker-subtitle">
                        {deleteMode ? 'Select images to delete' : multiSelect ? 'Select multiple images' : 'Select image to use'}
                    </span>
                    <button className="result-picker-close" onClick={onClose}>✕</button>
                </div>

                <div className="result-picker-body">
                    {loading ? (
                        <div className="result-picker-loading">
                            <div className="spinner"></div>
                            <span>กำลังโหลด...</span>
                        </div>
                    ) : results.length === 0 ? (
                        <div className="result-picker-empty">
                            <span className="empty-icon">📁</span>
                            <p>No results yet</p>
                            <p className="empty-hint">Use tools to generate results first</p>
                        </div>
                    ) : (
                        <div className="result-picker-grid">
                            {results.map((item) => (
                                <div
                                    key={`${item.tool}-${item.filename}`}
                                    className={`result-picker-card ${converting === item.filename ? 'loading' : ''} ${selected.has(item.filename) ? 'selected' : ''} ${deleteMode && toDelete.has(item.filename) ? 'marked-delete' : ''}`}
                                    onClick={() => handleCardClick(item)}
                                >
                                    {/* Checkbox for multi-select or delete mode */}
                                    {(multiSelect || deleteMode) && (
                                        <div className={`result-card-checkbox ${deleteMode ? 'delete-check' : ''}`}>
                                            <input
                                                type="checkbox"
                                                checked={deleteMode ? toDelete.has(item.filename) : selected.has(item.filename)}
                                                readOnly
                                            />
                                        </div>
                                    )}
                                    <div className="result-card-img-wrapper">
                                        <AuthImage url={`${API_BASE}${item.url}`} alt={item.filename} />
                                        {(converting === item.filename || (converting === 'multi' && selected.has(item.filename))) && (
                                            <div className="result-card-loading-overlay">
                                                <div className="spinner"></div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="result-card-info">
                                        <span className="result-card-tool">{item.toolLabel}</span>
                                        <span className="result-card-meta">
                                            {formatTime(item.timestamp)} · {formatSize(item.size)}
                                        </span>
                                    </div>
                                    {!deleteMode && (
                                        <button
                                            className="result-card-delete"
                                            onClick={(e) => handleDelete(e, item)}
                                            title="Delete"
                                        >
                                            ✕
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="result-picker-footer">
                    {/* Left side: toggle + delete all */}
                    <div className="footer-left">
                        {results.length > 0 && (
                            <>
                                <button
                                    className={`rp-btn-delete-mode ${deleteMode ? 'active' : ''}`}
                                    onClick={toggleDeleteMode}
                                >
                                    {deleteMode ? 'Cancel' : '🗑 Manage'}
                                </button>
                                {deleteMode && (
                                    <button
                                        className="rp-btn-delete-all"
                                        onClick={handleDeleteAll}
                                        disabled={deleting}
                                    >
                                        {deleting ? 'Deleting...' : 'Delete All'}
                                    </button>
                                )}
                            </>
                        )}
                    </div>

                    {/* Right side: refresh / confirm actions */}
                    <div className="footer-right">
                        {deleteMode && toDelete.size > 0 && (
                            <button
                                className="rp-btn-delete-selected"
                                onClick={handleDeleteSelected}
                                disabled={deleting}
                            >
                                {deleting ? 'Deleting...' : `Delete ${toDelete.size} Selected`}
                            </button>
                        )}
                        {!deleteMode && (
                            <button className="result-picker-refresh" onClick={fetchResults}>
                                Refresh
                            </button>
                        )}
                        {!deleteMode && multiSelect && selected.size > 0 && (
                            <button className="btn btn-primary" onClick={handleMultiConfirm} disabled={converting === 'multi'}>
                                {converting === 'multi' ? 'Loading...' : `Select ${selected.size} images`}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ResultPicker;
