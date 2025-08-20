# CopeScan - Copenhagen Tobacco Code Scanner

CopeScan is a React Native mobile app that automatically scans Copenhagen Tobacco reward codes using ML Kit OCR and submits them to Fresh Cope's rewards system. The app includes a **DevShare** revenue model where every 10th submission goes to the app developer.

## 🎯 Features

- **OCR Code Scanning**: Uses ML Kit to automatically detect Copenhagen tobacco codes from camera or photo gallery
- **Batch Processing**: Queue multiple codes and submit them all at once with natural timing delays
- **DevShare Revenue Model**: Every 10th code submission goes to app developer as payment for creating the app
- **Account Management**: Remote credential system with automatic rotation for scaling beyond 30 submissions/month
- **Graceful Degradation**: Falls back to default credentials if server is unreachable
- **Version Display**: Shows current app version in settings
- **Natural Timing**: 500ms delays between submissions to avoid automation detection

## 📱 Installation

1. Download the APK from: https://ufobeep.com/copescan
2. Enable "Install unknown apps" for your browser in Android Settings
3. Install the APK
4. Grant camera permissions when prompted

## 🏗️ Architecture

### Mobile App
- **Framework**: React Native with Expo
- **OCR**: Google ML Kit Vision API
- **Storage**: AsyncStorage for persistent data
- **Platform**: Android (iOS support planned)

### Backend Infrastructure
- **API Server**: FastAPI running on UFOBeep server
- **Endpoints**:
  - `GET /copescan/devshare-config` - Returns current DevShare account credentials
  - `POST /copescan/devshare-config` - Updates DevShare configuration
  - `GET /copescan/devshare-status` - System status and monitoring
- **Account Management**: Python script for credential rotation and monitoring

### DevShare System
- **Remote Credentials**: Fetched from API every 10th submission with 1-hour caching
- **Account Rotation**: Automatic switching between multiple accounts when limits are reached
- **Fallback**: Uses default credentials if API is unreachable
- **Monitoring**: Status tracking and submission counting

## 🔧 Development Setup

### Prerequisites
- Node.js 18+
- React Native development environment
- Android Studio (for Android development)
- Expo CLI

### Local Development
```bash
cd mobile
npm install
npx expo start
```

### Building APK
```bash
# Development build
npx expo build:android

# Production build
npm run build:android
```

## 🚀 Deployment

### Mobile App
1. Build APK: `npm run build:android`
2. Upload to server: `scp -P322 copescan.apk ufobeep@ufobeep.com:/home/ufobeep/ufobeep/web/public/downloads/`
3. Update website download link

### API Updates
```bash
# Deploy API changes
git push origin main
ssh -p 322 ufobeep@ufobeep.com "cd /home/ufobeep/ufobeep && git pull origin main"
ssh -p 322 ufobeep@ufobeep.com "sudo systemctl restart ufobeep-api"
```

### Website Updates
```bash
# Deploy website changes
ssh -p 322 ufobeep@ufobeep.com "cd /home/ufobeep/ufobeep/web && npm run build && pm2 restart all"
```

## 🔐 Account Management

The DevShare system uses a sophisticated account management system to handle multiple Copenhagen accounts:

### Adding Accounts
```bash
python manage-copescan-accounts.py add-account --username user@example.com --password mypass --name "Account 1"
```

### Listing Accounts
```bash
python manage-copescan-accounts.py list-accounts
```

### Manual Rotation
```bash
python manage-copescan-accounts.py rotate
```

### System Status
```bash
python manage-copescan-accounts.py status
```

### Account Data Structure
```json
{
  "accounts": [
    {
      "name": "Account 1",
      "username": "user@example.com", 
      "password": "securepass123",
      "created": "2025-01-15T10:30:00Z",
      "submissions_this_month": 15,
      "last_used": "2025-01-20T14:22:00Z",
      "status": "active"
    }
  ]
}
```

## 📊 How DevShare Works

1. **User scans codes** with the CopeScan app
2. **First 9 submissions** go to user's Copenhagen account
3. **10th submission** automatically goes to app developer's account
4. **Process repeats** - next 9 to user, 10th to developer
5. **Account rotation** happens automatically when monthly limits are reached
6. **Revenue scales** based on app usage across all users

## 🔄 System Flow

```
User scans code → App OCRs text → Validates format → Adds to queue
                                                    ↓
Queue submission → Check if 10th → Fetch DevShare credentials (if 10th)
                                                    ↓  
Submit to Fresh Cope → Add delay → Process next code → Update counters
```

## 📁 File Structure

```
/home/mike/D/copescan/
├── mobile/                     # React Native app
│   ├── App.js                 # Main application logic
│   ├── app.json               # Expo configuration
│   └── package.json           # Dependencies
├── README.md                   # This file
└── builds/                     # Generated APK files

/home/mike/D/ufobeep/           # Backend infrastructure
├── api/app/routers/copescan.py # DevShare API endpoints
├── api/scripts/manage-copescan-accounts.py # Account management
└── web/src/app/copescan/page.tsx # Landing page
```

## 🐛 Troubleshooting

### App Issues
- **OCR not working**: Check camera permissions
- **Codes not submitting**: Verify internet connection and Fresh Cope website status
- **App crashes**: Check Android version compatibility (6.0+ required)

### Server Issues
- **API unreachable**: App will use fallback credentials
- **Account rotation failing**: Check account management script logs
- **Submission failures**: Verify Fresh Cope website changes

### Common Fixes
```bash
# Restart API service
ssh -p 322 ufobeep@ufobeep.com "sudo systemctl restart ufobeep-api"

# Check API status
curl https://api.ufobeep.com/copescan/devshare-status

# Verify account status
python manage-copescan-accounts.py status
```

## 📈 Monitoring

### Key Metrics
- Total app downloads
- Daily active users
- Codes scanned per day
- DevShare revenue (codes submitted to developer accounts)
- Account rotation frequency
- API response times

### Log Locations
- API logs: `/var/log/ufobeep-api.log`
- Account management: Console output
- Mobile app: Expo/React Native debugging tools

## 🚀 Future Enhancements

- **iOS Support**: Port to iOS with similar ML Kit integration
- **Multiple Tobacco Brands**: Support for other tobacco reward programs
- **Analytics Dashboard**: Real-time monitoring of DevShare revenue
- **User Accounts**: Optional user registration for personalized features
- **Referral System**: Additional revenue sharing for user referrals
- **Batch OCR**: Process multiple codes from single image

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature-name`
3. Make changes and test thoroughly
4. Commit with descriptive message
5. Push to feature branch: `git push origin feature-name`
6. Create pull request

## 📜 License

Copyright (c) 2025 UFOBeep. All rights reserved.

## 📞 Support

- Website: https://ufobeep.com/copescan
- Issues: Create GitHub issue in UFOBeep repository
- Email: Support available through UFOBeep contact form

---

## 📋 CopeScan Development Cheatsheet

### Quick Commands

#### Building & Deployment
```bash
# Build APK with correct Java version
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64 && cd /home/mike/D/copescan/mobile/android && ./gradlew assembleDebug

# Install to connected devices
adb devices
adb -s DEVICE_ID install -r /home/mike/D/copescan/mobile/android/app/build/outputs/apk/debug/app-debug.apk

# Check for DevShare endpoint in code
grep -n "devshare-config" /home/mike/D/copescan/mobile/App.js
```

#### API Management
```bash
# Check DevShare API status
curl https://api.ufobeep.com/copescan/devshare-status

# Test account management
cd /home/mike/D/ufobeep/api/scripts
python manage-copescan-accounts.py status
python manage-copescan-accounts.py list-accounts
```

#### Server Deployment
```bash
# Deploy API changes
ssh -p 322 ufobeep@ufobeep.com "cd /home/ufobeep/ufobeep && git pull origin main"
ssh -p 322 ufobeep@ufobeep.com "sudo systemctl restart ufobeep-api"

# Deploy website changes
ssh -p 322 ufobeep@ufobeep.com "cd /home/ufobeep/ufobeep/web && npm run build && pm2 restart all"
```

### Key Files & Locations

#### Mobile App
- **Main Logic**: `/home/mike/D/copescan/mobile/App.js`
- **Build Output**: `/home/mike/D/copescan/mobile/android/app/build/outputs/apk/debug/app-debug.apk`
- **Config**: `/home/mike/D/copescan/mobile/app.json`

#### Backend API
- **DevShare Router**: `/home/mike/D/ufobeep/api/app/routers/copescan.py`
- **Account Management**: `/home/mike/D/ufobeep/api/scripts/manage-copescan-accounts.py`
- **Config File**: `/home/ufobeep/copescan-config.json` (production server)

#### Website
- **Landing Page**: `/home/mike/D/ufobeep/web/src/app/copescan/page.tsx`
- **Download URL**: https://ufobeep.com/copescan
- **APK Location**: `/home/ufobeep/ufobeep/web/public/downloads/copescan.apk`

### DevShare System

#### API Endpoints
- `GET /copescan/devshare-config` - Returns current account credentials
- `POST /copescan/devshare-config` - Updates account configuration  
- `GET /copescan/devshare-status` - System status and monitoring

#### How It Works
1. **User submissions 1-9**: Go to user's Copenhagen account
2. **10th submission**: Automatically uses DevShare account from API
3. **Credential caching**: 1-hour cache, falls back to defaults if API fails
4. **Account rotation**: Automatic when monthly limits reached (25+ submissions)

#### Troubleshooting
- **"Unable to load script"**: Build with Java 17 and install fresh APK
- **API unreachable**: App falls back to default credentials automatically
- **Build failures**: Ensure `JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64`
- **DevShare not working**: Verify endpoint URL contains `/devshare-config`

### Testing Workflow

#### Complete Test Cycle
1. Make code changes
2. Build with Java 17: `export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64`
3. Install APK: `adb -s DEVICE_ID install -r app-debug.apk`
4. Test DevShare functionality on 10th submission
5. Deploy API/website changes if needed

#### Validation Checklist
- ✅ App launches without "unable to load script" error
- ✅ OCR scanning works with ML Kit
- ✅ Code queue shows correct count
- ✅ Submissions work with 500ms delays
- ✅ 10th submission fetches DevShare credentials
- ✅ Version number displays in settings
- ✅ Graceful degradation if API unreachable

### Production Deployment

#### Upload APK to Server
```bash
scp -P322 /home/mike/D/copescan/mobile/android/app/build/outputs/apk/debug/app-debug.apk ufobeep@ufobeep.com:/home/ufobeep/ufobeep/web/public/downloads/copescan.apk
```

#### Update Download Page
Website automatically serves from `/public/downloads/copescan.apk`

---

**CopeScan** - Copenhagen tobacco code scanner with DevShare revenue model.