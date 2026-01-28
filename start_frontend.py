#!/usr/bin/env python3
"""
RetailMind Frontend Startup Script
Starts the React development server
"""

import os
import sys
import subprocess
from pathlib import Path

def main():
    # Change to frontend directory
    frontend_dir = Path(__file__).parent / "frontend"
    os.chdir(frontend_dir)
    
    print("🚀 Starting RetailMind Frontend Server...")
    print("📍 Frontend directory:", frontend_dir)
    print("🌐 Frontend will be available at: http://localhost:3000")
    print("🔗 Make sure backend is running at: http://localhost:8000")
    print("\n" + "="*50)
    
    # Check if node_modules exists
    if not (frontend_dir / "node_modules").exists():
        print("📦 Installing dependencies...")
        try:
            subprocess.run(["npm", "install"], check=True)
        except subprocess.CalledProcessError as e:
            print(f"❌ Failed to install dependencies: {e}")
            sys.exit(1)
    
    try:
        # Start the development server
        subprocess.run(["npm", "start"], check=True)
    except KeyboardInterrupt:
        print("\n🛑 Frontend server stopped by user")
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to start frontend server: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()