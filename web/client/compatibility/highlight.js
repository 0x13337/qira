var escapeHTML = (function () {
  'use strict';
  var chr = { '"': '&quot;', '&': '&amp;', '<': '&lt;', '>': '&gt;' };
  return function (text) {
    return text.replace(/[\"&<>]/g, function (a) { return chr[a]; });
  };
}());

function highlight_addresses(a) {
  // no XSS :)
  var d = escapeHTML(a);
  var re = /0x[0123456789abcdef]+/g;
  var m = d.match(re);
  if (m !== null) {
    // make matches unique?
    m = m.filter(function (v,i,a) { return a.indexOf(v) == i });
    m.map(function(a) { 
      var cl = get_data_type(a);
      if (cl == "") {
        d = d.replace(a, "<span class='hexnumber'>"+a+"</span>");
      } else {
        cl += " addr addr_"+a;
        d = d.replace(a, "<span class='"+cl+"'>"+a+"</span>");
      }
    });
  }
  // does this work outside templates?
  return d;
}

function highlight_instruction(a) {
  if (a == undefined) return "undefined";
  var ret = highlight_addresses(a);

  // dim colors
  function fc(a) {
    var df = 1.4;
    // heard of loops?
    var r = a.substr(1,2);
    var g = a.substr(3,2);
    var b = a.substr(5,2);
    r = Math.floor(parseInt(r, 16)/df);
    g = Math.floor(parseInt(g, 16)/df);
    b = Math.floor(parseInt(b, 16)/df);
    return "#"+hex2(r)+hex2(g)+hex2(b);
  }

  // highlight registers
  if (arch !== undefined) {
    for (var i = 0; i < arch[0].length; i++) {
      var rep = '<span style="color: '+fc(regcolors[i])+'" class="data_'+hex(i*arch[1])+'">'+arch[0][i]+'</span>';
      ret = ret.replace(arch[0][i], rep);

      var rep = '<span style="color: '+fc(regcolors[i])+'" class="data_'+hex(i*arch[1])+'">'+arch[0][i].toLowerCase()+'</span>';
      ret = ret.replace(arch[0][i].toLowerCase(), rep);
    }
  }

  // highlight opcode
  var i = 0;
  for (i = 0; i < ret.length; i++) {
    if (ret[i] == ' ' || ret[i] == '\t') {
      break;
    }
  }
  return '<span class="op">' + ret.substr(0, i) + '</span>' + ret.substr(i)
}

function rehighlight() {
  var clnum = Session.get("clnum");
  var iaddr = Session.get("iaddr");
  var daddr = Session.get("daddr");
  $(".autohighlight").removeClass("autohighlight");
  $(".autohighlighti").removeClass("autohighlighti");
  $(".clnum_"+clnum).addClass("autohighlight");
  $(".addr_"+iaddr).addClass("autohighlighti");
  $(".daddr_"+daddr).addClass("autohighlight");
  $(".data_"+daddr).addClass("autohighlight");
}

Deps.autorun(function() { DA("rehighlight");
  rehighlight();
});

stream = io.connect(STREAM_URL);

function get_address_from_class(t) {
  var l = t.className.split(" ").filter(function(x) { return x.substr(0,5) == "addr_"; });
  if (l.length != 1) return undefined;
  return l[0].split("_")[1].split(" ")[0];
}

// sync for no blink!
function replace_names() {
  var addrs = [];
  $(".addr").each(function() {
    var ret = get_address_from_class(this);
    if (ret !== undefined) addrs.push(ret);
  });
  //stream.emit('gettagsa', addrs);

  var tags = sync_tags_request(addrs);

  //p(tags);
  for (var i=0;i<tags.length;i++) {
    $(".addr_"+tags[i]['address']).each(function() {
      if (tags[i]['name'] !== undefined) {
        $(this).addClass("name");
        $(this).html(tags[i]['name']);
      }
    });
  }
}

