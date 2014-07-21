stream = io.connect("http://localhost:3002/qira");

Meteor.startup(function() {
  $("#idump")[0].addEventListener("mousewheel", function(e) {
    if (e.wheelDelta < 0) {
      Session.set('clnum', Session.get('clnum')+1);
    } else if (e.wheelDelta > 0) {
      Session.set('clnum', Session.get('clnum')-1);
    }
  });
});

Template.idump.ischange = function() {
  var clnum = Session.get("clnum");
  if (this.clnum == clnum) {
    // keep the iaddr in sync with the change
    Session.set('iaddr', this.address);
    return "highlight";
  } else return "";
};

Template.idump.isiaddr = function() {
  var iaddr = Session.get("iaddr");
  if (this.address == iaddr) return "highlight";
  else return "";
}

Template.idump.hexaddress = function() {
  return hex(this.address);
};

Template.idump.events({
  'click .change': function() {
    Session.set('clnum', this.clnum);
  },
  'mousedown .datainstruction': function(e) { return false; },
  'click .datainstruction': function() {
    Session.set('iaddr', this.address);
  },
  'dblclick .datainstruction': function() {
    update_dview(this.address);
  }
});

// ** should move these to idump.js **

stream.on('instructions', function(msg) {
  $('#idump')[0].innerHTML = "";
  UI.insert(UI.renderWithData(Template.idump, {instructions: msg}), $('#idump')[0]);
});

Deps.autorun(function() {
  var clnum = Session.get("clnum");
  var forknum = Session.get("forknum");
  stream.emit('getinstructions', forknum, clnum-4, clnum+8);
});

