import { useState, useEffect } from 'react';
import { fetchApi, getResultImageUrl } from '../services/api';

export default function AuthImage({ url, alt, className, style }) {
    const [blobUrl, setBlobUrl] = useState(null);

    useEffect(() => {
        let isMounted = true;
        const loadImg = async () => {
            if (!url) return;
            // Short-circuit if it's already a blob or local data URI
            if (url.startsWith('blob:') || url.startsWith('data:')) {
                if (isMounted) setBlobUrl(url);
                return;
            }

            try {
                // Ensure full URL
                const fullUrl = getResultImageUrl(url);
                // Fetch with ngrok-skip-browser-warning via fetchApi
                const response = await fetchApi(fullUrl);
                if (!response.ok) throw new Error('Failed to load image');
                const blob = await response.blob();
                if (isMounted) setBlobUrl(URL.createObjectURL(blob));
            } catch (err) {
                console.error("AuthImage load failed", err);
            }
        };
        loadImg();
        return () => { isMounted = false; };
    }, [url]);

    return blobUrl ? (
        <img src={blobUrl} alt={alt} className={className} style={style} loading="lazy" />
    ) : (
        <div className="spinner" style={{ margin: 'auto', width: '24px', height: '24px' }}></div>
    );
}
