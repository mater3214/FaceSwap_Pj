import SimpleAutoSlider from '../components/SimpleAutoSlider';
import './AboutPage.css';

function AboutPage() {
    return (
        <div className="about-page">
            <section className="about-hero">
                <div className="container">
                    <div className="about-grid">
                        <div className="about-content">
                            <span className="badge">About Us</span>
                            <h1>Empowering Business<br />with Facial AI Solutions</h1>
                            <p>
                                Leverage our industry-leading face swap and facial recognition to create
                                powerful AI applications and deliver exceptional customer experiences. Our
                                technology is designed for seamless integration and deployment, backed by a
                                significant technological influence within the global community.
                            </p>
                            <div className="about-actions">
                                <a href="/services" className="btn btn-primary">Our Services ↗</a>
                                <a href="/contact" className="btn btn-primary">Contact Us ↗</a>
                            </div>
                        </div>
                        <div className="about-visual">
                            <SimpleAutoSlider />
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}

export default AboutPage;
