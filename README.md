# Copenhagen Rewards Scanner

An app that captures photos of Copenhagen can wrappers, extracts reward codes using OCR, and submits them to Fresh Cope rewards.

## Setup

1. Install Tesseract OCR:
   ```bash
   sudo apt install tesseract-ocr  # Ubuntu/Debian
   brew install tesseract          # macOS
   ```

2. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

## Usage

Run the app:
```bash
python copescan.py
```

1. Select option 1 to capture a photo
2. Point camera at Copenhagen wrapper with code visible
3. Press SPACE to capture, ESC to cancel
4. App will extract the code and ask for confirmation
5. Code gets submitted to Fresh Cope rewards automatically

## OCR Technology

Uses Tesseract OCR (free, open-source) for text recognition from images.