#!/usr/bin/env python
import qira_log
import qira_trace
import socket
import threading
import time
import sys
import os
import fcntl
import signal
import argparse

QIRA_PORT = 3002

from flask import Flask, Response
from flask.ext.socketio import SocketIO, emit

# see http://stackoverflow.com/questions/8774958/keyerror-in-module-threading-after-a-successful-py-test-run
if 'threading' in sys.modules:
  del sys.modules['threading']
import gevent
import gevent.socket
import gevent.monkey
gevent.monkey.patch_all()

app = Flask(__name__)
socketio = SocketIO(app)

program = None
run_id = 0

def ghex(a):
  if a == None:
    return None
  return hex(a).strip("L")

# ***** after this line is the new server stuff *****

@socketio.on('forkat', namespace='/qira')
def forkat(forknum, clnum):
  global run_id
  print "forkat",forknum,clnum
  start_bindserver(ss2, forknum, clnum)

@socketio.on('deletefork', namespace='/qira')
def deletefork(forknum):
  print "deletefork", forknum
  os.unlink("/tmp/qira_logs/"+str(int(forknum)))
  del program.traces[forknum]
  emit('maxclnum', program.get_maxclnum())

@socketio.on('connect', namespace='/qira')
def connect():
  print "client connected", program.get_maxclnum()
  emit('maxclnum', program.get_maxclnum())
  emit('pmaps', program.pmaps)

@socketio.on('getclnum', namespace='/qira')
def getclnum(forknum, clnum, types, limit):
  if forknum not in program.traces:
    return
  trace = program.traces[forknum]
  if clnum == None or types == None or limit == None:
    return
  ret = []
  for t in types:
    key = (clnum, t)
    for c in trace.pydb_clnum[key]:
      c = c.copy()
      c['address'] = ghex(c['address'])
      c['data'] = ghex(c['data'])
      ret.append(c)
      if len(ret) >= limit:
        break
    if len(ret) >= limit:
      break
  emit('clnum', ret)

@socketio.on('getchanges', namespace='/qira')
def getchanges(forknum, address, typ):
  if address == None or typ == None:
    return
  if forknum != -1 and forknum not in program.traces:
    return
  address = int(address)
  if forknum == -1:
    ret = {}
    for forknum in program.traces:
      ret[forknum] = program.traces[forknum].pydb_addr[(address, typ)]
    emit('changes', {'type': typ, 'clnums': ret})
  else:
    emit('changes', {'type': typ, 'clnums': {forknum: program.traces[forknum].pydb_addr[(address, typ)]}})

@socketio.on('getinstructions', namespace='/qira')
def getinstructions(forknum, clstart, clend):
  if forknum not in program.traces:
    return
  trace = program.traces[forknum]
  if clstart == None or clend == None:
    return
  ret = []
  pydb_clnum = trace.pydb_clnum 
  for i in range(clstart, clend):
    key = (i, 'I')
    if key in pydb_clnum:
      rret = pydb_clnum[key][0]
      if rret['address'] in program.instructions:
        rret['instruction'] = program.instructions[rret['address']]
      ret.append(rret)
  emit('instructions', ret)

@socketio.on('getmemory', namespace='/qira')
def getmemory(forknum, clnum, address, ln):
  if forknum not in program.traces:
    return
  trace = program.traces[forknum]
  if clnum == None or address == None or ln == None:
    return
  address = int(address)
  dat = trace.mem.fetch(clnum, address, ln)
  ret = {'address': address, 'len': ln, 'dat': dat}
  emit('memory', ret)

@socketio.on('getregisters', namespace='/qira')
def getregisters(forknum, clnum):
  if forknum not in program.traces:
    return
  trace = program.traces[forknum]
  #print "getregisters",clnum
  if clnum == None:
    return
  # register names shouldn't be here
  # though i'm not really sure where a better place is, qemu has this information
  ret = []
  REGS = program.tregs[0]
  REGSIZE = program.tregs[1]
  for i in range(0, len(REGS)):
    if i*REGSIZE in trace.regs.daddr:
      rret = {"name": REGS[i], "address": i*REGSIZE, "value": ghex(trace.regs.daddr[i*REGSIZE].fetch(clnum)), "size": REGSIZE, "regactions": ""}
      # this +1 is an ugly hack
      if (clnum+1) in trace.pydb_addr[(i*REGSIZE, 'R')]:
        rret['regactions'] = "regread"
      if (clnum+1) in trace.pydb_addr[(i*REGSIZE, 'W')]:
        if "regread" == rret['regactions']:
          rret['regactions'] = "regreadwrite"
        else:
          rret['regactions'] = "regwrite"
      ret.append(rret)
  emit('registers', ret)

@app.route('/', defaults={'path': 'index.html'})
@app.route('/<path:path>')
def serve(path):
  # best security?
  if ".." in path:
    return
  webstatic = os.path.dirname(os.path.realpath(__file__))+"/../webstatic/"

  ext = path.split(".")[-1]

  if ext == 'css':
    path = "qira.css"

  dat = open(webstatic+path).read()
  if ext == 'js' and not path.startswith('client/compatibility/') and not path.startswith('packages/'):
    dat = "(function(){"+dat+"})();"

  if ext == 'js':
    return Response(dat, mimetype="application/javascript")
  elif ext == 'css':
    return Response(dat, mimetype="text/css")
  else:
    return Response(dat, mimetype="text/html")

def run_socketio():
  print "starting socketio server..."
  socketio.run(app, port=QIRA_PORT)


def run_middleware():
  global program
  print "starting QIRA middleware"

  # run loop run
  # read in all the traces
  while 1:
    time.sleep(0.2)
    did_update = False
    for i in os.listdir("/tmp/qira_logs/"):
      if "_" in i:
        continue
      i = int(i)
      if i not in program.traces:
        #print "C create trace",qiradb.new_trace("/tmp/qira_logs/"+str(i), i, program.tregs[1], len(program.tregs[0]))
        qira_trace.Trace(program, i)

    for tn in program.traces:
      if program.traces[tn].poll():
        did_update = True

    if did_update:
      # push to all connected websockets
      socketio.emit('pmaps', program.pmaps, namespace='/qira')

      # this must happen last
      socketio.emit('maxclnum', program.get_maxclnum(), namespace='/qira')
      
def init_bindserver():
  global ss, ss2
  # wait for a connection
  ss = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
  ss.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
  ss.bind(("127.0.0.1", 4000))
  ss.listen(5)
  
  ss2 = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
  ss2.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
  ss2.bind(("127.0.0.1", 4001))
  ss2.listen(5)

def start_bindserver(myss, parent_id, start_cl, loop = False):
  if os.fork() != 0:
    return
  # bindserver runs in a fork
  while 1:
    print "**** listening on",myss
    (cs, address) = myss.accept()

    # fork off the child if we are looping
    if loop:
      if os.fork() != 0:
        cs.close()
        continue
    run_id = get_next_run_id()
    print "**** ID",run_id,"CLIENT",cs, address, cs.fileno()

    fd = cs.fileno()
    # python nonblocking is a lie...
    signal.signal(signal.SIGPIPE, signal.SIG_DFL)
    fcntl.fcntl(fd, fcntl.F_SETFL, fcntl.fcntl(fd, fcntl.F_GETFL, 0) & ~os.O_NONBLOCK)
    os.dup2(fd, 0) 
    os.dup2(fd, 1) 
    os.dup2(fd, 2) 
    for i in range(3, fd+1):
      try:
        os.close(i)
      except:
        pass
    # fingerprint here
    os.execvp(program.qirabinary, [program.qirabinary, "-D", "/dev/null", "-d", "in_asm",
      "-qirachild", "%d %d %d" % (parent_id, start_cl, run_id), "-singlestep",
      program.program]+program.args)
      #"-strace",


def get_next_run_id():
  ret = -1
  for i in os.listdir("/tmp/qira_logs/"):
    if "_" in i:
      continue
    ret = max(ret, int(i))
  return ret+1

if __name__ == '__main__':
  parser = argparse.ArgumentParser(description = 'Analyze binary.')
  parser.add_argument('-s', "--server", help="bind on port 4000. like socat", action="store_true")
  parser.add_argument('binary', help="path to the binary")
  parser.add_argument('args', nargs='*', help="arguments to the binary")
  args = parser.parse_args()

  # creates the file symlink, program is constant through server run
  program = qira_trace.Program(args.binary, args.args)

  is_qira_running = 1
  try:
    socket.create_connection(('127.0.0.1', QIRA_PORT))
    if args.server:
      raise Exception("can't run as server if QIRA is already running")
  except:
    is_qira_running = 0
    print "no qira server found, starting it"
    program.clear()

  # start the binary runner
  if args.server:
    init_bindserver()
    start_bindserver(ss, -1, 1, True)
  else:
    print "**** running "+program.program
    if is_qira_running or os.fork() == 0:   # cute?
      os.execvp(program.qirabinary, [program.qirabinary, "-D", "/dev/null", "-d", "in_asm",
        "-singlestep",  program.program]+program.args)

  if not is_qira_running:
    # start the http server
    http = threading.Thread(target=run_socketio)
    http.start()

    # this reads the files. replace it with c
    run_middleware()

