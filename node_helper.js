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
            setInterval(function() {self.updateCurrentLocation(theConfig); }, theConfig.refreshRateCurrLoc);

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

    updateDepBoard: function(theConfig) {

    },

    updateCurrLocation: function(theConfig) {

    },

    gotStopID: function(resParams) {
        if (resParams.id == "dep") {
            this.depStopID = resParams.stopID;
        } else {
            this.arrStopID = resParams.stopID;
        };
        this.sendSocketNotification("SYDTRAINS_GOT_STOPID", this.depStopID);
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
