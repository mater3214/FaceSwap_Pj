import { useNavigate, useLocation } from 'react-router-dom';
import './ToolsPanel.css';

const TOOLS = [
    {
        id: 'background',
        name: 'Background Removal',
        icon: '🖼️',
        enabled: true,
        description: 'Remove or replace background',
        path: '/tool/bg-removal'
    },
    {
        id: 'simswap-single',
        name: 'SimSwap (Single)',
        icon: '🎭',
        enabled: true,
        description: 'Single face swap',
        path: '/tool/simswap'
    },
    {
        id: 'simswap-multi',
        name: 'SimSwap (Multi)',
        icon: '👥',
        enabled: true,
        description: 'Multiple faces swap',
        path: '/tool/simswap-multi'
    },
    {
        id: 'headnerf',
        name: 'HeadNeRF',
        icon: '🧠',
        enabled: true,
        description: 'Neural head generation',
        path: '/tool/headnerf'
    },
    {
        id: 'difareli',
        name: 'DiFaReLi (Relighting)',
        icon: '💡',
        enabled: false,
        description: 'coming soon',
        path: null
    }
];

function ToolsPanel({ selectedTool, onToolChange }) {
    const navigate = useNavigate();
    const location = useLocation();

    const handleToolClick = (tool) => {
        if (!tool.enabled) return;

        if (tool.path) {
            navigate(tool.path);
        }

        if (onToolChange) {
            onToolChange(tool.id);
        }
    };

    const isSelected = (tool) => {
        if (selectedTool === tool.id) return true;
        if (tool.path && location.pathname === tool.path) return true;
        return false;
    };

    return (
        <div className="tools-panel">
            <h3 className="tools-title">Tools</h3>

            <div className="tools-list">
                {TOOLS.map(tool => (
                    <button
                        key={tool.id}
                        className={`tool-item ${isSelected(tool) ? 'selected' : ''} ${!tool.enabled ? 'disabled' : ''}`}
                        onClick={() => handleToolClick(tool)}
                        disabled={!tool.enabled}
                    >
                        <span className="tool-icon">{tool.icon}</span>
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
                <p>• Gateway: Online</p>
                <p>• Services: Ready</p>
            </div>
        </div>
    );
}

export default ToolsPanel;

