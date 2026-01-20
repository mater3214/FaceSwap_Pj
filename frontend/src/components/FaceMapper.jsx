import { useState, useEffect } from 'react';
import { detectTargetFaces, getResultImageUrl } from '../services/api';
import './FaceMapper.css';

function FaceMapper({
    sourceFiles = [],
    targetFile,
    onMappingComplete,
    onBack
}) {
    const [targetFaces, setTargetFaces] = useState([]);
    const [mapping, setMapping] = useState({});
    const [isDetecting, setIsDetecting] = useState(false);
    const [error, setError] = useState(null);

    // Source file previews
    const sourcePreviewsURLs = sourceFiles.map(f => URL.createObjectURL(f));

    // Detect faces when targetFile changes
    useEffect(() => {
        if (targetFile) {
            detectFaces();
        }
    }, [targetFile]);

    const detectFaces = async () => {
        setIsDetecting(true);
        setError(null);
        try {
            const result = await detectTargetFaces(targetFile);
            if (result.ok && result.faces) {
                setTargetFaces(result.faces);
                // Initialize mapping: all target faces unassigned (-1)
                const initialMapping = {};
                result.faces.forEach(face => {
                    initialMapping[face.index] = -1;
                });
                setMapping(initialMapping);
            } else {
                setError('ไม่พบใบหน้าในรูปเป้าหมาย');
            }
        } catch (err) {
            setError(err.message || 'การตรวจจับใบหน้าล้มเหลว');
        } finally {
            setIsDetecting(false);
        }
    };

    const handleAssign = (targetIdx, sourceIdx) => {
        setMapping(prev => ({
            ...prev,
            [targetIdx]: sourceIdx
        }));
    };

    const handleContinue = () => {
        onMappingComplete(mapping);
    };

    const assignedCount = Object.values(mapping).filter(v => v !== -1).length;

    return (
        <div className="face-mapper">
            <div className="mapper-header">
                <h2>🎯 Face Mapping</h2>
                <p>เลือกว่าจะสลับใบหน้าไหนไปใส่ใบหน้าไหน</p>
            </div>

            {error && (
                <div className="mapper-error">
                    <span>⚠️</span> {error}
                </div>
            )}

            {isDetecting ? (
                <div className="mapper-loading">
                    <div className="loading-spinner"></div>
                    <p>กำลังตรวจจับใบหน้า...</p>
                </div>
            ) : (
                <div className="mapping-content">
                    {/* Source Faces */}
                    <div className="faces-section sources">
                        <h3>📤 Source Faces ({sourceFiles.length})</h3>
                        <div className="faces-grid">
                            {sourcePreviewsURLs.map((url, idx) => (
                                <div key={idx} className="face-item source-face">
                                    <img src={url} alt={`Source ${idx + 1}`} />
                                    <span className="face-label">S{idx + 1}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Arrow */}
                    <div className="mapping-arrow">→</div>

                    {/* Target Faces */}
                    <div className="faces-section targets">
                        <h3>📥 Target Faces ({targetFaces.length})</h3>
                        {targetFaces.length === 0 ? (
                            <p className="no-faces">ไม่พบใบหน้าในรูปเป้าหมาย</p>
                        ) : (
                            <div className="faces-grid">
                                {targetFaces.map((face) => (
                                    <div key={face.index} className="face-item target-face">
                                        <img
                                            src={getResultImageUrl(face.url)}
                                            alt={`Target ${face.index + 1}`}
                                        />
                                        <span className="face-label">T{face.index + 1}</span>

                                        {/* Dropdown to assign source */}
                                        <select
                                            value={mapping[face.index] ?? -1}
                                            onChange={(e) => handleAssign(face.index, parseInt(e.target.value))}
                                            className="assign-select"
                                        >
                                            <option value={-1}>-- ไม่เปลี่ยน --</option>
                                            {sourceFiles.map((_, sIdx) => (
                                                <option key={sIdx} value={sIdx}>
                                                    Source {sIdx + 1}
                                                </option>
                                            ))}
                                        </select>

                                        {mapping[face.index] !== -1 && (
                                            <div className="assigned-badge">
                                                ← S{mapping[face.index] + 1}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className="mapper-actions">
                <button className="btn btn-secondary" onClick={onBack}>
                    ← ย้อนกลับ
                </button>
                <button
                    className="btn btn-primary"
                    onClick={handleContinue}
                    disabled={isDetecting || targetFaces.length === 0}
                >
                    เริ่มสลับหน้า ({assignedCount}/{targetFaces.length} mapped)
                </button>
            </div>
        </div>
    );
}

export default FaceMapper;
