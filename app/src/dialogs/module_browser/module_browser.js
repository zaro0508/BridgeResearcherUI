import {serverService} from '../../services/server_service';
import fn from '../../functions';
import ko from 'knockout';
import sharedModuleUtils from '../../shared_module_utils';
import tables from '../../tables';
import utils from '../../utils';

/*
- Hide things that are already imported?
- See if your import is up-to-date or not in survey list or browser
- import an updated version
*/
module.exports = function(params) {
    let self = this;
    let importedMods = {};
    let methName = (params.type === "survey") ? "getSurveys" : "getAllUploadSchemas";
    let scrollTo = utils.makeScrollTo(".item");

    fn.copyProps(self, sharedModuleUtils, 'formatDescription', 'formatTags', 'formatVersions');

    self.title = "Shared " + params.type + "s";
    self.searchObs = ko.observable("").extend({ rateLimit: 300 });
    self.searchObs.subscribe(load);
    self.cancel = params.closeModuleBrowser;

    tables.prepareTable(self, {name: params.type});

    self.importItem = function(item, event) {
        utils.startHandler(self, event);
        serverService.importMetadata(item.id, item.version)
            .then(params.closeModuleBrowser)
            .then(utils.successHandler(self, event))
            .catch(utils.failureHandler({scrollTo: scrollTo, transient: false}));
    };
    self.isImported = function(metadata) {
        return importedMods[metadata.id+"/"+metadata.version];
    };

    function searchForModules() {
        let query = {published:true};
        let text = self.searchObs();
        if (text === "") {
            query.mostrecent = true;
        } else {
            query.mostrecent = false;
            query.name = text;
            query.notes = text;
        }
        return serverService.getMetadata(query, params.type);
    }
    function addImportedModules(response) {
        response.items.filter(function(item) {
            return item.moduleId;
        }).forEach(function(item) {
            importedMods[item.moduleId+"/"+item.moduleVersion] = true;
        });
    }

    function load() {
        serverService[methName]()
            .then(addImportedModules)
            .then(sharedModuleUtils.loadNameMaps)
            .then(searchForModules)
            .then(fn.handleReverse('items'))
            .then(fn.handleObsUpdate(self.itemsObs, 'items'));
    }
    load();
};