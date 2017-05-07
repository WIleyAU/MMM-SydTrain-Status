/* Magic Mirror
 * Module: MMM-SydTrain-Status
 *
 * By Scott Kemble
 * Apache Licensed.
 */

Module.register('MMM-SydTrain-Status', {

    defaults: {
        updateInterval: 20000,
        animationSpeed: 1000,
        header: '',
        apiKey: "",
        departure: "Leura",
        arrival: "Central",
        depAfter: true,
        autoSwitch: "14:30",
        mornTrain: "08:45",
        eveTrain: "17:06",
        showIncidents: false,
        refreshRateIncidents: 10*60*1000,
        refreshRateDepBoard: 5*60*1000,
        refreshRateCurrLoc: 20*1000,
        timeOffset: 120,  //minutes
        loadingText: "Loading SydTrain Status..."
    },

    start: function () {
        //self = this;
        Log.log("Starting module: " + this.name);
        this.depStopID = "";
        this.url = '';
        this.config.dispSched = false;
        this.depLoaded = false;
        this.schLoaded = false;
        this.incLoaded = false;
        this.firstUpdateDOMFlag = false;
        this.errorMessage = null;
        this.departureBoard = {};
        this.currentLocation = {};
        this.incidents = {};
        if (this.config.apiKey !== "") {
            this.sendSocketNotification('MMM-SydTrain-Status_CONFIG', this.config);
        } else {
            this.errorMessage = 'Error: Missing API Key';
        };
        var self = this;
        setTimeout(function () { self.firstUpdateDOM(); }, 2000);
    },

    firstUpdateDOM: function () {
        this.firstUpdateDOMFlag = true;
        this.updateDom();
    },

    socketNotificationReceived: function(notification, payload) {
        if (notification === "SYDTRAIN_DEPBOARD_UDPATE") {
            this.departureBoard = payload;
            this.depLoaded = true;
            if (this.firstUpdateDOMFlag) {
                this.updateDom();
            };
        };
        if (notification === "SYDTRAIN_SCH_UPDATE") {
            this.currentLocation = payload;
            this.schLoaded = true;
            if (this.firstUpdateDOMFlag) {
                this.updateDom();
            };
        };
        if (notification === "SYDTRAIN_INCIDENT_UPDATE") {
            this.incidents = payload;
            this.incLoaded = true;
            if (this.firstUpdateDOMFlag) {
                this.updateDom();
            };
        };
        if (notification === "SYDTRAINS_GOT_STOPID") {
            this.depStopID = payload;
            var self = this;
            setTimeout(function () { self.updateDom(); }, 2000);
            this.updateDom();
        };
        if (notification === "SYDTRAIN_ERROR") {
            this.errorMessage = "Error: Too Many REST Failures";
            this.updateDom();
        };
    },
   



    getStyles: function () {
        return ["sydtrainstats.css"]
    },

    // Override dom generator.

    getDom: function () {

        if (this.errorMessage !== null) {
            var wrapper = document.createElement("div");
            wrapper.className = "small";
            wrapper.innerHTML = this.errorMessage;
            return wrapper;
        };

        var wrapper = document.createElement("div");
        wrapper.innerHTML = this.depStopID;


        //DEPBOARD DOM FORMATTING


        //SCH DOM FORMATTING

       

        return wrapper;
    }


});
