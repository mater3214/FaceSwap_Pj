# Region configuration for FaceLab
# Each region represents a target market with specific style/color preferences

REGIONS = [
    {
        "id": "th",
        "name": "Thailand",
        "nameLocal": "ประเทศไทย",
        "flag": "🇹🇭",
        "flagUrl": "https://flagcdn.com/w80/th.png",
        "climate": "tropical",
        "colorTone": "warm",
        "colorSettings": {
            "brightness": 1.05,
            "contrast": 1.1,
            "saturation": 1.15,
            "temperature": 10  # positive = warmer
        },
        "style": "vibrant"
    },
    {
        "id": "jp",
        "name": "Japan",
        "nameLocal": "日本",
        "flag": "🇯🇵",
        "flagUrl": "https://flagcdn.com/w80/jp.png",
        "climate": "temperate",
        "colorTone": "cool",
        "colorSettings": {
            "brightness": 1.0,
            "contrast": 1.05,
            "saturation": 0.95,
            "temperature": -5
        },
        "style": "minimal"
    },
    {
        "id": "us",
        "name": "United States",
        "nameLocal": "United States",
        "flag": "🇺🇸",
        "flagUrl": "https://flagcdn.com/w80/us.png",
        "climate": "varied",
        "colorTone": "neutral",
        "colorSettings": {
            "brightness": 1.05,
            "contrast": 1.1,
            "saturation": 1.05,
            "temperature": 0
        },
        "style": "bold"
    },
    {
        "id": "gb",
        "name": "United Kingdom",
        "nameLocal": "United Kingdom",
        "flag": "🇬🇧",
        "flagUrl": "https://flagcdn.com/w80/gb.png",
        "climate": "cool",
        "colorTone": "cool",
        "colorSettings": {
            "brightness": 0.98,
            "contrast": 1.0,
            "saturation": 0.9,
            "temperature": -10
        },
        "style": "classic"
    },
    {
        "id": "cn",
        "name": "China",
        "nameLocal": "中国",
        "flag": "🇨🇳",
        "flagUrl": "https://flagcdn.com/w80/cn.png",
        "climate": "varied",
        "colorTone": "warm",
        "colorSettings": {
            "brightness": 1.05,
            "contrast": 1.15,
            "saturation": 1.2,
            "temperature": 15
        },
        "style": "vibrant"
    },
    {
        "id": "kr",
        "name": "South Korea",
        "nameLocal": "대한민국",
        "flag": "🇰🇷",
        "flagUrl": "https://flagcdn.com/w80/kr.png",
        "climate": "temperate",
        "colorTone": "neutral",
        "colorSettings": {
            "brightness": 1.08,
            "contrast": 1.05,
            "saturation": 1.0,
            "temperature": 0
        },
        "style": "clean"
    }
]

def get_region_by_id(region_id: str):
    """Get region config by ID"""
    for region in REGIONS:
        if region["id"] == region_id:
            return region
    return None

def get_all_regions():
    """Get all available regions"""
    return REGIONS
