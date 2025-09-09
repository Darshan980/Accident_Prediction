# gunicorn.conf.py - Render Optimized Configuration for Accident Detection API

import os
import multiprocessing

# Server socket
bind = f"0.0.0.0:{os.getenv('PORT', 8000)}"
backlog = 2048

# Worker processes - Optimized for Render's memory constraints
workers = 1  # Single worker for memory efficiency on Render
worker_class = "uvicorn.workers.UvicornWorker"
worker_connections = 1000
max_requests = 1000  # Restart workers after 1000 requests to prevent memory leaks
max_requests_jitter = 100  # Add randomness to prevent all workers restarting at once

# Worker timeouts - CRITICAL FOR FIXING TIMEOUT ISSUES
timeout = 300  # 5 minutes - matches our WORKER_TIMEOUT in main.py
keepalive = 30  # Keep connections alive for 30 seconds
graceful_timeout = 60  # Give workers 60 seconds to finish requests during shutdown

# Memory and performance optimizations
preload_app = True  # Load application before forking workers (saves memory)
max_worker_memory = 512 * 1024 * 1024  # 512MB per worker (Render limit consideration)

# Logging configuration
accesslog = "-"  # Log to stdout
errorlog = "-"   # Log errors to stdout
loglevel = "info"
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s" %(D)s'

# Process naming
proc_name = "accident-detection-api"

# Security
limit_request_line = 8192  # Limit request line size
limit_request_fields = 100  # Limit number of headers
limit_request_field_size = 8192  # Limit header size

# SSL (if needed in production)
keyfile = None
certfile = None

# Monitoring and health checks
# Enable stats if you need monitoring
# statsd_host = None
# statsd_prefix = None

# Worker lifecycle hooks
def on_starting(server):
    """Called just before the master process is initialized."""
    server.log.info("🚀 Starting Render-Optimized Accident Detection API")
    server.log.info("⚡ Performance Configuration:")
    server.log.info(f"   👥 Workers: {workers}")
    server.log.info(f"   ⏰ Timeout: {timeout}s")
    server.log.info(f"   🔌 Connections: {worker_connections}")
    server.log.info(f"   🔄 Max Requests: {max_requests}")
    server.log.info(f"   💾 Max Memory: {max_worker_memory // (1024*1024)}MB per worker")

def on_reload(server):
    """Called to recycle workers during a reload via SIGHUP."""
    server.log.info("🔄 Reloading workers...")

def when_ready(server):
    """Called just after the server is started."""
    server.log.info("✅ Server is ready to accept connections")
    server.log.info(f"📍 Listening on: {bind}")
    server.log.info("🌐 CORS configured for cross-origin requests")

def worker_int(worker):
    """Called just after a worker exited on SIGINT or SIGQUIT."""
    worker.log.info(f"🛑 Worker {worker.pid} received interrupt signal")

def pre_fork(server, worker):
    """Called just before a worker is forked."""
    server.log.info(f"🍴 About to fork worker {worker.age}")

def post_fork(server, worker):
    """Called just after a worker has been forked."""
    server.log.info(f"✨ Worker {worker.pid} spawned")

def post_worker_init(worker):
    """Called just after a worker has initialized the application."""
    worker.log.info(f"🎯 Worker {worker.pid} initialized and ready")

def worker_abort(worker):
    """Called when a worker received the SIGABRT signal."""
    worker.log.error(f"💥 Worker {worker.pid} aborted")

def pre_exec(server):
    """Called just before a new master process is forked."""
    server.log.info("🔄 About to exec new master process")

def pre_request(worker, req):
    """Called just before a worker processes the request."""
    # Only log for important endpoints to reduce noise
    if any(endpoint in req.path for endpoint in ['/api/live/ws', '/api/upload', '/api/health']):
        worker.log.debug(f"📥 Worker {worker.pid} processing: {req.method} {req.path}")

def post_request(worker, req, environ, resp):
    """Called after a worker processes the request."""
    # Log slow requests (over 5 seconds)
    if hasattr(req, 'start_time'):
        duration = time.time() - req.start_time
        if duration > 5.0:
            worker.log.warning(f"🐌 Slow request: {req.method} {req.path} took {duration:.2f}s")

def child_exit(server, worker):
    """Called just after a worker has been reaped."""
    server.log.info(f"👋 Worker {worker.pid} exited")

def worker_exit(server, worker):
    """Called just after a worker has been reaped."""
    server.log.info(f"🚪 Worker {worker.pid} exit")

def nworkers_changed(server, new_value, old_value):
    """Called just after num_workers has been changed."""
    server.log.info(f"👥 Number of workers changed from {old_value} to {new_value}")

def on_exit(server):
    """Called just before exiting."""
    server.log.info("👋 Shutting down Render-Optimized Accident Detection API")
    server.log.info("✅ Graceful shutdown completed")

# Environment-specific configurations
if os.getenv("ENVIRONMENT") == "development":
    # Development settings
    reload = True
    loglevel = "debug"
    workers = 1
    timeout = 60
elif os.getenv("ENVIRONMENT") == "production":
    # Production settings (Render)
    reload = False
    loglevel = "info"
    workers = 1  # Keep single worker for Render
    timeout = 300  # Long timeout for ML processing
    preload_app = True
    max_requests = 500  # More frequent worker recycling in production

# Render-specific optimizations
if os.getenv("RENDER"):
    # We're running on Render
    workers = 1  # Single worker for memory constraints
    timeout = 300  # Extended timeout for ML processing
    worker_connections = 500  # Reduced connections for stability
    max_requests = 200  # More aggressive worker recycling
    max_worker_memory = 400 * 1024 * 1024  # 400MB limit for Render
    
    # Additional Render optimizations
    worker_tmp_dir = "/dev/shm"  # Use shared memory for better performance
    
    print("🏗️  RENDER-SPECIFIC OPTIMIZATIONS ACTIVE")
    print(f"   👥 Workers: {workers} (memory optimized)")
    print(f"   ⏰ Timeout: {timeout}s (ML processing optimized)")
    print(f"   🔌 Connections: {worker_connections} (stability focused)")
    print(f"   🔄 Max Requests: {max_requests} (aggressive recycling)")
    print(f"   💾 Memory Limit: {max_worker_memory // (1024*1024)}MB per worker")

# Error handling for worker crashes
def worker_crashed(server, worker):
    """Called when a worker crashes."""
    server.log.error(f"💥 CRITICAL: Worker {worker.pid} crashed!")
    server.log.error("🔍 Check logs for segmentation faults or memory issues")
    server.log.error("🔄 Worker will be automatically restarted")

# Custom signal handling
import signal
import time

def handle_timeout(signum, frame):
    """Handle timeout signals more gracefully"""
    print(f"⚠️  TIMEOUT WARNING: Worker may be processing a long-running ML prediction")
    print(f"🔍 This is normal for accident detection ML inference")
    print(f"⏳ Configured timeout: {timeout}s")

# Install custom signal handler
signal.signal(signal.SIGALRM, handle_timeout)

# Health check configuration for monitoring
def health_check():
    """Simple health check function that can be used by monitoring systems"""
    return {
        "status": "healthy",
        "workers": workers,
        "timeout": timeout,
        "render_optimized": True,
        "timestamp": time.time()
    }

# Configuration validation
def validate_config():
    """Validate the configuration settings"""
    issues = []
    
    if timeout < 60:
        issues.append("⚠️  Timeout too low for ML processing")
    
    if workers > 2 and os.getenv("RENDER"):
        issues.append("⚠️  Too many workers for Render memory constraints")
    
    if worker_connections > 1000 and os.getenv("RENDER"):
        issues.append("⚠️  Too many connections for Render")
    
    if issues:
        print("🚨 CONFIGURATION WARNINGS:")
        for issue in issues:
            print(f"   {issue}")
    else:
        print("✅ Configuration validation passed")

# Run validation
validate_config()

# Additional notes for debugging
print("=" * 60)
print("🔧 GUNICORN CONFIGURATION SUMMARY")
print("=" * 60)
print(f"📍 Bind: {bind}")
print(f"👥 Workers: {workers}")
print(f"🔌 Worker Class: {worker_class}")
print(f"⏰ Timeout: {timeout}s")
print(f"🤝 Keepalive: {keepalive}s")
print(f"🔄 Max Requests: {max_requests}")
print(f"💾 Max Memory: {max_worker_memory // (1024*1024) if max_worker_memory else 'unlimited'}MB")
print(f"📊 Preload App: {preload_app}")
print(f"🔍 Log Level: {loglevel}")
print("=" * 60)
print("   ✅ Extended timeout for ML processing")
print("   ✅ Memory-efficient single worker")
print("   ✅ Aggressive worker recycling")
print("   ✅ Optimized connection limits")
print("   ✅ Enhanced error handling")
print("   ✅ Preloaded application")
print("=" * 60)

# Final configuration check
if __name__ == "__main__":
    print("🧪 Configuration test mode")
    print("This file should be used with: gunicorn -c gunicorn.conf.py main:app")
    health = health_check()
    print(f"Health check: {health}")
