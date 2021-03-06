import {serverService} from '../../services/server_service';
import * as schemaUtils from '../../pages/schema/schema_utils';
import Binder from '../../binder';
import fn from '../../functions';
import root from '../../root';
import utils from '../../utils';

const failureHandler = utils.failureHandler({
    redirectTo: "study",
    redirectMsg: "Study not found.",
    transient: false
});

module.exports = function(params) {
    let self = this;
  
    self.isAdmin = root.isAdmin;

    let binder = new Binder(this)
        .obs('index', 0)
        .bind('fieldDefinitions[]', [])
        .bind('version');

    self.save = function(vm, event) {
        if (!self.study) {
            return;
        }
        utils.startHandler(vm, event);

        self.study.uploadMetadataFieldDefinitions = schemaUtils.fieldObsToDef(self.fieldDefinitionsObs());
        serverService.saveStudy(self.study, self.isAdmin())
            .then(fn.handleObsUpdate(self.versionObs, 'version'))
            .then(utils.successHandler(vm, event, "Upload metadata fields have been saved."))
            .catch(utils.failureHandler());
    };
    self.addBelow = function(field, event) {
        let index = self.fieldDefinitionsObs.indexOf(field);
        let newField = schemaUtils.makeNewField();
        self.fieldDefinitionsObs.splice(index+1,0,newField);
    };
    self.addFirst = function(vm, event) {
        let field = schemaUtils.makeNewField();
        self.fieldDefinitionsObs.push(field);
    };
    self.editMultiChoiceAnswerList = function(field, event) {
        let otherLists = self.fieldDefinitionsObs().filter(function(oneField) {
            return (oneField.typeObs() === "multi_choice" && oneField.multiChoiceAnswerListObs().length);
        }).map(function(oneField) {
            return [].concat(oneField.multiChoiceAnswerListObs());
        });
        root.openDialog('multichoice_editor', {
            listObs: field.multiChoiceAnswerListObs,
            otherLists: otherLists
        });
    };
    
    serverService.getStudy()
        .then(function(study) {
            self.study = study;
            self.fieldDefinitionsObs(schemaUtils.fieldDefToObs(study.uploadMetadataFieldDefinitions));
            return study;
        })
        .catch(failureHandler);
};