# AyurAuth Mega Project - Startup Guide

## Overview
This is a complete Ayurvedic herb authentication system using CNN + Blockchain + React + FastAPI

**Components**:
- 🧠 **ML Service**: Flask with MobileNetV2 CNN (Port 5001)
- 🔧 **Backend API**: FastAPI (Port 5000)
- 🌐 **Frontend**: React + TypeScript (Port 5173)
- 📦 **Database**: MongoDB (configured in backend)

---

## Quick Start (3 Terminal Windows)

### Terminal 1: ML Service (Flask + CNN)
```bash
cd "C:\Users\Aditya\OneDrive\Desktop\Mega project\CNN model\files"

# Install dependencies (first time only)
pip install -r requirements.txt

# Run ML service
python app.py
# Expected: "Running on http://127.0.0.1:5001"
```

### Terminal 2: Backend API (FastAPI)
```bash
cd "C:\Users\Aditya\OneDrive\Desktop\Mega project\Website frontend Mega Project\ayurvedic-blockchain-frontend"

# Install dependencies (first time only)
npm install

# Run backend
npm run backend
# Expected: "Server running on http://localhost:5000"
```

### Terminal 3: Frontend (React + Vite)
```bash
cd "C:\Users\Aditya\OneDrive\Desktop\Mega project\Website frontend Mega Project\ayurvedic-blockchain-frontend"

# Run frontend (in same directory as backend)
npm run dev
# Expected: "VITE v... ready in XXX ms"
# Access: http://localhost:5173
```

---

## Setup Steps

### Step 1: Prepare Dataset (One-time)

**Option A: Download from Kaggle**
```bash
cd "C:\Users\Aditya\OneDrive\Desktop\Mega project\CNN model\files"

# Requires Kaggle API setup first
# Go to https://www.kaggle.com/settings/account
# Create API token and place kaggle.json in ~/.kaggle/

python prepare_dataset.py
# This will download and organize the data
```

**Option B: Manual Download**
1. Go to: https://www.kaggle.com/datasets/aryashah2k/indian-medicinal-leaves-dataset
2. Download and extract to: `dataset/`
3. Run: `python prepare_dataset.py` (to organize)

### Step 2: Train Improved Model (Optional but Recommended)

```bash
cd "C:\Users\Aditya\OneDrive\Desktop\Mega project\CNN model\files"

# First prepare dataset (see Step 1)
python prepare_dataset.py

# Then train model (takes 2-3 hours on CPU, 30 min on GPU)
python improved_cnn_model.py --data_dir data/herbs

# Test accuracy
python test_accuracy.py
```

### Step 3: Copy Model to ML Service

```bash
# After training, copy model to Flask service
cp "C:\Users\Aditya\OneDrive\Desktop\Mega project\CNN model\files\saved_models\herbal_auth_improved_final.h5" \
   "C:\Users\Aditya\OneDrive\Desktop\Mega project\Website frontend Mega Project\ayurvedic-blockchain-frontend\ml-service\models\"
```

Or use the existing `leaf_model.h5` (already in ml-service/models/)

---

## Testing Flows

### Test 1: Upload & AI Verification

1. **Start all 3 services** (see Quick Start above)

2. **Navigate to**: http://localhost:5173

3. **Click "Upload Herb"** on landing page

4. **Login** (if not logged in):
   - Email: `farmer@ayurauth.demo`
   - Password: `demo1234`

5. **Upload a herb image**:
   - Drag & drop an image or click to select
   - Image should show in preview

6. **Fill in details**:
   - Herb Name: `Neem` (or any of: Amla, Guava, Tulsi, Hibiscus)
   - Farmer ID: `farmer_001`

7. **Auto Fetch Location**:
   - Click "Auto Fetch Geo-location"
   - Allow browser permission
   - Should show: "Location: XX.XXXXX, YY.YYYYY"

8. **Submit**:
   - Click "Submit Batch"
   - Should call Flask CNN service
   - Should show: "Model: [model_name] | Class: [herb] | Confidence: XX% | Verified: Yes/No"

9. **Success Message**:
   - "Herb batch uploaded" → Check Dashboard
   - "AI verification failed" → Try with clearer image

### Test 2: Verify QR Code

1. **From upload page**:
   - After successful upload, copy the QR payload displayed

2. **Navigate to Verify page**:
   - Click "Upload New Herb" or go to /verify
   - Should show QR scanner interface

3. **Enter Batch ID**:
   - Paste the QR payload in the search field
   - Click "Verify" button

4. **View Result**:
   - Should display herb details:
     - Herb image
     - Herb name
     - Origin (geolocation)
     - AI Confidence %
     - Verification Badge (Valid/Invalid/Unverified)
     - Blockchain Hash
     - Verification Date

### Test 3: Camera Scanner

1. **On Verify page**:
   - Click "Scan QR" button
   - Browser should request camera permission
   - Point at QR code on screen or printed QR

2. **Auto-Verify**:
   - On successful scan, should automatically verify

### Test 4: Dashboard

1. **Login**: farmer@ayurauth.demo / demo1234

2. **Navigate to Dashboard**:
   - Click "Dashboard" or go to /dashboard
   - Should show table of all uploaded herbs

3. **Check Fields**:
   - Herb Name ✓
   - Farmer ID ✓
   - Verification Status ✓
   - Timestamp ✓

### Test 5: Chat/Chatbot

1. **Login**: farmer@ayurauth.demo / demo1234

2. **Navigate to Chat**:
   - Click "Chat" or go to /chat

3. **Ask Questions**:
   - "How do I upload herbs?"
   - "What does AI verification do?"
   - "How can I verify a QR code?"
   - Should get helpful responses

4. **Chat History**:
   - Click "Export" to download as .txt
   - Click "Clear" to clear chat
   - Check localStorage persistence (refresh page)

### Test 6: Navigation & UI

1. **Check all links**:
   - Landing → Upload ✓
   - Upload → Dashboard ✓
   - Dashboard → Upload ✓
   - All pages → Verify ✓
   - All pages → Chat ✓
   - All pages → Landing ✓

2. **Theme Toggle**:
   - Top-right toggle button
   - Switch between dark/light mode
   - Check UI readability

3. **Language Switcher**:
   - Top-right language icon
   - Should change text if multi-language configured

4. **Mobile Responsive**:
   - Press F12 (DevTools)
   - Toggle device toolbar (Ctrl+Shift+M)
   - Test on iPhone SE (375px)
   - Check layout works

5. **Console Errors**:
   - Open DevTools (F12)
   - Check Console tab
   - Should have no red errors
   - Warnings are OK

---

## API Endpoints Reference

### ML Service (Flask, Port 5001)

**Health Check**:
```bash
curl http://localhost:5001/health
```
Response:
```json
{
  "ok": true,
  "modelLoaded": true,
  "modelVersion": "herbal_auth_improved",
  "classes": 5,
  "classNames": ["Amla", "Guava", "Neem", "Tulsi", "Hibiscus"]
}
```

**Predict**:
```bash
curl -X POST http://localhost:5001/predict \
  -H "Content-Type: application/json" \
  -d '{"image": "base64_encoded_image_here"}'
```

Response:
```json
{
  "class": "Neem",
  "confidence": 0.9523,
  "isAuthentic": true,
  "modelName": "herbal_auth_improved",
  "modelVersion": "herbal_auth_improved",
  "threshold": 0.7
}
```

### Backend API (FastAPI, Port 5000)

**Health**:
```bash
curl http://localhost:5000/api/health
```

**Upload Herb** (requires auth):
```bash
curl -X POST http://localhost:5000/api/herbs \
  -H "Authorization: Bearer <token>" \
  -F "herbName=Neem" \
  -F "farmerId=farmer_001" \
  -F "latitude=28.7041" \
  -F "longitude=77.1025" \
  -F "image=@herb_image.jpg"
```

**Verify QR** (public):
```bash
curl -X POST http://localhost:5000/api/verify \
  -H "Content-Type: application/json" \
  -d '{"code": "qr_payload_here"}'
```

---

## Troubleshooting

### ML Service won't start
```
Error: Model not found at ...
```
**Solution**: Copy a model file to `ml-service/models/`:
- Use existing `leaf_model.h5`, or
- Train new model and copy `herbal_auth_improved_final.h5`

### Backend API connection fails
```
Error: Failed to load data from API
```
**Solution**: 
1. Check backend is running: `npm run backend`
2. Check port 5000 is not in use: `netstat -ano | findstr :5000`
3. Check .env has correct API URL: `VITE_API_URL=http://localhost:5000`

### Frontend won't load
```
Error: VITE not running / Connection refused
```
**Solution**:
1. Check frontend is running: `npm run dev`
2. Try clearing browser cache: `Ctrl+Shift+Delete`
3. Check port 5173 not in use: `netstat -ano | findstr :5173`

### CNN predictions taking too long
- ML service slow on CPU
- Use GPU: Set CUDA env vars or use lighter model
- Or reduce image size in app.py: `IMG_SIZE = 160` instead of 224

### No geolocation permission
- Browser security: Only works on HTTPS or localhost
- Check browser allows location access
- Or manually enter coordinates

### QR scanner not working
- Chrome/Firefox required (not all browsers support camera)
- Check browser has camera permission
- Try uploading QR image instead

---

## Performance Checklist

✅ **Model Accuracy**: Should be 92%+ on validation set
✅ **Upload Speed**: Image → Prediction should be <5 seconds
✅ **QR Scanning**: Should scan and verify in <2 seconds
✅ **Dashboard Load**: Should load in <2 seconds
✅ **Chat Response**: Should respond in <3 seconds
✅ **No Console Errors**: Clean DevTools output

---

## Next Steps

1. **Improve Model** (if not done):
   ```bash
   python improved_cnn_model.py --data_dir data/herbs
   ```

2. **Deploy to Production**:
   - Use Gunicorn for Flask (instead of dev server)
   - Use PM2 or systemd for process management
   - Use HTTPS/SSL certificates
   - Deploy to cloud (AWS, GCP, Azure, Heroku)

3. **Blockchain Integration**:
   - Currently using mock blockchain
   - To use real Ethereum/Polygon:
     - Set up wallet & contract
     - Configure in backend .env
     - Test QR-to-blockchain flow

4. **Database Optimization**:
   - Add indexes on frequently queried fields
   - Implement caching (Redis)
   - Backup MongoDB regularly

---

## File Locations Quick Reference

| Item | Location |
|------|----------|
| ML Model (old) | `CNN model/files/leaf_model.h5` |
| ML Model (improved) | `CNN model/files/saved_models/herbal_auth_improved_final.h5` |
| Training Code | `CNN model/files/improved_cnn_model.py` |
| Dataset | `CNN model/files/data/herbs/` |
| Flask App | `Website/.../ml-service/app.py` |
| Backend App | `Website/.../backend/app.js` |
| Frontend | `Website/.../src/` |
| Frontend Env | `Website/.../.env.development` |
| Backend Env | `Website/.../backend/.env` |

---

## Support

For issues or questions:
1. Check console logs (DevTools F12)
2. Check terminal output of each service
3. Review API responses in network tab
4. Check MongoDB connection in backend logs

---

**Last Updated**: May 17, 2026
**Version**: 1.0.0
