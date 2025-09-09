#!/bin/bash

# deploy.sh - Render Deployment Script for Accident Detection API
# This script ensures proper deployment with optimized settings

echo "🚀 RENDER DEPLOYMENT SCRIPT - Accident Detection API v2.3.0"
echo "================================================================="

# Set environment variables for Render
export ENVIRONMENT=production
export RENDER=true
export PYTHONPATH="${PYTHONPATH}:."

# Check Python version
echo "🐍 Checking Python version..."
python --version
if [ $? -ne 0 ]; then
    echo "❌ Python not found!"
    exit 1
fi

# Check if we're on Render
if [ -n "$RENDER" ]; then
    echo "🏗️  Detected Render environment"
    echo "📍 Service URL: $RENDER_EXTERNAL_URL"
    echo "📍 Internal URL: $RENDER_INTERNAL_URL"
    
    # Render-specific optimizations
    export WORKER_TIMEOUT=300
    export MAX_PREDICTION_TIME=25
    export THREAD_POOL_SIZE=2
    export WEBSOCKET_TIMEOUT=60
fi

# Create necessary directories
echo "📁 Creating required directories..."
mkdir -p logs
mkdir -p snapshots
mkdir -p models

# Set proper permissions
chmod 755 logs snapshots models

# Check if main.py exists
if [ ! -f "main.py" ]; then
    echo "❌ main.py not found!"
    exit 1
fi

echo "✅ main.py found"

# Check if gunicorn config exists
if [ ! -f "gunicorn.conf.py" ]; then
    echo "⚠️  gunicorn.conf.py not found - using default settings"
    GUNICORN_CONFIG=""
else
    echo "✅ gunicorn.conf.py found"
    GUNICORN_CONFIG="-c gunicorn.conf.py"
fi

# Install dependencies if requirements.txt exists
if [ -f "requirements.txt" ]; then
    echo "📦 Installing dependencies..."
    pip install -r requirements.txt
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install dependencies!"
        exit 1
    fi
    echo "✅ Dependencies installed"
else
    echo "⚠️  No requirements.txt found"
fi

# Check for ML model
if [ -d "models" ]; then
    MODEL_COUNT=$(find models -name "*.keras" -o -name "*.h5" -o -name "*.pkl" | wc -l)
    echo "🤖 Found $MODEL_COUNT model file(s) in models directory"
    if [ $MODEL_COUNT -eq 0 ]; then
        echo "⚠️  No ML model files found - will use mock predictions"
    fi
else
    echo "⚠️  Models directory not found - will use mock predictions"
fi

# Database initialization
echo "🗄️  Initializing database..."
python -c "
from main import Base, engine
try:
    Base.metadata.create_all(bind=engine)
    print('✅ Database tables created successfully')
except Exception as e:
    print(f'❌ Database initialization failed: {str(e)}')
    exit(1)
"

# Test import of main application
echo "🧪 Testing application import..."
python -c "
try:
    from main import app
    print('✅ Application import successful')
except Exception as e:
    print(f'❌ Application import failed: {str(e)}')
    exit(1)
"

# Set optimal worker settings for Render
if [ -n "$RENDER" ]; then
    # Render-specific settings
    WORKERS=1
    TIMEOUT=300
    WORKER_CLASS="uvicorn.workers.UvicornWorker"
    BIND="0.0.0.0:${PORT:-8000}"
    
    echo "⚡ Render-Optimized Settings:"
    echo "   👥 Workers: $WORKERS"
    echo "   ⏰ Timeout: $TIMEOUT seconds"
    echo "   🔌 Bind: $BIND"
    echo "   🏗️  Worker Class: $WORKER_CLASS"
else
    # Local development settings
    WORKERS=1
    TIMEOUT=120
    WORKER_CLASS="uvicorn.workers.UvicornWorker"
    BIND="0.0.0.0:8000"
fi

# Health check before deployment
echo "🔍 Running health check..."
timeout 30 python -c "
import asyncio
import sys
sys.path.append('.')

async def health_check():
    try:
        from main import app
        # Basic health check
        print('✅ Application loads successfully')
        return True
    except Exception as e:
        print(f'❌ Health check failed: {str(e)}')
        return False

result = asyncio.run(health_check())
sys.exit(0 if result else 1)
"

if [ $? -ne 0 ]; then
    echo "❌ Health check failed - aborting deployment"
    exit 1
fi

echo "✅ Health check passed"

# Generate startup command
if [ -n "$GUNICORN_CONFIG" ]; then
    STARTUP_CMD="gunicorn $GUNICORN_CONFIG main:app"
else
    STARTUP_CMD="gunicorn -k uvicorn.workers.UvicornWorker -w $WORKERS --timeout $TIMEOUT --bind $BIND main:app"
fi

echo "🚀 Startup Command: $STARTUP_CMD"

# Create a startup script for Render
cat > start.sh << EOF
#!/bin/bash
# Auto-generated startup script for Render deployment

echo "🚀 Starting Render-Optimized Accident Detection API"
echo "=================================================="
echo "🕐 Timestamp: \$(date)"
echo "📍 Port: \${PORT:-8000}"
echo "🌍 Environment: \${ENVIRONMENT:-production}"
echo "=================================================="

# Set Python path
export PYTHONPATH="\${PYTHONPATH}:."

# Render environment variables
export RENDER=true
export ENVIRONMENT=production

# Performance optimizations
export WORKER_TIMEOUT=300
export MAX_PREDICTION_TIME=25
export THREAD_POOL_SIZE=2

# Create directories
mkdir -p logs snapshots models

# Run the application
exec $STARTUP_CMD
EOF

chmod +x start.sh

echo "✅ Created start.sh for Render deployment"

# Performance tuning suggestions
echo ""
echo "⚡ PERFORMANCE TUNING COMPLETED"
echo "================================"
echo "🔧 Optimizations applied:"
echo "   ✅ Extended worker timeout (300s)"
echo "   ✅ Reduced thread pool size (2 workers)"
echo "   ✅ Memory-efficient single worker"
echo "   ✅ Optimized database connections"
echo "   ✅ Enhanced error handling"
echo "   ✅ Rate-limited WebSocket processing"
echo ""

# Deployment instructions
echo "📋 DEPLOYMENT INSTRUCTIONS"
echo "=========================="
echo "1. Ensure all files are uploaded to your Render repository:"
echo "   - main.py (optimized backend)"
echo "   - gunicorn.conf.py (configuration)"
echo "   - requirements.txt (dependencies)"
echo "   - start.sh (startup script)"
echo ""
echo "2. In your Render dashboard, set the build command to:"
echo "   pip install -r requirements.txt"
echo ""
echo "3. Set the start command to:"
echo "   ./start.sh"
echo ""
echo "4. Set environment variables (optional):"
echo "   ENVIRONMENT=production"
echo "   SECRET_KEY=your-secret-key"
echo "   ALLOWED_ORIGINS=https://your-frontend-domain.com"
echo ""

# Final verification
echo "🔍 FINAL VERIFICATION"
echo "===================="

# Check critical files
CRITICAL_FILES=("main.py" "start.sh")
for file in "${CRITICAL_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file exists"
    else
        echo "❌ $file missing"
        exit 1
    fi
done

# Check permissions
if [ -x "start.sh" ]; then
    echo "✅ start.sh is executable"
else
    echo "❌ start.sh is not executable"
    chmod +x start.sh
    echo "✅ Fixed start.sh permissions"
fi

echo ""
echo "🎉 DEPLOYMENT PREPARATION COMPLETE!"
echo "=================================="
echo "Your application is ready for Render deployment."
echo ""
echo "🚀 Next steps:"
echo "1. Push these files to your Git repository"
echo "2. Connect the repository to Render"
echo "3. Use './start.sh' as your start command"
echo "4. Monitor the deployment logs for any issues"
echo ""
echo "📊 Expected improvements:"
echo "   ✅ No more worker timeout errors"
echo "   ✅ Better memory management"
echo "   ✅ Improved stability"
echo "   ✅ Enhanced performance monitoring"
echo ""
echo "🆘 If you encounter issues:"
echo "   - Check Render logs for specific errors"
echo "   - Verify all dependencies are installed"
echo "   - Ensure environment variables are set correctly"
echo "   - Monitor memory usage in Render dashboard"
echo ""
echo "================================================================="
echo "🏁 Render Deployment Script Completed Successfully!"
echo "================================================================="
