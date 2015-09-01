var ko = require('knockout');
var $ = require('jquery');

var SHOW_DELAY = 1;
var HIDE_DELAY = 800;

// http://stackoverflow.com/questions/23606541/observable-array-push-multiple-objects-in-knockout-js
ko.observableArray.fn.pushAll = function(valuesToPush) {
    var underlyingArray = this();
    this.valueWillMutate();
    ko.utils.arrayPushAll(underlyingArray, valuesToPush);
    this.valueHasMutated();
    return this;
};
ko.observableArray.fn.contains = function(value) {
    var underlyingArray = this();
    return underlyingArray.indexOf(value) > -1;
};
ko.bindingHandlers.semantic = {
    init: function(element, valueAccessor) {
        var value = ko.unwrap(valueAccessor());
        if (value === 'checkbox') {
            var input = $(element).children("input").get(0);
            element.classList.add("ui");
            element.classList.add("checkbox");
            $(element).checkbox();
            // This seems to be necessary to update knockout model.
            $(element).on('change', function() {
                var context = ko.contextFor(input);
                context.$component.checkedObs(input.checked);
            });
        } else if (value === 'dropdown') {
            element.classList.add("ui");
            element.classList.add("dropdown");
            $(element).dropdown();
        }
    }
};
ko.bindingHandlers.ckeditor = {
    init: function(element, valueAccessor) {
        if (!CKEDITOR) {
            throw new Error("CK editor has not been loaded in the page");
        }
        var config = {
            toolbarGroups: [
                { name: 'clipboard', groups: ['clipboard','undo']},
                {"name":"basicstyles","groups":["basicstyles"]},
                {"name":"paragraph","groups":["list","blocks"]},
                {"name":"insert","groups":["insert"]},
                {"name":"styles","groups":["styles"]},
                {"name":"links","groups":["links"]}
            ],
            on: {
                instanceReady: function(event) {
                    var callback = valueAccessor();
                    callback(event.editor);
                }
            }
        };
        CKEDITOR.replace(element, config);
    }
};
ko.bindingHandlers.modal = {
    init: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
        ko.bindingHandlers.component.init(element, valueAccessor, allBindings, viewModel, bindingContext);
        var config = valueAccessor();
        config.extend({notify: 'always'}); // Even if the user opens an identical dialog, reopen it.
        config.subscribe(function (newConfig) {
            var $modal = $(element).children(".modal");
            if ($modal.modal) {
                $modal.modal({"closable": false});
                if (newConfig.name !== "none_dialog") {
                    $modal.modal('show');
                } else {
                    $modal.modal('hide');
                }
            }
        });
    }
};
/**
 * Create an auto-resizing textarea control without going insane. Unfortunately this
 * solution requires CSS as well, see survey.css where this is currently used.
 *
 * http://www.brianchu.com/blog/2013/11/02/creating-an-auto-growing-text-input/
 */
ko.bindingHandlers.resizeTextArea = {
    init: function (element, valueAccessor, allBindings, viewModel, bindingContext) {
        var textareaSize = element.querySelector('.textarea-size');
        var textarea = element.querySelector('textarea');
        var autoSize = function () {
            textareaSize.innerHTML = textarea.value.trim() + '\n';
        };
        textarea.addEventListener('input', autoSize, false);
        setTimeout(autoSize, 200);
    }
};
/**
 * Creates that flippy insertion control in the survey editor.
 *
 */
ko.bindingHandlers.flipper = {
    init: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
        var showTimer = null;
        var hideTimer = null;

        function clearTimers() {
            clearTimeout(showTimer);
            clearTimeout(hideTimer);
        }

        var obj = ko.unwrap(valueAccessor());
        element.addEventListener('click', function(event) {
            clearTimers();
            showTimer = setTimeout(function() {
                element.classList.add('insertion-control-flipped');
            }, SHOW_DELAY);
            if (viewModel[obj.mouseover]) {
                viewModel[obj.mouseover](element);
            }
        }, false);
        element.addEventListener('mouseover', function(event) {
            clearTimers();
            hideTimer = setTimeout(function() {
                element.classList.remove('insertion-control-flipped');
            }, HIDE_DELAY);
        }, false);
        element.addEventListener('mouseout', function(event) {
            clearTimers();
            hideTimer = setTimeout(function() {
                element.classList.remove('insertion-control-flipped');
            }, HIDE_DELAY);
            if (viewModel[obj.mouseout]) {
                viewModel[obj.mouseout](element);
            }
        }, false);
        element.addEventListener('click', function(event) {
            if (event.target.getAttribute('data-type')) {
                event.stopPropagation();
                clearTimers();
                element.classList.remove('insertion-control-flipped');
                if (viewModel[obj.click]) {
                    viewModel[obj.click](event.target.getAttribute('data-type'), ko.unwrap(obj.index));
                }
            }
        }, false);
    }
};
