var ko = require('knockout');
var root = require('../../root');
var fn = require('../../functions');

module.exports = function(params) {
    var self = this;

    var input = fn.seq(fn.utcTolocalDateTime, ko.observable);
    self.startsOnObs = input(params.startsOnObs());
    self.endsOnObs = input(params.endsOnObs());
    self.formatDateTime = fn.formatDateTime;
    self.cancel = root.closeDialog;
    self.clear = fn.seq(params.clearWindowFunc, root.closeDialog);

    self.save = function() {
        var startsOnUTC = fn.localDateTimeToUTC(self.startsOnObs());
        var endsOnUTC = fn.localDateTimeToUTC(self.endsOnObs());
        params.startsOnObs(startsOnUTC);
        params.endsOnObs(endsOnUTC);
        root.closeDialog();
    };
    
};