#!/bin/bash

# Install system packages
sudo apt update
sudo apt install -y tesseract-ocr python3-venv python3-pip

# Create virtual environment
python3 -m venv venv

# Activate virtual environment and install packages
source venv/bin/activate
pip install -r requirements.txt

echo "Setup complete! To run the app:"
echo "source venv/bin/activate"
echo "python copescan.py"