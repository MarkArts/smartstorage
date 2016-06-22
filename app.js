var five = require("johnny-five");
var board = new five.Board();
var RtmClient = require('@slack/client').RtmClient;
var CLIENT_EVENTS = require('@slack/client').CLIENT_EVENTS;
var RTM_EVENTS = require('@slack/client').RTM_EVENTS;
var RTM_CLIENT_EVENTS = require('@slack/client').CLIENT_EVENTS.RTM;
var WEB_CLIENT_EVENTS = require('@slack/client').CLIENT_EVENTS.WEB;
var WebClient = require('@slack/client').WebClient;
var Promise = require("bluebird");

var channel_materials = "C1K40Q7QT";
var token = process.env.SLACK_API_TOKEN || 'Your key here';

var state = {
  "needs_refill": false
};

var pins = [
  {
    "name": "Wood",
    "status": "full"
  },
  {
    "name": "Plastic",
    "status": "full"
  },
  {
    "name": "Glass",
    "status": "full"
  }
];



var rtm = new RtmClient(token);//, {logLevel: 'debug'});
rtm.start();
var web = new WebClient(token);//, {logLevel: 'debug'});


// If board is connected
board.on("ready", function() {
  // Connect analog pin
  this.pinMode(0, five.Pin.ANALOG);
  this.analogRead(0, function(voltage) {
    setState(voltage);
    checkState();
  });
});

function setState(voltage)
{
  if(voltage <= 400){
    state.needs_refill = false;
  }else {
    state.needs_refill = true;
  }
}

var lastState = state;
function checkState()
{
  if(lastState.needs_refill != state.needs_refill){
    updatePins();
    console.log('change');
  }

  lastState = JSON.parse(JSON.stringify(state));
}

rtm.on(CLIENT_EVENTS.RTM.AUTHENTICATED, function (rtmStartData) {
  console.log(`Logged in as ${rtmStartData.self.name} of team ${rtmStartData.team.name}, but not yet connected to a channel`);
});

rtm.on(RTM_EVENTS.MESSAGE, function (message) {
  console.log("message: "+ message);
});

rtm.on(RTM_EVENTS.CHANNEL_CREATED, function (message) {
  console.log("created chanel: "+ message);
});

rtm.on(RTM_CLIENT_EVENTS.RTM_CONNECTION_OPENED, function () {
  // This will send the message 'this is a test message' to the channel identified by id 'C0CHZA86Q'

  web.pins.list(channel_materials).then(function(pins){
    updatePins();
  });

  rtm.sendMessage('this is the weight bot checking in (starting up)', channel_materials, function messageSent() {
    // optionally, you can supply a callback to execute once the message has been sent
  });
});

web.on(WEB_CLIENT_EVENTS.WEB_CONNECTION_OPENED, function () {
  console.log("sup bitches");
});


var updatePromise = false;
var updating = false;
function updatePins()
{
  if(!updatePromise || !updating)
  {
    updatePromise = clearPins().then(pinMaterials);
  }else
  {
    updatePromise = updatePromise.then(clearPins().then(pinMaterials));
  }
}

function clearPins(){
    return web.pins.list(channel_materials).then(function(pins){
      return Promise.map(pins.items, function(p){
        if(p.type == "message"){
          return web.pins.remove(channel_materials, {timestamp: p.message.ts});
        }else{
          return new Promise(function(resolve, reject){
            resolve();
          });
        }
      })
    });
}

function pinMaterials(){
  return new Promise(function(resolve, reject) {
    rtm.sendMessage(createMaterialMessage(), channel_materials, function messageSent(err, res) {
      if(err){
        reject(err);
      }else{
        resolve(web.pins.add(channel_materials, {
            timestamp: res.ts
        }));
      }
      });
  });
}

function createMaterialMessage(){
  pins[0].status = (state.needs_refill) ? "needs refill" : "full";
  return pins.reduce( (acc, material) => acc + material.name + ": " + material.status + "\n", '');
}