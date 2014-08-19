stream = io.connect(STREAM_URL);

$(document).ready(function() {
  $("#idump")[0].addEventListener("mousewheel", function(e) {
    //p("idump mousewheel");
    if (e.wheelDelta < 0) {
      Session.set('clnum', Session.get('clnum')+1);
    } else if (e.wheelDelta > 0) {
      Session.set('clnum', Session.get('clnum')-1);
    }
  });
});

function on_instructions(msg) { DS("instructions");
  var clnum = Session.get("clnum");
  var iaddr = Session.get("iaddr");
  var idump = "";
  for (var i = 0; i<msg.length;i++) {
    var ins = msg[i];

    if (ins.clnum === clnum) {
      Session.set('iaddr', ins.address);
    }

    // compute the dynamic stuff
    idump +=
       '<div class="instruction" style="margin-left: '+(ins.depth*10)+'px">'+
        '<div class="change '+(ins.slice ? "halfhighlight": "")+' clnum clnum_'+ins.clnum+'">'+ins.clnum+'</div> '+
        '<span class="datainstruction iaddr iaddr_'+ins.address+'">'+ins.address+'</span> '+
        '<div class="instructiondesc">'+highlight_addresses(ins.instruction)+'</div> '+
        '<span class="comment">'+(ins.comment !== undefined ? ins.comment : "")+'</span>'+
      '</div>';
  }
  $('#idump').html(idump);
  rehighlight();
} stream.on('instructions', on_instructions);

Deps.autorun(function() { DA("emit getinstructions");
  var forknum = Session.get("forknum");
  var clnum = Session.get("clnum");
  stream.emit('getinstructions', forknum, clnum, clnum-8, clnum+10);
});

