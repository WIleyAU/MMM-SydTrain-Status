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
        eveTrain: "19:06",
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
        this.showSchedule = false;
        this.schLoaded = false;
        this.incLoaded = false;
        this.firstUpdateDOMFlag = false;
        this.errorMessage = null;
        this.autoS = false;
        this.departureBoard = {};
        this.depLoaded = false;
        this.schCurrentLocation = {};
        this.schPeriod = "";
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
            Log.log("MMM-SYDTRAIN-STATUS notification received: SYDTRAIN_DEPBOARD_UPDATE");
            this.departureBoard = payload.results;
            this.autoS = payload.autoS;
            this.depLoaded = true;
            if (this.firstUpdateDOMFlag) {
                this.updateDom();
            };
        };
        if (notification === "SYDTRAIN_SCH_UPDATE") {
            Log.log("MMM-SYDTRAIN-STATUS notification received: SYDTRAIN_SCH_UPDATE");
            Log.log("MMM-SYDTRAIN-STATUS schUpdate payload results: ", payload.results);
            Log.log("MMM-SYDTRAIN-STATUS schUpdate payload period: ", payload.period);
            this.schCurrentLocation = payload.results;
            this.schPeriod = payload.period;
            this.schLoaded = true;
            this.showSchedule = true;
            if (this.firstUpdateDOMFlag) {
                this.updateDom();
            };
        };
        if (notification === "SYDTRAIN_HIDE_SCHEDULE") {
            Log.log("MMM-SYDTRAIN-STATUS notification received: SYDTRAIN_HIDE_SCHEDULE");
            this.showSchedule = false;
            this.schLoaded = false;
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
            if (this.autoS) {
                var header = this.config.departure + " - ARRIVALS (from " + this.config.arrival + ")";
            } else {
                var header = this.config.departure + " - DEPARTURES (to " + this.config.arrival + ")";
            };
            var boardDetails = this.departureBoard.depBoard;
            if (boardDetails.length > 5) {
                var detLength = 5;
            } else {
                var detLength = boardDetails.length
            };
            var headRow = document.createElement("tr");
            var headElement1 = document.createElement("th");
            var headElement2 = document.createElement("th");
            var headElement3 = document.createElement("th");
            var headElement4 = document.createElement("th");
            var headElement5 = document.createElement("th");
            var headElement6 = document.createElement("th");
            var boardTable = document.createElement("table");

            var boardHeader = document.createElement("header");
            boardHeader.className = "small";
            boardHeader.innerHTML = header;
            boardWrapper.appendChild(boardHeader);

            headElement1.className = "small";
            headElement2.className = "small";
            headElement3.className = "small";
            headElement4.className = "small";
            headElement5.className = "small";
            headElement6.className = "small";
            headElement1.innerHTML = "DEP";
            headRow.appendChild(headElement1);
            headElement2.innerHTML = " -- ";
            headRow.appendChild(headElement2);
            headElement3.innerHTML = "ARR";
            headRow.appendChild(headElement3);
            headElement6.innerHTML = "&nbsp;";
            headRow.appendChild(headElement6);
            headElement4.innerHTML = "(mins)";
            headRow.appendChild(headElement4);
            headElement5.innerHTML = "DELAY";
            headRow.appendChild(headElement5);
            boardTable.appendChild(headRow);
            for (bi = 0; bi < detLength; bi++) {
                var depTime = moment(boardDetails[bi].dep, "DD-MM-YY HH:mm").format("HH:mm");
                var arrTime = moment(boardDetails[bi].arr, "DD-MM-YY HH:mm").format("HH:mm");
                //var depTime = boardDetails[bi].dep;
                //var arrTime = boardDetails[bi].arr;
                var dur = boardDetails[bi].dur;
                if (this.autoS) {
                    var del = boardDetails[bi].arrDel;
                } else {
                    var del = boardDetails[bi].depDel;
                };
                var iRow = document.createElement("tr");
                var iElement1 = document.createElement("td");
                var iElement2 = document.createElement("td");
                var iElement3 = document.createElement("td");
                var iElement4 = document.createElement("td");
                var iElement5 = document.createElement("td");
                var iElement6 = document.createElement("td");
                iElement1.className = "small";
                iElement2.className = "small";
                iElement3.className = "small";
                iElement4.className = "small";
                iElement5.className = "small";
                iElement6.className = "rImageCell";
                iElement1.innerHTML = depTime;
                iRow.appendChild(iElement1);
                iElement2.innerHTML = " -- ";
                iRow.appendChild(iElement2);
                iElement3.innerHTML = arrTime;
                iRow.appendChild(iElement3);

                var summary = "";
                var summ = boardDetails[bi].summ;
                var iconWrap = document.createElement("div");
                iconWrap.className = "rImageDiv";
                for (si = 0; si < summ.length; si++) {
                    var tranIcon = document.createElement("img");
                    var iconImg = "";
                    switch (summ[si]) {
                        case "Train": iconImg = "Train-Small.png"; break;
                        case "Bus": iconImg = "Bus-Small.png"; break;
                        case "Walk": iconImg = "Walk-Small.png"; break;
                        case "Ferry": iconImg = "Ferry-Small"; break;
                        case "Light Rail": iconImg = "LightRail-Small";
                    };
                    tranIcon.src = this.file("images/" + iconImg);
                    iconWrap.appendChild(tranIcon);
                }
                /*
                if (si < summ.length - 1) {
                    summary = summary + summ[si] + "  --  ";
                } else {
                    summary = summary + summ[si];
                };
                */
                iElement6.appendChild(iconWrap);
                iRow.appendChild(iElement6);

                iElement4.innerHTML = dur;
                iRow.appendChild(iElement4);
                iElement5.innerHTML = del;
                iRow.appendChild(iElement5);
                boardTable.appendChild(iRow);
            /*
                var summRow = document.createElement("tr");
                var summElement = document.createElement("td");
                summElement.className = "xsmall";
                summElement.colSpan = "5";
                
                summElement.innerHTML = summary;
                summRow.appendChild(summElement);
                boardTable.appendChild(summRow);
                */
            };
            boardWrapper.appendChild(boardTable);
        } else {
            boardWrapper.innerHTML = "Loading...";
        };


        //SCH DOM FORMATTING
        if (this.showSchedule) {
            var currLoc = this.schCurrentLocation.currLoc;
            var currTripStops = this.schCurrentLocation.currTripStops;
            var tripSumm = this.schCurrentLocation.tripSumm;
            var scheduleWrapper = document.createElement("div");
            var scheduleHeader = document.createElement("header");
            scheduleHeader.className = "small";
            if (this.schPeriod == "morn") {
                var schHeader = this.config.departure + " : " + moment(tripSumm[0].dep, "DD-MM-YY HH:mm").format("HH:mm") + "  --  " + moment(tripSumm[0].arr, "DD-MM-YY HH:mm").format("HH:mm") + " : " + this.config.arrival + "  (" + tripSumm[0].dur + "mins)";
            } else {
                var schHeader = this.config.arrival + " : " + moment(tripSumm[0].dep, "DD-MM-YY HH:mm").format("HH:mm") + "  --  " + moment(tripSumm[0].arr, "DD-MM-YY HH:mm").format("HH:mm") + " : " + this.config.departure + "  (" + tripSumm[0].dur + "mins)";
            };
            scheduleHeader.innerHTML = schHeader;
            scheduleWrapper.appendChild(scheduleHeader);

            var schDelay = document.createElement("div");
            schDelay.className = "small"
            if (currLoc.del == 0) {
                var delay = "ON TIME";
            } else {
                if (currLoc.del < 0) {
                    var delay = currLoc.del + "mins EALRY";
                } else {
                    var delay = currLoc.del + "mins LATE";
                };
            };
            schDelay.innerHTML = delay;
            scheduleWrapper.appendChild(schDelay);

            //Determine the background iMAGE TO DISPLAY
            var currLocWrapper = document.createElement("div");
            currLocWrapper.id = "schContainer";
            var schImgBackground = document.createElement("img");
            schImgBackground.src = this.file("images/" + currLoc.schImage);
            currLocWrapper.appendChild(schImgBackground);

            //Determine the transport vehicle to display
            var vehicalIcon = "images/Train-Large.png";

            /*
            //Determine the position of icon display
            var currLocImg = document.createElement("div");
            currLocImg.id = currLoc.schPos;
            var currLocImgIcon = document.createElement("img");
            currLocImgIcon = this.file(vehicalIcon);
            currLocImg.appendChild(currLocImgIcon);
            currLocWrapper.appendChild(currLocImg);
            /*
            //Determine the station labels to apply
            var prevStopSplit = currLoc.prevStop.split(",");
            var currStopSplit = currLoc.currStop.split(",");
            var nxtStopSplit = currLoc.nxtStop.split(",");
            if (currLoc.currStop == "IN-TRANSIT") {
                var labelDiv1 = document.createElement("div");
                labelDiv1.id = "schLabel1";
                labelDiv1.innerHTML = prevStopSplit[0];
                currLocWrapper.appendChild(labelDiv1);

                var labelDiv2 = document.createElement("div");
                labelDiv2.id = "schLabel3";
                labelDiv2.innerHTML = nxtStopSplit[0];
                currLocWrapper.appendChild(labelDiv2);
            } else if (currLoc.nxtStop == "ARRIVED") {
                var labelDiv1 = document.createElement("div");
                labelDiv1.id = "schLabel1";
                labelDiv1.innerHTML = prevStopSplit[0];
                currLocWrapper.appendChild(labelDiv1);

                var labelDiv2 = document.createElement("div");
                labelDiv2.id = "schLabel3";
                labelDiv2.innerHTML = currStopSplit[0];
                currLocWrapper.appendChild(labelDiv2);
            } else if (currLoc.prevStop == "WAITING") {
                var labelDiv1 = document.createElement("div");
                labelDiv1.id = "schLabel1";
                labelDiv1.innerHTML = currStopSplit[0];
                currLocWrapper.appendChild(labelDiv1);

                var labelDiv2 = document.createElement("div");
                labelDiv2.id = "schLabel3";
                labelDiv2.innerHTML = nxtStopSplit[0];
                currLocWrapper.appendChild(labelDiv2);
            } else {
                var labelDiv1 = document.createElement("div");
                labelDiv1.id = "schLabel1";
                labelDiv1.innerHTML = prevStopSplit[0];
                currLocWrapper.appendChild(labelDiv1);

                var labelLength = currStopSplit[0].length;
                var labelLength1 = Math.floor(labelLength / 2);
                var labelString1 = currStopSplit[0].substring(0, labelLength1);
                var labelString2 = currStopSplit[0].substring(labelLength1, labelLength);
                var labelDiv21 = document.createElement("div");
                labelDiv21.id = "schLabel2-1";
                labelDiv21.innerHTML = labelString1;
                currLocWrapper.appendChild(labelDiv21);
                var labelDiv22 = document.createElement("div");
                labelDiv22.id = "schLabel2-2";
                labelDiv22.innerHTML = labelString2;
                currLocWrapper.appendChild(labelDiv22);


                var labelDiv3 = document.createElement("div");
                labelDiv3.id = "schLabel3";
                labelDiv3.innerHTML = nxtStopSplit[0];
                currLocWrapper.appendChild(labelDiv3);
            };
            */
            scheduleWrapper.appendChild(currLocWrapper);
            wrapper.appendChild(scheduleWrapper);

        } else {
            var scheduleWrapper = document.createElement("div");
            scheduleWrapper.className = "small";
            scheduleWrapper.innerHTML = "No train schedule to display...";
            wrapper.appendChild(scheduleWrapper);
        }; //END SCH DOM FORMATTING


        wrapper.appendChild(boardWrapper);
        return wrapper;
    }


});
