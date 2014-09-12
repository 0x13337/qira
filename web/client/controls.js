stream = io.connect(STREAM_URL);

function on_setiaddr(iaddr) { DS("setiaddr");
  update_iaddr(iaddr);
} stream.on('setiaddr', on_setiaddr);

function on_setclnum(forknum, clnum) { DS("setclnum");
  Session.set('forknum', forknum);
  Session.set('clnum', clnum);
  push_history("remote setclnum");
} stream.on('setclnum', on_setclnum);

Deps.autorun(function() { DA("set backend know iaddr changed");
  var iaddr = Session.get('iaddr');
  stream.emit('navigateiaddr', iaddr);
});

Deps.autorun(function() { DA("update controls");
  $("#control_clnum").val(Session.get("clnum"));
  $("#control_forknum").val(Session.get("forknum"));
  $("#control_iaddr").val(Session.get("iaddr"));
  $("#control_daddr").val(Session.get("daddr"));
});
  
$(document).ready(function() {
  $('#control_clnum').on('change', function(e) {
    Session.set("clnum", fdec(e.target.value));
  });
  $('#control_forknum').on('change', function(e) {
    Session.set("forknum", fdec(e.target.value));
  });
  $('#control_iaddr').on('change', function(e) {
    if (e.target.value == "") {
      Session.set("iaddr", undefined);
    } else {
      Session.set("iaddr", e.target.value);
      Session.set("dirtyiaddr", true);
    }
  });
  $('#control_daddr').on('change', function(e) {
    if (e.target.value == "") {
      Session.set("daddr", undefined);
      Session.set("dview", undefined);
    } else {
      update_dview(e.target.value);
    }
  });
});

$(document).ready(function() {
  $('body').on('mousewheel', '.flat', function(e) {
    var cdr = $(".flat").children();
    if (e.originalEvent.wheelDelta < 0) {
      Session.set('iaddr', get_address_from_class(cdr[16].childNodes[0]));
    } else if (e.originalEvent.wheelDelta > 0) {
      Session.set('iaddr', get_address_from_class(cdr[14].childNodes[0]));
    }
  });
  $("#idump")[0].addEventListener("mousewheel", function(e) {
    //p("idump mousewheel");
    if (e.wheelDelta < 0) {
      Session.set('clnum', Session.get('clnum')+1);
    } else if (e.wheelDelta > 0) {
      Session.set('clnum', Session.get('clnum')-1);
    }
  });
});

Session.setDefault("flat", false);

// keyboard shortcuts
window.onkeydown = function(e) {
  //p(e.keyCode);
  //p(e);
  if (e.keyCode == 32) {
    // space bar
    Session.set("flat", !Session.get("flat"));
  } else if (e.keyCode == 37) {
    Session.set("forknum", Session.get("forknum")-1);
  } else if (e.keyCode == 39) {
    Session.set("forknum", Session.get("forknum")+1);
  } else if (e.keyCode == 38) {
    Session.set("clnum", Session.get("clnum")-1);
  } else if (e.keyCode == 40) {
    Session.set("clnum", Session.get("clnum")+1);
  } else if (e.keyCode == 77) {  // m -- end of function
    stream.emit('navigatefunction', Session.get("forknum"), Session.get("clnum"), false);
  } else if (e.keyCode == 188) {  // , -- start of function
    stream.emit('navigatefunction', Session.get("forknum"), Session.get("clnum"), true);
  } else if (e.keyCode == 90) {  // z
    zoom_out_max();
  } else if (e.keyCode == 74) {  // vim down, j
    go_to_flag(true, false);
  } else if (e.keyCode == 75) {  // vim up, k
    go_to_flag(false, false);
  } else if (e.keyCode == 85) {  // vim down, row up, data, u
    go_to_flag(true, true);
  } else if (e.keyCode == 73) {  // vim up, row up, data, i
    go_to_flag(false, true);
  } else if (e.keyCode == 27) {  // esc
    history.back();
  } else if (e.keyCode == 67 && e.shiftKey == true) {
    // shift-C = clear all forks
    delete_all_forks();
  } else if (e.keyCode == 78) {
    if (e.shiftKey) {
      // shift-n = rename data
      var addr = Session.get("daddr");
    } else {
      // n = rename instruction
      var addr = Session.get("iaddr");
    }
    if (addr == undefined) return;
    var old = sync_tags_request([addr])[0]['name'];
    if (old == undefined) old = "";
    var dat = prompt("Rename address "+addr, old);
    if (dat == undefined) return;
    var send = {};
    send[addr] = {"name": dat};
    stream.emit("settags", send);

    replace_names();
  } else if (e.keyCode == 186) {
    var addr = undefined;
    if (e.shiftKey) {
      // shift-; = comment data
      var addr = Session.get("daddr");
    } else {
      // n = comment instruction
      var addr = Session.get("iaddr");
    }
    if (addr == undefined) return;
    var old = sync_tags_request([addr])[0]['comment'];
    if (old == undefined) old = "";
    var dat = prompt("Enter comment on "+addr, old);
    if (dat == undefined) return;
    var send = {};
    send[addr] = {"comment": dat};
    stream.emit("settags", send);

    // do this explictly?
    $(".comment_"+addr).html("; "+dat);
  } else if (e.keyCode == 71) {
    var dat = prompt("Enter change or address");
    if (dat == undefined) return;
    if (dat.substr(0, 2) == "0x") { update_iaddr(dat); }
    else if (fdec(dat) == dat) { Session.set("clnum", fdec(dat)); }
    else {
      stream.emit("gotoname", dat);
    }
  }
};



$(document).ready(function() {

  // control the highlighting of things
  $('body').on('click', '.clnum', function(e) {
    Session.set('clnum', fdec(e.target.textContent));
    push_history("click clnum");
  });
  /*$('body').on('click', '.iaddr', function(e) {
    Session.set('iaddr', e.target.textContent);
    push_history("click iaddr");
  });*/
  $('body').on('click', '.data', function(e) {
    //var daddr = e.target.getAttribute('id').split("_")[1].split(" ")[0];
    var daddr = get_address_from_class(e.target, "data");

    Session.set('daddr', daddr);
    push_history("click data");
  });


  // registers and other places
  $('body').on('click', '.dataromemory', function(e) {
    update_dview(get_address_from_class(e.target));
  });
  $('body').on('click', '.datamemory', function(e) {
    update_dview(get_address_from_class(e.target));
  });
  $('body').on('click', '.datainstruction', function(e) {
    /*var d = get_address_from_class(e.target)
    p(d);
    update_dview(d);*/
    update_iaddr(get_address_from_class(e.target), false);
  });

  $('body').on('dblclick', '.datainstruction', function(e) {
    update_iaddr(get_address_from_class(e.target));
  });

  $('body').on('contextmenu', '.datainstruction', function(e) {
    update_dview(get_address_from_class(e.target));
    return false;
  });

  // hexdump
  $('body').on('dblclick', '.hexdumpdatamemory', function(e) {
    update_dview(get_address_from_class(e.target));
  });
  $('body').on('dblclick', '.hexdumpdataromemory', function(e) {
    update_dview(get_address_from_class(e.target));
  });
  $('body').on('contextmenu', '.hexdumpdatainstruction', function(e) {
    update_iaddr(get_address_from_class(e.target));
    //update_dview(get_address_from_class(e.target));
    return false;
  });
  /*$('body').on('click', '.hexdumpdatainstruction', function(e) {
    update_iaddr(get_address_from_class(e.target), false);
    return false;
  });*/
  $('body').on('dblclick', '.hexdumpdatainstruction', function(e) {
    update_dview(get_address_from_class(e.target));
    return false;
  });
  $('body').on('mousedown', '.hexdumpdataromemory', function(e) { return false; });
  $('body').on('mousedown', '.hexdumpdatamemory', function(e) { return false; });
  $('body').on('mousedown', '.hexdumpdatainstruction', function(e) { return false; });
  $('body').on('mousedown', '.datainstruction', function(e) { return false; });

  // vtimeline flags
  $('body').on('click', '.flag', function(e) {
    var forknum = fdec(e.target.parentNode.id.substr(9));
    var clnum = fdec(e.target.textContent);
    Session.set("forknum", forknum);
    Session.set("clnum", clnum);
    push_history("click flag");
  });
});

