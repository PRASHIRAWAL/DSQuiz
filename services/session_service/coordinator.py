"""
coordinator.py (Cross-platform version)
---------------------------------------
Simulates distributed mutual exclusion using file locks.
Works on Windows and Linux/Mac — no PostgreSQL needed.

Demonstrates:
- Mutual Exclusion
- Fault Tolerance (auto unlock on crash)
"""

import os
import time
import logging
import sys

# On Windows, use msvcrt for file locking
if os.name == "nt":
    import msvcrt
else:
    import fcntl

logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S"
)


class FileLockCoordinator:
    def __init__(self, session_id: str, lock_dir=".locks"):
        self.session_id = session_id
        self.lock_dir = lock_dir
        self.lock_file_path = os.path.join(lock_dir, f"{session_id}.lock")
        self.file_handle = None
        os.makedirs(lock_dir, exist_ok=True)

    def _lock_file(self):
        """Cross-platform lock operation."""
        if os.name == "nt":
            msvcrt.locking(self.file_handle.fileno(), msvcrt.LK_NBLCK, 1)
        else:
            fcntl.flock(self.file_handle, fcntl.LOCK_EX | fcntl.LOCK_NB)

    def _unlock_file(self):
        """Cross-platform unlock operation."""
        if os.name == "nt":
            try:
                msvcrt.locking(self.file_handle.fileno(), msvcrt.LK_UNLCK, 1)
            except OSError:
                pass
        else:
            fcntl.flock(self.file_handle, fcntl.LOCK_UN)

    def try_acquire_lock(self) -> bool:
        try:
            self.file_handle = open(self.lock_file_path, "a+")
            try:
                self._lock_file()
                self.file_handle.seek(0)
                self.file_handle.truncate()
                self.file_handle.write(f"LOCKED by PID={os.getpid()}\n")
                self.file_handle.flush()
                logging.info(f"[{self.session_id}] ✅ Acquired master lock (PID {os.getpid()}).")
                return True
            except (BlockingIOError, OSError):
                logging.info(f"[{self.session_id}] ❌ Lock held by another instance.")
                return False
        except Exception as e:
            logging.error(f"[{self.session_id}] Error acquiring file lock: {e}")
            return False

    def release_lock(self):
        if not self.file_handle:
            return
        try:
            self._unlock_file()
            self.file_handle.close()
            if os.path.exists(self.lock_file_path):
                os.remove(self.lock_file_path)
            logging.info(f"[{self.session_id}] 🔓 Released file lock.")
        except Exception as e:
            logging.error(f"[{self.session_id}] Error releasing lock: {e}")

    def monitor_lock(self, interval=3):
        try:
            while True:
                logging.info(f"[{self.session_id}] Master alive (PID {os.getpid()}).")
                time.sleep(interval)
        except KeyboardInterrupt:
            self.release_lock()


if __name__ == "__main__":
    session_id = "session-101"
    coordinator = FileLockCoordinator(session_id)
    if coordinator.try_acquire_lock():
        coordinator.monitor_lock()
    else:
        # Retry every few seconds until lock becomes free
        while True:
            time.sleep(3)
            if coordinator.try_acquire_lock():
                coordinator.monitor_lock()
