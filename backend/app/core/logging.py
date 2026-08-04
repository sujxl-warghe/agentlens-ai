import logging
import sys


def configure_logging(level: int = logging.INFO) -> None:
    root = logging.getLogger()
    root.setLevel(level)

    if root.handlers:
        # Avoid duplicate handlers on reload
        return

    handler = logging.StreamHandler(sys.stdout)
    formatter = logging.Formatter(
        fmt="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
        datefmt="%H:%M:%S",
    )
    handler.setFormatter(formatter)
    root.addHandler(handler)

    # Quiet noisy third-party loggers
    logging.getLogger("git").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)


def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(name)
