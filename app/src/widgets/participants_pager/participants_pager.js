import * as fn from '../../functions';
import Binder from '../../binder';
import storeService from '../../services/store_service';
import utils from '../../utils';

const pageSize = 25;

/**
 * @params loadingFunc - the function to call to load resources. The function takes the parameters 
 *      offsetBy, pageSize.
 * @params pageKey - a key to make the pagination on this table unique from other pagination on 
 *      the screen
 */
module.exports = function(params) {
    var self = this;
    var pageKey = params.pageKey;
    var loadingFunc = params.loadingFunc;
    var query = storeService.restoreQuery(pageKey);
    var offsetBy = query.offsetBy;

    new Binder(self)
        .obs('emailFilter', query.emailFilter)
        .obs('startDate', query.startDate)
        .obs('endDate', query.endDate)
        .obs('offsetBy', offsetBy)
        .obs('pageSize', pageSize)
        .obs('totalRecords')
        .obs('totalPages')
        .obs('currentPage', 1)
        .obs('searchLoading', false)
        .obs('showLoader', false);
    
    self.doEmailSearch = function(vm, event) {
        if (event.keyCode === 13) {
            self.searchLoadingObs(true);
            wrappedLoadingFunc(Math.round(self.currentPageObs()));
        }
    };

    self.doCalSearch = function() {
        self.searchLoadingObs(true);
        wrappedLoadingFunc(Math.round(self.currentPageObs()));
    };
    self.previousPage = function(vm, event) {
        var page = self.currentPageObs() -1;
        if (page >= 0) {
            self.showLoaderObs(true);
            wrappedLoadingFunc(page*pageSize);
        }
    };
    self.nextPage = function(vm, event) {
        var page = self.currentPageObs() +1;
        if (page <= self.totalPagesObs()-1) {
            self.showLoaderObs(true);
            wrappedLoadingFunc(page*pageSize);
        }
    };
    self.thisPage = function() {
        wrappedLoadingFunc(self.currentPageObs()*pageSize);
    };
    self.firstPage = function(vm, event) {
        self.showLoaderObs(true);
        wrappedLoadingFunc(0, vm, event);
    };
    self.lastPage = function(vm, event) {
        self.showLoaderObs(true);
        wrappedLoadingFunc((self.totalPagesObs()-1)*pageSize);
    };

    function makeDate(date) {
        if (date) {
            return new Date(date).toISOString();
        }
        return null;
    }
    function updateModel(response) {
        // If you're not a researcher, it can happen this gets called without a response.
        if (response) {
            self.offsetByObs(response.offsetBy);
            self.pageSizeObs(response.pageSize);
            self.totalRecordsObs(response.total);
            self.emailFilterObs(response.emailFilter);
            self.startDateObs(response.startDate);
            self.endDateObs(response.endDate);
            self.currentPageObs(Math.round(response.offsetBy/response.pageSize));
            self.totalPagesObs( Math.ceil(response.total/response.pageSize) );
        }
    }
    
    function wrappedLoadingFunc(offsetBy, vm, event) {
        var emailFilter = self.emailFilterObs();
        var startDate = makeDate(self.startDateObs());
        var endDate = makeDate(self.endDateObs());

        storeService.persistQuery(pageKey, {emailFilter: emailFilter, 
            startDate: startDate, endDate: endDate, offsetBy: offsetBy});

        loadingFunc(offsetBy, pageSize, emailFilter, startDate, endDate)
            .then(updateModel)
            .then(fn.handleStaticObsUpdate(self.searchLoadingObs, false))
            .then(fn.handleStaticObsUpdate(self.showLoaderObs, false))
            .catch(utils.failureHandler());
    }
    wrappedLoadingFunc(offsetBy);
};