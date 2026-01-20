import { Link } from 'react-router-dom';
import LuxuryCarousel from '../components/LuxuryCarousel';
import AnimatedBackground from '../components/AnimatedBackground';
import './LandingPage.css';

function LandingPage() {
    return (
        <div className="landing-page">
            <AnimatedBackground />
            <section className="hero-section">
                <div className="container">
                    <div className="hero-content">
                        <h1 className="hero-title">
                            FaceLab: The Ultimate Toolbox for <br />
                            <span className="gradient-text">State-of-the-Art Face Swapping</span>
                        </h1>
                        <p className="hero-description">
                            Experience seamless, high-quality face swapping and analysis powered by advanced AI.
                            Built for creators, developers, and enterprise solutions.
                        </p>
                        <div className="hero-actions">
                            <Link to="/services" className="btn btn-primary btn-xl">
                                Get Started 🚀
                            </Link>
                            <Link to="/contact" className="btn btn-secondary btn-xl">
                                Contact
                            </Link>
                        </div>
                    </div>
                    <div className="hero-visual">
                        <LuxuryCarousel />
                    </div>
                </div>
            </section>


        </div>
    );
}

export default LandingPage;
