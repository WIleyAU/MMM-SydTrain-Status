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
        this.showMorn = false;
        this.showEve = false;
        this.hideSchedule = true;
    },

    
   
    
    // Subclass socketNotificationReceived received.
    socketNotificationReceived: function (notification, theConfig) {
        var self = this;
        if (notification === 'MMM-SydTrain-Status_CONFIG') {
            var self = this;
            this.getStopID(theConfig, "dep");
            setTimeout(function() {self.getStopID(theConfig, "arr"); }, 1500);

            //DETERMINE LIVE TRAIN SCHEDULE
            console.log("SYDTRAIN_STATUS calling UpdateShowCurrent function...");
            setTimeout(function() {self.updateShowCurrent(theConfig); }, 8000);
            setInterval(function() {self.updateShowCurrent(theConfig); }, theConfig.refreshRateCurrLoc);

            //DETERMINE DEPARTUREBOARD UPDATES
            setTimeout(function() {self.updateDepBoard(theConfig); }, 4000);
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

    updateShowCurrent: function(theConfig) {
        console.log("MMM-SydTrain-Status initiating updateShowCurrent function...");

        var now = new moment();
        if ((now.get("hour") >= moment(theConfig.mornTrain, "HH:mm").add(-3, "hour").get("hour")) && (now.get("hour") <= moment(theConfig.mornTrain, "HH:mm").add(2, "hour").get("hour"))) {
            this.showMorn = true;
            this.showEve = false;
        } else {
            this.showMorn = false;
        };
        if ((now.get("hour") >= moment(theConfig.eveTrain, "HH:mm").add(-2, "hour").get("hour")) && (now.get("hour") <= moment(theConfig.eveTrain, "HH:mm").add(3, "hour").get("hour"))) {
            this.showEve = true;
            this.showMorn = false;
        } else {
            this.showEve = false;
        };
        if (this.showMorn || this.showEve) {
            this.hideSchedule = false;
            console.log("MMM-SydTrain-Status calling updateCurrLocation function...");
            this.updateCurrLocation(theConfig);
        } else {
            if (!this.hideSchedule) {
                this.hideSchedule = true;
                console.log("MMM-SydTrain-Status sending socket notification: SYDTRAIN_HIDE_SCHEDULE");
                this.sendSocketNotification("SYDTRAIN_HIDE_SCHEDULE",0);   
                console.log("MMM-SydTrain-Status socket notification sent: SYDTRAIN_HIDE_SCHEDULE");
            }
        };
        console.log("MMM-SydTrain-Status updateShowCurrent this.showMorn = " + this.showMorn);
        console.log("MMM-SydTrain-Status updateShowCurrent this.mornTrain = " + theConfig.mornTrain);
        console.log("MMM-SydTrain-Status updateShowCurrent this.showEve = " + this.showEve);
        console.log("MMM-SydTrain-Status updateShowCurrent this.eveTrain = " + theConfig.eveTrain);
    },

    updateAutoSwitch: function(theConfig) {
        console.log("MMM_SYDTRAIN-STATUS starting updateAutoSwitch function");
        console.log("MMM-SYDTRAIN-STATUS theCOnfig.autoSwitch: " + theConfig.autoSwitch);
        if (theConfig.autoSwitch == "") {
            this.autoS = false;
        } else {
            if ((moment().get("hour") < moment(theConfig.autoSwitch, "HH:mm").get("hour"))) {
                this.autoS = false;
            } else {
                if (moment().get("hour") == moment(theConfig.autoSwitch, "HH:mm").get("hour")) {
                    if (moment().get("minute") <= moment(theConfig.autoSwitch, "HH:mm").get("minute")) {
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
                "Authorization": apiKey
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
        console.log("MMM-SydTrain-Status Initiating updateCurrLocation function...");
        var self=this;
        if (!this.autoS) {
            var trainTime = moment(theConfig.mornTrain, "HH:mm").format("HHmm");
            var depID = this.depStopID;
            var arrID = this.arrStopID;
            var depMacr = "arr";
        } else {
            var trainTime = moment(theConfig.eveTrain, "HH:mm").format("HHmm");
            var depID = this.arrStopID;
            var arrID = this.depStopID;
            var depMacr = "dep";
        };
        var trainDate = new moment().format("YYYYMMDD");
        var apiKey = "apikey " + theConfig.apiKey;
        var results = [];
        var testObj = {};
        var tempURL = "https://api.transport.nsw.gov.au/v1/tp/trip?";
        var finURL = "";
        var qOptions = {
            "outputFormat": "rapidJSON",
            "coordOutputFormat": "EPSG:4326",
            "depArrMacro": depMacr,
            "itdDate": trainDate,
            "itdTime": trainTime,
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
                "Authorization": apiKey
            },
            encoding: null
        };
        console.log("MMM-SydTrain-Status initiating updateCurrLocation HTTP request...");
        request(requestSettings, function (error, response, body) {

            console.log("MMM-SydTrain-Status updateCurrLocation response code: " + response.statusCode);

            if (!error && response.statusCode == 200) {
                
                var items = JSON.parse(body);

                var jCount = 0;
                var journeys = items["journeys"];
                var tripDetails = [];
                var stopDetails = [];
                var legs = journeys[0]["legs"];
                var fares = journeys[0]["fare"];
                var ttlDuration = 0;
                var summary = [];
                var legNumber = 0;
                var depart = new moment();
                var arrive = new moment();

                var currLoc = {};
                var prevStop = "";
                var currStop = "";
                var nxtStop = "";
                var delay = 0;
                var schImage = "";
                var schPos = "";
                var currVehicle = "";
                var now = new moment().format("DD-MM-YYYY HH:mm");

                legs.forEach(function (leg) {
                    var stops = leg["stopSequence"];
                    for (i = 0; i < stops.length; i++) {
                        if (i < stops.length - 1) {
                            if (stops[i]["departureTimePlanned"]) {
                                stopDetails.push({
                                    "stopName": stops[i]["name"],
                                    "scTime": moment.utc(stops[i]["departureTimePlanned"]).local().format("DD-MM-YYYY HH:mm"),   //departure
                                    "rlTime": moment.utc(stops[i]["departureTimeEstimated"]).local().format("DD-MM-YYYY HH:mm")
                                });
                                if (moment.utc(stops[i]["departureTimeEstimated"]).local().format("DD-MM-YYYY HH:mm") < now) {
                                    if (i == 0) {
                                        prevStop = "WAITING";
                                        schImage = "SchedTrip_AtDep.png";
                                    } else {
                                        prevStop = stops[i]["name"];
                                        schImage = "SchedTrip_InTransit.png";
                                        var posCalc = 0;
                                        var ti = i+1;
                                        var prevTime = moment.utc(stops[i]["departureTimeEstimated"]).local().format("DD-MM-YYYY HH:mm");
                                        var nxtTime = moment.utc(stops[ti]["arrivalTimeEstimated"]).local().format("DD-MM-YYYY HH:mm");
                                        posCalc = moment.duration(moment(now).diff(prevTime))/moment.duration(moment(nxtTime).diff(prevTime));
                                        console.log("MMM-SYDTRAIN-STATS posCalc: " + posCalc);
                                        console.log("MMM-SYDTRAIN-STATS posCalc now: " + moment(now).format());
                                        console.log("MMM-SYDTRAIN-STATS posCalc prevTime: " + moment(prevTime).format());
                                        console.log("MMM-SYDTRAIN-STATS posCalc nxtTime: " + moment(nxtTime).format());
                                        console.log("MMM-SYDTRAIN-STATS posCalc nxtStop: " + stops[i+1]["arrivalTimeEstimated"]);
                                        console.log("MMM-SYDTRAIN-STATS posCalc stop[i]: " + i);
                                        console.log("MMM-SYDTRAIN-STATS posCalc stops: " + stops.length);
                                        console.log("MMM-SYDTRAIN_STATS posCalc prev: " + moment.duration(moment(now).diff(prevTime)));
                                        console.log("MMM-SYDTRAIN_STATS posCalc prev2: " + moment.duration(moment(nxtTime).diff(prevTime)));
                                        console.log("MMM-SYDTRAIN-STATS posCalc diff: " + moment.duration(moment(now).diff(prevTime))/moment.duration(moment(nxtTime).diff(prevTime)));
                                        if (posCalc<0.05)  {
                                            schPos = "schPos1";
                                        } else  if (posCalc<0.35) {
                                            schPos = "schPos2";
                                        } else if (posCalc<0.65) {
                                            schPos = "schPos3";
                                        } else {
                                            schPos = "schPos4";
                                        };
                                    };
                                };
                                if ((moment.utc(stops[i]["arrivalTimeEstimated"]).local().format("DD-MM-YYYY HH:mm") <= now) && (moment.utc(stops[i]["departureTimeEstimated"]).local().format("DD-MM-YYYY HH:mm") >= now)) {
                                    currStop = stops[i]["name"];
                                    nxtStop = stops[i + 1]["name"];
                                    schImage = "TripSched_AtStop.png";
                                    schPos = "schPos3";
                                };
                                if ((moment.utc(stops[i]["departureTimeEstimated"]).local().format("DD-MM-YYYY HH:mm") > now) && (nxtStop == "")) {
                                    nxtStop = stops[i]["name"];
                                    delay = moment(stops[i]["arrivalTimeEstimated"]).diff(moment(stops[i]["arrivalTimePlanned"]), "minutes");
                                };
                            };
                        } else {
                            stopDetails.push({
                                "stopName": stops[i]["name"],
                                "scTime": moment.utc(stops[i]["arrivalTimePlanned"]).local().format("DD-MM-YYYY HH:mm"),
                                "rlTime": moment.utc(stops[i]["arrivalTimeEstimated"]).local().format("DD-MM-YYYY HH:mm")
                            });
                            if (moment.utc(stops[i]["arrivalTimeEstimated"]).local().format("DD-MM-YYYY HH:mm") <= now) {
                                currStop = stops[i]["name"];
                                nxtStop = "ARRIVED";
                                delay = moment(stops[i]["arrivalTimeEstimated"]).diff(moment(stops[i]["arrivalTimePlanned"]), "minutes");
                                schImage = "SchedTrip_AtArr.png";
                            };
                        };
                    };
                });
                if (currStop == "") {
                    currStop = "IN-TRANSIT";
                };
                currLoc = {
                    "prevStop": prevStop,
                    "currStop": currStop,
                    "nxtStop": nxtStop,
                    "del": delay,
                    "schImage": schImage,
                    "schPos": schPos
                };

                legs.forEach(function (leg) {

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
                    "id": 0,
                    "dep": depart,
                    "arr": arrive,
                    "dur": minutes,
                    "summ": summary
                });




                var results = {
                    "currLoc": currLoc,
                    "currTripStops": stopDetails,
                    "tripSumm": tripDetails
                };

                console.log("MMM-SydTrain-Status calling gotSchedule function...");
                self.gotSchedule(results);

            }
            else {
                console.log(" Error: " + response.statusCode);
            }
        });
    },

    gotSchedule: function(results) {
        console.log("MMM-SydTrain-Status initiating gotSchedule function...");
        if (this.showMorn) {
            var tPeriod = "morn";
        } else {
            var tPeriod = "eve";
        };
        var retRes = {
            "period":tPeriod,
            "results": results};
        console.log("MMM-SYDTRAIN_STATUS sending socket notification: SYDTRAIN_SCH_UPDATE");
        this.sendSocketNotification("SYDTRAIN_SCH_UPDATE", retRes);
        console.log("MMM-SYDTRAIN_STATUS socket notification sent: SYDTRAIN_SCH_UPDATE");
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
