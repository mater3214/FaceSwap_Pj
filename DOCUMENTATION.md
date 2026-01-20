# 🎭 FaceLab - เอกสารโปรเจกต์ฉบับสมบูรณ์

## สารบัญ

1. [ภาพรวมโปรเจกต์](#1-ภาพรวมโปรเจกต์)
2. [สถาปัตยกรรมระบบ](#2-สถาปัตยกรรมระบบ)
3. [การติดตั้งและ Dependencies](#3-การติดตั้งและ-dependencies)
4. [โครงสร้างโฟลเดอร์](#4-โครงสร้างโฟลเดอร์)
5. [Frontend - React Application](#5-frontend---react-application)
6. [Backend - Python Services](#6-backend---python-services)
7. [API Endpoints](#7-api-endpoints)
8. [Routes ทั้งหมด](#8-routes-ทั้งหมด)
9. [Components ทั้งหมด](#9-components-ทั้งหมด)
10. [อัลกอริทึมการปรับสี](#10-อัลกอริทึมการปรับสี)
11. [ขั้นตอนการทำงาน](#11-ขั้นตอนการทำงาน)

---

## 1. ภาพรวมโปรเจกต์

### 1.1 FaceLab คืออะไร?

FaceLab เป็นเว็บแอปพลิเคชันสำหรับ **AI Face Swap** (สลับใบหน้า) ที่ใช้เทคโนโลยี Deep Learning โดยเฉพาะ **SimSwap** ซึ่งเป็นโมเดล AI ที่สามารถ:

- **Single Face Swap** - สลับใบหน้าเดี่ยว (1 ต่อ 1)
- **Multi Face Swap** - สลับหลายใบหน้าพร้อมกัน
- **Color Editor** - ปรับสี ความสว่าง contrast และครอปภาพ

### 1.2 เทคโนโลยีที่ใช้

| Layer | Technology | Version |
|-------|------------|---------|
| Frontend | React | 19.2.0 |
| Build Tool | Vite | 7.2.4 |
| Routing | React Router DOM | 7.11.0 |
| Backend Gateway | FastAPI | ≥0.100.0 |
| AI Service | SimSwap + InsightFace | - |
| Deep Learning | PyTorch | ≥2.0.0 |
| Face Detection | InsightFace + ONNX | - |

---

## 2. สถาปัตยกรรมระบบ

### 2.1 ภาพรวมสถาปัตยกรรม

```
┌────────────────────────────────────────────────────────────────────┐
│                         USER (Browser)                              │
│                        http://localhost:5173                        │
└──────────────────────────────┬─────────────────────────────────────┘
                               │
                               ▼
┌────────────────────────────────────────────────────────────────────┐
│                    FRONTEND (React + Vite)                         │
│                                                                     │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────────────────┐  │
│  │   Pages     │   │ Components  │   │      Services           │  │
│  │             │   │             │   │                         │  │
│  │ LandingPage │   │ Layout      │   │  api.js                 │  │
│  │ ServicesPage│   │ ImageUpload │   │  ├─ runSimSwap()        │  │
│  │ FaceSwapTool│   │ ColorEditor │   │  ├─ runSimSwapMulti()   │  │
│  │ AboutPage   │   │ ResultView  │   │  └─ checkHealth()       │  │
│  └─────────────┘   └─────────────┘   └─────────────────────────┘  │
│                                                                     │
└──────────────────────────────┬─────────────────────────────────────┘
                               │ HTTP Requests (fetch)
                               ▼
┌────────────────────────────────────────────────────────────────────┐
│                   GATEWAY (FastAPI - Port 8000)                    │
│                                                                     │
│  Endpoints:                                                         │
│  ├─ GET  /health              → Health check                       │
│  ├─ POST /api/simswap         → Single face swap (proxy)           │
│  └─ POST /api/simswap_multi_upload → Multi face swap (proxy)       │
│                                                                     │
│  CORS enabled for: localhost:5173, localhost:5174, localhost:3000  │
└──────────────────────────────┬─────────────────────────────────────┘
                               │ HTTP Proxy (requests library)
                               ▼
┌────────────────────────────────────────────────────────────────────┐
│               SIMSWAP SERVICE (FastAPI - Port 8001)                │
│                                                                     │
│  Endpoints:                                                         │
│  ├─ POST /run       → Single face swap with SimSwap model          │
│  └─ POST /run_multi → Multi face swap with SimSwap model           │
│                                                                     │
│  Uses: SimSwap neural network, InsightFace for face detection      │
│  Storage: shared_storage/uploads/ and shared_storage/outputs/      │
└────────────────────────────────────────────────────────────────────┘
```

### 2.2 ทำไมต้องแยก Gateway กับ Service?

**เหตุผลในการออกแบบ:**

1. **Separation of Concerns** - Gateway รับผิดชอบ routing, CORS, static files ส่วน Service รับผิดชอบ AI processing
2. **Scalability** - สามารถเพิ่ม Service อื่นๆ ได้ในอนาคต (เช่น DiFaReLi)
3. **Different Conda Environments** - Gateway ใช้ `web` env (เบา), SimSwap ใช้ `simswap` env (มี PyTorch, CUDA)
4. **Isolation** - ถ้า AI Service crash, Gateway ยังทำงานได้
5. **CORS Handling** - จัดการ CORS ที่จุดเดียว

---

## 3. การติดตั้งและ Dependencies

### 3.1 Frontend Dependencies (package.json)

```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.89.0",   // Authentication (optional)
    "react": "^19.2.0",                    // UI Library
    "react-dom": "^19.2.0",                // React DOM rendering
    "react-router-dom": "^7.11.0"          // Client-side routing
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^5.1.1",      // Vite React plugin
    "vite": "^7.2.4",                       // Build tool
    "eslint": "^9.39.1"                     // Code linting
  }
}
```

**ทำไมใช้ React 19?**
- Concurrent rendering ทำให้ UI responsive ขณะประมวลผล
- Automatic batching ลด re-renders
- Suspense improvements สำหรับ loading states

**ทำไมใช้ Vite แทน Create React App?**
- เร็วกว่า 10-100 เท่าในการ dev
- Hot Module Replacement (HMR) ทันที
- Build ด้วย Rollup ที่ optimized

### 3.2 Backend Dependencies (requirements.txt)

```
# Core Web Framework
fastapi>=0.100.0      # Modern async Python web framework
uvicorn>=0.23.0       # ASGI server
python-multipart>=0.0.6  # Form file uploads

# Computer Vision
opencv-python>=4.8.0  # Image processing
Pillow>=10.0.0        # Image manipulation

# Deep Learning
torch>=2.0.0          # PyTorch neural networks
torchvision>=0.15.0   # Vision utilities

# Face Detection
insightface>=0.7.3    # Face detection & recognition
onnxruntime>=1.15.0   # ONNX model inference
```

**ทำไมใช้ FastAPI?**
- Async by default - รองรับ concurrent requests
- Automatic OpenAPI docs
- Type hints = validation + documentation
- เร็วที่สุดใน Python frameworks

---

## 4. โครงสร้างโฟลเดอร์

```
CS FINALPROJECT/
│
├── frontend/                          # React Frontend
│   ├── public/                        # Static assets
│   │   └── carousel/                  # Carousel images
│   ├── src/
│   │   ├── components/                # Reusable UI components
│   │   │   ├── ColorEditor.jsx        # Color/crop editor (588 lines)
│   │   │   ├── ImageUploader.jsx      # Drag-drop uploader
│   │   │   ├── ResultDisplay.jsx      # Result comparison view
│   │   │   ├── GenerationProgress.jsx # Progress indicator
│   │   │   ├── Layout.jsx             # Header + Footer wrapper
│   │   │   ├── ThemeToggle.jsx        # Dark/Light mode toggle
│   │   │   ├── ToolsPanel.jsx         # Tool selector sidebar
│   │   │   └── LuxuryCarousel.jsx     # Auto-sliding carousel
│   │   │
│   │   ├── pages/                     # Route pages
│   │   │   ├── LandingPage.jsx        # Home page
│   │   │   ├── ServicesPage.jsx       # Services listing
│   │   │   ├── FaceSwapTool.jsx       # Main tool page (296 lines)
│   │   │   ├── AboutPage.jsx          # About us
│   │   │   ├── ContactPage.jsx        # Contact form
│   │   │   └── ResearchPage.jsx       # Research info
│   │   │
│   │   ├── services/
│   │   │   └── api.js                 # API client functions
│   │   │
│   │   ├── context/
│   │   │   └── ThemeContext.jsx       # Theme state management
│   │   │
│   │   ├── App.jsx                    # Root component + routing
│   │   ├── main.jsx                   # Entry point
│   │   └── index.css                  # Global styles (447 lines)
│   │
│   ├── package.json
│   └── vite.config.js
│
├── facelab/                           # Python Backend
│   ├── gateway/                       # API Gateway
│   │   ├── app.py                     # Gateway endpoints
│   │   ├── static/                    # Served result images
│   │   └── templates/                 # Jinja2 templates
│   │
│   ├── Service/
│   │   ├── simswap_service/           # SimSwap AI Service
│   │   │   ├── app.py                 # Service endpoints
│   │   │   ├── requirements.txt
│   │   │   └── SimSwap/               # SimSwap model code
│   │   │       ├── arcface_model/     # Face recognition model
│   │   │       ├── checkpoints/       # Pretrained weights
│   │   │       └── insightface_func/  # Face detection
│   │   │
│   │   └── difareli_service/          # (Coming soon)
│   │
│   └── shared_storage/                # Shared file storage
│       ├── uploads/                   # Uploaded images
│       └── outputs/                   # Generated results
│
├── environment_simswap.yaml           # Conda env for SimSwap
├── environment_web.yaml               # Conda env for Gateway
├── start_facelab.bat                  # Startup script
└── README.md
```

---

## 5. Frontend - React Application

### 5.1 Entry Point (main.jsx)

```jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

**อธิบาย:**
- `StrictMode` - เปิดใช้การตรวจสอบเพิ่มเติมในการพัฒนา (double-render เพื่อหา side effects)
- `createRoot` - React 18+ Concurrent Mode API
- `index.css` - Global styles โหลดก่อน App

### 5.2 App Component (App.jsx)

```jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import Layout from './components/Layout';
// ... page imports

function App() {
    return (
        <ThemeProvider>
            <BrowserRouter>
                <Routes>
                    <Route path="/" element={<Layout />}>
                        <Route index element={<LandingPage />} />
                        <Route path="services" element={<ServicesPage />} />
                        <Route path="about" element={<AboutPage />} />
                        <Route path="contact" element={<ContactPage />} />
                        <Route path="research" element={<ResearchPage />} />
                        <Route path="tool/*" element={<FaceSwapTool />} />
                    </Route>
                </Routes>
            </BrowserRouter>
        </ThemeProvider>
    );
}
```

**อธิบายการออกแบบ:**

1. **ThemeProvider ครอบทั้งหมด** - ทุก component เข้าถึง theme ได้
2. **BrowserRouter** - ใช้ HTML5 History API สำหรับ clean URLs
3. **Nested Routes** - `Layout` เป็น parent route ที่ render Header/Footer
4. **`path="tool/*"`** - Wildcard route สำหรับ `/tool/simswap-single`, `/tool/simswap-multi`

### 5.3 Theme Context (ThemeContext.jsx)

```jsx
const ThemeContext = createContext();

export function ThemeProvider({ children }) {
    const [theme, setTheme] = useState(() => {
        // 1. Check localStorage first
        const saved = localStorage.getItem('facelab-theme');
        if (saved) return saved;
        
        // 2. Check system preference
        if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return 'dark';
        }
        return 'light';
    });

    useEffect(() => {
        // Save to localStorage
        localStorage.setItem('facelab-theme', theme);
        // Apply to HTML element
        document.documentElement.setAttribute('data-theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => prev === 'light' ? 'dark' : 'light');
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}
```

**หลักการ:**
- **Lazy initialization** - useState callback ทำงานครั้งเดียวตอน mount
- **Persist to localStorage** - จำ preference ของ user
- **CSS attribute selector** - ใช้ `[data-theme="dark"]` ใน CSS

---

## 6. Backend - Python Services

### 6.1 Gateway (gateway/app.py)

```python
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import requests

app = FastAPI(title="FaceLab Hub")

# CORS - อนุญาต Frontend เข้าถึง
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SIMSWAP_URL = "http://127.0.0.1:8001/run"

@app.post("/api/simswap")
def simswap(src: UploadFile = File(...), dst: UploadFile = File(...)):
    # Reset file position
    src.file.seek(0)
    dst.file.seek(0)
    
    # Forward to SimSwap service
    files = {
        "src": (src.filename, src.file, src.content_type),
        "dst": (dst.filename, dst.file, dst.content_type),
    }
    
    r = requests.post(SIMSWAP_URL, files=files, timeout=600)
    
    if r.status_code != 200:
        return JSONResponse(status_code=r.status_code, content={"detail": r.text})
    
    # Save result
    out_path = STATIC_DIR / "simswap_result.png"
    out_path.write_bytes(r.content)
    
    return {"ok": True, "result_url": "/static/simswap_result.png"}
```

**ทำไมต้อง `file.seek(0)`?**
- UploadFile อาจถูกอ่านแล้วก่อนหน้า
- `seek(0)` รีเซ็ต cursor กลับไปต้นไฟล์

**ทำไมบันทึกผลลัพธ์?**
- Frontend load รูปผ่าน `<img src=...>`
- ต้อง serve เป็น static file

### 6.2 SimSwap Service (simswap_service/app.py)

```python
@app.post("/run")
def run(src: UploadFile = File(...), dst: UploadFile = File(...)):
    # Import heavy ML libraries inside endpoint
    # to allow FastAPI to start without ML dependencies
    try:
        from SimSwap.test_wholeimage_swapsingle import run_swap
    except Exception as e:
        # Fallback for testing without ML
        def run_swap(src, dst, output_dir, **kwargs):
            shutil.copyfile(dst, os.path.join(output_dir, 'result.jpg'))
    
    # Generate unique job ID
    job = uuid.uuid4().hex[:10]
    
    # Save uploaded files
    src_path = UPLOAD / f"{job}_src.png"
    dst_path = UPLOAD / f"{job}_dst.png"
    save_upload(src, src_path)
    save_upload(dst, dst_path)
    
    # Run SimSwap
    run_swap(str(src_path), str(dst_path), str(OUTPUT), crop_size=224)
    
    # Return latest output
    out_img = max(OUTPUT.glob("*.*"), key=lambda p: p.stat().st_mtime)
    return FileResponse(str(out_img))
```

**ทำไม import ใน endpoint?**
- PyTorch + InsightFace ใช้เวลา load นาน
- ถ้า import ที่ top-level, FastAPI จะ start ช้ามาก
- Lazy import = เร็วกว่า

---

## 7. API Endpoints

### 7.1 Gateway Endpoints (Port 8000)

| Method | Endpoint | Description | Request | Response |
|--------|----------|-------------|---------|----------|
| GET | `/` | Hub HTML page | - | HTML |
| GET | `/health` | Health check | - | `{"status": "ok"}` |
| POST | `/api/simswap` | Single face swap | FormData: `src`, `dst` | `{"ok": true, "result_url": "..."}` |
| POST | `/api/simswap_multi_upload` | Multi face swap | FormData: `src[]`, `dst` | `{"ok": true, "result_url": "..."}` |

### 7.2 SimSwap Service Endpoints (Port 8001)

| Method | Endpoint | Description | Request | Response |
|--------|----------|-------------|---------|----------|
| POST | `/run` | Single face swap | FormData: `src`, `dst` | Image bytes (PNG) |
| POST | `/run_multi` | Multi face swap | FormData: `src[]`, `dst` | Image bytes (PNG) |

---

## 8. Routes ทั้งหมด

| Path | Component | Description |
|------|-----------|-------------|
| `/` | `LandingPage` | หน้าแรก แสดง hero section และ carousel |
| `/services` | `ServicesPage` | รายการ services ที่มี |
| `/tool/simswap-single` | `FaceSwapTool` | เครื่องมือสลับหน้าเดี่ยว |
| `/tool/simswap-multi` | `FaceSwapTool` | เครื่องมือสลับหลายหน้า |
| `/about` | `AboutPage` | เกี่ยวกับเรา |
| `/contact` | `ContactPage` | ติดต่อ |
| `/research` | `ResearchPage` | งานวิจัยที่เกี่ยวข้อง |

---

## 9. Components ทั้งหมด

### 9.1 Layout.jsx (85 lines)

**หน้าที่:** Wrapper component สำหรับ Header, Footer, และ Navigation

```jsx
function Layout() {
    const location = useLocation();  // ดู current path

    return (
        <div className="layout">
            <header className="main-header">
                <Link to="/" className="logo">🎭 FaceLab</Link>
                
                <nav className="main-nav">
                    <Link to="/" className={location.pathname === '/' ? 'active' : ''}>
                        Home
                    </Link>
                    {/* ... more links */}
                </nav>
                
                <div className="header-actions">
                    <ThemeToggle />
                    <a href="https://github.com/...">GitHub ↗</a>
                </div>
            </header>
            
            <main>
                <Outlet />  {/* Child routes render here */}
            </main>
            
            <footer>...</footer>
        </div>
    );
}
```

**ทำไมใช้ Outlet?**
- React Router 6+ pattern
- Parent route render layout, child routes render ใน `<Outlet />`
- ไม่ต้อง pass children manually

---

### 9.2 ImageUploader.jsx (209 lines)

**หน้าที่:** Component อัพโหลดรูป รองรับ drag-drop และ multi-select

```jsx
function ImageUploader({
    onSourceChange,       // Callback เมื่อเลือก source file
    onSourceFilesChange,  // Callback เมื่อเลือกหลาย source files
    onTargetChange,       // Callback เมื่อเลือก target file
    sourceFile,
    sourceFiles = [],
    targetFile,
    isMultiMode = false   // Single vs Multi face swap
}) {
    const [dragOver, setDragOver] = useState({ source: false, target: false });
    
    // Drag & Drop handlers
    const handleDragOver = useCallback((e, type) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOver(prev => ({ ...prev, [type]: true }));
    }, []);
    
    const handleDrop = useCallback((e, type, onChange, isMulti) => {
        e.preventDefault();
        const files = e.dataTransfer.files;
        
        if (isMulti) {
            // Filter only images
            const imageFiles = Array.from(files).filter(f => 
                f.type.startsWith('image/')
            );
            onChange(imageFiles);
        } else {
            onChange(files[0]);
        }
    }, []);
    
    // Create preview URL
    const createPreview = (file) => URL.createObjectURL(file);
    
    // ... render upload zones
}
```

**ทำไมใช้ useCallback?**
- ป้องกัน function สร้างใหม่ทุก render
- จำเป็นเพราะ functions ถูก pass เป็น props ให้ child components

**ทำไมใช้ URL.createObjectURL?**
- สร้าง local URL สำหรับ preview รูป
- ไม่ต้อง upload ก่อน preview
- Memory efficient กว่า Base64

---

### 9.3 FaceSwapTool.jsx (296 lines)

**หน้าที่:** หน้าหลักของเครื่องมือ Face Swap จัดการ state machine ทั้งหมด

```jsx
// App States - State Machine
const STATES = {
    UPLOAD: 'upload',      // กำลังอัพโหลดรูป
    GENERATING: 'generating', // กำลังประมวลผล
    RESULT: 'result',      // แสดงผลลัพธ์
    EDITING: 'editing'     // ปรับแต่งสี
};

function FaceSwapTool() {
    const location = useLocation();
    
    // Determine tool from URL
    const getInitialTool = () => {
        const pathParts = location.pathname.split('/');
        const toolFromUrl = pathParts[pathParts.length - 1];
        return ['simswap-single', 'simswap-multi'].includes(toolFromUrl)
            ? toolFromUrl
            : 'simswap-single';
    };
    
    const [selectedTool, setSelectedTool] = useState(getInitialTool);
    const [currentState, setCurrentState] = useState(STATES.UPLOAD);
    const [sourceFile, setSourceFile] = useState(null);
    const [sourceFiles, setSourceFiles] = useState([]);
    const [targetFile, setTargetFile] = useState(null);
    const [progress, setProgress] = useState(0);
    const [resultUrl, setResultUrl] = useState(null);
    const [error, setError] = useState(null);
    
    // Main generation handler
    const handleGenerate = async () => {
        try {
            setCurrentState(STATES.GENERATING);
            setProgress(10);
            setStatus('กำลังอัพโหลดรูปภาพ...');
            
            let result;
            if (isMultiMode) {
                result = await runSimSwapMulti(sourceFiles, targetFile);
            } else {
                result = await runSimSwap(sourceFile, targetFile);
            }
            
            setResultUrl(getResultImageUrl(result.result_url));
            setCurrentState(STATES.RESULT);
            
        } catch (err) {
            // Parse error for user-friendly message
            if (err.message.includes('face')) {
                setError('❌ ไม่พบใบหน้าในรูปภาพ');
            } else if (err.message.includes('unreachable')) {
                setError('⚠️ ไม่สามารถเชื่อมต่อกับ Backend ได้');
            }
            setCurrentState(STATES.UPLOAD);
        }
    };
    
    // Render based on state
    return (
        <div className="tool-page">
            {currentState === STATES.UPLOAD && <ImageUploader ... />}
            {currentState === STATES.GENERATING && <GenerationProgress ... />}
            {currentState === STATES.RESULT && <ResultDisplay ... />}
            {currentState === STATES.EDITING && <ColorEditor ... />}
        </div>
    );
}
```

**State Machine Pattern:**
```
UPLOAD → (กด Generate) → GENERATING → (สำเร็จ) → RESULT → (กด Edit) → EDITING
                              ↓ (error)
                           UPLOAD
```

---

### 9.4 ColorEditor.jsx (588 lines) - Component หลัก

**หน้าที่:** ปรับแต่งสี, ความสว่าง, contrast, และครอปรูป

ดูรายละเอียดในหัวข้อถัดไป (อัลกอริทึมการปรับสี)

---

### 9.5 GenerationProgress.jsx (44 lines)

**หน้าที่:** แสดงสถานะขณะ AI กำลังประมวลผล

```jsx
function GenerationProgress({ isGenerating, progress, status }) {
    if (!isGenerating) return null;

    return (
        <div className="generation-progress">
            <div className="ai-icon">
                <span className="icon-pulse">🤖</span>
            </div>
            
            <div className="progress-bar-container">
                <div className="progress-bar" 
                     style={{ width: `${progress}%` }} />
            </div>
            
            <p className="progress-status">{status}</p>
        </div>
    );
}
```

**Early Return Pattern:**
- ถ้า `!isGenerating` return `null` ทันที
- ไม่ต้องครอบ condition ทั้ง JSX

---

### 9.6 ResultDisplay.jsx (132 lines)

**หน้าที่:** แสดงผลลัพธ์แบบเปรียบเทียบ Source + Target = Result

```jsx
function ResultDisplay({
    sourceFile,
    sourceFiles = [],
    targetFile,
    resultUrl,
    onReset,
    onProceedToEdit,
    isMultiMode = false
}) {
    // Handle download
    const handleDownload = async () => {
        const response = await fetch(resultUrl);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `facelab_result_${Date.now()}.png`;
        a.click();
        
        window.URL.revokeObjectURL(url);  // Clean up
    };
    
    return (
        <div className="comparison-view">
            {/* Source + Target = Result */}
            <div className="comparison-item">
                <img src={URL.createObjectURL(sourceFile)} />
            </div>
            <div className="operator">+</div>
            <div className="comparison-item">
                <img src={URL.createObjectURL(targetFile)} />
            </div>
            <div className="operator">=</div>
            <div className="comparison-item result">
                <img src={resultUrl} />
            </div>
        </div>
    );
}
```

**Download Pattern:**
1. Fetch รูปเป็น blob
2. สร้าง object URL
3. สร้าง invisible `<a>` element
4. Trigger click
5. Revoke URL เพื่อ free memory

---

### 9.7 ThemeToggle.jsx (21 lines)

**หน้าที่:** ปุ่มสลับ Dark/Light mode

```jsx
function ThemeToggle() {
    const { theme, toggleTheme } = useTheme();

    return (
        <button className="theme-toggle" onClick={toggleTheme}>
            <span className="theme-icon">
                {theme === 'light' ? '🌙' : '☀️'}
            </span>
        </button>
    );
}
```

**ง่ายแค่นี้เพราะ:**
- Logic อยู่ใน ThemeContext
- Component นี้แค่ render และ trigger

---

### 9.8 LuxuryCarousel.jsx (152 lines)

**หน้าที่:** Auto-sliding image carousel สำหรับหน้าแรก

```jsx
function LuxuryCarousel() {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [progress, setProgress] = useState(0);
    
    const nextSlide = useCallback(() => {
        setCurrentIndex(prev => (prev + 1) % images.length);
        setProgress(0);
    }, []);
    
    // Auto-play with progress bar
    useEffect(() => {
        const interval = setInterval(() => {
            setProgress(prev => {
                if (prev >= 100) {
                    nextSlide();
                    return 0;
                }
                return prev + 1;
            });
        }, 50);  // Update every 50ms
        
        return () => clearInterval(interval);
    }, [nextSlide]);
    
    return (
        <div className="carousel-container">
            {images.map((img, i) => (
                <div className={`slide ${i === currentIndex ? 'active' : ''}`}>
                    <div style={{ backgroundImage: `url(${img.url})` }} />
                </div>
            ))}
            
            {/* Progress dots */}
            <div className="carousel-dots">
                {images.map((_, i) => (
                    <button className="dot">
                        <div className="dot-progress" 
                             style={{ width: i === currentIndex ? `${progress}%` : 0 }} />
                    </button>
                ))}
            </div>
        </div>
    );
}
```

**Auto-play Algorithm:**
- `setInterval` ทุก 50ms เพิ่ม progress 1%
- เมื่อ progress = 100 → next slide
- Total time per slide = 50ms × 100 = 5 seconds

---

## 10. อัลกอริทึมการปรับสี

### 10.1 CSS Filter Functions

ColorEditor ใช้ **CSS Filter** ในการปรับสี ซึ่งประมวลผลบน GPU:

```jsx
const getFilterString = useCallback(() => {
    const filters = [
        `brightness(${adjustments.brightness}%)`,  // 0-200%
        `contrast(${adjustments.contrast}%)`,      // 0-200%
        `saturate(${adjustments.saturation}%)`,    // 0-200%
    ];
    
    // Temperature adjustment
    if (adjustments.temperature > 0) {
        // Warm tone: add sepia
        filters.push(`sepia(${adjustments.temperature}%)`);
    } else if (adjustments.temperature < 0) {
        // Cool tone: rotate hue toward blue
        filters.push(`hue-rotate(${adjustments.temperature * 2}deg)`);
    }
    
    return filters.join(' ');
}, [adjustments]);
```

### 10.2 สูตรการคำนวณแต่ละ Filter

#### Brightness
```
Output = Input × (brightness / 100)
```
- brightness = 100: ไม่เปลี่ยน
- brightness = 50: มืดลงครึ่งหนึ่ง
- brightness = 200: สว่างขึ้น 2 เท่า

#### Contrast
```
Factor = (259 × (contrast + 255)) / (255 × (259 - contrast))
Output = Factor × (Input - 128) + 128
```
- contrast = 100: ไม่เปลี่ยน
- contrast < 100: สีจืดลง (เข้าหา gray)
- contrast > 100: สีเข้มขึ้น (ต่างชัดขึ้น)

#### Saturation
```
Gray = 0.2126×R + 0.7152×G + 0.0722×B  // Luminance
Output = Gray + (Input - Gray) × (saturation / 100)
```
- saturation = 0: ขาวดำ
- saturation = 100: ไม่เปลี่ยน
- saturation = 200: สีอิ่มตัวขึ้น 2 เท่า

#### Temperature (Warm/Cool)

**Warm (sepia):**
```
R' = R × 0.95 + G × 0.05
G' = G × 0.85
B' = B × 0.70
```

**Cool (hue-rotate):**
```
θ = temperature × 2 degrees
[R']   [cos(θ)  -sin(θ)  0] [R]
[G'] = [sin(θ)   cos(θ)  0] [G]
[B']   [0        0       1] [B]
```

### 10.3 Canvas-based Apply

```jsx
const applyToResultCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = originalImageRef.current;
    
    // Set canvas size to crop area
    canvas.width = Math.round(cropArea.width);
    canvas.height = Math.round(cropArea.height);
    
    // Apply CSS filters
    ctx.filter = getFilterString();
    
    // Draw cropped region
    ctx.drawImage(
        img,
        cropArea.x, cropArea.y,           // Source position
        cropArea.width, cropArea.height,  // Source size
        0, 0,                             // Destination position
        cropArea.width, cropArea.height   // Destination size
    );
}, [cropArea, getFilterString]);
```

**ทำไมใช้ Canvas?**
- สามารถ export เป็น PNG ได้
- Hardware accelerated
- รองรับ `ctx.filter` property

### 10.4 Crop Algorithm

```jsx
// Corner handles for resizing
const handles = {
    nw: { x: cropArea.x, y: cropArea.y },
    ne: { x: cropArea.x + cropArea.width, y: cropArea.y },
    sw: { x: cropArea.x, y: cropArea.y + cropArea.height },
    se: { x: cropArea.x + cropArea.width, y: cropArea.y + cropArea.height }
};

// Drag resize logic
if (dragHandle === 'se') {  // Southeast corner
    newCrop.width = Math.max(50, 
        Math.min(dragStart.cropWidth + deltaX, 
                 img.naturalWidth - dragStart.cropX));
    newCrop.height = Math.max(50, 
        Math.min(dragStart.cropHeight + deltaY, 
                 img.naturalHeight - dragStart.cropY));
}
```

**Constraints:**
- Minimum size: 50×50 pixels
- Maximum: ไม่เกินขอบรูป
- Move: ไม่ให้หลุดขอบ

---

## 11. ขั้นตอนการทำงาน

### 11.1 Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER WORKFLOW                            │
└─────────────────────────────────────────────────────────────────┘

1. เปิดเว็บ localhost:5173
        │
        ▼
2. หน้า Landing Page
   ├── ดู Carousel ตัวอย่าง
   └── กด "Get Started" หรือ "Services"
        │
        ▼
3. หน้า Services
   ├── เลือก "Face Swap" (Single)
   └── หรือ "Multi Face Swap"
        │
        ▼
4. หน้า FaceSwapTool (State: UPLOAD)
   ├── อัพโหลด Source Image (หน้าที่จะนำไปใส่)
   └── อัพโหลด Target Image (รูปที่จะถูกเปลี่ยนหน้า)
        │
        ▼
5. กด "เริ่มสร้างภาพ"
        │
        ▼
6. State: GENERATING
   │  Frontend: api.js → runSimSwap()
   │      │
   │      ▼ POST /api/simswap with FormData
   │  Gateway (port 8000):
   │      │
   │      ▼ Forward to SimSwap Service
   │  SimSwap Service (port 8001):
   │      ├── Save uploads to shared_storage/uploads/
   │      ├── Load SimSwap model
   │      ├── Detect faces with InsightFace
   │      ├── Extract face embeddings
   │      ├── Generate swapped face
   │      └── Save result to shared_storage/outputs/
   │      │
   │      ▼ Return image bytes
   │  Gateway:
   │      └── Save as static/simswap_result.png
   │      │
   │      ▼ Return JSON: {"result_url": "/static/simswap_result.png"}
   │  Frontend:
   │      └── Update state to RESULT
        │
        ▼
7. State: RESULT
   ├── แสดงผล: Source + Target = Result
   ├── กด "เริ่มใหม่" → กลับ State UPLOAD
   ├── กด "ดาวน์โหลด" → Download รูป
   └── กด "ปรับแต่งสี" → ไป State EDITING
        │
        ▼
8. State: EDITING (ColorEditor)
   ├── ปรับ Brightness (0-200%)
   ├── ปรับ Contrast (0-200%)
   ├── ปรับ Saturation (0-200%)
   ├── ปรับ Temperature (-50 to +50)
   ├── เปิด Crop mode → ปรับขนาด
   └── กด "ดาวน์โหลด" → Export PNG
```

### 11.2 SimSwap AI Process (ภายใน)

```
Input: Source Face + Target Image
        │
        ▼
1. Face Detection (InsightFace)
   ├── Detect faces in source image
   └── Detect faces in target image
        │
        ▼
2. Face Alignment
   └── Align faces using facial landmarks
       (eyes, nose, mouth positions)
        │
        ▼
3. Feature Extraction (ArcFace)
   └── Extract 512-D face embedding from source face
        │
        ▼
4. Face Swapping (SimSwap Generator)
   ├── Input: Target face region + Source embedding
   └── Output: Synthesized face with source identity
        │
        ▼
5. Blending
   └── Seamlessly blend swapped face into target image
        │
        ▼
Output: Result Image
```

---

## 12. CSS Design System (index.css)

### 12.1 CSS Variables

```css
:root {
    /* Colors - Light Theme */
    --bg-primary: #fdfbf9;
    --bg-secondary: #ffffff;
    --text-primary: #1e293b;
    --text-secondary: #64748b;
    
    /* Gradients */
    --gradient-primary: linear-gradient(135deg, #d946ef 0%, #8b5cf6 100%);
    
    /* Shadows */
    --shadow-card: 0 4px 24px rgba(0, 0, 0, 0.04);
    
    /* Spacing Scale */
    --spacing-xs: 4px;
    --spacing-sm: 8px;
    --spacing-md: 16px;
    --spacing-lg: 24px;
    --spacing-xl: 32px;
    
    /* Border Radius */
    --radius-sm: 6px;
    --radius-md: 12px;
    --radius-lg: 16px;
    --radius-full: 9999px;  /* Pill shape */
    
    /* Transitions */
    --transition-fast: 0.15s cubic-bezier(0.4, 0, 0.2, 1);
    --transition-bounce: 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* Dark Theme Override */
[data-theme="dark"] {
    --bg-primary: #0a0f1a;
    --text-primary: #f8fafc;
    --gradient-primary: linear-gradient(135deg, #8b5cf6 0%, #d946ef 50%, #f97316 100%);
    --shadow-neon: 0 0 20px rgba(139, 92, 246, 0.5);
}
```

**ทำไมใช้ CSS Variables?**
- เปลี่ยน theme ได้ทันทีโดยเปลี่ยน `data-theme`
- ไม่ต้อง re-render JavaScript
- Maintainable และ consistent

### 12.2 Button Styles

```css
.btn {
    display: inline-flex;
    align-items: center;
    gap: var(--spacing-xs);
    padding: var(--spacing-sm) var(--spacing-lg);
    border-radius: var(--radius-full);  /* Pill shape */
    font-weight: 500;
    transition: all var(--transition-fast);
}

.btn-primary {
    background: var(--gradient-primary);
    color: white;
    box-shadow: 0 4px 12px rgba(168, 85, 247, 0.25);
}

.btn-primary:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 16px rgba(168, 85, 247, 0.35);
}
```

**Hover Effect:**
- `translateY(-2px)` - ปุ่มลอยขึ้น
- เพิ่ม shadow blur และ spread
- สร้างความรู้สึก "กด" ได้

### 12.3 Animations

```css
@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}

@keyframes slideUp {
    from {
        opacity: 0;
        transform: translateY(20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

@keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
}

.animate-slideUp {
    animation: slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
```

**cubic-bezier(0.16, 1, 0.3, 1):**
- เริ่มเร็ว ค่อยๆ ช้าลง
- "Ease out expo" feeling
- ดูเป็นธรรมชาติ

---

## สรุป

FaceLab เป็นโปรเจกต์ที่รวม:
- **Modern Frontend** ด้วย React 19 + Vite
- **Microservices Backend** ด้วย FastAPI
- **AI/ML** ด้วย SimSwap + InsightFace
- **Premium UI/UX** ด้วย CSS Variables + Animations

โครงสร้างแยก Layer ชัดเจน ทำให้ maintain และ scale ได้ง่าย.
