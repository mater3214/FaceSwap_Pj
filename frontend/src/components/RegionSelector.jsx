import { useState, useEffect } from 'react';
import { getRegions } from '../services/api';
import './RegionSelector.css';

// Fallback data when API is not available
const FALLBACK_REGIONS = [
    { id: 'th', name: 'Thailand', nameLocal: 'ประเทศไทย', flag: '🇹🇭', colorTone: 'warm', colorSettings: { brightness: 1.05, contrast: 1.1, saturation: 1.15, temperature: 10 } },
    { id: 'jp', name: 'Japan', nameLocal: '日本', flag: '🇯🇵', colorTone: 'cool', colorSettings: { brightness: 1.0, contrast: 1.05, saturation: 0.95, temperature: -5 } },
    { id: 'us', name: 'United States', nameLocal: 'United States', flag: '🇺🇸', colorTone: 'neutral', colorSettings: { brightness: 1.05, contrast: 1.1, saturation: 1.05, temperature: 0 } },
    { id: 'gb', name: 'United Kingdom', nameLocal: 'United Kingdom', flag: '🇬🇧', colorTone: 'cool', colorSettings: { brightness: 0.98, contrast: 1.0, saturation: 0.9, temperature: -10 } },
    { id: 'cn', name: 'China', nameLocal: '中国', flag: '🇨🇳', colorTone: 'warm', colorSettings: { brightness: 1.05, contrast: 1.15, saturation: 1.2, temperature: 15 } },
    { id: 'kr', name: 'South Korea', nameLocal: '대한민국', flag: '🇰🇷', colorTone: 'neutral', colorSettings: { brightness: 1.08, contrast: 1.05, saturation: 1.0, temperature: 0 } },
];

function RegionSelector({ selectedRegion, onRegionChange }) {
    const [regions, setRegions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadRegions();
    }, []);

    const loadRegions = async () => {
        try {
            setLoading(true);
            const data = await getRegions();
            setRegions(data);
        } catch (err) {
            console.warn('Backend not available, using fallback regions:', err.message);
            // Use fallback data silently - no error shown to user
            setRegions(FALLBACK_REGIONS);
        } finally {
            setLoading(false);
        }
    };

    const getColorToneClass = (tone) => {
        switch (tone) {
            case 'warm': return 'tone-warm';
            case 'cool': return 'tone-cool';
            default: return 'tone-neutral';
        }
    };

    return (
        <div className="region-selector">
            <div className="selector-header">
                <h2 className="step-title">
                    <span className="step-number">2</span>
                    เลือกภูมิภาคเป้าหมาย
                </h2>
                <p className="step-description">
                    เลือกประเทศปลายทางเพื่อปรับ style และโทนสีให้เหมาะสม
                </p>
            </div>

            {loading ? (
                <div className="loading-state">
                    <div className="spinner"></div>
                    <span>กำลังโหลด...</span>
                </div>
            ) : (
                <div className="region-grid">
                    {regions.map((region) => (
                        <button
                            key={region.id}
                            className={`region-card ${selectedRegion?.id === region.id ? 'selected' : ''} ${getColorToneClass(region.colorTone)}`}
                            onClick={() => onRegionChange(region)}
                        >
                            <span className="region-flag">{region.flag}</span>
                            <div className="region-info">
                                <span className="region-name">{region.name}</span>
                                <span className="region-local">{region.nameLocal}</span>
                            </div>
                            <div className="region-tone">
                                <span className="tone-label">
                                    {region.colorTone === 'warm' ? '☀️ Warm' :
                                        region.colorTone === 'cool' ? '❄️ Cool' : '⚖️ Neutral'}
                                </span>
                            </div>
                            {selectedRegion?.id === region.id && (
                                <div className="selected-indicator">✓</div>
                            )}
                        </button>
                    ))}
                </div>
            )}

            {selectedRegion && (
                <div className="selected-preview">
                    <span className="preview-label">ภูมิภาคที่เลือก:</span>
                    <span className="preview-value">
                        {selectedRegion.flag} {selectedRegion.name}
                    </span>
                </div>
            )}
        </div>
    );
}

export default RegionSelector;
