#!/usr/bin/env python2
import os
basedir = os.path.dirname(os.path.realpath(__file__))
import argparse
import socket
import threading
import time

import qira_config
import qira_socat
import qira_program
import qira_webserver

if __name__ == '__main__':
  # define arguments
  parser = argparse.ArgumentParser(description = 'Analyze binary. Like "qira /bin/ls /"')
  parser.add_argument('-s', "--server", help="bind on port 4000. like socat", action="store_true")
  parser.add_argument('-t', "--tracelibraries", help="trace into all libraries", action="store_true")
  parser.add_argument('binary', help="path to the binary")
  parser.add_argument('args', nargs='*', help="arguments to the binary")
  parser.add_argument("--flush-cache", help="flush all QIRA caches", action="store_true")
  parser.add_argument("--dwarf", help="parse program dwarf data", action="store_true")
  if os.path.isdir(basedir+"/../cda"):
    parser.add_argument("--cda", help="use CDA to view source(implies dwarf)", action="store_true")

  # parse arguments
  args = parser.parse_args()
  if args.tracelibraries:
    qira_config.TRACE_LIBRARIES = True
  if args.dwarf:
    qira_config.WITH_DWARF = True
  if args.cda:
    qira_config.WITH_CDA = True
    qira_config.WITH_DWARF = True
  if args.flush_cache:
    print "*** flushing caches"
    os.system("rm -rfv /tmp/qira*")

  # creates the file symlink, program is constant through server run
  program = qira_program.Program(args.binary, args.args)

  is_qira_running = 1
  try:
    socket.create_connection(('127.0.0.1', qira_webserver.QIRA_WEB_PORT))
    if args.server:
      raise Exception("can't run as server if QIRA is already running")
  except:
    is_qira_running = 0
    print "no qira server found, starting it"
    program.clear()

  # start the binary runner
  if args.server:
    qira_socat.start_bindserver(program, 4000, -1, 1, True)
  else:
    print "**** running "+program.program
    if is_qira_running or os.fork() == 0:   # cute?
      program.execqira()

  if not is_qira_running:
    # start the http server
    qira_webserver.run_server(args, program)

