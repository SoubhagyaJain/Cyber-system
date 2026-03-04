import logging
import os
from datetime import datetime
from config import LOGS_DIR

def setup_logger(name="CyberIntrusionDashboard"):
    """
    Configures a logger that writes to a file and console.
    """
    logger = logging.getLogger(name)
    logger.setLevel(logging.INFO)

    # Check if handlers already exist to avoid duplicate logs
    if not logger.handlers:
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )

        # File Handler
        log_file = LOGS_DIR / "app.log"
        file_handler = logging.FileHandler(log_file)
        file_handler.setFormatter(formatter)
        logger.addHandler(file_handler)

        # Console Handler
        console_handler = logging.StreamHandler()
        console_handler.setFormatter(formatter)
        logger.addHandler(console_handler)

    return logger
