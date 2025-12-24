# 🎭 FaceLab - AI Face Swap for Advertising

ระบบ Face Swap ด้วย AI สำหรับงานโฆษณา รองรับทั้ง Single Face และ Multi Face Swap

![FaceLab](https://img.shields.io/badge/FaceLab-AI%20Face%20Swap-blueviolet)
![Python](https://img.shields.io/badge/Python-3.10-blue)
![React](https://img.shields.io/badge/React-18-61dafb)

---

## ⚡ Features

- **SimSwap (Single Face)** - สลับใบหน้าเดี่ยว
- **SimSwap (Multi Face)** - สลับหลายใบหน้าพร้อมกัน
- **Region Selector** - เลือกภูมิภาคเพื่อปรับโทนสี
- **Color Editor** - ปรับแต่งสีภาพ
- **DiFaReLi (Coming Soon)** - Relighting ใบหน้า

---

## 📁 โครงสร้างโปรเจกต์

```
CS FINALPROJECT/
├── frontend/                    # React Frontend (Vite)
│   ├── src/
│   │   ├── components/          # UI Components
│   │   ├── pages/               # Pages
│   │   └── services/            # API Services
│   └── package.json
│
└── facelab/                     # Backend Services
    ├── gateway/                 # API Gateway (FastAPI)
    │   └── app.py              # Port 8000
    │
    ├── Service/
    │   └── simswap_service/    # SimSwap Service
    │       ├── app.py          # Port 8001
    │       └── SimSwap/        # SimSwap Model
    │
    └── shared_storage/          # Shared files storage
```

---

## 🚀 Installation

### Prerequisites
- **Python 3.10** (แนะนำใช้ Anaconda)
- **Node.js 18+**
- **CUDA 11.8+** (สำหรับ GPU acceleration)

### 1. Clone Repository
```bash
git clone https://github.com/YOUR_USERNAME/FaceLab.git
cd FaceLab
```

### 2. สร้าง Conda Environment สำหรับ SimSwap
```bash
conda create -n simswap python=3.10 -y
conda activate simswap

# Install PyTorch (เลือกตาม CUDA version)
# CUDA 11.8
conda install pytorch torchvision pytorch-cuda=11.8 -c pytorch -c nvidia

# Install dependencies
cd facelab/Service/simswap_service
pip install -r requirements.txt
```

### 3. สร้าง Conda Environment สำหรับ Gateway
```bash
conda create -n web python=3.10 -y
conda activate web
pip install fastapi uvicorn python-multipart requests jinja2
```

### 4. Install Frontend
```bash
cd frontend
npm install
```

### 5. Download Models (สำคัญมาก!)

#### SimSwap Models
วางไฟล์ใน `facelab/Service/simswap_service/SimSwap/`:

| ไฟล์ | ตำแหน่ง |
|------|---------|
| `arcface_checkpoint.tar` | `arcface_model/` |
| `latest_net_G.pth` | `checkpoints/people/` |
| `antelopeV2` models | `insightface_func/models/` |

> 📥 ดาวน์โหลดจาก [SimSwap Releases](https://github.com/neuralchen/SimSwap/releases)

---

## ▶️ วิธีรัน

### รันทุก Service (3 terminals)

**Terminal 1 - SimSwap Service:**
```bash
conda activate simswap
cd facelab/Service/simswap_service
python -m uvicorn app:app --host 0.0.0.0 --port 8001
```

**Terminal 2 - Gateway:**
```bash
conda activate web
cd facelab/gateway
python -m uvicorn app:app --host 0.0.0.0 --port 8000
```

**Terminal 3 - Frontend:**
```bash
cd frontend
npm run dev
```

### เปิดใช้งาน
- **Frontend:** http://localhost:5173
- **Gateway API:** http://localhost:8000
- **SimSwap API:** http://localhost:8001

---

## 📖 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/api/regions` | GET | Get all regions |
| `/api/simswap` | POST | Single face swap |
| `/api/simswap_multi_upload` | POST | Multi face swap |

---

## 🐛 Troubleshooting

### Port 8000 already in use
```bash
# Windows
netstat -ano | findstr :8000
taskkill /F /PID <PID>

# Linux/Mac
lsof -i :8000
kill -9 <PID>
```

### "ไม่พบใบหน้าในรูป" Error
- ใช้รูปที่เห็นใบหน้าชัดเจน
- หลีกเลี่ยงรูปที่หน้าหัน/มืด/เบลอ
- แนะนำความละเอียดอย่างน้อย 512x512

### insightface Module Not Found
```bash
pip install insightface onnxruntime-gpu
```

---

## 📝 License

This project is for educational purposes only.

---

## 🙏 Acknowledgements

- [SimSwap](https://github.com/neuralchen/SimSwap)
- [InsightFace](https://github.com/deepinsight/insightface)
