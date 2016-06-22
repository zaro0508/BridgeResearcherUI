var utils = require('../../utils');
var serverService = require('../../services/server_service');
var bind = require('../../binder');
var tables = require('../../tables');
var fn = require('../../transforms');

var deleteMsg = "Deleting all activities is recommended ONLY while developing your application.\n\n"+
    "Activities (even finished ones) will be recreated the next time the user asks for them, "+
    "based on your current schedules.\n\nDo you wish to continue?";

module.exports = function(params) {
    var self = this;

    var binder = bind(self)
        .obs('userId', params.userId)
        .obs('items[]')
        .obs('total', 0)
        .obs('isNew', false)
        .obs('title', params.name);

    self.formatTitleCase = fn.formatTitleCase;
    self.formatDateTime = fn.formatLocalDateTimeWithoutZone;
    
    self.displayBorder = function(item, index) {
        var next = self.itemsObs()[index()+1];
        if (!next) {
            return false;
        }
        var guid1 = item.guid.split(":")[0];
        var guid2 = next.guid.split(":")[0];
        return (guid1 !== guid2);
    };
    self.formatActivityClass = function(item) {
        return (item.activity.activityType === "task") ? "child icon" : "tasks icon";
    };
    self.formatActivity = function(item) {
        return item.activity.label;
    };
    self.deleteActivities = function(vm, event) {
        if (confirm(deleteMsg)) {
            utils.startHandler(vm, event);
            serverService.deleteParticipantActivities(self.userIdObs())
                .then(utils.successHandler(self, event, "Activities deleted"))
                .then(self.loadingFunc)
                .catch(utils.failureHandler(vm, event));
        }
    };

    function msgIfNoRecords(response) {
        if (response.items.length === 0) {
            document.querySelector(".loading_status").textContent = "There are no activities for this participant.";
        }
        return response;
    }

    self.loadingFunc = function loadPage(params) {
        return serverService.getParticipantActivities(self.userIdObs(), params)
            .then(binder.update('total','items'))
            .then(function(response) {
                console.log(response);
                return response;
            })
            .then(msgIfNoRecords)
            .catch(utils.failureHandler());
    };    
};