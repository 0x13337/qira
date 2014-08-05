import os

WITH_CDA = False
WITH_DWARF = False
TRACE_LIBRARIES = False
WEB_HOST = '127.0.0.1'
WEB_PORT = 3002
SOCAT_PORT = 4000
FORK_PORT = 4001
USE_PIN = False
if os.name == "nt":
  TRACE_FILE_BASE = "c:/qiratmp"
else:
  TRACE_FILE_BASE = "/tmp/qira_logs/"

