# session_manager.py
import asyncio
import logging
import time
import os
from typing import Callable, Optional

from coordinator import FileLockCoordinator

logging.basicConfig(level=logging.INFO, format="[%(asctime)s] [%(levelname)s] %(message)s", datefmt="%H:%M:%S")


class SessionManager:
    """
    Async session manager that:
     - Tries to acquire a session-level lock (coordinator)
     - If master, dispatches questions periodically via the provided broadcaster callback
     - If not master, keeps retrying to acquire lock
    """

    def __init__(self, session_id: str, question_interval: float = 6.0, broadcaster: Optional[Callable] = None):
        self.session_id = session_id
        self.coordinator = FileLockCoordinator(session_id)
        self.question_interval = question_interval
        self.broadcaster = broadcaster  # async function: await broadcaster(session_id, message_dict)
        self.is_master = False
        self._task = None
        self._running = False

    async def run(self):
        """
        Main entrypoint — keeps running until shutdown is called.
        It attempts to acquire the coordinator lock. When master, it runs the dispatch loop.
        """
        logging.info(f"[{self.session_id}] SessionManager starting (async).")
        while True:
            try:
                acquired = self.coordinator.try_acquire_lock()
                if acquired:
                    self.is_master = True
                    logging.info(f"[{self.session_id}] Became master. Starting dispatch loop.")
                    self._running = True
                    await self._dispatch_loop()
                    # dispatch loop exited (likely due to shutdown) -> attempt release
                    self.coordinator.release_lock()
                    self.is_master = False
                    logging.info(f"[{self.session_id}] Released lock and will retry acquiring again shortly.")
                else:
                    self.is_master = False
                    logging.info(f"[{self.session_id}] Not master. Will retry in 3s.")
                    await asyncio.sleep(3.0)
            except Exception as e:
                logging.error(f"[{self.session_id}] Unexpected error in manager.run: {e}")
                await asyncio.sleep(3.0)

    async def _dispatch_loop(self):
        """
        Async dispatch loop: create a question payload and use broadcaster to send it to clients.
        If no broadcaster is provided, logs only.
        """
        qnum = 1
        try:
            while self._running:
                question_payload = {
                    "type": "question",
                    "session_id": self.session_id,
                    "question_id": f"q{qnum}",
                    "text": f"Demo question #{qnum}",
                    "timestamp": time.time(),
                    "duration_seconds": self.question_interval
                }
                logging.info(f"[{self.session_id}] Dispatching question: {question_payload['question_id']}")
                if self.broadcaster:
                    # broadcaster is an async function (session_service.main.broadcast)
                    await self.broadcaster(self.session_id, question_payload)
                qnum += 1
                # Wait question_interval seconds but check _running periodically
                total = 0.0
                interval = 0.5
                while total < self.question_interval and self._running:
                    await asyncio.sleep(interval)
                    total += interval
        except asyncio.CancelledError:
            logging.info(f"[{self.session_id}] Dispatch loop cancelled.")
        except Exception as e:
            logging.error(f"[{self.session_id}] Error in dispatch loop: {e}")

    async def shutdown(self):
        logging.info(f"[{self.session_id}] Shutdown requested for SessionManager.")
        self._running = False
        # release lock if we hold it
        if self.is_master:
            try:
                self.coordinator.release_lock()
            except Exception:
                pass
        logging.info(f"[{self.session_id}] Shutdown complete.")
