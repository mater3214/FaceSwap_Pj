import { useState, useEffect } from 'react';
import { getRegions } from '../services/api';
import './RegionSelector.css';

// Fallback data when API is not available (synced with backend regions.py)
const FALLBACK_REGIONS = [
    { id: 'th', code: 'TH', name: 'Thailand', nameLocal: 'ประเทศไทย', flag: '🇹🇭', flagUrl: 'https://flagcdn.com/w80/th.png', climate: 'tropical', colorTone: 'warm', colorSettings: { brightness: 1.05, contrast: 1.1, saturation: 1.15, temperature: 10 }, style: 'vibrant' },
    { id: 'jp', code: 'JP', name: 'Japan', nameLocal: '日本', flag: '🇯🇵', flagUrl: 'https://flagcdn.com/w80/jp.png', climate: 'temperate', colorTone: 'cool', colorSettings: { brightness: 1.0, contrast: 1.05, saturation: 0.95, temperature: -5 }, style: 'minimal' },
    { id: 'us', code: 'US', name: 'United States', nameLocal: 'United States', flag: '🇺🇸', flagUrl: 'https://flagcdn.com/w80/us.png', climate: 'varied', colorTone: 'neutral', colorSettings: { brightness: 1.05, contrast: 1.1, saturation: 1.05, temperature: 0 }, style: 'bold' },
    { id: 'gb', code: 'GB', name: 'United Kingdom', nameLocal: 'United Kingdom', flag: '🇬🇧', flagUrl: 'https://flagcdn.com/w80/gb.png', climate: 'cool', colorTone: 'cool', colorSettings: { brightness: 0.98, contrast: 1.0, saturation: 0.9, temperature: -10 }, style: 'classic' },
    { id: 'cn', code: 'CN', name: 'China', nameLocal: '中国', flag: '🇨🇳', flagUrl: 'https://flagcdn.com/w80/cn.png', climate: 'varied', colorTone: 'warm', colorSettings: { brightness: 1.05, contrast: 1.15, saturation: 1.2, temperature: 15 }, style: 'vibrant' },
    { id: 'kr', code: 'KR', name: 'South Korea', nameLocal: '대한민국', flag: '🇰🇷', flagUrl: 'https://flagcdn.com/w80/kr.png', climate: 'temperate', colorTone: 'neutral', colorSettings: { brightness: 1.08, contrast: 1.05, saturation: 1.0, temperature: 0 }, style: 'clean' },
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
            setRegions(FALLBACK_REGIONS);
        } finally {
            setLoading(false);
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
                            className={`region-card ${selectedRegion?.id === region.id ? 'selected' : ''}`}
                            onClick={() => onRegionChange(region)}
                        >
                            {/* Country Code Badge */}
                            <div className="region-code">{region.code || region.id.toUpperCase()}</div>

                            {/* Flag Emoji */}
                            <span className="region-flag">{region.flag}</span>

                            {/* Country Names */}
                            <div className="region-info">
                                <span className="region-name">{region.name}</span>
                                <span className="region-local">{region.nameLocal}</span>
                            </div>

                            {/* Selected Indicator */}
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
                        {selectedRegion.flag} {selectedRegion.name} ({selectedRegion.code || selectedRegion.id.toUpperCase()})
                    </span>
                </div>
            )}
        </div>
    );
}

export default RegionSelector;
