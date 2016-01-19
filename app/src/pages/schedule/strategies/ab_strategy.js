var ko = require('knockout');
require('knockout-postbox');
var utils = require('../../../utils');
var scheduleUtils = require('../schedule_utils');
var root = require('../../../root');

function groupToObservables(group) {
    group.percentageObs = ko.observable(group.percentage);
    group.scheduleObs = ko.observable(group.schedule);
    group.scheduleObs.callback = utils.identity;
    group.percentLabel = ko.computed(function(){
        return group.percentageObs()+"%";
    });
    return group;
}

function observablesToGroup(group) {
    return {
        percentage: parseInt(group.percentageObs(), 10),
        schedule: group.scheduleObs.callback(),
        type: 'ScheduleGroup'
    };
}

function newGroup() {
    var group = {percentage:0, schedule:scheduleUtils.newSchedule()};
    groupToObservables(group);
    return group;
}

module.exports = function(params) {
    var self = this;

    self.labelObs = params.labelObs;
    self.strategyObs = params.strategyObs;
    self.scheduleGroupsObs = ko.observableArray([]).publishOn("scheduleGroupChanges");

    root.setEditorPanel('ABTestScheduleStrategyPanel', {viewModel:self});

    params.strategyObs.callback = function () {
        var strategy = params.strategyObs();
        strategy.scheduleGroups = self.scheduleGroupsObs().map(observablesToGroup);
        return strategy;
    };

    // This is fired when the parent viewModel gets a plan back from the server
    ko.computed(function () {
        var strategy = params.strategyObs();
        if (strategy && strategy.scheduleGroups) {
            self.scheduleGroupsObs(strategy.scheduleGroups.map(groupToObservables));
        }
    });

    var scrollTo = utils.makeScrollTo(".schedulegroup-fieldset");

    self.addGroup = function(vm, event) {
        self.scheduleGroupsObs.push(newGroup());
        scrollTo(self.scheduleGroupsObs().length-1);
    };
    ko.postbox.subscribe("scheduleGroupAdd", function() {
        self.addGroup();
    });
    ko.postbox.subscribe("scheduleGroupRemove",
        utils.manualFadeRemove(self.scheduleGroupsObs, ".schedulegroup-fieldset"));
    ko.postbox.subscribe("scheduleGroupSelect", function(group) {
        var index = self.scheduleGroupsObs().indexOf(group);
        scrollTo( index );
    });
};