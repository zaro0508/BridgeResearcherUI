import fn from '../../functions';
import Promise from 'bluebird';
import scheduleUtils from '../schedule/schedule_utils';
import serverService from '../../services/server_service';
import sharedModuleUtils from '../../shared_module_utils';
import tables from '../../tables';
import utils from '../../utils';

module.exports = class Tasks {
    constructor() {
        tables.prepareTable(this, {
            name: 'task',
            type: 'CompoundActivityDefinition',
            delete: this.deleteItem,
            refresh: this.load
        });
        fn.copyProps(this, scheduleUtils, 'formatCompoundActivity');    
        this.load();
    }
    copy(vm, event) {
        var copyables = this.itemsObs().filter(tables.hasBeenChecked);
        var confirmMsg = (copyables.length > 1) ?
            "Tasks have been copied." : "Task has been copied.";

        utils.startHandler(vm, event);
        Promise.mapSeries(copyables, function(task) {
            task.taskId += "-copy";
            delete task.version;
            return serverService.createTaskDefinition(task);
        }).then(load)
            .then(utils.successHandler(vm, event, confirmMsg))
            .catch(utils.failureHandler({transient:false}));
    }
    deleteItem(task) {
        return serverService.deleteTaskDefinition(task.taskId);
    }
    load() { 
        sharedModuleUtils.loadNameMaps()
            .then(scheduleUtils.loadOptions)
            .then(serverService.getTaskDefinitions)
            .then(fn.handleSort('items','taskId'))
            .then(fn.handleObsUpdate(this.itemsObs, 'items'))
            .catch(utils.failureHandler());
    }
}
