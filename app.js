var five = require("johnny-five");
var board = new five.Board();

var needs_refill;
var state = false;

// If board is connected
board.on("ready", function() {

  // Connect analog pin
  this.pinMode(0, five.Pin.ANALOG);
  this.analogRead(0, function(voltage) {

    // voltage 0 simulates the correct pressure. For lack of weight sensor
    if(voltage == 0){
      needs_refill = true;
    }else {
      needs_refill = false;
    }
  });


  if(state == false && needs_refill == true ){
    // If message sent, no need to send it again

    //TODO send_data_to_slack

    state = true;

  }else if(state == true && needs_refill == false){
    // If refilled, unset state

    //TODO unset_pin?

    state = false;
  };
});
