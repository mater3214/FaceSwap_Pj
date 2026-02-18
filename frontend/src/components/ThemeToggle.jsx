import { useTheme } from '../context/ThemeContext';
import './ThemeToggle.css';

function ThemeToggle() {
    const { theme, toggleTheme } = useTheme();

    return (
        <button
            className="theme-toggle"
            onClick={toggleTheme}
            title={theme === 'light' ? 'เปลี่ยนเป็น Dark Mode' : 'เปลี่ยนเป็น Light Mode'}
        >
            <span className="theme-icon">
                {theme === 'light' ? 'Dark' : 'Light'}
            </span>
        </button>
    );
}

export default ThemeToggle;
