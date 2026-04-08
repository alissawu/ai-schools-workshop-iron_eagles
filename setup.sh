#!/bin/bash
set -e

echo "Installing Node dependencies..."
npm install

echo ""
echo "Installing Python dependencies..."
cd companion
pip3 install -r requirements.txt
cd ..

echo ""
echo "✓ Setup complete! Run 'npm start' to start the app."
