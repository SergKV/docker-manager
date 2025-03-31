import platform
import logging
from typing import Dict

class SystemService:
    def __init__(self):
        self.logger = logging.getLogger(__name__)

    def get_system_info(self) -> Dict:
        """Get basic system information"""
        system = platform.system().lower()
        return {
            'os': system,
            'os_version': platform.version(),
            'architecture': platform.machine(),
            'requires_privileges': self._check_privileges()
        }

    def _check_privileges(self) -> bool:
        """Check if admin/sudo privileges are available"""
        try:
            if platform.system().lower() == 'windows':
                import ctypes
                return ctypes.windll.shell32.IsUserAnAdmin() != 0
            return os.geteuid() == 0
        except Exception as e:
            self.logger.error(f"Privilege check failed: {e}")
            return False