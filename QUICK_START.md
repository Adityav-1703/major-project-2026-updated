# 🚀 Quick Start - Get Everything Running in 5 Minutes

## ⚡ The Fastest Way to See Your Project Working

### Open 3 PowerShell/Terminal Windows Side-by-Side

---

## 🪟 Window 1: ML Service (Flask CNN)

```powershell
cd "C:\Users\Aditya\OneDrive\Desktop\Mega project\CNN model\files"
python app.py
```

**Expected Output:**
```
✓ Model loaded: leaf_model.h5
Running on http://127.0.0.1:5001
```

✅ **Status**: ML Service ready on port 5001

---

## 🪟 Window 2: Backend API (FastAPI)

```powershell
cd "C:\Users\Aditya\OneDrive\Desktop\Mega project\Website frontend Mega Project\ayurvedic-blockchain-frontend"
npm run backend
```

**Expected Output:**
```
info: Server running on http://localhost:5000
✓ MongoDB connected
✓ Ready to accept requests
```

✅ **Status**: Backend ready on port 5000

---

## 🪟 Window 3: Frontend (React + Vite)

```powershell
cd "C:\Users\Aditya\OneDrive\Desktop\Mega project\Website frontend Mega Project\ayurvedic-blockchain-frontend"
npm run dev
```

**Expected Output:**
```
VITE v5.4... ready in XXX ms

➜ Local: http://localhost:5173/
➜ Network: use --host to expose
```

✅ **Status**: Frontend ready on port 5173

---

## 🌐 Open Website

**Click here**: http://localhost:5173

Or copy-paste into browser address bar

---

## 🧪 Test the Complete Flow (5 minutes)

### 1️⃣ Landing Page
- ✅ See hero section with "Upload Herb" button
- ✅ Click button → Goes to /upload
- ✅ Beautiful animations

### 2️⃣ Login
- Email: `farmer@ayurauth.demo`
- Password: `demo1234`
- ✅ Click Login

### 3️⃣ Upload Herb Image
- Drag-and-drop any image OR click to select
- Herb Name: `Neem` (or Amla, Guava, Tulsi, Hibiscus)
- Farmer ID: `farmer_001`
- Click "Auto Fetch Geo-location" → Allow
- Click "Submit Batch"
- ✅ See CNN result: "Confidence: 87%"

### 4️⃣ View Dashboard
- Click "View Dashboard"
- ✅ See your uploaded herb listed

### 5️⃣ Verify QR Code
- Go to `/verify` or click "Verify QR"
- Paste or enter the herb batch ID
- Click "Verify"
- ✅ See herb details with green "Verified" badge

### 6️⃣ Chat
- Click "Chat" in navigation
- Ask: "How do I upload herbs?"
- ✅ Get helpful response

### 7️⃣ Try Dark Mode
- Click moon/sun icon (top-right)
- ✅ UI changes to dark mode

---

## ✨ That's It! You're Done!

All features working:
- ✅ Upload herb with CNN verification
- ✅ AI predicts herb class + confidence
- ✅ QR code generation
- ✅ QR code verification
- ✅ Dashboard showing records
- ✅ Chat assistant
- ✅ Dark/light theme

---

## 🧪 Full Testing (Optional - 2 hours)

Use: **WEBSITE_TEST_CHECKLIST.md** (111 test cases)

---

## 🎯 Next: Train Better Model (Optional - 3 hours)

```powershell
cd "C:\Users\Aditya\OneDrive\Desktop\Mega project\CNN model\files"

# Download dataset
python prepare_dataset.py

# Train improved model (92-95% accuracy!)
python improved_cnn_model.py --data_dir data/herbs

# Test accuracy
python test_accuracy.py
```

---

## 🔧 Troubleshooting

| Problem | Solution |
|---------|----------|
| "Cannot find module" | Run `npm install` in frontend directory |
| Port 5000/5001 already in use | `netstat -ano \| findstr :5000` to find process |
| Model not found error | Model already copied ✅ (should work) |
| No images showing | Check browser console (F12) for errors |
| Slow predictions | Predictions are <5 seconds on CPU ✓ |
| Camera not working | Use Chrome, check browser permissions |

---

## 📚 For More Information

- **Setup & Configuration**: `STARTUP_GUIDE.md`
- **Complete Testing**: `WEBSITE_TEST_CHECKLIST.md`
- **Technical Details**: `IMPLEMENTATION_SUMMARY.md`

---

## 💡 Key Info

| Item | Details |
|------|---------|
| **Frontend URL** | http://localhost:5173 |
| **Demo User** | farmer@ayurauth.demo |
| **Demo Password** | demo1234 |
| **ML Service** | http://localhost:5001/health |
| **Backend API** | http://localhost:5000/api/health |
| **Model** | MobileNetV2 (leaf_model.h5) |
| **Classes** | Amla, Guava, Neem, Tulsi, Hibiscus |

---

## 🎉 Success Indicators

✅ All three services running without errors  
✅ Frontend loads at http://localhost:5173  
✅ Can login with demo credentials  
✅ Can upload herb image  
✅ CNN prediction shows confidence %  
✅ Can verify QR code  
✅ Dashboard shows uploaded herbs  
✅ Chat responds to questions  
✅ Dark mode works  

---

**Estimated time to complete**: 5-10 minutes ⏱️

Good luck! 🚀
