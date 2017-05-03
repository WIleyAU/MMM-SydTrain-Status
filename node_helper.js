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


module.exports = NodeHelper.create({


    start: function () {
        console.log('Starting node helper: ' + this.name);
    },

    
    sendStopID: function (err, resParams) {
        var self = this;
        console.log("MMM-SydTrain-Status NodeHelper Notification Sending: MMM_SYDTRAINS_GOT_STOP_ID: ", resParams);
        self.sendSocketNotification("MMM_SYDTRAINS_GOT_STOP_ID", resParams);
        console.log("MMM-SydTrain-Status NodeHelper Notification Sent: MMM_SYDTRAINS_GOT_STOP_ID: ", resParams);
    },

   
    getStopID: function (params) {
        //getStopID: function (params, done) {
        var self = this;
        var stopName = params.name;
        var apiKey = params.apiKey;
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
                        "id": params.id,
                        "stopID": results[0]
                    };
                };
                self.sendSocketNotification("MMM_SYDTRAINS_GOT_STOP_ID", resParams);
            }
            else {
                console.log(" Error: " + response.statusCode);
            }
        });


        function logItems(err, pItems) {
            var resParams = {
                "id": params.id,
                "stopID": pItems[0]
            };

            console.log("MMM-SydTrain-Status NodeHelper Notification Sending: MMM_SYDTRAINS_GOT_STOP_ID: ", resParams);
            self.sendSocketNotification("MMM_SYDTRAINS_GOT_STOP_ID", resParams);
            console.log("MMM-SydTrain-Status NodeHelper Notification Sent: MMM_SYDTRAINS_GOT_STOP_ID: ", resParams);
            //done(null, resParams);
        };
    },

    getTrainBoard: function (tParams) {

        console.log("MMM-SydTrain-Status Initiating getTrainBoard Function...");
        var self = this;
        var arrID = tParams.depID;
        var depID = tParams.arrID;
        var depMacr = "dep";
        var tOffset = tParams.tOffset;
        var apiKey = tParams.apiKey;
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
                console.log("MMM-SydTrain-Status NodeHelper Sending Notification: MMM_SYDTRAINS_GOT_TRAINBOARD: ", results);
                this.sendSocketNotification("MMM_SYDTRAINS_GOT_TRAINBOARD", results);
                console.log("MMM-SydTrain-Status NodeHelper Notification Sent: MMM_SYDTRAINS_GOT_TRAINBOARD: ", results);

            }
            else {
                console.log(" Error: " + response.statusCode);
            }
        });



    },

    
    // Subclass socketNotificationReceived received.
    socketNotificationReceived: function (notification, payload) {
        var self = this;
        if (notification === 'MMM_SYDTRAINS_GET_STOP_ID') {
            console.log("MMM-SydTrain-Status GET_STOP_ID Notification Received: ", payload);
            //this.getStopID(payload, this.sendStopID);
            this.getStopID(payload);
        };
        if (notification === 'MMM_SYDTRAINS_GET_TRAINBOARD') {
            this.getTrainBoard(payload);
            console.log("MMM-SydTrain-Status NodeHelper Notification Received: ", notification);
        };

    },


});
