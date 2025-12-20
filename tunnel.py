#!/usr/bin/env python3
"""
SSH Tunnel Manager for YouTube Gallery Development

This script creates SSH tunnels to access remote Docker services as if they were local.
Supports starting, stopping, and checking tunnel status.

Usage:
    python tunnel.py start   - Start SSH tunnels
    python tunnel.py stop    - Stop all SSH tunnels
    python tunnel.py status  - Check tunnel status
    python tunnel.py restart - Restart SSH tunnels

Configuration:
    Edit the values below or pass as environment variables:
    TUNNEL_USER, TUNNEL_HOST, TUNNEL_FRONTEND_PORT, TUNNEL_BACKEND_PORT
"""

import subprocess
import sys
import os

# Configuration - can be overridden with environment variables
REMOTE_USER = os.getenv("TUNNEL_USER", "gargamel")
REMOTE_HOST = os.getenv("TUNNEL_HOST", "10.0.0.11")
FRONTEND_PORT = int(os.getenv("TUNNEL_FRONTEND_PORT", "3000"))
BACKEND_PORT = int(os.getenv("TUNNEL_BACKEND_PORT", "8000"))

# Colors for terminal output
class Colors:
    GREEN = '\033[0;32m'
    YELLOW = '\033[1;33m'
    RED = '\033[0;31m'
    BLUE = '\033[0;34m'
    NC = '\033[0m'  # No Color


def print_color(message: str, color: str = Colors.NC) -> None:
    """Print colored message to terminal"""
    print(f"{color}{message}{Colors.NC}")


def get_tunnel_processes() -> list[str]:
    """Get list of running SSH tunnel process IDs"""
    try:
        # Find SSH processes that match our tunnel pattern
        # Look for SSH processes with our specific port forwarding
        result = subprocess.run(
            ["pgrep", "-f", f"{FRONTEND_PORT}:localhost:{FRONTEND_PORT}.*{REMOTE_HOST}"],
            capture_output=True,
            text=True
        )
        if result.returncode == 0 and result.stdout.strip():
            return result.stdout.strip().split('\n')
        return []
    except Exception as e:
        print_color(f"Error checking processes: {e}", Colors.RED)
        return []


def check_port_in_use(port: int) -> bool:
    """Check if a local port is in use"""
    try:
        result = subprocess.run(
            ["lsof", "-i", f":{port}", "-sTCP:LISTEN"],
            capture_output=True,
            text=True
        )
        return result.returncode == 0
    except Exception:
        return False


def test_ssh_connection() -> bool:
    """Test if SSH connection to remote host works"""
    print_color(f"Testing SSH connection to {REMOTE_USER}@{REMOTE_HOST}...", Colors.BLUE)
    try:
        result = subprocess.run(
            ["ssh", "-o", "ConnectTimeout=5", "-o", "BatchMode=yes",
             f"{REMOTE_USER}@{REMOTE_HOST}", "echo", "success"],
            capture_output=True,
            text=True,
            timeout=10
        )
        if result.returncode == 0:
            print_color("[OK] SSH connection successful", Colors.GREEN)
            return True
        else:
            print_color("[ERROR] SSH connection failed", Colors.RED)
            print_color("\nPlease ensure:", Colors.YELLOW)
            print_color(f"  1. You can SSH to {REMOTE_USER}@{REMOTE_HOST}", Colors.YELLOW)
            print_color("  2. SSH key is configured (password-less login)", Colors.YELLOW)
            print_color(f"\nTest manually: ssh {REMOTE_USER}@{REMOTE_HOST}", Colors.YELLOW)
            return False
    except subprocess.TimeoutExpired:
        print_color("[ERROR] SSH connection timed out", Colors.RED)
        return False
    except Exception as e:
        print_color(f"[ERROR] Error testing SSH: {e}", Colors.RED)
        return False


def start_tunnel() -> bool:
    """Start SSH tunnel"""
    print_color("YouTube Gallery SSH Tunnel Manager", Colors.BLUE)
    print_color("=" * 40, Colors.BLUE)
    print()

    # Check if tunnel is already running
    pids = get_tunnel_processes()
    if pids:
        print_color("SSH tunnel is already running!", Colors.YELLOW)
        print_color(f"Process IDs: {', '.join(pids)}", Colors.YELLOW)
        print_color("\nTo stop it, run: python tunnel.py stop", Colors.YELLOW)
        return False

    # Test SSH connection first
    if not test_ssh_connection():
        return False

    print()
    print_color(f"Starting SSH tunnel to {REMOTE_HOST}...", Colors.GREEN)
    print_color("This will forward:", Colors.BLUE)
    print_color(f"  Frontend: localhost:{FRONTEND_PORT} -> {REMOTE_HOST}:{FRONTEND_PORT}", Colors.BLUE)
    print_color(f"  Backend:  localhost:{BACKEND_PORT} -> {REMOTE_HOST}:{BACKEND_PORT}", Colors.BLUE)
    print()

    # Build SSH command
    ssh_command = [
        "ssh",
        "-L", f"{FRONTEND_PORT}:localhost:{FRONTEND_PORT}",
        "-L", f"{BACKEND_PORT}:localhost:{BACKEND_PORT}",
        "-N",  # Don't execute remote command
        "-f",  # Run in background
        "-o", "ServerAliveInterval=60",  # Keep connection alive
        "-o", "ServerAliveCountMax=3",   # Retry 3 times
        "-o", "ExitOnForwardFailure=yes",  # Exit if port forwarding fails
        f"{REMOTE_USER}@{REMOTE_HOST}"
    ]

    try:
        result = subprocess.run(ssh_command, capture_output=True, text=True)

        if result.returncode == 0:
            # Verify tunnel is actually running by checking if ports are listening
            import time
            time.sleep(2)  # Give it a moment to start and bind ports

            # Check if ports are actually listening
            frontend_listening = check_port_in_use(FRONTEND_PORT)
            backend_listening = check_port_in_use(BACKEND_PORT)

            if frontend_listening or backend_listening:
                print_color("[OK] SSH tunnel started successfully!", Colors.GREEN)
                print()
                print_color("You can now access:", Colors.GREEN)
                if frontend_listening:
                    print_color(f"  Frontend: http://localhost:{FRONTEND_PORT}", Colors.GREEN)
                if backend_listening:
                    print_color(f"  Backend:  http://localhost:{BACKEND_PORT}", Colors.GREEN)
                if not frontend_listening:
                    print_color(f"  Frontend port {FRONTEND_PORT} not listening yet (may need more time)", Colors.YELLOW)
                if not backend_listening:
                    print_color(f"  Backend port {BACKEND_PORT} not listening yet (may need more time)", Colors.YELLOW)
                print()
                print_color("To stop the tunnel: python tunnel.py stop", Colors.BLUE)
                print_color("Check status: python tunnel.py status", Colors.BLUE)
                return True
            else:
                print_color("[ERROR] Tunnel started but ports are not listening", Colors.RED)
                print_color("This might mean the remote ports are not accessible.", Colors.YELLOW)
                print_color("Check that Docker services are running on the remote host.", Colors.YELLOW)
                return False
        else:
            print_color("[ERROR] Failed to start SSH tunnel", Colors.RED)
            if result.stderr:
                print_color(f"Error: {result.stderr}", Colors.RED)

            # Check if ports are already in use
            if check_port_in_use(FRONTEND_PORT):
                print_color(f"\nPort {FRONTEND_PORT} is already in use!", Colors.YELLOW)
            if check_port_in_use(BACKEND_PORT):
                print_color(f"Port {BACKEND_PORT} is already in use!", Colors.YELLOW)

            return False

    except Exception as e:
        print_color(f"[ERROR] Error starting tunnel: {e}", Colors.RED)
        return False


def stop_tunnel() -> bool:
    """Stop SSH tunnel"""
    print_color("Stopping SSH tunnel...", Colors.YELLOW)

    pids = get_tunnel_processes()
    if not pids:
        print_color("No SSH tunnel is running", Colors.YELLOW)
        return False

    try:
        for pid in pids:
            subprocess.run(["kill", pid], check=True)
            print_color(f"[OK] Stopped tunnel process {pid}", Colors.GREEN)

        print_color("[OK] SSH tunnel stopped successfully", Colors.GREEN)
        return True
    except Exception as e:
        print_color(f"[ERROR] Error stopping tunnel: {e}", Colors.RED)
        return False


def check_status() -> None:
    """Check tunnel status"""
    print_color("SSH Tunnel Status", Colors.BLUE)
    print_color("=" * 40, Colors.BLUE)
    print()

    pids = get_tunnel_processes()

    if pids:
        print_color(f"[RUNNING] Tunnel is active (PIDs: {', '.join(pids)})", Colors.GREEN)
        print()

        # Check if ports are listening
        if check_port_in_use(FRONTEND_PORT):
            print_color(f"[OK] Frontend port {FRONTEND_PORT} is forwarding", Colors.GREEN)
        else:
            print_color(f"[ERROR] Frontend port {FRONTEND_PORT} is NOT listening", Colors.RED)

        if check_port_in_use(BACKEND_PORT):
            print_color(f"[OK] Backend port {BACKEND_PORT} is forwarding", Colors.GREEN)
        else:
            print_color(f"[ERROR] Backend port {BACKEND_PORT} is NOT listening", Colors.RED)

        print()
        print_color("Access URLs:", Colors.BLUE)
        print_color(f"  Frontend: http://localhost:{FRONTEND_PORT}", Colors.BLUE)
        print_color(f"  Backend:  http://localhost:{BACKEND_PORT}", Colors.BLUE)
    else:
        print_color("[NOT RUNNING] Tunnel is not active", Colors.RED)
        print()
        print_color("To start the tunnel: python tunnel.py start", Colors.YELLOW)


def restart_tunnel() -> bool:
    """Restart SSH tunnel"""
    print_color("Restarting SSH tunnel...", Colors.YELLOW)
    stop_tunnel()
    import time
    time.sleep(1)
    return start_tunnel()


def print_usage() -> None:
    """Print usage information"""
    print_color("SSH Tunnel Manager for YouTube Gallery", Colors.BLUE)
    print_color("=" * 40, Colors.BLUE)
    print()
    print("Usage:")
    print("  python tunnel.py start   - Start SSH tunnels")
    print("  python tunnel.py stop    - Stop all SSH tunnels")
    print("  python tunnel.py status  - Check tunnel status")
    print("  python tunnel.py restart - Restart SSH tunnels")
    print()
    print_color("Configuration:", Colors.BLUE)
    print(f"  Remote: {REMOTE_USER}@{REMOTE_HOST}")
    print(f"  Ports:  {FRONTEND_PORT} (frontend), {BACKEND_PORT} (backend)")


def main() -> None:
    """Main entry point"""
    if len(sys.argv) < 2:
        print_usage()
        sys.exit(1)

    command = sys.argv[1].lower()

    if command == "start":
        success = start_tunnel()
        sys.exit(0 if success else 1)
    elif command == "stop":
        success = stop_tunnel()
        sys.exit(0 if success else 1)
    elif command == "status":
        check_status()
        sys.exit(0)
    elif command == "restart":
        success = restart_tunnel()
        sys.exit(0 if success else 1)
    else:
        print_color(f"Unknown command: {command}", Colors.RED)
        print()
        print_usage()
        sys.exit(1)


if __name__ == "__main__":
    main()
