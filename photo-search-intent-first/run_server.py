#!/usr/bin/env python3
"""
Server startup wrapper that prevents mutex blocking from heavy ML libraries.
"""

import os
import sys

# Set all threading environment variables before any imports
os.environ["TOKENIZERS_PARALLELISM"] = "false"
os.environ["OMP_NUM_THREADS"] = "1"
os.environ["MKL_NUM_THREADS"] = "1"
os.environ["OPENBLAS_NUM_THREADS"] = "1"
os.environ["VECLIB_MAXIMUM_THREADS"] = "1"
os.environ["NUMEXPR_NUM_THREADS"] = "1"
os.environ["TORCH_NUM_THREADS"] = "1"

# Disable CUDA to avoid GPU mutex issues on macOS
os.environ["CUDA_VISIBLE_DEVICES"] = ""

# Force single-threaded execution for PyTorch
os.environ["PYTORCH_JIT"] = "0"
os.environ["PYTORCH_DISABLE_JITERATOR"] = "1"

if __name__ == "__main__":
    # Import uvicorn and run the server
    import uvicorn
    
    # Default configuration
    host = sys.argv[1] if len(sys.argv) > 1 else "127.0.0.1"
    port = int(sys.argv[2]) if len(sys.argv) > 2 else 8000
    
    # Run the server with optimized settings for avoiding mutex blocking
    uvicorn.run(
        "api.server:app",
        host=host,
        port=port,
        reload=False,
        log_level="info",
        workers=1,  # Single worker to avoid multi-process mutex issues
        loop="asyncio",
        access_log=True
    )