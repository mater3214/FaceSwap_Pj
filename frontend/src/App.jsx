import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import LandingPage from './pages/LandingPage';
import ServicesPage from './pages/ServicesPage';
import FaceSwapTool from './pages/FaceSwapTool';
import BackgroundRemovalTool from './pages/BackgroundRemovalTool';
import HeadNeRFTool from './pages/HeadNeRFTool';
import AboutPage from './pages/AboutPage';
import ContactPage from './pages/ContactPage';
import ResearchPage from './pages/ResearchPage';
import './App.css';

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Layout />}>
                    <Route index element={<LandingPage />} />
                    <Route path="services" element={<ServicesPage />} />
                    <Route path="about" element={<AboutPage />} />
                    <Route path="contact" element={<ContactPage />} />
                    <Route path="research" element={<ResearchPage />} />
                    <Route path="tool/*" element={<FaceSwapTool />} />
                    <Route path="tool/background" element={<BackgroundRemovalTool />} />
                    <Route path="tool/bg-removal" element={<BackgroundRemovalTool />} />
                    <Route path="tool/headnerf" element={<HeadNeRFTool />} />
                </Route>
            </Routes>
        </BrowserRouter>
    );
}

export default App;

