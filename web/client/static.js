// static stuff

stream = io.connect(STREAM_URL);

Deps.autorun(function() { DA("update static view");
  var iaddr = Session.get('iaddr');
  if (iaddr === undefined) return;
  stream.emit('getfunc', iaddr);
});

/*$(function() {
  $("#staticpanel").css("display", "none");
});*/

function on_tags(addrs) { DS("tags"); 
  //p(addrs);
  var idump = "";
  for (var i=0;i<addrs.length;i++) {
    var ins = addrs[i];
    idump += '<div class="instruction">';
    idump += '<span class="hexdumpdatainstruction iaddr iaddr_'+ins.address+'">'+ins.address+'</span> '+
    '<div class="instructiondesc">'+ins.instruction+'</div>';
    idump += '</div>';
  }
  $("#static").html(idump);
  rehighlight();
} stream.on('tags', on_tags);

