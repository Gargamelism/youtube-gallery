#!/usr/bin/env python3
import subprocess
import sys
import os
from pathlib import Path

def run_command(command, check=True):
    """Run a command and return its output"""
    try:
        # If command is a string, split it into a list
        if isinstance(command, str):
            command = command.split()
        
        result = subprocess.run(
            command,
            check=check,
            capture_output=True,
            text=True,
            shell=False  # Don't use shell when passing command lists
        )
        if result.stdout:
            print(result.stdout)
        if result.stderr:
            print(result.stderr, file=sys.stderr)
        return result.returncode == 0
    except subprocess.CalledProcessError as e:
        print(f"Command failed with exit code {e.returncode}", file=sys.stderr)
        print(e.stderr, file=sys.stderr)
        return False

def main():
    # Ensure we're in the project root directory
    project_root = Path(__file__).parent
    os.chdir(project_root)

    print("[INFO] Running pre-build tests...")
    
    # Build test image
    if not run_command(['docker', 'compose', 'build', 'backend_test']):
        print("[ERROR] Failed to build test image!")
        sys.exit(1)

    # Run tests with detailed output
    test_command = 'cd /app && python -m pytest videos/tests/test_000_pre_startup.py -vv --tb=short --no-header --show-capture=all'
    result = subprocess.run(
        ['docker', 'compose', 'run', '--rm', '--no-deps', 'backend_test', 'sh', '-c', test_command],
        capture_output=True,
        text=True
    )
    
    # Always show test output
    if result.stdout:
        print("\n[TEST OUTPUT]")
        print(result.stdout)
    if result.stderr:
        print("\n[TEST ERRORS]")
        print(result.stderr)
        
    if result.returncode != 0:
        print("[ERROR] Tests failed! Build aborted.")
        sys.exit(1)
    
    print("[INFO] Tests passed! Building production image...")
    
    # Build production image
    if not run_command(['docker', 'compose', 'build', 'backend']):
        print("[ERROR] Production build failed!")
        sys.exit(1)

    print("[INFO] Build completed successfully!")
    return 0

if __name__ == "__main__":
    sys.exit(main())
