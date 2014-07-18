stream = io.connect("http://localhost:3002/qira");

Meteor.startup(function() {
  $("#vtimelinebox")[0].addEventListener("mousewheel", function(e) {
    var max = abs_maxclnum(); if (max === undefined) return;
    var cview = Session.get("cview"); if (cview === undefined) return;
    var cscale = get_cscale(); if (cscale === undefined) return;
    var move = Math.round(cscale * 50.0); // 50 pixels
    // clamping
    if (e.wheelDelta < 0) {
      if (cview[0] - move < 0) move = cview[0];
      Session.set("cview", [cview[0] - move, cview[1] - move]);
    } else {
      if (cview[1] + move > max) move = max-cview[1];
      Session.set("cview", [cview[0] + move, cview[1] + move]);
    }
  });
  register_drag_zoom();
});

function register_drag_zoom() {
  function get_clnum(e) {
    if ($(".vtimeline")[0] !== e.target &&
        e.target !== $("#vtimelinebox")[0]) return undefined;
    var max = abs_maxclnum(); if (max === undefined) return;
    var cview = Session.get("cview"); if (cview === undefined) return;
    var cscale = get_cscale();
    if (cscale === undefined) return undefined;
    // fix for non full zoom
    var clnum = (e.offsetY * cscale) + cview[0];
    var clret = Math.round(clnum);
    if (clret > max) clret = max;
    return clret;
  }
  var down = -1;
  $("#vtimelinebox").mousedown(function(e) {
    if (e.button == 1) { zoom_out_max(); }
    if (e.button != 0) return;
    var clnum = get_clnum(e);
    if (clnum === undefined) return;
    down = clnum;
    return false;
  });
  $("#vtimelinebox").mouseup(function(e) {
    p("mouseup");
    if (e.button != 0) return;
    var up = get_clnum(e);
    if (up === undefined) return;
    if (down != -1) {
      // should check absolute length of drag, not clnums
      p("drag "+down+"-"+up);
      if (down == up) {
        Session.set("clnum", down);
      } else if (down < up) {
        Session.set("cview", [down, up]);
      } else if (down > up) {
        Session.set("cview", [up, down]);
      }
    }
    return false;
  });
}

var flags = {};

function get_cscale() {
  var cview = Session.get("cview");
  if (cview === undefined) return;
  var range = cview[1] - cview[0];
  var box = $("#vtimelinebox");
  if (box.length == 0) return undefined;
  var working_height = box[0].offsetHeight - 100;
  //var scale = Math.ceil(range/working_height);
  var scale = range/working_height;
  var real_height = Math.ceil(range/scale);
  $(".vtimeline")[0].style.height = real_height + "px";
  $(".vtimeline")[1].style.height = real_height + "px";
  //p("working height is "+working_height+" scale is "+scale);
  return scale;
}

function redraw_flags() {
  var cview = Session.get("cview");
  if (cview === undefined) return undefined;
  var cscale = get_cscale();
  if (cscale === undefined) return;
  $(".flag").remove();
  var colors = {
    "bounds": "green",
    "change": "blue",
    "ciaddr": "#AA0000", // keep it alphabetical
    "daddrr": "#888800",
    "daddrw": "yellow"
  };
  for (arr in flags) {
    var classes = "flag";
    var forknum = parseInt(arr.split(",")[0]);
    var clnum = parseInt(arr.split(",")[1]);
    if (clnum < cview[0] || clnum > cview[1]) continue;
    sty = "";
    if (flags[arr].length == 0) continue;
    else if (flags[arr].length == 1) {
      var col = colors[flags[arr][0]];
      sty = "background-color:"+col+"; color:"+col;
    }
    else {
      sty = "background: linear-gradient(to right"
      var cols = flags[arr].sort()
      for (var i = 0; i < cols.length; i++) {
        sty += ","+colors[cols[i]];
      }
      sty += ")";
    }

    var flag = $('<div id="flag'+clnum+'" class="flag" style="'+sty+'">'+clnum+'</div>');
    flag[0].style.marginTop = ((clnum-cview[0])/cscale) + "px";
    flag.click(function(cln) { Session.set("forknum", cln[0]); Session.set("clnum", cln[1]); }.bind(undefined, [forknum, clnum]));
    $($('.vtimeline')[forknum]).append(flag);
  }
}

function add_flag(type, forknum, clnum) {
  var t = [forknum, clnum];
  if (flags[t] !== undefined) flags[t].push(type);
  else flags[t] = [type];
}

function remove_flags(type, forknum) {
  for (arr in flags) {
    var tforknum = parseInt(arr.split(",")[0]);
    if (forknum !== undefined && forknum != tforknum) continue;
    var index = flags[arr].indexOf(type);
    while (index != -1) {
      flags[arr].splice(index, 1)
      index = flags[arr].indexOf(type);
    }
    if (flags[arr].length == 0) delete flags[arr];
  }
}

Deps.autorun(function() {
  // false here forces update on max_clnum update
  zoom_out_max(false);
});

Deps.autorun(function() {
  var cview = Session.get("cview");
  if (cview === undefined) return undefined;
  remove_flags("bounds");
  add_flag("bounds", 0, cview[0]);
  add_flag("bounds", 0, cview[1]);
  redraw_flags();
});

Deps.autorun(function() {
  var forknum = Session.get("forknum");
  var clnum = Session.get("clnum");
  remove_flags("change");
  add_flag("change", forknum, clnum);
  redraw_flags();
});

Deps.autorun(function() {
  var forknum = Session.get("forknum");
  var iaddr = Session.get('iaddr');
  var maxclnum = Session.get('max_clnum');
  stream.emit('getchanges', forknum, iaddr, 'I')
});

Deps.autorun(function() {
  var forknum = Session.get("forknum");
  var daddr = Session.get('daddr');
  var maxclnum = Session.get('max_clnum');
  stream.emit('getchanges', forknum, daddr, 'L')
  stream.emit('getchanges', forknum, daddr, 'S')
});

stream.on('changes', function(msg) {
  var types = {'I': 'ciaddr', 'L': 'daddrr', 'S': 'daddrw'};
  var clnums = msg['clnums'];
  var type = types[msg['type']];
  var clnum = Session.get('clnum');
  var forknum = msg['forknum'];

  // this should probably only be for the IDA plugin
  if (msg['type'] == 'I' && clnums.indexOf(clnum) == -1 && Session.get('dirtyiaddr') == true) {
    var closest = undefined;
    var diff = 0;
    // if these are instructions and the current clnum isn't in the list
    for (var i = 0; i < clnums.length; i++) {
      var ldiff = Math.abs(clnums[i] - clnum);
      if (closest == undefined || diff > ldiff) {
        closest = clnums[i];
        diff = ldiff;
      }
    }
    //p("nearest change is "+closest);
    if (closest !== undefined && closest !== clnum) {
      Session.set("clnum", closest);
    }
    Session.set("dirtyiaddr", false);
  }

  remove_flags(type, forknum);
  for (var i = 0; i < clnums.length; i++) {
    add_flag(type, forknum, clnums[i]);
  }
  redraw_flags();
});

