from qira_base import *
import qira_config
from qira_webserver import socket_method, socketio 
from flask.ext.socketio import SocketIO, emit

# should namespace be changed to static?

@socketio.on('getaddressrange', namespace='/qira')
@socket_method
def getaddressrange(start, length):
  start = fhex(start)
  ret = []
  for i in range(start, start+length):
    if i in program.instructions:
      ret.append({"address": ghex(i),
        "instruction": program.instructions[i]})
  emit('addressrange', ret)

def init_static(lprogram):
  global program
  program = lprogram

