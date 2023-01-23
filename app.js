const express = require('express')
const amtrak = require('amtrak')
var tz = require('timezone/loaded'),
    equal = require('assert').equal,
    utc;
const app = express()
const port = 8080
const config = require("./config.json")
var status = {}


function get_train_status(tn) {
  return amtrak.fetchTrain(tn)

}


function parse_status(status_data) {
  const now = Date()
  var current_status = null
  var est_arrival = null
  if (status_data.length == 0) {
    current_status = "The train has not left yet."
    est_arrival = new Date()
    status = {"status": current_status, "estArrival": null, "lastUpdate": now}

  }
  else {
    get_station_status(status_data, now)
  }
}

function get_station_status(status_data, time) {
  var current_status = status_data[0].trainTimely
  var arrival_station = null
  var departure_station = null
  const stations = status_data[0].stations
  for (var i = 0; i < stations.length; i++) {
    const station = stations[i]
    if(station["code"] == config['departure_station']) {
      departure_station = station
    }
    else if(station["code"] == config['arrival_station']) {
      arrival_station = station
    }
  }
  const departed = "postDep" in departure_station
  const arrived = "postArr" in arrival_station
  if (departed && (!arrived)) {get_in_transit(arrival_station, time)}
  
  else if (arrived) {
    arr_time = new Date(arrival_station.postDep)
    status = {"status": "The train has already arrived", "estArrival": arr_time, "lastUpate": time}
  }

  else if (!departed) {
    get_not_departed(departure_station, time)
  }

}


function get_in_transit(arrival_data, time) {

  var status_ = arrival_data.estArrCmnt
  var est_arr_ = new Date(arrival_data.estArr)
  var sn = arrival_data.stationName
  parse_(sn, "arrive", status_, est_arr_, time)

}

function get_not_departed(departure_data, time) {
  var status_ = departure_data.estArrCmnt
  var est_dep_ = new Date(departure_data.estDep)
  var sn = departure_data.stationName
  parse_(sn, "depart", status_, est_dep_, time)

}

function parse_(station, type, status_, est_time, update_time) {

  var late = !(status_.search("LATE") == -1)
  ts = est_time.toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true })
  station_status_message = {"arrive": "arrive at", "depart": "leave"}
  late_status_message = {true: "is running a bit late", false: "is running on-time"}
  msg = `The train ${late_status_message[late]}, it is expected to ${station_status_message[type]} ${station} at ${ts}`
  status = {"status": msg, "estArrival": est_time, "lastUpdate": update_time}

}

function update_status(tn) {
  get_train_status(tn).then(ts => parse_status(ts))
}


app.get('/', (req, res) => {
  res.send(status)
})

app.listen(port, () => {
  update_status(config["train_number"])
  setInterval(function() {update_status(["train_number"]);}, 10*60*1000)
  console.log(`Example app listening on port ${port}`)
})