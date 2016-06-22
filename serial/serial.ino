const int LED = 13;    // Red LED Pin
const int SENSOR_PIN = 0;      // Analog input pin
int sensorValue;

void setup()
{
  Serial.begin(9600);
  Serial.println("Start");
  // analogWrite() sets up the pins as outputs
}


void loop()
{
  

  sensorValue = analogRead(SENSOR_PIN);

  Serial.println(sensorValue); 
  delay(1000);
}


