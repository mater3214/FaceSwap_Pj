import { useState } from 'react';
import './ToolsPanel.css';

const TOOLS = [
    {
        id: 'simswap-single',
        name: 'SimSwap (Face Swap)',
        icon: '🎭',
        enabled: true,
        description: 'Single face swap'
    },
    {
        id: 'simswap-multi',
        name: 'SimSwap (Multi Face Swap)',
        icon: '👥',
        enabled: true,
        description: 'Multiple faces swap'
    },
    {
        id: 'difareli',
        name: 'DiFaReLi (Relighting)',
        icon: '💡',
        enabled: false,
        description: 'coming soon'
    }
];

function ToolsPanel({ selectedTool, onToolChange }) {
    return (
        <div className="tools-panel">
            <h3 className="tools-title">Tools</h3>

            <div className="tools-list">
                {TOOLS.map(tool => (
                    <button
                        key={tool.id}
                        className={`tool-item ${selectedTool === tool.id ? 'selected' : ''} ${!tool.enabled ? 'disabled' : ''}`}
                        onClick={() => tool.enabled && onToolChange(tool.id)}
                        disabled={!tool.enabled}
                    >
                        <span className="tool-checkbox">
                            {tool.enabled ? (selectedTool === tool.id ? '☑' : '☐') : '⏳'}
                        </span>
                        <div className="tool-info">
                            <span className="tool-name">{tool.name}</span>
                            {!tool.enabled && (
                                <span className="tool-status">— {tool.description}</span>
                            )}
                        </div>
                    </button>
                ))}
            </div>

            <div className="tools-notes">
                <p>* Currently only SimSwap is available</p>
                <p>* New tools can be added via API Gateway later</p>
            </div>
        </div>
    );
}

export default ToolsPanel;
