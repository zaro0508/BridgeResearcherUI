import {serverService} from '../../services/server_service';
import Binder from '../../binder';
import fn from '../../functions';
import root from '../../root';
import storeService from '../../services/store_service';
import tables from '../../tables';
import utils from '../../utils';

const PAGE_SIZE = 50;
const PAGE_KEY = 'u';

module.exports = class UploadsViewModel {
    constructor(params) {
        let {start, end} = fn.getRangeInDays(-14, 0);
        this.query = storeService.restoreQuery(PAGE_KEY);
        this.query.pageSize = this.query.pageSize || PAGE_SIZE;
        this.query.startTime = (this.query.startTime) ? new Date(this.query.startTime) : start;
        this.query.endTime = (this.query.endTime) ? new Date(this.query.endTime) : end;

        new Binder(this)
            .obs('uploadsStartDate', this.query.startTime)
            .obs('uploadsEndDate', this.query.endTime)
            .obs('find', '');
        this.loadingFunc = this.loadingFunc.bind(this);
        this.doCalSearch = this.doCalSearch.bind(this);
        this.doSearch = this.doSearch.bind(this);
        this.vm = this;
        fn.copyProps(this, fn, 'formatDateTime', 'identity->callback');
        fn.copyProps(this, root, 'isAdmin');
        tables.prepareTable(this, {name:'upload'});
    }
    makeSuccess(vm, event) {
        return (response) => {
            event.target.parentNode.parentNode.classList.remove("loading");
            document.location = "#/uploads/" + response.uploadId;
        };
    }
    classFor(item) {
        switch(item.status) {
            case 'unknown': return 'negative';
            case 'validation_failed': return 'warning';
            case 'duplicate': return 'warning';
            default: return '';
        }
    }
    iconFor(item) {
        switch(item.status) {
            case 'unknown': return 'help circle icon';
            case 'validation_in_progress': return 'refresh icon';
            case 'validation_failed': return 'ui yellow text warning sign icon';
            case 'duplicate': return 'ui yellow text copy icon';
            case 'succeeded': return 'ui green text checkmark icon';
            default: return '';
        }
    }
    doSearch(event) {
        utils.clearErrors();
        let id = this.findObs().trim();
        if (id) {
            event.target.parentNode.parentNode.classList.add("loading");
            let success = this.makeSuccess(this, event);
    
            utils.startHandler(this, event);
            serverService.getUploadById(id).then(success).catch(function() {
                serverService.getUploadByRecordId(id).then(success).catch(function(e) {
                    event.target.parentNode.parentNode.classList.remove("loading");
                    utils.failureHandler({transient:false})(e);
                });
            });
        }
    }
    updateDateRange() {
        let start = this.uploadsStartDateObs();
        let end = this.uploadsEndDateObs();
        if (!start || !end) {
            this.query.startTime = null;
            this.query.endTime = null;
            return;
        }
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        this.query.startTime = start;
        this.query.endTime = end;
    }
    doCalSearch() {
        utils.clearErrors();
        this.updateDateRange();
        //if (this.query.startTime !== null && this.query.endTime !== null) {
            this.itemsObs([]);
            this.recordsMessageObs("<div class='ui tiny active inline loader'></div>");
            this.callback();
        //}
    }
    htmlFor(data) {
        if (data.validationMessageList === undefined) {
            return null;
        }
        return data.validationMessageList.map(function(error) {
            return "<p class='error-message'>"+error+"</p>";
        }).join('');
    }
    toggle(item) {
        item.collapsedObs(!item.collapsedObs());
    }
    processItem(item) {
        new Binder(item)
            .obs('content','')
            .obs('href','')
            .obs('collapsed', true)
            .obs('completedBy', '');
            
        if (item.status === 'succeeded') {
            let id = item.schemaId;
            let rev = item.schemaRevision;
            item.contentObs(id);
            item.hrefObs('/#/schemas/'+encodeURIComponent(id)+'/versions/'+rev+'/editor');
        }
        item.progressState = this.uploadProgressBarState(item);
        item.requestedOnFormatted = fn.formatDateTime(item.requestedOn);
        item.completedByObs(this.uploadFormatCompletedBy(item));
    }
    uploadFormatCompletedBy(item) {
        if (item.status === 'succeeded') {
            let start = new Date(item.requestedOn).getTime();
            let end = new Date(item.completedOn).getTime();
            let completedOn = fn.formatDateTime(item.completedOn);
            return completedOn+" ("+item.completedBy+", "+fn.formatMs(end-start)+")";
        } else if (item.status === 'duplicate') {
            return "duplicates <span class='upload-id'>"+item.duplicateUploadId+"</span>";
        }
        return '';
    }
    uploadProgressBarState(item) {
        let obj = {type: 'progress', color: 'gray', value: 1, label: 'Upload Requested', total:3};
        if (item.status === 'succeeded') {
            obj.value = 2;
            obj.label = "Upload Completed";
            if (item.healthRecordExporterStatus === 'succeeded') {
                obj.value = 3;  
                obj.label = "Export Completed";
                obj.color = "green";
            } else if (typeof item.healthRecordExporterStatus === 'undefined') {
                obj.color = "green";
            }
        } else if (item.status === 'duplicate') {
            obj.value = 2;
            obj.label = "Upload Error";
        }
        return obj;
    }
    processUploads(response) {
        if (response.items) {
            response.items.map(this.processItem.bind(this));
            this.itemsObs(response.items);
        }
        return response;
    }
    loadingFunc(args) {
        this.updateDateRange();
        args.startTime = this.query.startTime;
        args.endTime = this.query.endTime;
        storeService.persistQuery(PAGE_KEY, args);
        
        return serverService.getUploads(args)
            .then(this.processUploads.bind(this))
            .catch(utils.failureHandler());
    }
};
