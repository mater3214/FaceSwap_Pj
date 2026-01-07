import { useState, useEffect } from 'react';
import './SimpleAutoSlider.css';

const sliderImages = [
    "/about_slider/face-swap-online.png",
];

function SimpleAutoSlider() {
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentIndex((prevIndex) => (prevIndex + 1) % sliderImages.length);
        }, 1000); // Change slide every 3 seconds

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="simple-auto-slider">
            <div
                className="slider-track"
                style={{ transform: `translateX(-${currentIndex * 100}%)` }}
            >
                {sliderImages.map((src, index) => (
                    <div key={index} className="slider-slide">
                        <img src={src} alt={`Slide ${index + 1}`} />
                    </div>
                ))}
            </div>
            <div className="slider-indicators">
                {sliderImages.map((_, index) => (
                    <div
                        key={index}
                        className={`indicator ${index === currentIndex ? 'active' : ''}`}
                    />
                ))}
            </div>
        </div>
    );
}

export default SimpleAutoSlider;
