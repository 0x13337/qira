var ws = undefined;

function do_ida_socket(callme) {
  if (ws == undefined) {
    p('connecting to IDA socket');
    ws = new WebSocket('ws://localhost:3003', 'qira');
    ws.onopen = callme;
    ws.onmessage = function(msg) {
      //p(msg.data);
      var dat = msg.data.split(" ");
      if (dat[0] == "setiaddr") {
        var iaddr = parseInt(dat[1])
        Session.set("iaddr", iaddr);
      }
      if (dat[0] == "setdaddr") {
        var iaddr = parseInt(dat[1])
        Session.set("daddr", iaddr);
      }
    };
  } else {
    callme();
  }
}

Deps.autorun(function() {
  var iaddr = Session.get('iaddr');
  do_ida_socket(function() {
    ws.send('setaddress '+iaddr);
  });
});


