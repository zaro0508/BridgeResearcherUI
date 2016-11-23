var ko = require('knockout');
require('knockout-postbox');
var serverService = require('../../services/server_service');
var utils = require('../../utils');
var root = require('../../root');
var tables = require('../../tables');
var fn = require('../../transforms');
var alerts = require('../../widgets/alerts');

var cssClassNameForStatus = {
    'disabled': 'negative',
    'unverified': 'warning',
    'verified': ''
};

module.exports = function() {
    var self = this;
        
    self.total = 0;
    self.searchFilter = null;
    self.startDate = null;
    self.endDate = null;

    tables.prepareTable(self, "participant", function(participant) {
        return serverService.deleteParticipant(participant.id);
    });

    self.isAdmin = root.isAdmin;
    self.recordsObs = ko.observable("");
    self.formatName = fn.formatName;
    self.formatDateTime = fn.formatLocalDateTime;
    self.classNameForStatus = function(user) {
        return cssClassNameForStatus[user.status];
    };
    self.fullName = function(user) {
        return encodeURIComponent(fn.formatName(user));
    };
    
    function formatCount(total) {
        return (total+"").replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " user records";
    }
    function updateParticipantStatus(participant) {
        participant.status = "enabled";
        return serverService.updateParticipant(participant);
    }
    function publishPageUpdate(response) {
        ko.postbox.publish('participants-page-refresh');
        return response;
    }
    self.resendEmailVerification = function(vm, event) {
        alerts.confirmation("This will send email to this user.\n\nDo you wish to continue?", function() {
            var userId = vm.id;
            utils.startHandler(vm, event);
            serverService.resendEmailVerification(userId)
                .then(utils.successHandler(vm, event, "Resent email to verify participant's email address."))
                .catch(utils.failureHandler(vm, event));
        });
    };
    self.enableAccount = function(item, event) {
        utils.startHandler(item, event);
        serverService.getParticipant(item.id)
            .then(updateParticipantStatus)
            .then(publishPageUpdate)
            .then(utils.successHandler(item, event, "User account activated."))
            .catch(utils.failureHandler(item, event));
    };
    self.exportDialog = function() {
        root.openDialog('participant_export', {searchFilter: self.searchFilter, 
            startDate: self.startDate, endDate: self.endDate, total: self.total});    
    };
    self.loadingFunc = function loadPage(offsetBy, pageSize, searchFilter, startDate, endDate) {
        self.searchFilter = searchFilter;
        self.startDate = startDate;
        self.endDate = endDate;
        return serverService.getParticipants(offsetBy, pageSize, searchFilter, startDate, endDate).then(function(response) {
            self.total = response.total;
            self.recordsObs(formatCount(response.total));
            self.itemsObs(response.items);
            if (response.items.length === 0) {
                if (offsetBy > 0) {
                    // You can't switch studies or environments unless you reset this when it has 
                    // overshot the new list. So drop back and try and find the first page.
                    return self.loadingFunc(0, pageSize, searchFilter);
                } else {
                    self.recordsMessageObs("There are no user accounts, or none that match the filter.");
                }
            }
            return response;
        }).catch(utils.failureHandler());
    };
};