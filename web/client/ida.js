var ws = undefined;

function do_ida_socket(callme) {
  if (ws == undefined || ws.readyState == WebSocket.CLOSED) {
    ws = new WebSocket('ws://localhost:3003', 'qira');
    ws.onopen = function() {
      p('connected to IDA socket');
      callme();
    };
    ws.onmessage = function(msg) {
      //p(msg.data);
      var dat = msg.data.split(" ");
      if (dat[0] == "setiaddr") {
        Session.set("iaddr", hex(parseInt(dat[1])));
        Session.set("dirtyiaddr", true);
      }
      if (dat[0] == "setdaddr") {
        if (get_data_type(dat[1]) != "datainstruction") {
          update_dview(dat[1]);
        }
      }
    };
  } else {
    callme();
  }
}

Deps.autorun(function() {
  var iaddr = Session.get('iaddr');
  do_ida_socket(function() {
    ws.send('setaddress '+fhex(iaddr));
  });
});


