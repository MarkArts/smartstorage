# Smartstorage
This is the repository for my smartstorage project for the HRO Ambient en Persuasive Design.

## Setup
To run the project you should copy the .env-example to .env and set the correct SLACK settings.

Then run npm
```
npm install
```

## run
You can run the project with node
```
node app.js
```


By default we emulte the arduono device but to use an actual arduino you upload the `serial/serial.info` file to the arduino board and uncomment the following code
```
// If board is connected
//board.on("ready", function() {
//  this.pinMode(0, five.Pin.ANALOG);
//  this.analogRead(0, function(voltage) {
//    setState(voltage);
//    checkState();
//  });
//});
```
