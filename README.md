# 🦅 BIRD EYE VIEW — Multi-Angle Surveillance & Target Detection

A modern fullstack surveillance intelligence platform that allows users to **upload multi-angle CCTV / drone video feeds** and **detect a chosen object or person** using cross-camera Re-Identification (Re-ID) and a unified **Bird's-Eye View Top-Down Homography Ground Map**.

---

## 🌟 Key Capabilities

1. **Multi-Angle CCTV Ingestion Workbench**:
   - Drag-and-drop multiple video feeds simultaneously (supports MP4, AVI, MOV, MKV, WEBM).
   - Custom tagging for each camera angle (e.g., *Camera 1 (Front)*, *Camera 2 (Side)*, *Camera 3 (Overhead)*).
   - Real-time file validation, size tracking, and chunked upload progress.

2. **Target Person / Object Reference (Re-ID)**:
   - Upload a reference photo of the target individual or choose object class (*Person*, *Vehicle*, *Backpack / Luggage*).
   - Used for appearance feature matching and multi-camera Re-Identification.

3. **Stored Surveillance Videos Vault**:
   - Gallery of stored feeds with instant playback modal and storage analytics.
   - Active target reference banner with one-click detection launch and removal.

4. **Multi-Angle Detection Studio**:
   - **Synchronized Multi-Angle Playback**: View feeds side-by-side with active AI bounding boxes and confidence scores.
   - **Top-Down Bird's-Eye View Ground Plane**: Projects ground-plane locations of the detected target through space and time across all camera angles.
   - **Interactive Trajectory Timeline**: Play, pause, and step through target movement coordinates.

---

## 📁 Project Architecture

```text
Birds-Eye/
├── backend/                       # Node.js (Express) Video & Detection API
│   ├── src/
│   │   ├── config/index.js        # Port 3001, CORS & environment settings
│   │   ├── controllers/           # Video uploads, metadata, multi-angle detection
│   │   ├── middleware/            # Error handlers
│   │   ├── routes/api.routes.js   # Multer storage & detection endpoints
│   │   └── server.js              # Express server
│   ├── uploads/                   # Stored multi-angle videos & target references
│   │   ├── videos/
│   │   ├── targets/
│   │   └── metadata.json          # Persistent file index & storage stats
│   ├── .env                       # Backend environment (PORT=3001)
│   └── package.json
│
├── frontend/                      # React (Vite) Dashboard
│   ├── src/
│   │   ├── components/
│   │   │   ├── Header.jsx         # Navy banner with live stats & status pill
│   │   │   ├── VideoIngestion.jsx # Multi-video & target reference uploader
│   │   │   ├── StoredVideosGallery.jsx # Stored video cards & player triggers
│   │   │   ├── DetectionStudio.jsx# Synchronized multi-cam grid + Bird's Eye map
│   │   │   ├── VideoPlayerModal.jsx# Full video viewer modal
│   │   │   └── Toast.jsx          # Notification alerts
│   │   ├── services/api.js        # Backend fetch & upload API client
│   │   ├── App.jsx                # Main coordinating layout
│   │   └── index.css              # Styling matching surveillance dashboard UI
│   ├── .env                       # Frontend environment (VITE_API_URL)
│   └── package.json
│
└── README.md
```

---

## 🚀 Running the Project

### 1. Start the Node.js Backend API
```bash
npm run dev:backend
# Or: cd backend && npm run dev
# Running on http://localhost:3001
```

### 2. Start the React Frontend Dashboard
```bash
npm run dev:frontend
# Or: cd frontend && npm run dev
# Running on http://localhost:5173
```

Visit **`http://localhost:5173`** in your browser.
