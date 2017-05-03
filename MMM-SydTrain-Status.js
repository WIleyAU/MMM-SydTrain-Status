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
        timeOffset: 120,  //minutes
        loadingText: "Loading..."
    },

    start: function () {
        self = this;
        this.url = '';
        this.fullAPIKey = "apikey " + this.config.apiKey;
        this.depStopID = "";
        this.arrStopID = "";
        this.autoS = false;
        this.activeItem = 0;
        this.dispSched = false;
        this.loaded = false;
        this.currTrainLoc = {};
        this.schedTrainOutput = "";
        this.schedTrainHead = ""
        this.boardTrainOutput = "";
        this.boardTrainHead = "";
        this.getStopIDs();
        //this.getTrains();
    },


    getStopIDs: function () {

        console.log("MMM-SydTrain-Status Initiating getSTopIDs function...");

        if (this.depStopID == "") {
            var dParams = {
                "id": "departure",
                "name": this.config.departure,
                "apiKey": this.fullAPIKey
            };
            console.log("MMM-SydTrain-Status sending DEPARTURE notification: MMM_SYDTRAINS_GET_STOP_ID");
            this.sendSocketNotification("MMM_SYDTRAINS_GET_STOP_ID", dParams);
        };
        if (this.arrStopID == "") {
            var aParams = {
                "id": "arrival",
                "name": this.config.arrival,
                "apiKey": this.fullAPIKey
            };
            console.log("MMM-SydTrain-Status sending ARRIVAL notification: MMM_SYDTRAINS_GET_STOP_ID");
            this.sendSocketNotification("MMM_SYDTRAINS_GET_STOP_ID", aParams);
        };
    },


    socketNotificationReceived: function(notification, payload) {

        console.log("MMM-SydTrain-Status socket notification received...");

        if (notification === "MMM_SYDTRAINS_GOT_STOP_ID") {
            console.log("MMM-SydTrain-Status socket notification received: MMM_SYDTRAINS_GOT_STOP_ID");
            console.log("MMM-SydTrain-Status calling gotStopID function...");
            gotStopID(payload);
            if (!this.loaded) {
                this.updateDom(this.config.animationSpeed);
            }
        };
       
        if (notification === "MMM_SYDTRAINS_ERROR") {
            console.log("MMM-SydTrain-Status socket notification received: MMM_SYDTRAINS_ERROR");
            console.log(payload);
        };
    },

    scheduleUpdate: function () {

        console.log("MMM-SydTrain-Status initialising scheduleUpdate function...");

        this.updateDom(this.config.animationSpeed);
        setInterval(function () {
            self.updateDom(this.config.animationSpeed);
            console.log('update')
        }, this.config.updateInterval);
    },



    gotStopID: function(params) {

        console.log("MMM-SydTrain-Status initiating gotStopID function...");

        if (params.id == "departure") {
            this.depStopID = params.stopID;
        };
        if (params.id == "arrival") {
            this.arrStopID = params.stopID;
        };
        //added for testing purposes only
        this.updateDom(this.config.animationSpeed);
        scheduleUpdate();
    },

   



    getStyles: function () {
        return ["sydtrainstats.css"]
    },

    // Override dom generator.

    getDom: function () {

        console.log("MMM-SydTrain-Status initiating getDom function...");

        var wrapper = document.createElement("div");
        var header = document.createElement("header");
        var name = document.createElement("span");

        if (!this.loaded) {
            wrapper.innerHTML = "Loading SydTrain Status...";
            return wrapper;
        }


       

        //name.innerHTML = "" + this.url;
        name.innerHTML = "" + "DepID:" + this.depStopID + " / ArrID:" + this.arrStopID;


        header.appendChild(name);
        wrapper.appendChild(header);
        //wrapper.appendChild(image);

        return wrapper;
    }


});
