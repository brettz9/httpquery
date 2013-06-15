/**
In order to keep more similarities in code between this non-privileged
web app here and the privileged add-on code, this shim can be used
for mimicking communication being a content script and (privileged)
add-on script
*/

function SDKPort () {
    this.listeners = {};
}
SDKPort.prototype = {
    constructor: SDKPort,
    on: function (type, cb) {
        this.listeners[type] = this.listeners[type] || [];
        this.listeners[type].push(cb);
    },
    emit: function (type, data) {
        var jsonData = JSON.stringify(data);
        this.other.listeners[type].forEach(function (cb) {
            cb(jsonData);
        });
    }
};

function SDKCommunicator (parent) {
    parent.port = new SDKPort();
}


var self = {};
SDKCommunicator(self);
