import {serverService} from '../../services/server_service';
import Binder from '../../binder';
import BridgeError from '../../bridge_error';
import config from '../../config';
import fn from '../../functions';
import ko from 'knockout';
import root from '../../root';
import storeService from '../../services/store_service';
import utils from '../../utils';

const ENVIRONMENT = 'environment';
const PHONE_SUCCESS_MSG = "An SMS message has been sent to that phone number; enter the code to sign in.";
const STUDY_KEY = 'studyKey';
const SUCCESS_MSG = "An email has been sent to that address with instructions on changing your password.";

const TITLES = {
    'EnterCode': 'Enter Code',
    'ExternalIdSignIn': 'Sign In',
    'ForgotPassword': 'Forgot Password',
    'PhoneSignIn': 'Sign In',
    'SignIn': 'Sign In'
};
const BUTTONS = {
    'EnterCode': 'Sign In',
    'ExternalIdSignIn': 'Sign In',
    'ForgotPassword': 'Send Email',
    'PhoneSignIn': 'Send Text Message',
    'SignIn': 'Sign In'
};

// There will be stale data in the UI if we don't reload when changing studies or environments.
function makeReloader(studyKey, environment) {
    let requiresReload = (storeService.get(STUDY_KEY) !== studyKey || 
                          storeService.get(ENVIRONMENT) !== environment);
    return (requiresReload) ?
        function(response) {
            storeService.set(STUDY_KEY, studyKey);
            storeService.set(ENVIRONMENT, environment);
            root.closeDialog();
            window.location.reload(); 
        } : function() {
            root.closeDialog();
        };
}

module.exports = function() {
    let self = this;

    let isLocked = fn.isNotBlank(root.queryParams.studyPath);
    const SYNTH_EVENT = {target: document.querySelector("#submitButton")};

    let studyKey, env;    
    if (isLocked) {
        studyKey = root.queryParams.studyPath;
        env = 'production';
    } else {
        studyKey = storeService.get(STUDY_KEY) || 'api';
        env = storeService.get(ENVIRONMENT) || 'production';
    }
    new Binder(self)
        .obs('state', 'SignIn')
        .obs('study', studyKey)
        .obs('environment', env)
        .obs('email')
        .obs('password')
        .obs('phone')
        .obs('phoneRegion', 'US')
        .obs('token')
        .obs('imAnAdmin', false)
        .obs('externalId')
        .obs('studyOptions[]')
        .obs('isLocked', isLocked);

    self.titleObs = ko.computed(() => TITLES[self.stateObs()]);
    self.buttonTextObs = ko.computed(() => BUTTONS[self.stateObs()]);
    
    self.handleFocus = function(focusOnState) {
        return ko.computed(function() {
            return focusOnState === self.stateObs();
        });
    };

    self.environmentOptions = config.environments;
    self.environmentObs.subscribe(function(newValue) {
        self.studyOptionsObs({name:'Updating...',identifier:''});
        loadStudyList(newValue);
    });
    loadStudyList(env);
    
    function loadStudies(studies){
        self.studyOptionsObs(studies.items);
        self.studyObs(studyKey);
    }
    function loadStudyList(newValue) {
        return serverService.getStudyList(newValue)
            .then(loadStudies)
            .catch(utils.failureHandler());
    }
    function clear(response) {
        self.emailObs("");
        self.externalIdObs("");
        self.passwordObs("");
        self.phoneObs("");
        self.phoneRegionObs("US");
        self.tokenObs("");
        return response;
    }
    function createPayload(...fields) {
        let error = new BridgeError();
        let payload = {};
        fields.forEach((field) => {
            payload[field] = self[field + "Obs"]();
            if (!payload[field]) {
                error.addError(field, "is required");
            }
        });
        if (error.hasErrors()) {
            return utils.failureHandler({transient:false})(error);
        }
        if (payload.phone && payload.phoneRegion) {
            payload.phone = {
                number: payload.phone.replace(/\D/g,''), 
                regionCode: payload.phoneRegion
            };
            delete payload.phoneRegion;
        }
        if (payload.token) {
            payload.token = payload.token.replace(/[^\d]/g,'');
        }
        return payload;
    }
    function collectValues() {
        let studyKey = self.studyObs();
        let environment = self.environmentObs();
        let studyName = utils.findStudyName(self.studyOptionsObs(), studyKey);
        return { studyKey, studyName, environment };
    }

    self.submit = function(vm, event) {
        let key = self.stateObs();
        let methodName = key.substring(0,1).toLowerCase() + key.substring(1);
        self[methodName](vm, event);
    };
    self.signIn = function(vm, event) {
        let payload = createPayload('email', 'password', 'study');
        if (payload) {
            let { studyKey, studyName, environment } = collectValues();
            utils.startHandler(self, SYNTH_EVENT);

            let promise = (self.imAnAdminObs()) ?
                serverService.adminSignIn(studyName, environment, payload) :
                serverService.signIn(studyName, environment, payload);
            promise.then(clear)
                .then(makeReloader(studyKey, environment))
                .then(utils.successHandler(self, SYNTH_EVENT))
                .catch(utils.failureHandler({transient:false}));
        }
    };
    self.forgotPassword = function(vm, event) {
        let payload = createPayload('email', 'study');
        if (payload) {
            let { studyKey, studyName, environment } = collectValues();
            utils.startHandler(self, SYNTH_EVENT);
            return serverService.requestResetPassword(environment, payload)
                .then(clear)
                .then(self.cancel)
                .then(utils.successHandler(self, SYNTH_EVENT, SUCCESS_MSG))
                .catch(utils.failureHandler());
        }
    };
    self.enterCode = function(vm, event) {
        let payload = createPayload('token', 'phone', 'phoneRegion', 'study');
        if (payload) {
            self.cancel();
            clear();
            let { studyKey, studyName, environment } = collectValues();
            utils.startHandler(vm, SYNTH_EVENT);
            return serverService.phoneSignIn(studyName, environment, payload)
                .then(clear)
                .then(makeReloader(studyKey, environment))
                .then(utils.successHandler(vm, SYNTH_EVENT))
                .catch(utils.failureHandler({transient:false}));
        }
    };
    self.phoneSignIn = function(vm, event) {
        let payload = createPayload('phone', 'phoneRegion', 'study');
        if (payload) {
            let { studyKey, studyName, environment } = collectValues();
            utils.startHandler(vm, SYNTH_EVENT);
            return serverService.requestPhoneSignIn(environment, payload)
                .then(self.useCode)
                .then(utils.successHandler(vm, SYNTH_EVENT, PHONE_SUCCESS_MSG))
                .catch(utils.failureHandler());
        }
    };
    self.externalIdSignIn = function(vm, event) {
        let payload = createPayload('externalId', 'password', 'study');
        if (payload) {
            let { studyKey, studyName, environment } = collectValues();
            utils.startHandler(self, SYNTH_EVENT);
            serverService.signIn(studyName, environment, payload)
                .then(clear)
                .then(makeReloader(studyKey, environment))
                .then(utils.successHandler(self, SYNTH_EVENT))
                .catch(utils.failureHandler({transient:false}));
        }
    };
    self.usePhone = function(vm, event) {
        utils.clearErrors();
        self.stateObs('PhoneSignIn');
    };
    self.useExternalId = function(vm, event) {
        utils.clearErrors();
        self.stateObs('ExternalIdSignIn');
    };
    self.useForgotPassword = function() {
        utils.clearErrors();
        self.stateObs('ForgotPassword');
    };
    self.cancel = function() {
        utils.clearErrors();
        self.stateObs('SignIn');
    };
    self.useCode = function() {
        utils.clearErrors();
        self.stateObs('EnterCode');
    };
    self.updateRegion = function(model, event) {
        if(event.target.classList.contains("item")) {
            self.phoneRegionObs(event.target.textContent);
        }
    };
};