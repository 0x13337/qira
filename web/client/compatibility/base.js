function p(a) { console.log(a); }

function hex(a) {
  if (a == undefined) {
    return "";
  } else {
    if (a < 0) a += 0x100000000;
    return "0x"+a.toString(16);
  }
}

function update_dview(addr) {
  Session.set('daddr', addr);
  Session.set('dview', (addr-0x20)-(addr-0x20)%0x10);
}

function update_maxclnum(clnum) {
  p("update maxclnum "+clnum);
  if (Session.get("max_clnum") == Session.get("clnum")) {
    // track the max changelist if you have it selected
    Session.set("clnum", clnum);
  } else {
    Session.setDefault("clnum", clnum);
  }
  Session.set("max_clnum", clnum);
}

function zoom_out_max(dontforce) {
  var max = Session.get("max_clnum");
  if (max === undefined) return;
  if (dontforce === true)  Session.setDefault("cview", [0, max]);
  else Session.set("cview", [0, max]);
}

