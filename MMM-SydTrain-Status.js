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
        this.getTrains();
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


    getTrains: function () {

        console.log("MMM-SydTrain-Status initiating getTrains function...");
        
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

        getTBoard();
        needTSched(getTSched);
    },

    needTSched: function (getTSched) {

        console.log("MMM-SydTrain-Status initiating needTSched function...);

        var now = new moment();
        var showMorn = false;
        var showEve = false;
        if ((now.get("hour") >= moment(mornTrain, "HH:mm").add(-3, "hour").get("hour")) && (now.get("hour") <= moment(mornTrain, "HH:mm").add(2, "hour").get("hour"))) {
            showMorn = true;
        };
        if ((now.get("hour") >= moment(eveTrain, "HH:mm").add(-2, "hour").get("hour")) && (now.get("hour") <= moment(eveTrain, "HH:mm").add(3, "hour").get("hour"))) {
            showEve = true;
        };
        if (showMorn || showEve) {
            this.dispSched = true;
        } else {
            this.dispSched = false
        };
        console.log("MMM-SydTrain-Status calling getTSched function...");
        getTSched();
    },

    getTBoard: function() {

        console.log("MMM-SydTrain-Status initiating getTBoard function...");

        if (this.depStopID != "" && this.arrStopID != "") {
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
        };
    },

    getTSched: function() {

        console.log("MMM-SydTrain-Status initiating getTSched function...");

        if (this.depStopID != "" && this.arrStopID != "") {
            var tParams = {
                "depID": this.depStopID,
                "arrID": this.arrStopID,
                "mornTrain": this.config.mornTrain,
                "eveTrain": this.config.eveTrain,
                "apiKey": this.fullAPIKey
            };
            console.log("MMM-SydTrain-Status sending socket notification: MMM_SYDTRAINS_GET_TRAINSCHEDULE");
            this.sendSocketNotification("MMM_SYDTRAINS_GET_TRAINSCHEDULE", tParams);
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
        if (notification === "MMM_SYDTRAINS_GOT_TRAINBOARD") {
            console.log("MMM-SydTrain-Status socket notification received: MMM_SYDTRAINS_GOT_TRAINBOARD");
            if (!this.loaded) {
                this.updateDom(this.config.animationSpeed);
            }
            this.loaded = true;
            console.log("MMM-SydTrain-Status calling gotTrainBoard function...");
            gotTrainBoard(payload);
        };
        if (notification === "MMM_SYDTRAINS_GOT_TRAINSCHEDULE") {
            console.log("MMM-SydTrain-Status socket notification received: MMM_SYDTRAINS_GOT_TRAINSCHEDULE");
            if (!this.loaded) {
                this.updateDom(this.config.animationSpeed);
            }
            this.loaded = true;
            console.log("MMM-SydTrain-Status calling gotTrainSchedule function...");
            gotTrainSchedule(payload);
        };
        if (notification === "MMM_SYDTRAINS_ERROR") {
            console.log("MMM-SydTrain-Status socket notification received...");
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
        this.showBoardTrainOutput = htmlText;
        scheduleUpdate();
    },

    gotTrainSchedule: function(payload) {

        console.log("MMM-SydTrain-Status initialising gotTrainSchedule function...");

        if (this.autoS) {
            var depStat = this.config.arrival;
            var arrStat = this.config.departure;
            this.schedTrainHead = this.config.arrival + " - " + this.config.departure;
        } else {
            var depStat = this.config.departure;
            var arrStat = this.config.arrival;
            this.schedTrainHead = this.config.departure + " - " + this.config.arrival;
        };
        var depTime = payload.tripSumm[0].dep;
        var arrTime = payload.tripSumm[0].arr;
        var dur = payload.tripSumm[0].dur;
       
        this.showSchedTrainOutput = depTime + " - " + arrTime + "  (" + dur + ")";
        this.currTrainLoc = payload.currLoc;
    },



    getStyles: function () {
        return ["sydtrainstats.css"]
    },

    // Override dom generator.

    getDom: function () {

        console.log("MMM-SydTrain-Status initiating getDom function...");

        var wrapper = document.createElement("div");
        var header = document.createElement("header");
        var board = document.createElement("table");


        if (!this.loaded) {
            wrapper.innerHTML = "Loading SydTrain Stats...";
            return wrapper;
        }

       // board.innerHTML = this.boardTrainOutput;
       // header.innerHTML = "" + this.boardTrainHeader;

     //   wrapper.appendChild(header);
     //   wrapper.appendChild(board);

        return wrapper;
    }


});
