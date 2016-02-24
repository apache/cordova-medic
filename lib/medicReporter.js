/* jshint node: true */

"use strict";

var util = require("../lib/util");

var OFFSET = "    ";

function plural(str, count) {
    return count === 1 ? str : str + "s";
}

function repeat(thing, times) {
    var arr = [];
    for (var i = 0; i < times; i++) {
        arr.push(thing);
    }
    return arr;
}

function indent(str, spaces) {
    var lines = (str || "").split("\n");
    var newArr = [];

    for (var i = 0; i < lines.length; i++) {
        newArr.push(repeat(" ", spaces).join("") + lines[i]);
    }
    return newArr.join("\n");
}

function specFailureDetails(result, failedSpecNumber) {
    var failedExpectation;

    console.log(failedSpecNumber + ") ");
    console.log(result.fullName);

    for (var i = 0; i < result.failedExpectations.length; i++) {
        failedExpectation = result.failedExpectations[i];
        console.log(indent("Message:", 2));
        console.log(failedExpectation.message);
        console.log(indent("Stack:", 2));
        console.log(indent(failedExpectation.stack, 4));
    }
}

function pendingSpecDetails(result, pendingSpecNumber) {
    console.log(pendingSpecNumber + ") ");
    console.log(result.fullName);
    var pendingReason = "No reason given";
    if (result.pendingReason && result.pendingReason !== "") {
        pendingReason = result.pendingReason;
    }
    console.log(indent(pendingReason, 2));
}

function MedicReporter(callback) {
    this.allDoneCallback = callback;
    this.failedSpecs = [];
    this.pendingSpecs = [];
    this.results = {
        total: 0,
        failed: 0,
        passed: 0,
        warnings: 0
    };

    this.reportResults = function () {
        var specCounts;

        if (this.failedSpecs.length > 0) {
            console.log("Failures:");
        }
        for (var i = 0; i < this.failedSpecs.length; i++) {
            specFailureDetails(this.failedSpecs[i], i + 1);
        }

        if (this.pendingSpecs.length > 0) {
            console.log("Pending:");
        }
        for (i = 0; i < this.pendingSpecs.length; i++) {
            pendingSpecDetails(this.pendingSpecs[i], i + 1);
        }

        if (this.results.total > 0) {
            specCounts = this.results.total + " " + plural("spec", this.results.total) + ", " +
                this.results.failed + " " + plural("failure", this.results.failed);

            if (this.pendingSpecs.length) {
                specCounts += ", " + this.pendingSpecs.length + " pending " + plural("spec", this.pendingSpecs.length);
            }

            console.log(specCounts);
        } else {
            console.log("No specs found");
        }
    };
}

MedicReporter.prototype = {
    specStarted: function (spec) {
        util.medicLog("Starting new spec: " + spec.description);
    },
    suiteDone: function (suite) {
        util.medicLog("Suite done: " + suite.description);
        util.medicLog("Result was: " + suite.status);
        for (var i = 0; i < suite.failedExpectations.length; i++) {
            util.medicLog(suite.failedExpectations[i].message);
            util.medicLog(OFFSET + suite.failedExpectations[i].stack.replace(/(\r\n|\n|\r)/gm, "\n" + OFFSET));
        }
    },
    specDone: function (spec) {
        util.medicLog("Spec " + spec.status + ": " + spec.description);
        this.results.total++;
        if (spec.status === "failed") {
            this.failedSpecs.push(spec);
            this.results.failed++;
        } else if (spec.status === "pending") {
            this.pendingSpecs.push(spec);
            this.results.warnings++;
        } else {
            this.results.passed++;
        }
    },
    jasmineDone: function () {
        this.reportResults();
        this.allDoneCallback(this.results);
    }
};

module.exports = MedicReporter;
