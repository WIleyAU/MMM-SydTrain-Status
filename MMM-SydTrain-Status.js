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
        loadingText: "Loading SydTrain Status..."
    },

    start: function () {
        //self = this;
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
        this.schedTrainHead = "";
        this.boardTrainOutput = "Loading...";
        this.boardTrainHead = "";
        this.getStopIDs();
        this.getTrains();
    },


    getStopIDs: function () {

        Log.log("MMM-SydTrain-Status Initiating getSTopIDs function...");

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


   

    scheduleUpdate: function () {

        console.log("MMM-SydTrain-Status initialising scheduleUpdate function...");

        this.updateDom(this.config.animationSpeed);
        setInterval(function () {
            self.updateDom(this.config.animationSpeed);
            console.log('update')
            //}, this.config.updateInterval);
        }, 1000);
    },



    gotStopID: function(params) {

        console.log("MMM-SydTrain-Status initiating gotStopID function...");

        if (params.id == "departure") {
            this.depStopID = params.stopID;
            if (this.arrStopID != "") {
                this.loaded = true;
            };
        };
        if (params.id == "arrival") {
            this.arrStopID = params.stopID;
            if (this.depStopID != "") {
                this.loaded = true;
            };
        };
        this.updateDom(this.config.animationSpeed);
    },

    gotTrainBoard: function (payload) {

        console.log("MMM-SydTrain-Status initialising gotTrainBoard function...");

        if (this.autoS) {
            var depStat = this.config.arrival;
            var arrStat = this.config.departure;
            this.baordTrainHead = this.config.departure + " - ARRIVALS";
        } else {
            var depStat = this.config.departure;
            var arrStat = this.config.arrival;
            this.baordTrainHead = this.config.departure + " - DEPARTURES";
        };

        var htmlText = "<tr><th>DEPART</th><th>TIME</th><th>ARRIVE</th><th>TIME</th><th>MINS</th><th>DELAY</th></tr>";
        payload.depBoard.forEach(function (leg) {
            var depTime = leg.dep;
            var arrTime = leg.arr;
            var dur = leg.dur;
            if (this.autoS) {
                var del = leg.arrDel;
            } else {
                var del = leg.depDel;
            };
            htmlText = htmlText + "<tr><td>" + depStat + "</td><td>" + depTime + "</td><td>" + arrStat + "</td><td>" + arrTime + "</td><td>" + dur + "</td><td>" + del + "</td></tr>";
            var summary = "";
            var summ = leg.summ;
            for (i = 0; I < summ.length; i++) {
                if (i < summ.length - 1) {
                    summary = summary + summ[i] + "  -->  ";
                } else {
                    summary = summary + summ[i];
                };
            };
            htmlText = htmlText + '<tr><td colspan="6">' + summary + '</td></tr>';

        });
        this.BoardTrainOutput = htmlText;
        this.updateDom(this.config.animationSpeed);
    },

    

    getTrains: function () {

        Log.log("MMM-SydTrain-Status initiating getTrains function...");

        //DETERMINE WHETHER TO SWITCH DEPARTUER BOARD TO ARRIVALS
        if (this.config.autoSwitch == "") {
            this.autoS = false;
        } else {
            if ((moment().get("hour") < moment(this.config.autoSwitch, "HH:mm").get("hour"))) {
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


        function getTBoard() {

            console.log("MMM-SydTrain-Status initiating getTBoard function...");

            if (this.loaded) {
                if (this.autoS) {
                    var tParams = {
                        "depID": this.arrStopID,
                        "arrID": this.depStopID,
                        "tOffset": this.timeOffset * -1,
                        "apiKey": this.fullAPIKey
                    };
                } else {
                    var tParams = {
                        "depID": this.depStopID,
                        "arrID": this.arrStopID,
                        "tOffset": 0,
                        "apiKey": this.fullAPIKey
                    };
                };
                console.log("MMM-SydTrain-Status sending socket notification: MMM_SYDTRAINS_GET_TRAINBOARD");
                this.sendSocketNotification("MMM_SYDTRAINS_GET_TRAINBOARD", tParams);
                console.log("MMM-SydTrain-Status socket notification sent: MMM_SYDTRAINS_GET_TRAINBOARD");
            };
        };



        Log.log("MMM-SydTrain-Status Initiating getTBoard function...");
        getTBoard();
        // needTSched(getTSched);

        setInterval(function () {
            getTBoard();
        }, this.config.updateInterval);

    },



   

    

    socketNotificationReceived: function (notification, payload) {

        console.log("MMM-SydTrain-Status socket notification received...");

        if (notification === "MMM_SYDTRAINS_GOT_STOP_ID") {
            console.log("MMM-SydTrain-Status socket notification received: MMM_SYDTRAINS_GOT_STOP_ID");
            console.log("MMM-SydTrain-Status calling gotStopID function...");
            this.gotStopID(payload);
            this.updateDom(this.config.animationSpeed);
        };
        if (notification === "MMM_SYDTRAINS_GOT_TRAINBOARD") {
            console.log("MMM-SydTrain-Status socket notification received: MMM_SYDTRAINS_GOT_TRAINBOARD");
            console.log("MMM-SydTrain-Status calling gotTrainBoard function...");
            gotTrainBoard(payload);
            this.updateDom(this.config.animationSpeed);
        };

        if (notification === "MMM_SYDTRAINS_ERROR") {
            console.log("MMM-SydTrain-Status socket notification received: MMM_SYDTRAINS_ERROR");
            console.log(payload);
        };
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

        /*
        //added for testing purposes only
        if (this.loaded) {
            wrapper.innerHTML = "" + "DepID:" + this.depStopID + " - ArrID:" + this.arrStopID;
        } else {
            wrapper.innerHTML = this.config.loadingText;
        };
        */
        wrapper.innerHTML = this.boardTrainOutput;
       

       
       

        //name.innerHTML = "" + this.url;
        //name.innerHTML = "" + "DepID:" + this.depStopID + " / ArrID:" + this.arrStopID;


        //header.appendChild(name);
        //wrapper.appendChild(header);
        //wrapper.appendChild(image);

        return wrapper;
    }


});
