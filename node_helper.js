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
        this.fullAPIKey = "apikey " + this.config.apiKey;
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
            this.fullAPIKey = "apiKey " + theConfig.apiKey;
            this.getStopID(theConfig.departure);
            setTimeout(function() {self.getStopID(theConfig.arrival); }, 1500);

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

    getStopIDs: function(stopName) {

    },
});
