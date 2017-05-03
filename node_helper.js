/* Magic Mirror
 * Module: MMM-SydTran-Status
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

    
    sendStopID: function (err, resParams) {
        this.sendSocketNotification("MMM_SYDTRAINS_GOT_STOP_ID", resParams);
        console.log("MMM-SydTrain-Status NodeHelper Notification Sent: MMM_SYDTRAINS_GOT_STOP_ID: ", resParams);
    },

   

    getStopID: function (params, done) {
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

    
    // Subclass socketNotificationReceived received.
    socketNotificationReceived: function (notification, payload) {
        if (notification === 'MMM_SYDTRAINS_GET_STOP_ID') {
            console.log("MMM-SydTrain-Status NodeHelper Notification Received: ", notification);
            this.getStopID(payload, this.sendStopID);
        };

    },


});
