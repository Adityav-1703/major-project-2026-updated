# AyurAuth Website - Complete Testing Checklist

## ✅ Service Health

- [ ] **Frontend (Port 5173)**: http://localhost:5173
  - Command: `npm run dev`
  - Status: Should show "VITE ready in XXX ms"
  
- [ ] **Backend API (Port 5000)**:
  - Command: `npm run backend`
  - Status: Should show "listening on port 5000"
  - Health: `curl http://localhost:5000/api/health`
  
- [ ] **ML Service (Port 5001)**:
  - Command: `python ml-service/app.py`
  - Status: Should show "Running on http://127.0.0.1:5001"
  - Health: `curl http://localhost:5001/health`

---

## 🎯 Landing Page Tests (`/`)

### Navigation
- [ ] Logo is visible and clickable
- [ ] All CTA buttons present: "Upload Herb", "Verify QR", "Learn More"
- [ ] Navigation menu appears (if mobile: hamburger menu)
- [ ] "Upload Herb" button navigates to /upload
- [ ] "Verify QR" button navigates to /verify

### Content
- [ ] Hero section displays workflow title
- [ ] 5-step workflow visible with descriptions
- [ ] "Learn More" shows workflow details in modal
- [ ] Features section displays (AI Verification, Blockchain, QR Codes, etc.)
- [ ] Call-to-action buttons are prominent

### UI/UX
- [ ] Page loads in <2 seconds
- [ ] No console errors (F12)
- [ ] Responsive layout (mobile, tablet, desktop)
- [ ] Theme toggle works (dark/light mode)
- [ ] Animations smooth (Framer Motion)

---

## 🔐 Authentication Tests

### Login Page (`/login`)
- [ ] Email field accepts valid email
- [ ] Password field is masked
- [ ] "Login" button submits form
- [ ] Demo credentials visible:
  - Email: `farmer@ayurauth.demo`
  - Password: `demo1234`
- [ ] "Don't have account?" links to /signup
- [ ] Error message shows for invalid credentials

**Test Credentials**:
```
Email: farmer@ayurauth.demo
Password: demo1234
```

### Signup Page (`/signup`)
- [ ] Name field accepts text
- [ ] Email field validates email format
- [ ] Password field shows strength indicator
- [ ] Confirm password matches
- [ ] "Sign up" button submits form
- [ ] "Already have account?" links to /login
- [ ] Validation messages display

### Session Management
- [ ] After login: Token saved in localStorage
- [ ] User data persists on refresh
- [ ] Can navigate to protected pages (/upload, /dashboard, /chat)
- [ ] Logout clears session
- [ ] Redirects to /login on logout

---

## 📤 Upload Flow Tests (`/upload`)

### Access Control
- [ ] Redirects to /login if not authenticated
- [ ] After login: Page loads
- [ ] Page title: "Upload Herb Batch"

### Image Upload
- [ ] **Drag & Drop**:
  - Drag image over upload area
  - Drop image
  - Image should show in preview
  - Preview size: ~176px height

- [ ] **Click to Select**:
  - Click upload area
  - File dialog opens
  - Select image
  - Image preview updates

- [ ] **File Validation**:
  - Only accepts image files (jpg, png, etc.)
  - Shows error for non-image files
  - Shows error message: "Please upload a valid image file."

### Form Fields
- [ ] **Herb Name**: Accepts text (e.g., "Neem")
  - Accepts: Amla, Guava, Neem, Tulsi, Hibiscus
  
- [ ] **Farmer ID**: Accepts text (e.g., "farmer_001")
  - No special validation, any text works

- [ ] **Geolocation**:
  - "Auto Fetch Geo-location" button visible
  - Click button → Browser permission request
  - After allow: Shows coordinates
  - Format: "Location: XX.XXXXX, YY.YYYYY"
  - Clicking again updates coordinates

### Submission
- [ ] **Before Submission**:
  - All fields required: name, farmer ID, image, location
  - Error if any field missing: "All fields are required..."
  
- [ ] **During Submission**:
  - Submit button shows "Uploading..."
  - Spinner animates
  - Message shows: "Running CNN verification via API..."
  
- [ ] **After Submission (Success)**:
  - Prediction preview shows:
    - Model name
    - Predicted class (herb name)
    - Confidence % (e.g., 87%)
    - Verified: Yes/No
  - Success message: "Herb batch uploaded (XX% confidence). QR: ..."
  - Form clears (herb name, farmer ID, image, location)
  - "View Dashboard" link appears

- [ ] **After Submission (Failed)**:
  - Confidence < 70%
  - Shows: "AI verification failed (XX% confidence). Batch saved as unverified."
  - Prediction preview still shows
  - Form does not clear
  - Can try again with different image

### Navigation
- [ ] "Back to Home" link goes to /
- [ ] "View Dashboard" link goes to /dashboard
- [ ] After successful upload, can upload another herb

---

## ✅ Verify Flow Tests (`/verify`)

### Access Control
- [ ] Page accessible without login (public)
- [ ] No authentication required

### QR Scanner
- [ ] **"Scan QR" button**:
  - Visible and clickable
  - Click → Camera permission request
  - Browser camera activates
  - Red scanning frame appears
  - Scan QR code
  - Auto-detects and verifies
  - Results display (see below)

- [ ] **"Upload QR" button**:
  - Click → File dialog opens
  - Select image with QR code
  - Auto-detects QR in image
  - Results display

### Manual Search
- [ ] **Text Input Field**:
  - Paste QR payload or Batch ID
  - Format: Text string from upload
  
- [ ] **"Verify" Button**:
  - During search: Shows spinner
  - After search: Results or error

### Verification Results

**If Record Found (Valid)**:
- [ ] Status badge: "Valid QR"
- [ ] Herb image displays
- [ ] Shows herb information:
  - Herb Name: (e.g., "Neem")
  - Origin: (Geolocation from upload)
  - AI Confidence: (e.g., "87%")
  - Blockchain Hash: (shows first 20 chars + "...")
  - Verification Date: (ISO date with time)
  - Status: "Verified" or "Unverified" badge

**If Record Not Found (Invalid)**:
- [ ] Status badge: "Invalid QR"
- [ ] Error message: "No record found"
- [ ] Can try different code

**If Malformed QR**:
- [ ] Shows error: "Invalid QR code format"
- [ ] Try uploading image with QR

### Navigation
- [ ] "Back to Home" link works
- [ ] "Upload New Herb" button links to /upload
- [ ] Can scan multiple QR codes sequentially

---

## 📊 Dashboard Tests (`/dashboard`)

### Access Control
- [ ] Requires authentication
- [ ] Redirects to /login if not authenticated
- [ ] Shows after successful login

### Content
- [ ] Page title: "Herb Records Dashboard"
- [ ] Shows statistics:
  - Total uploads count
  - Verified herbs count
  
- [ ] Table displays uploaded herbs:
  - Columns: ID, Herb Name, Farmer ID, Origin, Timestamp, Status
  - Shows all user's uploaded herbs
  - Sortable by columns (if implemented)

### Herb Records
- [ ] Each row shows:
  - Herb Name (clickable?)
  - Farmer ID
  - Origin (geolocation)
  - Upload timestamp
  - Verification status badge

### Navigation
- [ ] "Upload New Batch" button → /upload
- [ ] "Verify Herbs" button → /verify
- [ ] Can go back to home

---

## 💬 Chat Tests (`/chat`)

### Access Control
- [ ] Requires authentication
- [ ] Shows after login to /chat

### Chat Interface
- [ ] Message input field at bottom
- [ ] "Send" button or Enter key to submit
- [ ] Chat history visible above input
- [ ] User messages (blue, right-aligned)
- [ ] Bot messages (gray, left-aligned)

### Chat Functionality
Test these questions:

1. **"How do I upload herbs?"**
   - Should respond with upload instructions
   
2. **"What does AI verification do?"**
   - Should explain CNN model
   
3. **"How do I verify a QR code?"**
   - Should explain verification process
   
4. **"What is blockchain?"**
   - Should explain blockchain usage
   
5. **"Can I download my chat?"**
   - Should offer export option

### Chat Features
- [ ] **Auto-suggestions**: Quick reply buttons appear
- [ ] **Export Chat**: Click "Export" button
  - Downloads .txt file
  - Contains all messages
  
- [ ] **Clear Chat**: Click "Clear" button
  - Clears conversation
  - Asks for confirmation
  
- [ ] **Message Count**: Shows user name and message count
- [ ] **Persistent Storage**: Chat saved to localStorage
  - Refresh page
  - Chat history persists

### Performance
- [ ] Responses appear in <3 seconds
- [ ] No console errors
- [ ] Chat doesn't lag while typing

---

## 🎨 UI/UX Tests

### Theme Toggle (Top-right)
- [ ] Dark mode button/icon visible
- [ ] Click toggles dark/light mode
- [ ] All pages support both themes
- [ ] Theme persists on refresh
- [ ] Text readable in both modes
- [ ] Colors contrast well (WCAG AA)

### Language Switcher (Top-right)
- [ ] Language icon visible
- [ ] Click shows language options
- [ ] Select language changes UI text
- [ ] Multiple languages available:
  - English
  - Spanish (if configured)
  - French (if configured)
- [ ] Language preference persists

### Navigation
- [ ] All internal links work
- [ ] No broken links
- [ ] Back buttons work correctly
- [ ] Browser back button works
- [ ] Logo navigates to home

### Responsive Design
**Mobile (375px - iPhone SE)**:
- [ ] Layout stacks vertically
- [ ] Text is readable
- [ ] Buttons are tappable (>44px)
- [ ] Forms are usable
- [ ] Images scale down

**Tablet (768px - iPad)**:
- [ ] Content centered
- [ ] Two-column layout works
- [ ] All features accessible

**Desktop (1280px+)**:
- [ ] Full width layout
- [ ] Side-by-side forms
- [ ] All features visible

### Animations
- [ ] Page transitions smooth (Framer Motion)
- [ ] Button hover effects visible
- [ ] Loading spinners animate
- [ ] No jank or stuttering

---

## 🔧 Backend API Tests

### Health Check
```bash
curl http://localhost:5000/api/health
```
Expected:
```json
{
  "ok": true,
  "service": "online",
  "storage": "connected",
  "llm": "configured"
}
```

### Predict Endpoint
```bash
curl -X POST http://localhost:5000/api/predict \
  -H "Authorization: Bearer <token>" \
  -F "image=@herb_image.jpg"
```
Expected response: CNN prediction

### Verify Endpoint
```bash
curl -X POST http://localhost:5000/api/verify \
  -H "Content-Type: application/json" \
  -d '{"code": "qr_payload"}'
```
Expected: Herb record or error

---

## 🧠 ML Service Tests

### Health Check
```bash
curl http://localhost:5001/health
```
Expected:
```json
{
  "ok": true,
  "modelLoaded": true,
  "modelVersion": "herbal_auth_improved",
  "classes": 5,
  "classNames": ["Amla", "Guava", "Neem", "Tulsi", "Hibiscus"]
}
```

### Prediction Test
Test with sample herb images:
- [ ] Amla image → Predicts "Amla" with high confidence (>80%)
- [ ] Guava image → Predicts "Guava" with high confidence
- [ ] Neem image → Predicts "Neem" with high confidence
- [ ] Tulsi image → Predicts "Tulsi" with high confidence
- [ ] Hibiscus image → Predicts "Hibiscus" with high confidence
- [ ] Unknown plant → Predicts with <70% confidence (unverified)

---

## 📱 Browser Console Tests

Open DevTools (F12) and check:

### Console Tab
- [ ] No red error messages
- [ ] Warnings are acceptable
- [ ] No "undefined" errors
- [ ] Network requests show in Network tab

### Network Tab
- [ ] All API calls return 200/201 status
- [ ] No 404/500 errors
- [ ] Response times <1 second
- [ ] Image uploads complete successfully

### Application Tab
- [ ] localStorage persists:
  - `ayurauth-token` (JWT)
  - `ayurauth-user` (user data)
  - Chat history (per email)

---

## 🚀 Performance Tests

| Operation | Target | Status |
|-----------|--------|--------|
| Page load time | <2s | ✓/✗ |
| API response time | <1s | ✓/✗ |
| Image upload | <5s | ✓/✗ |
| CNN prediction | <5s | ✓/✗ |
| QR scan/verify | <2s | ✓/✗ |
| Chat response | <3s | ✓/✗ |
| Theme toggle | <100ms | ✓/✗ |

---

## ⚠️ Error Handling Tests

- [ ] Submit empty form → Shows validation errors
- [ ] Upload non-image file → Shows error
- [ ] Disconnect internet → Shows offline message
- [ ] Invalid login → Shows "Invalid credentials"
- [ ] Non-existent QR code → Shows "No record found"
- [ ] Expired token → Redirects to /login

---

## ✨ End-to-End Flow Tests

### Complete Flow 1: Upload & Verify (New User)
```
1. Land on homepage (/)
2. Click "Upload Herb"
3. Redirected to /login
4. Login with demo credentials
5. Navigate to /upload
6. Select herb image
7. Enter herb name and farmer ID
8. Get geolocation
9. Submit
10. See CNN result (confidence %)
11. See "QR: ..." message
12. Click "View Dashboard"
13. See herb record in list
14. Go back to /verify
15. Enter QR payload
16. See verification result
17. Check herb details match
```

### Complete Flow 2: Farmer Dashboard
```
1. Login to account
2. Go to /dashboard
3. See all uploaded herbs
4. Statistics show upload count
5. Each herb shows status
6. Click "Upload New Batch"
7. Upload another herb
8. Dashboard updates
9. Can filter or sort (if implemented)
```

### Complete Flow 3: Consumer Verification
```
1. Land on homepage (/)
2. Click "Verify QR"
3. Go to /verify (no login needed)
4. Click "Scan QR"
5. Allow camera access
6. Scan QR code
7. Results display immediately
8. See herb details
9. Check "Verified" badge
10. Go back and verify another
```

---

## 📋 Test Results Summary

**Date**: _________  
**Tester**: _________  
**Environment**: Windows 11 | Chrome | Localhost

| Category | Total | Passed | Failed | Notes |
|----------|-------|--------|--------|-------|
| Landing | 12 | _ | _ | |
| Auth | 10 | _ | _ | |
| Upload | 20 | _ | _ | |
| Verify | 15 | _ | _ | |
| Dashboard | 10 | _ | _ | |
| Chat | 10 | _ | _ | |
| UI/UX | 20 | _ | _ | |
| API | 6 | _ | _ | |
| ML Service | 8 | _ | _ | |
| **TOTAL** | **111** | **_** | **_** | |

---

## 🎯 Sign-off

- **All Tests Passed**: ☐
- **Critical Issues Found**: ☐
- **Ready for Deployment**: ☐
- **Notes**: _________________________________

**Signed**: _________________ **Date**: _________

