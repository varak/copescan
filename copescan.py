#!/usr/bin/env python3
import cv2
import pytesseract
import requests
import re
import os
from dotenv import load_dotenv
from PIL import Image
import numpy as np

load_dotenv()

class CopeScanner:
    def __init__(self):
        self.username = "mike@emke.com"
        self.password = os.getenv("PASSWORD")
        self.session = requests.Session()
        
    def capture_photo(self):
        """Capture photo from camera"""
        print("Starting camera...")
        cap = cv2.VideoCapture(0)
        
        if not cap.isOpened():
            print("Error: Could not open camera")
            return None
            
        print("Camera ready! Press SPACE to capture photo or ESC to exit")
        
        while True:
            ret, frame = cap.read()
            if not ret:
                break
                
            cv2.imshow('Copenhagen Scanner - Press SPACE to capture', frame)
            key = cv2.waitKey(1) & 0xFF
            
            if key == 32:  # SPACE key
                captured_frame = frame.copy()
                cap.release()
                cv2.destroyAllWindows()
                return captured_frame
            elif key == 27:  # ESC key
                break
                
        cap.release()
        cv2.destroyAllWindows()
        return None
    
    def preprocess_image(self, image):
        """Preprocess image for better OCR"""
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Apply Gaussian blur to reduce noise
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        
        # Apply adaptive threshold
        thresh = cv2.adaptiveThreshold(blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
                                     cv2.THRESH_BINARY, 11, 2)
        
        # Morphological operations to clean up
        kernel = np.ones((2,2), np.uint8)
        cleaned = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel)
        
        return cleaned
    
    def extract_code(self, image):
        """Extract code from image using OCR"""
        processed_img = self.preprocess_image(image)
        
        # Convert back to PIL Image for pytesseract
        pil_img = Image.fromarray(processed_img)
        
        # Extract text
        text = pytesseract.image_to_string(pil_img, config='--psm 6 -c tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789')
        
        # Look for alphanumeric codes (adjust pattern as needed)
        codes = re.findall(r'[A-Z0-9]{6,}', text.upper())
        
        if codes:
            print(f"Detected codes: {codes}")
            return codes[0]  # Return first detected code
        else:
            print("No codes detected in image")
            return None
    
    def submit_code(self, code):
        """Submit code to Fresh Cope website"""
        try:
            # First, get the login page to establish session
            login_url = "https://www.freshcope.com/rewards/earn"
            response = self.session.get(login_url)
            
            if response.status_code != 200:
                print(f"Error accessing login page: {response.status_code}")
                return False
            
            # Login data
            login_data = {
                'username': self.username,
                'password': self.password,
                'code': code
            }
            
            # Submit the form
            submit_response = self.session.post(login_url, data=login_data)
            
            if submit_response.status_code == 200:
                print(f"Code {code} submitted successfully!")
                return True
            else:
                print(f"Error submitting code: {submit_response.status_code}")
                return False
                
        except Exception as e:
            print(f"Error submitting code: {e}")
            return False
    
    def run(self):
        """Main application loop"""
        print("Copenhagen Rewards Scanner")
        print("=" * 30)
        
        while True:
            print("\n1. Capture and scan Copenhagen wrapper")
            print("2. Exit")
            choice = input("Choose option (1-2): ")
            
            if choice == '1':
                # Capture photo
                image = self.capture_photo()
                if image is None:
                    continue
                
                # Save captured image for debugging
                cv2.imwrite('captured_wrapper.jpg', image)
                print("Image saved as 'captured_wrapper.jpg'")
                
                # Extract code
                code = self.extract_code(image)
                if code:
                    print(f"Extracted code: {code}")
                    
                    # Confirm submission
                    confirm = input(f"Submit code '{code}' to Fresh Cope? (y/n): ")
                    if confirm.lower() == 'y':
                        self.submit_code(code)
                    else:
                        print("Code not submitted")
                else:
                    print("No code found. Try capturing again with better lighting.")
                    
            elif choice == '2':
                print("Goodbye!")
                break
            else:
                print("Invalid choice")

if __name__ == "__main__":
    scanner = CopeScanner()
    scanner.run()