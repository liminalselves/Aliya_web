"""Legacy compatibility entry point for the Aliya web service.

Use ``misskey__agent_server.py`` for normal development. Keeping this shim avoids
breaking old shortcuts without retaining a second, insecure server implementation.
"""

import os

from misskey__agent_server import app


if __name__ == "__main__":
    host = os.environ.get("ALIYA_HOST", "127.0.0.1")
    port = int(os.environ.get("ALIYA_PORT", "4000"))
    debug = os.environ.get("ALIYA_DEBUG", "").strip().lower() in {
        "1",
        "true",
        "yes",
        "on",
    }
    app.run(host=host, port=port, debug=debug, use_reloader=False)
