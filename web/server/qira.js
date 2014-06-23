Change = new Meteor.Collection("change");
Blocks = new Meteor.Collection("blocks");
Program = new Meteor.Collection("program");

Meteor.startup(function () {
});

Meteor.publish('max_clnum', function() {
  // extract 'clnum' from this to get the max clnum
  return Change.find({}, {sort: {clnum: -1}, limit: 1});
});

Meteor.publish('dat_clnum', function(clnum){
  // can only return as many as in the changelist
  return Change.find({clnum: clnum}, {sort: {address: 1}, limit:20});
});

Meteor.publish('instruction_iaddr', function(iaddr){
  // this doesn't work...
  //return Program.find({address: {$gt: iaddr-0x100, $lt: iaddr+0x100}}, {sort: {address:1}});
});

Meteor.publish('instructions', function(clnum) {
  //return Change.find({clnum: {$gt: clnum-0x10, $lt: clnum+0x18}, type: "I"}, {sort: {clnum:1}});
  var BEFORE = clnum-0x10;
  var AFTER = clnum+0x28;
  var changes = Change.find({clnum: {$gt: BEFORE, $lt: AFTER}, type: "I"});
  var cblocks = Blocks.find({clend: {$gt: BEFORE}, clstart: {$lt: AFTER}});
  //cblocks.forEach(function(post) { console.log(post); });
  var query = [];
  changes.forEach(function(post) {
    query.push({address: post.address});
  });
  var progdat = Program.find({$or: query});
  // we need to send the program data back here as well...
  return [changes, cblocks, progdat];
});

Meteor.publish('dat_iaddr', function(iaddr){
  // fetch the static info about the range
  return Change.find({address: iaddr, type: "I"}, {sort: {clnum: 1}, limit:10})
});

Meteor.publish('dat_daddr', function(daddr){
  // fetch the dynamic info about the instruction range
  //return Change.find({address : {$gt: daddr-0x100, $lt: daddr+0x300}});
  if (daddr >= 0x1000) {
    return Change.find({address:daddr}, {sort: {clnum: 1}, limit:10});
  } else {
    return false;
  }
});

Meteor.publish('hexedit_daddr', function(daddr, clnum) {
  return Change.find({address:daddr, clnum:{$lte: clnum}}, {sort: {clnum: -1}, limit:1});
});

