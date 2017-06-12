var tables = require('../../tables');
var serverService = require('../../services/server_service');
var sharedModuleUtils = require('../../shared_module_utils');
var utils = require('../../utils');
var ko = require('knockout');
var fn = require('../../functions');

/*
- Hide things that are already imported?
- See if your import is up-to-date or not in survey list or browser
- import an updated version
*/
module.exports = function(params) {
    var self = this;
    var importedMods = {};
    var methName = (params.type === "survey") ? "getSurveys" : "getAllUploadSchemas";
    var scrollTo = utils.makeScrollTo(".item");

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
            .then(utils.listFailure2({scrollTo: scrollTo}));
    };
    self.isImported = function(metadata) {
        return importedMods[metadata.id+"/"+metadata.version];
    };

    function searchForModules() {
        var query = "?published=true";
        var text = self.searchObs();
        if (text === "") {
            query += "&mostrecent=true";
        } else {
            var str = "name like '%"+text+"%' or notes like '%"+text+"%'";
            query += "&mostrecent=false&where=" + encodeURIComponent(str);
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