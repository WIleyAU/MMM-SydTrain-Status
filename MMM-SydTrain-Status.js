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
        this.schLoaded = false;
        this.incLoaded = false;
        this.firstUpdateDOMFlag = false;
        this.errorMessage = null;
        this.departureBoard = {};
        this.depLoaded = false;
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


        //DEPBOARD DOM FORMATTING
        var boardWrapper = document.createElement("div");
        if (this.depLoaded) {
            if (this.departureBoard.autoS) {
                var header = this.departure + " - ARRIVALS (from " + this.arrival + ")";
            } else {
                var header = this.departure + " - DEPARTURES (to " + this.arrival + ")";
            };
            var boardDetails = this.departureBoard.results.depBoard;
            if (boardDetails.length > 5) {
                var detLength = 5;
            } else {
                var detLength = boardDetails.length
            };
            var headRow = document.createElement("tr");
            var headElement = document.createElement("th");
            var boardTable = document.createElement("table");

            var boardHeader = document.createElement("header");
            boardHeader.className = "medium";
            boardHeader.innerHTML = header;
            boardWrapper.appendChild(boardHeader);

            headElement.className = "small";
            headElement.innerHTML = "DEP";
            headRow.appendChild(headElement);
            headElement.innerHTML = " -- ";
            headRow.appendChild(headElement);
            headElement.innerHTML = "ARR";
            headRow.appendChild(headElement);
            headElement.innerHTML = "(mins)";
            headRow.appendChild(headElement);
            headElement.innerHTML = "DELAY";
            headRow.appendChild(headElement);
            boardTable.appendChild(headRow);
            for (bi = 0; bi < detLength; bi++) {
                var depTime = moment(boardDetails[bi].dep).format("HH:mm");
                var arrTime = moment(boardDetails[bi].arr).format("HH:mm");
                var dur = boardDetails[bi].dur;
                if (this.autoS) {
                    var del = boardDetails[bi].arrDel;
                } else {
                    var del = boardDetails[bi].depDel;
                };
                var iRow = document.createElement("tr");
                var iElement = document.createElement("td");
                iElement.className = "xsmall";
                iElement.innerHTML = depTime;
                iRow.appendChild(iElement);
                iElement.innerHTML = " -- ";
                iRow.appendChild(iElement);
                iElement.innerHTML = arrTime;
                iRow.appendChild(iElement);
                iElement.innerHTML = dur;
                iRow.appendChild(iElement);
                iElement.innerHTML = del;
                iRow.appendChild(iElement);
                boardTable.appendChild(iRow);
                var summRow = document.createElement("tr");
                var summElement = document.createElement("td");
                summElement.className = "xsmall";
                summElement.colSpan = "5";
                var summary = "";
                var summ = boardDetails[bi].summ;
                for (si = 0; si < summ.length; si++) {
                    if (si < summ.length - 1) {
                        summary = summary + summ[si] + "  --  ";
                    } else {
                        summary = summary + summ[si];
                    };
                };
                summElement.innerHTML = summary;
                summRow.appendChild(summElement);
                boardTable.appendChild(summRow);
            };
            boardWrapper.appendChild(boardTable);
        } else {
            boardWrapper.innerHTML = "Loading...";
        };


        //SCH DOM FORMATTING


        wrapper.appendChild(boardWrapper);
        return wrapper;
    }


});
