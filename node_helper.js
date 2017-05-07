/* Magic Mirror
 * Module: MMM-SydTran-Status
 *
 * By Scott Kemble
 * Apache 2.0 Licensed.
 */

var NodeHelper = require('node_helper');
var request = require("request");
var querystring = require("querystring");
var moment = require("moment");
const errorFailureLimit = 5;

module.exports = NodeHelper.create({


    start: function () {
        console.log('Starting node helper: ' + this.name);
        this.stopUpdates = false;
        this.errorCount = 0;
        this.depStopID = "";
        this.arrStopID = "";
        this.autoS = false;
    },

    
   
    
    // Subclass socketNotificationReceived received.
    socketNotificationReceived: function (notification, theConfig) {
        var self = this;
        if (notification === 'MMM-SydTrain-Status_CONFIG') {
            console.log("MMM-SydTrain-Status GET_STOP_ID Notification Received: ", theConfig);
            var self = this;
            this.getStopID(theConfig, "dep");
            setTimeout(function() {self.getStopID(theConfig, "arr"); }, 1500);

            //DETERMINE LIVE TRAIN SCHEDULE
            setTimeout(function() {self.updateCurrLocation(theConfig); }, 4000);
            setInterval(function() {self.updateCurrLocation(theConfig); }, theConfig.refreshRateCurrLoc);

            //DETERMINE DEPARTUREBOARD UPDATES
            setTimeout(function() {self.updateDepBoard(theConfig); }, 5000);
            setInterval(function() {self.updateDepBoard(theConfig); }, theConfig.refreshRateDepBoard);

            //Determine Incident Updates
            if (theConfig.showIncidents) {
                setTimeout(function() {self.updateIncidents(theConfig); }, 6000);
                setInterval(function() {self.updateIncidents(theConfig); }, theConfig.refreshRateIncidents);
            };

            return;
        };
    },

    updateIncidents: function(theConfig) {

    },

    updateAutoSwitch: function(theConfig) {
        console.log("MMM_SYDTRAIN-STATUS starting updateAutoSwitch function"):
        console.log("MMM-SYDTRAIN-STATUS theCOnfig.autoSwitch: " + theConfig.autoSwitch);
        if (theConfig.autoSwitch == "") {
            this.autoS = false;
        } else {
            if ((moment().get("hour") < moment(theConfig.autoSwitch, "HH:mm").get("hour"))) {
                this.autoS = false;
            } else {
                if (moment().get("hour") == moment(this.config.autoSwitch, "HH:mm").get("hour")) {
                    if (moment().get("minute") <= moment(this.config.autoSwitch, "HH:mm").get("minute")) {
                        this.autoS = false;
                    } else {
                        this.autoS = true;
                    };
                } else {
                    this.autoS = true;
                };
            };
        };
    },

    updateDepBoard: function(theConfig) {
        this.updateAutoSwitch(theConfig);
        console.log("MMM-SydTrain-Status Initiating getTrainBoard Function...");
        var self = this;
        if (this.autoS) {
            var arrID = this.depStopID;
            var depID = this.arrStopID;
            var tOffset = theConfig.timeOffset * -1
        } else {
            var arrID = this.arrStopID;
            var depID = this.depStopID;
            var tOffset = 0
        };
        var depMacr = "dep";
        var apiKey = "apikey " + theConfig.apiKey;
        var now = new moment();
        var nowDate = moment(now).add(tOffset, 'm').format("YYYYMMDD");
        var nowTime = moment(now).add(tOffset, 'm').format("HHmm");
        //var results = [];
        var testObj = {};
        var tempURL = "https://api.transport.nsw.gov.au/v1/tp/trip?";
        var finURL = "";
        var qOptions = {
            "outputFormat": "rapidJSON",
            "coordOutputFormat": "EPSG:4326",
            "depArrMacro": depMacr,
            "itdDate": nowDate,
            "itdTime": nowTime,
            "type_origin": "stop",
            "name_origin": depID,   //depID
            "type_destination": "stop",
            "name_destination": arrID,  //arrID
            "TfNSWTR": "true"
        };
        finURL = tempURL + querystring.stringify(qOptions);

        var requestSettings = {
            method: "GET",
            url: finURL,
            headers: {
                "Accept": "application/json",
                "Authorization": "apikey guuB5I4bVgHRYRV6o3PURPlKPVJrbGkTstvz"
            },
            encoding: null
        };

        request(requestSettings, function (error, response, body) {

            console.log("MMM-SydTrain-Status getTrainBoard Request response: ", response.statusCode);

            if (!error && response.statusCode == 200) {

                var items = JSON.parse(body);

                var jCount = 0;
                var journeys = items["journeys"];
                var tripDetails = [];
                var stopDetails = [];

                for (ji = 0; ji < journeys.length; ji++) {
                    var legs = journeys[ji]["legs"];
                    var fares = journeys[ji]["fare"];
                    var ttlDuration = 0;
                    var summary = [];
                    var legNumber = 0;
                    var depart = new moment();
                    var arrive = new moment();
                    var fLegStopSeq = legs[0].stopSequence;
                    var lLegStopSeq = legs[legs.length - 1].stopSequence;


                    var depDelay = 0;
                    depDelay = moment(fLegStopSeq[0]["departureTimeEstimated"]).diff(moment(fLegStopSeq[0]["departureTimePlanned"]), "minutes");
                    var arrDelay = 0;
                    arrDelay = moment(lLegStopSeq[lLegStopSeq.length - 1]["arrivalTimeEstimated"]).diff(moment(lLegStopSeq[lLegStopSeq.length - 1]["arrivalTimePlanned"]), "minutes");

                    legs.forEach(function (leg) {

                        //console.log("stopSequence=== ", leg.stopSequence);

                        ttlDuration += leg["duration"];
                        var origin = leg["origin"];
                        // console.log("DepTimePl: " + origin["departureTimePlanned"]);
                        var destination = leg["destination"];

                        if (legNumber == 0) {
                            depart = moment.utc(origin["departureTimePlanned"]).local().format("DD-MM-YY HH:mm");
                        };
                        if (legNumber == legs.length - 1) {
                            arrive = moment.utc(destination["arrivalTimePlanned"]).local().format("DD-MM-YY HH:mm");
                        };
                        var transportation = leg["transportation"];

                        var routeType = transportation["product"]["class"];

                        switch (routeType) {
                            case 1: summary.push("Train"); break;
                            case 4: summary.push("Light Rail"); break;
                            case 5: summary.push("Bus"); break;
                            case 7: summary.push("Coach"); break;
                            case 9: summary.push("Ferry"); break;
                            case 11: summary.push("School Bus"); break;
                            case 99: summary.push("Walk"); break;
                            case 100: summary.push("Walk"); break;
                        };

                        legNumber++;
                    });

                    // console.log("StopDetails: ",stopDetails);
                    var minutes = ttlDuration / 60;
                    // console.log(depart + " - " + arrive + " : " + minutes + "mins");
                    // console.log(summary);
                    tripDetails.push({
                        "id": ji,
                        "dep": depart,
                        "arr": arrive,
                        "dur": minutes,
                        "depDel": depDelay,
                        "arrDel": arrDelay,
                        "summ": summary
                    });

                };


                var results = {
                    "depBoard": tripDetails
                };
                self.gotDepBoard(results);
            }
            else {
                console.log(" Error: " + response.statusCode);
            }
        });
    },

    gotDepBoard: function(results) {
        var retRes = {
            "autoS": this.autoS,
            "results": results
        };
        console.log("MMM-SYDTRAIN-STATUS sending notification: SYDTRAIN_DEPBOARD_UDPATE");
        this.sendSocketNotification("SYDTRAIN_DEPBOARD_UDPATE",retRes);
        console.log("MMM-SYDTRAIN-STATUS notification sent: SYDTRAIN_DEPBOARD_UDPATE");
    },

    updateCurrLocation: function(theConfig) {

    },

    gotStopID: function(resParams) {
        if (resParams.id == "dep") {
            this.depStopID = resParams.stopID;
        } else {
            this.arrStopID = resParams.stopID;
        };
    },

    getStopID: function(theConfig, direction) {
        //getStopID: function (params, done) {
        var self = this;
        if (direction == "dep") {
            var stopName = theConfig.departure;
        } else {
            var stopName = theConfig.arrival;
        };
        var apiKey = "apikey " + theConfig.apiKey;
        var results = [];
        var qOptions = {
            "outputFormat": "rapidJSON",
            "type_sf": "stop",
            "name_sf": stopName,
            "coordOutputFormat": "EPSG:4326",
            "anyMaxSizeHitList": 10,
            "tfNSWSF": "true",
            "version": "10.2.1.15"
        };
        var baseURL = "https://api.transport.nsw.gov.au/v1/tp/stop_finder?";
        var finURL = baseURL + querystring.stringify(qOptions);

        console.log("MMM-SydTrain-Status Initiating getStopID Function...");

        var requestSettings = {
            method: "GET",
            url: finURL,
            headers: {
                "Accept": "application/json",
                "Authorization": apiKey
            },
            encoding: null
        };

        request(requestSettings, function (error, response, body) {

            console.log("MMM-SydTrain-Status getStopID Request Response: ", response.statusCode);

            if (!error && response.statusCode == 200) {
                var items = JSON.parse(body);

                items.locations.forEach(function (items) {
                    items.assignedStops.forEach(function (assStop) {
                        if (assStop.hasOwnProperty("modes")) {
                            var tempModes = assStop.modes;
                            if (tempModes.indexOf(1) > -1) {
                                results.push(items.id);
                            };
                        };
                    });
                });
              
                if (results.length != 1) {
                    var resParams = {
                        "id": params.id,
                        "stopID": "NOT A VALID STOP NAME"
                    };
                } else {
                    var resParams = {
                        "id": direction,
                        "stopID": results[0]
                    };
                };
                self.gotStopID(resParams);
            }
            else {
                console.log(" Error: " + response.statusCode);
            }
        });

    },

});
