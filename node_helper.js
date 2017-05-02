/* Magic Mirror
 * Module: MMM-SydTran-Stats
 *
 * By Scott Kemble
 * Apache 2.0 Licensed.
 */

var request = require("request");
var querystring = require("querystring");
var moment = require("moment");


module.exports = NodeHelper.create({


    start: function () {
        console.log('Starting node helper: ' + this.name);
    },

    // Subclass socketNotificationReceived received.
    socketNotificationReceived: function (notification, payload) {
        if (notification === 'MMM_SYDTRAINS_GET_STOP_ID') {
            this.getStopID(payload, sendStopID);
        };
        if (notification === 'MMM_SYDTRAINS_GET_TRAINBOARD') {
            this.getTrainBoard(payload, sendTrainBoard);
        };
        if (notification === 'MMM_SYDTRAINS_GET_TRAINSCHEDULE') {
            this.getTrainSchedule(payload, sendTrainSchedule);
        };
    },


    sendStopID: function (err, resParams) {
        this.sendSocketNotification("MMM_SYDTRAINS_GOT_STOP_ID", resParams);
        console.log("resParams: ", resParams);
    },

    sendTrainBoard: function (err, resParams) {
        this.sendSocketNotification("MMM_SYDTRAINS_GOT_TRAINBOARD", resParams);
        console.log("resParams Callback Test: ", resParams);
    },

    sendTrainSchedule: function(err, resParams) {
        this.sendSocketNotification("MMM_SYDTRAINS_GOT_TRAINSCHEDULE", resParams);
        console.log("resParams Callback Test: ", resParams);
    },

    getStopID: function (params, done) {
        var stopName = params.name;
        var apiKey = params.apiKey;
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
                    logItems("NOT A VALID STATION NAME")
                } else {
                    logItems(null, results[0]);
                };

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
            done(null, resParams);
        };
    },

    getTrainBoard: function (tParams, done) {
        var arrID = tParams.depID;
        var depID = tParams.arrID;
        var depMacr = "dep";
        var tOffset = tParams.tOffset;
        var apiKey = tParams.apiKey;
        var now = new moment();
        var nowDate = moment(now).add(tOffset, 'm').format("YYYYMMDD");
        var nowTime = moment(now).add(tOffset, 'm').format("HHmm");
        var results = [];
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
            if (!error && response.statusCode == 200) {

                var items = JSON.parse(body);

                var jCount = 0;
                var journeys = items["journeys"];
                var tripDetails = [];
                var stopDetails = [];

                for (ji=0;ji<journeys.length;ji++) {
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
                        if (legNumber == legs.length -1) {
                            arrive = moment.utc(destination["arrivalTimePlanned"]).local().format("DD-MM-YY HH:mm");
                        };
                        var transportation = leg["transportation"];

                        var routeType = transportation["product"]["class"];

                        switch(routeType) {
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
                logItems(null, results);
       
            }
            else {
                console.log(" Error: " + response.statusCode);
            }
        });

        function logItems(err, pItems) {
            var resParams = pItems;
            done(null, resParams);
        };

    },

    getTrainSchedule: function (tParams, done) {

        if (moment().get("hour") < 12) {
            var trainTime = moment(tParams.mornTrain, "HH:mm").format("HHmm");
            var depID = tParams.depID;
            var arrID = tParams.arrID;
            var depMacr = "arr";
        } else {
            var trainTime = moment(tParams.eveTrain, "HH:mm").format("HHmm");
            var depID = tParams.arrID;
            var arrID = tParams.depID;
            var depMacr = "dep";
        };
        var trainDate = new moment().format("YYYYMMDD");
        var apiKey = tParams.apiKey;
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
                "Authorization": "apikey guuB5I4bVgHRYRV6o3PURPlKPVJrbGkTstvz"
            },
            encoding: null
        };

        request(requestSettings, function (error, response, body) {
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
                                    } else {
                                        prevStop = stops[i]["name"];
                                    };
                                };
                                if ((moment.utc(stops[i]["arrivalTimeEstimated"]).local().format("DD-MM-YYYY HH:mm") <= now) && (moment.utc(stops[i]["departureTimeEstimated"]).local().format("DD-MM-YYYY HH:mm") >= now)) {
                                    currStop = stops[i]["name"];
                                    nxtStop = stops[i + 1]["name"];
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
                    "del": delay
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
                logItems(null, results);

            }
            else {
                console.log(" Error: " + response.statusCode);
            }
        });

        function logItems(err, pItems) {
            var resParams = pItems;
            done(null, resParams);
        };
    },



});
