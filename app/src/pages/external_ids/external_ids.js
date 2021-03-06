import 'knockout-postbox';
import {serverService} from '../../services/server_service';
import Binder from '../../binder';
import fn from '../../functions';
import ko from 'knockout';
import root from '../../root';
import tables from '../../tables';
import utils from '../../utils';

let OPTIONS = {offsetBy:null, pageSize: 1, assignmentFilter:false};

function deleteItem(item) {
    return serverService.deleteExternalId(item.identifier);
}

module.exports = function() {
    let self = this;
    
    let binder = new Binder(self)
        .obs('items[]', [])
        .obs('total', 0)
        .obs('result', '')
        .obs('searchLoading', false)
        .obs('externalIdValidationEnabled', false)
        .obs('idFilter')
        .obs('useLegacyFormat', false)
        .obs('showResults', false);

    // For the forward pager control.
    self.vm = self;
    self.callback = fn.identity;

    fn.copyProps(self, root, 'isDeveloper', 'isResearcher');
    tables.prepareTable(self, {
        name: 'external ID', 
        delete: deleteItem, 
        refresh: load
    });

    function extractId(response) {
        if (response.items.length === 0) {
            throw new Error("There are no unassigned external IDs registered with your study. Please import more IDs to create more credentials.");
        }
        return response.items[0].identifier;
    }
    function createNewCredentials(identifier) {
        self.resultObs(identifier);
        let participant = (self.useLegacyFormatObs()) ?
            utils.oldCreateParticipantForID(self.study.supportEmail, identifier) :
            utils.createParticipantForID(identifier);
        return serverService.createParticipant(participant);
    }
    function updatePageWithResult(response) {
        self.showResultsObs(true);
        ko.postbox.publish('page-refresh');
        return response;
    }
    function convertToPaged(identifier) {
        return function() {
            return {items: [{identifier: identifier}]};    
        };
    }
    function msgIfNoRecords(response) {
        if (response.items.length === 0) {
            self.recordsMessageObs("There are no external IDs (or none that start with your search string).");
        }
        return response;
    }
    self.openImportDialog = function(vm, event) {
        self.showResultsObs(false);
        root.openDialog('external_id_importer', {
            vm: self, 
            showCreateCredentials: true,
            reload: self.loadingFunc.bind(self)
        });
    };
    self.createFrom = function(data, event) {
        self.showResultsObs(false);
        utils.startHandler(self, event);
        createNewCredentials(data.identifier)
            .then(updatePageWithResult)
            .then(utils.successHandler(self, event))
            .catch(utils.failureHandler());
    };
    self.createFromNext = function(vm, event) {
        self.showResultsObs(false);
        utils.startHandler(vm, event);
        serverService.getExternalIds(OPTIONS)
            .then(extractId)
            .then(createNewCredentials)
            .then(updatePageWithResult)
            .then(utils.successHandler(vm, event))
            .catch(utils.failureHandler());
    };
    self.link = function(item) {
        return '#/participants/'+encodeURIComponent('externalId:'+item.identifier)+'/general';
    };
    self.doSearch = function(vm, event) {
        self.callback(event);
    };
    
    // This is called from the dialog that allows a user to enter a new external identifier.
    self.createFromNew = function(identifier) {
        serverService.addExternalIds([identifier])
            .then(convertToPaged(identifier))
            .then(extractId)
            .then(createNewCredentials)
            .then(updatePageWithResult)
            .then(utils.successHandler())
            .catch(utils.failureHandler());
    };

    function initFromStudy(study) {
        let legacy = study.emailVerificationEnabled === false && study.externalIdValidationEnabled === true;
        self.useLegacyFormatObs(legacy);
        return study;
    }
    
    serverService.getStudy()
        .then(binder.assign('study'))
        .then(initFromStudy);
    
    function load(params) {
        params = params || {};
        params.idFilter = self.idFilterObs();
        return serverService.getExternalIds(params)
            .then(binder.update('total','items'))
            .then(msgIfNoRecords)
            .catch(utils.failureHandler());
    }

    self.loadingFunc = load;
};