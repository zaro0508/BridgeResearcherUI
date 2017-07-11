import Binder from '../../binder';
import root from '../../root';
import serverService from '../../services/server_service';
import utils from '../../utils';

module.exports = function() {
    var self = this;

    var binder = new Binder(self)
        .obs('status','')
        .obs('message')
        .obs('name')
        .obs('sponsorName')
        .obs('identifier')
        .bind('technicalEmail')
        .bind('supportEmail')
        .bind('consentNotificationEmail');

    function checkEmailStatus() {
        return serverService.emailStatus().then(binder.update('status'));
    }
    
    self.isPublicObs = root.isPublicObs;
    self.save = function(vm, event) {
        self.study = binder.persist(self.study);

        utils.startHandler(vm, event);
        serverService.saveStudy(self.study)
            .then(checkEmailStatus)
            .then(utils.successHandler(vm, event, "Study information saved."))
            .catch(utils.failureHandler());
    };
    self.verifyEmail = function(vm, event) {
        utils.startHandler(vm, event);
        serverService.verifyEmail()
            .then(binder.update('status'))
            .then(utils.successHandler(vm, event, "Request to verify email has been sent."))
            .catch(utils.failureHandler());
    };
    self.refreshStatus = checkEmailStatus;

    serverService.getStudy()
        .then(binder.assign('study'))
        .then(binder.update())
        .then(checkEmailStatus)
        .catch(utils.failureHandler());
};
