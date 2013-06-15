/*globals self */

(function () {

'use strict';

function $ (sel) {
    return document.querySelector(sel);
}

// http://stackoverflow.com/a/16974199/271577
function getSelectedRadioValue (formElement, radioName) {
    return ([].slice.call(formElement[radioName]).filter(function (radio) {
        return radio.checked;
    }).pop() || {}).value;
}


$('#queryForm').addEventListener('submit', function (e) {
    var xpathValue = $('#xpath1').value,
        queryValue = xpathValue || $('#css3').value,
        format = getSelectedRadioValue($('#queryForm'), 'format');
    e.preventDefault();
    self.port.emit('query', [$('#queryURL').value, queryValue, xpathValue ? 'xpath1' : 'css3', format]);
});


self.port.on('url', function (msg) {
    $('#queryURL').value = msg;
});

self.port.on('dataReceived', function (data) {
    $('#results').value = data;
});

}());