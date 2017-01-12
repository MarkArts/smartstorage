var five = require("johnny-five");
//var board = new five.Board();
var RtmClient = require('@slack/client').RtmClient;
var MemoryDataStore = require('@slack/client').MemoryDataStore;
var CLIENT_EVENTS = require('@slack/client').CLIENT_EVENTS;
var RTM_EVENTS = require('@slack/client').RTM_EVENTS;
var RTM_CLIENT_EVENTS = require('@slack/client').CLIENT_EVENTS.RTM;
var WEB_CLIENT_EVENTS = require('@slack/client').CLIENT_EVENTS.WEB;
var WebClient = require('@slack/client').WebClient;
var Promise = require("bluebird");

require('dotenv').config();

StateEnum = {
    EMPTY : "Leeg",
    NEEDS_REFIL : "Bijna Leeg",
    MIDDLE : "Gemiddeld",
    FULL : "Vol"
}

var pins = [
  {
    "name": "kleine 3mm plank",
    "state": StateEnum.FULL
  },
  {
    "name": "Polyester",
    "state": StateEnum.MIDDLE
  },
  {
    "name": "Glasplaat",
    "state": StateEnum.FULL
  },
  {
    "name": "Grote 3mm plank",
    "state": StateEnum.FULL
  },
  {
    "name": "Hout resten",
    "state": StateEnum.MIDDLE
  }
];



var rtm = new RtmClient(process.env.SLACK_API_TOKEN, {
  dataStore: new MemoryDataStore()
});//, {logLevel: 'debug'});
var dm = false;
rtm.start();
var web = new WebClient(process.env.SLACK_API_TOKEN);//, {logLevel: 'debug'});


// If board is connected
//board.on("ready", function() {
//  this.pinMode(0, five.Pin.ANALOG);
//  this.analogRead(0, function(voltage) {
//    setState(voltage);
//    checkState();
//  });
//});

var lastVoltage = 0;
function setState(voltage)
{
  if(Math.abs(voltage - lastVoltage) > 400)
  {
    if(voltage <= 1000){
      pins[0].state = StateEnum.NEEDS_REFIL
    }else {
      pins[0].state = StateEnum.FUll
    }

    lastVoltage = voltage;
  }
}

var lastPins = JSON.parse(JSON.stringify(pins));
function checkState()
{
  if( JSON.stringify(lastPins) != JSON.stringify(pins) ){
    console.log('change');

    for (var i = 0; i < pins.length; i++) {
      if(JSON.stringify(pins[i]) !== JSON.stringify(lastPins[i])){
        console.log(pins[i].name + " changed");
        if(pins[i].state == StateEnum.NEEDS_REFIL || pins[i].state == StateEnum.EMPTY){
          notify(pins[i]);
        }
      }
    }

    updatePins();
  }

  lastPins = JSON.parse(JSON.stringify(pins));
}

rtm.on(CLIENT_EVENTS.RTM.AUTHENTICATED, function (rtmStartData) {
  console.log(`Logged in as ${rtmStartData.self.name} of team ${rtmStartData.team.name}, but not yet connected to a channel`);
});

rtm.on(RTM_EVENTS.MESSAGE, function (message) {
  console.log("message: "+ JSON.stringify(message));
});

rtm.on(RTM_EVENTS.CHANNEL_CREATED, function (message) {
  console.log("created chanel: "+ message);
});

rtm.on(RTM_CLIENT_EVENTS.RTM_CONNECTION_OPENED, function () {
  // This will send the message 'this is a test message' to the channel identified by id 'process.env.SLACK_CHANNEL_MATERIALS'

  web.pins.list(process.env.SLACK_CHANNEL_MATERIALS).then(function(pins){
    updatePins();
  });

  rtm.sendMessage('this is the weight bot checking in (starting up)', process.env.SLACK_CHANNEL_MATERIALS, function messageSent() {
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
  return new Promise(function(resolve, reject){
    if(!updatePromise || !updating)
    {
      updatePromise = clearPins().then(pinMaterials);
    }else
    {
      updatePromise = updatePromise.then(clearPins().then(pinMaterials));
    }

    resolve(updatePromise);
  });
}

function clearPins(){
    return web.pins.list(process.env.SLACK_CHANNEL_MATERIALS).then(function(pins){
      return Promise.map(pins.items, function(p){
        if(p.type == "message"){
          return web.pins.remove(process.env.SLACK_CHANNEL_MATERIALS, {timestamp: p.message.ts});
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
    rtm.sendMessage(createMaterialMessage(), process.env.SLACK_CHANNEL_MATERIALS, function messageSent(err, res) {
      if(err){
        reject(err);
      }else{
        resolve(web.pins.add(process.env.SLACK_CHANNEL_MATERIALS, {
            timestamp: res.ts
        }));
      }
      });
  });
}

function notify(pin){
  return new Promise(function(resolve, reject) {
    var user = rtm.dataStore.getUserById(process.env.SLACK_NOTIFY_ID)
    var dm = rtm.dataStore.getDMByName(user.name);

    rtm.sendMessage(createMessage(pin), dm.id);
  });
}

function createMessage(pin){
  return "`"+pin.name+"` "+pin.state+""
}

function createMaterialMessage(){
  return "```" + pins.reduce( (acc, material) => acc + material.name + ": " + material.state + "\n", '') + "```";
}

/* Tests */
rtm.on(RTM_CLIENT_EVENTS.RTM_CONNECTION_OPENED, function () {
  setTimeout(function () {
    console.log("Change_state 1");
    pins[0].state = StateEnum.NEEDS_REFIL
    checkState();
  }, 4800);
  setTimeout(function (){
    console.log("Change_state 2");
    pins[1].state = StateEnum.FULL
    checkState();
  }, 4800*2);
  setTimeout(function (){
    console.log("Change_state 2");
    pins[2].state = StateEnum.EMPTY
    checkState();
  }, 4800*4);
});
