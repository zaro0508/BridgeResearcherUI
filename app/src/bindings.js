import '../../node_modules/flatpickr/dist/flatpickr.min.css';
import $ from 'jquery';
import alert from './widgets/alerts';
import Chart from 'chart.js';
import flatpickr from 'flatpickr';
import ko from 'knockout';

// need to make a global out of this for semantic to work, as it's not in a package.
// This is hacky, webpack has better support for this. Worse, semantic is a jQuery
// plugin and adds no globals that webpack can convert to modules.
window.$ = window.jQuery = $;

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

ko.bindingHandlers.chart = {
    init: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
        var context = element.getContext("2d");
        var observer = valueAccessor();
        observer.subscribe(function(config) {
            if (element._chart) {
                element._chart.destroy();
            }
            element._chart = new Chart(context, config);
        });
    }
};

ko.bindingHandlers.focusable = {
    init: function(element) {
        $(element).find('input').on('focus', function() {
            element.classList.add("range-control-border-active");
        }).on('blur', function() {
            element.classList.remove("range-control-border-active");
        });
    }
};
ko.bindingHandlers.flatpickr = {
    init: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
        var observer = valueAccessor();
        var timeout = allBindings().timeout;
        var onChange = allBindings().onChange || function() {};
        var wrap = (allBindings().wrap === true);
        var includeTime = element.hasAttribute("data-enableTime");

        function updateObserver(date) {
            observer(null);
            if (date && date.length) {
                observer(date[0]);
            }
            onChange();
        }
        function createPicker() {
            var d = observer();
            var config = { defaultDate: d, onChange: updateObserver, wrap: wrap, 
                clickOpens: !wrap, enableTime: includeTime };
            flatpickr(element, config);
        }
        // You must delay initialization in a modal until after the modal is open, or 
        // the picker works... but spontaneously opens. Just add timeout: 600 to the 
        // binding, or however long you want to delay.
        if (timeout) {
            setTimeout(createPicker, timeout);    
        } else {
            createPicker();
        }
    }
};

ko.bindingHandlers.condPopup = {
    init: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
        var data = bindingContext.$data;
        var object = ko.unwrap(valueAccessor());
        if (object.render(data)) {
            element.setAttribute('data-variation', 'very wide');
            element.setAttribute('data-html', object.html(data));
            $(element).popup();
        }
        var className = object.className(data);
        if (className) {
            element.classList.add(object.className(data));
        }
    }
};
ko.bindingHandlers.selected = {
    init: function(element, valueAccessor) {
        var value = ko.unwrap(valueAccessor());
        if (value) {
            element.setAttribute("selected","selected");
        }
    }  
};
ko.bindingHandlers.readonly = {
    init: function(element, valueAccessor) {
        var observer = valueAccessor();
        observer.subscribe(function(value) {
            if (value) {
                element.setAttribute("readonly","readonly");
            } else {
                element.removeAttribute("readonly");
            }
        });
    }
};

ko.bindingHandlers.ckeditor = {
    init: function(element, valueAccessor) {
        if (!CKEDITOR) {
            throw new Error("CK editor has not been loaded in the page");
        }
        CKEDITOR.on('dialogDefinition', function(event) {
            if (['image','table','link'].indexOf( event.data.name ) > -1) {
                var dialogDefinition = event.data.definition;
                dialogDefinition.removeContents('Link');
                dialogDefinition.removeContents('advanced');
            }
        });
        var id = element.getAttribute("id");
        var config = {
            height: "25rem",
            resize_dir: "vertical",
            on: {
                instanceReady: function(event) {
                    var callback = valueAccessor();
                    callback(event.editor);
                }
            },
            toolbar: [
                { name: 'clipboard', items: [ 'Cut', 'Copy', 'Paste', 'PasteText', 'PasteFromWord', '-', 'Undo', 'Redo' ] },
                { name: 'editing', items: [ 'Find', 'Replace', '-', 'SelectAll' ] },
                { name: 'basicstyles', items: [ 'Bold', 'Italic', 'Underline', 'Strike', 'Subscript', 'Superscript', '-', 'RemoveFormat' ] },
                { name: 'links', items: [ 'Link', 'Unlink', 'Anchor' ] },
                { name: 'insert', items: [ 'Image', 'Table', 'HorizontalRule', 'Smiley', 'SpecialChar' ] },
                { name: 'paragraph', items: [ 'NumberedList', 'BulletedList', '-', 'Outdent', 'Indent', '-', 'Blockquote', 'CreateDiv', '-', 'JustifyLeft', 'JustifyCenter', 'JustifyRight', 'JustifyBlock' ] },
                { name: 'styles', items: [ 'Styles', 'Format', 'Font', 'FontSize' ] },
                { name: 'colors', items: [ 'TextColor', 'BGColor' ] },
                { name: 'document', items: ['-', 'Source']}
            ]            
        };
        CKEDITOR.replace(element, config);
        ko.utils.domNodeDisposal.addDisposeCallback(element, function () {
            if (CKEDITOR.instances[id]) {
                CKEDITOR.remove(CKEDITOR.instances[id]);
            }
        });
    }
};
ko.bindingHandlers.modal = {
    init: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
        ko.bindingHandlers.component.init(element, valueAccessor, allBindings, viewModel, bindingContext);
        var observable = valueAccessor();
        observable.subscribe(function (newConfig) {
            var $modal = $(".ui.modal");
            if ($modal.modal) {
                if (newConfig.name !== "none") {
                    $modal.modal({closable: false, detachable: false, notify: 'always', observeChanges: true});
                    $modal.modal("show");
                } else {
                    $modal.modal('hide');
                }
            }
        });
    }
};
ko.bindingHandlers.editableDiv = {
    init: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
        var observer = valueAccessor();
        element.innerText = observer() || '';
        element.addEventListener('keyup', function() {
            observer(element.innerText);
        }, false);
    }
};
ko.bindingHandlers.submitByButton = {
    init: function(element, valueAccessor) {
        var buttonId = ko.unwrap(valueAccessor());
        var button = document.getElementById(buttonId);
        if (!button) {
            console.error("Could not find button #" + buttonId);
        }
        element.onsubmit = function(event) {
            event.preventDefault();
            button.click();
        };
    }
};

function findItemsObs(context, collName) {
    // If the observer is passed in directly, just return that.
    if (typeof collName !== 'string') {
        return collName;
    }
    for (var i = 0; i < context.$parents.length; i++) {
        if (context.$parents[i][collName]) {
            if (context.$parents[i][collName]) {
                return context.$parents[i][collName];
            }
        }
    }
    return null;
}

/**
 * Fade and remove element in a list. The binding has the following parameters, passed in through a
 * parameter object:
 *  selector {String}
 *      the selector to find the encompassing HTML element that represents a single item in this
 *          observable array
 *  object {Object}
 *      the actual object to remove from the observable array
 *  collection {String}
 *      the name of the collection on a viewModel in the hierachy for this element. Defaults to 'itemsObs'
 */
ko.bindingHandlers.fadeRemove = {
    init: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
        var config = ko.unwrap(valueAccessor());
        var selector = config.selector;
        var rowItem = config.object;
        var collName = config.collection || 'itemsObs';
        var context = ko.contextFor(element);
        var itemsObs = findItemsObs(context, collName);
        var $element = $(element).closest(selector);
        element.addEventListener('click', function(event) {
            event.preventDefault();
            alert.deleteConfirmation("Are you sure you want to delete this?", function() {
                $element.animate({height: '0px', minHeight: '0px'}, 300, 'swing', function() {
                    itemsObs.remove(rowItem);
                    $element.remove();
                });
            });
        });
    }
};
ko.bindingHandlers.returnTo = {
    init: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
        var expr = valueAccessor();
        var target = document.querySelector(expr);
        element.addEventListener("keypress", function(e) {
            if (e.keyCode === 13) {
                $(target).click();
                return false;
            }
        }, false);
    }
};

function activeHandler(element, valueAccessor) {
    var id = element.getAttribute("href");
    if (id) {
        id = id.replace('#/','');
    }
    var func = valueAccessor;
    do {
        func = func(id, element);
    } while(typeof func === "function");
    if (func) {
        // the active handler is used in an accordian. Open the panel the match
        // is located in.
        $(element).closest(".content").addClass("active").prev().addClass("active");
    }
    element.classList.toggle("active", func);
}

ko.bindingHandlers.active = {
    init: activeHandler,
    update: activeHandler
};

ko.bindingHandlers.tab = {
    init: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
        var tab = element.getAttribute('data-tab');
        updateElement(element, valueAccessor, function(element, value) {
            element.classList.toggle("active", value === tab);
        });
    }
};

function updateTabSelection(element) {
    var hash = document.location.hash;
    var href = element.getAttribute('href');
    var tabPostFix = (href) ? ("/" + href.split("/").pop()) : href;
    element.classList.toggle("active", hash.indexOf(tabPostFix) > -1);
}

ko.bindingHandlers.tabber = {
    init: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
        element.classList.add("item");
        updateTabSelection(element);

        var observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.attributeName === "href") {
                    updateTabSelection(element);            
                }
            });
        });
        observer.observe(element, {attributes: true});
    }
};

ko.bindingHandlers.href = {
    init: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
        updateElement(element, valueAccessor, function(element, value) {
            element.setAttribute('href', value);
        });
    }
};

function updateElement(element, valueAccessor, func) {
    var accessor = valueAccessor();
    if (ko.isObservable(accessor) || ko.isComputed(accessor)) {
        func(element, accessor());
        accessor.subscribe(function(newValue) {
            func(element, newValue);
        });
    } else {
        func(element, accessor);
    }        
}
