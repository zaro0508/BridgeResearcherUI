var serverService = require('../../services/server_service');
var utils = require('../../utils');
var root = require('../../root');
var bind = require('../../binder');

module.exports = function() {
    var self = this;
    
    var binder = bind(self)
        .obs('items[]', [])
        .obs('total', 0)
        .obs('externalIdValidationEnabled', false)
        .obs('result', '')
        .obs('showResults', false);

    function msgIfNoRecords(response) {
        if (response.items.length === 0) {
            document.querySelector(".loading_status").textContent = "There are no lab codes (or none that start with your search string).";
        }
        return response;
    }
    
    self.openImportDialog = function(vm, event) {
        self.showResultsObs(false);
        root.openDialog('external_id_importer', {vm: self, autoCredentials: true});
    };
    serverService.getStudy()
        .then(binder.assign('study'))
        .then(binder.update('externalIdValidationEnabled'));
    
    self.loadingFunc = function loadPage(params) {
        params.assignmentFilter = true; // no controls for this are shown, set it here.
        return serverService.getExternalIds(params)
            .then(binder.update('total','items'))
            .then(msgIfNoRecords)
            .catch(utils.failureHandler());
    };
};