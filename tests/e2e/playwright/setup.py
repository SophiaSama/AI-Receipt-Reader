"""
Setup script for Playwright E2E tests
Run this after installing Python dependencies
"""
import subprocess
import sys
from pathlib import Path


def main():
    print("=" * 60)
    print("  Playwright E2E Test Setup")
    print("=" * 60)
    
    # Check Python version
    print("\n▶ Checking Python version...")
    if sys.version_info < (3, 8):
        print("❌ Python 3.8+ required")
        sys.exit(1)
    print(f"✓ Python {sys.version_info.major}.{sys.version_info.minor}")
    
    # Create directories
    print("\n▶ Creating directories...")
    dirs = ["results", "results/videos", "results/screenshots", "results/traces", "fixtures"]
    for dir_name in dirs:
        Path(dir_name).mkdir(exist_ok=True)
    print("✓ Directories created")
    
    # Install dependencies
    print("\n▶ Installing Python dependencies...")
    try:
        subprocess.run([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"], check=True)
        print("✓ Dependencies installed")
    except subprocess.CalledProcessError:
        print("❌ Failed to install dependencies")
        sys.exit(1)
    
    # Install Playwright browsers
    print("\n▶ Installing Playwright browsers...")
    print("  (This may take a few minutes...)")
    try:
        subprocess.run([sys.executable, "-m", "playwright", "install", "--with-deps"], check=True)
        print("✓ Browsers installed")
    except subprocess.CalledProcessError:
        print("❌ Failed to install browsers")
        sys.exit(1)
    
    # Create .env from example
    print("\n▶ Setting up environment...")
    env_file = Path(".env")
    env_example = Path(".env.example")
    
    if not env_file.exists() and env_example.exists():
        env_file.write_text(env_example.read_text())
        print("✓ .env file created from .env.example")
    else:
        print("✓ .env file already exists")
    
    # Verify setup
    print("\n▶ Verifying setup...")
    try:
        result = subprocess.run([sys.executable, "-m", "pytest", "--version"], capture_output=True, text=True)
        print(f"✓ Pytest: {result.stdout.strip()}")
        
        result = subprocess.run([sys.executable, "-m", "playwright", "--version"], capture_output=True, text=True)
        print(f"✓ Playwright: {result.stdout.strip()}")
    except subprocess.CalledProcessError:
        print("⚠ Could not verify installation")
    
    print("\n" + "=" * 60)
    print("✓ Setup complete!")
    print("=" * 60)
    print("\nNext steps:")
    print("  1. Start your application: npm run dev")
    print("  2. Run tests: pytest")
    print("  3. See README.md for more options")
    print()


if __name__ == "__main__":
    main()
