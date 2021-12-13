# node-red-contrib-evohome 

This provides nodes for controlling Honeywell Evohome. It's using the unofficial API to interact with the evohome servers. node-red-contrib-evohome delivers 3 nodes:

## Evohome Config
Evohome Config is a config node to set the userid and password to login to evohome servers.

## Evohome Status
Evohome Status periodically polls the status of evohome servers. The interval in seconds can be set. To disable periodically polling, just set interval to 0 (zero).
You might manually poll date via input message. Note: The first poll creates session only, there is no data fetching on first poll.

Evohome Status returns the zone-id, the name of the zone, the temperature, and the cuttent setpoint value. It will send a message per thermostat. The msg.payload looks like:

`{ id: "1234567", name: "bedroom", currentTemperature: 22, targetTemperature: 22 }`

## Evohome Control
Evohome Control makes it possible to set the setpoint per thermostat. It offers 4 ways to do so:
- only provide the zone id will make the thermostat revert back to the schedule.
- zone id and temperature will set the temperature until next schedule.
- zone id, temperature and time will set a temporary setpoint until the given time, then revert back to the schedule.
- zone id, temperature and permanent-flag will set the temperature permanently.

This might look like:

`{ id: "1234567", temperature: 22, endtime: "22:00:00" }`

or

`{ id: "1234567", temperature: 22, permanent: true }`