/*globals require, exports */
// This is an active module of the HTTPQuery Add-on

(function () {

'use strict';
var modifyRequest,
    examineResponse,
    examineCachedResponse,
    httpQueryPanel, httpQueryWidget,
    chrome = require('chrome'),
    Cc = chrome.Cc,
    Ci = chrome.Ci,
    ACCESS_READ = Ci.nsICache.ACCESS_READ,
    cacheService = Cc['@mozilla.org/network/cache-service;1'].getService(Ci.nsICacheService),
    httpCacheSession = cacheService.createSession('HTTP', 0, true),
    data = require('sdk/self').data,
    winUtils = require('sdk/window/utils'),
    tabs = require('sdk/tabs'),
    tabUtils = require('sdk/tabs/utils'),
    Request = require('sdk/request').Request,
    widget = require('sdk/widget'),
    panel = require('sdk/panel'),
    observerBuilder = require('./ObserverBuilder').ObserverBuilder,
    supportedIcon = data.url('httpQuery-supported.svg'),
    notSupportedIcon = data.url('httpQuery.svg'),
    getCurrentTabContentWindow = function () {
        return tabUtils.getTabContentWindow(tabUtils.getActiveTab(winUtils.getMostRecentBrowserWindow()));
    },
    removeAnchor = function (url) {
        return url.replace(/#.*$/, '');
    },
    getActiveTabURL = function () {
        return removeAnchor(tabs.activeTab.url);
    },
    checkQueryServerSupport = function (header, queryType) {
        var queryServerSupport = (/^query-server-support:\s*(.*?)\s*(?:\;|$)/mi).exec(header);
        return queryServerSupport && (
            !queryType || (queryServerSupport[1].split(/\s+/).indexOf(queryType) > -1)
        );
    },
    /**
    * @param {String} [queryType]
    */
    checkCachePerSupport = function (url, supportedCb, notSupportedCb, noEntryCb, queryType) {
        var checkCacheListener = {
            onCacheEntryAvailable: function (entry, access, status) {
                if (!entry) { // Called if not available
                    return noEntryCb && noEntryCb(queryType);
                }
                var queryServerSupport = checkQueryServerSupport(entry.getMetaDataElement('response-head'), queryType);
                if (queryServerSupport) {
                    return supportedCb && supportedCb(queryType);
                }
                return notSupportedCb && notSupportedCb(entry);
            }
        };
        // We check whether the page has already been loaded (and so we can
        //   inspect its header info so as to know whether the query protocol
        //   is supported).
        httpCacheSession.asyncOpenCacheEntry(url, ACCESS_READ, checkCacheListener, true);
    },
    noSupportFoundForTab = function () {
        httpQueryWidget.contentURL = notSupportedIcon;
    },
    changeIconPerURLQuerySupport = function (url) {
        checkCachePerSupport(removeAnchor(url), function () {
            httpQueryWidget.contentURL = supportedIcon;
        }, noSupportFoundForTab, noSupportFoundForTab);
    },
    changeIconPerTabQuerySupport = function (tab) {
        changeIconPerURLQuerySupport(tab.url);
    };

httpCacheSession.doomEntriesIfExpired = false;

exports.main = function() {

    // ADD QUERY SUPPORT HEADER TO ALL REQUESTS
    modifyRequest = observerBuilder('http-on-modify-request',
        function (subject, topic, data) {
            var channel = subject.QueryInterface(Ci.nsIHttpChannel);
            channel.setRequestHeader('query-client-support', 'xpath1 css3', false);

            // channel.setRequestHeader('query-xpath-request', '//b[position() > 1 and position() < 4]', false);
        }
    ).register();


    // SETUP PANEL/WIDGET
    httpQueryPanel = panel.Panel({
        width: 715,
        height: 360,
        contentURL: data.url('httpQuery.html'),
        contentScriptFile: data.url('httpQuery.js'),
        contentScriptWhen: 'ready'
    });
    httpQueryWidget = widget.Widget({
        id: 'http-query-btn',
        label: "HTTP Query",
        contentURL: notSupportedIcon,
        panel: httpQueryPanel
    });

    // POPULATE DIALOG WITH CURRENT URL UPON PANEL LOAD
    httpQueryPanel.on('show', function () {
        httpQueryPanel.port.emit('url', getActiveTabURL());
    });


    // CHANGE ADD-ON ICON DEPENDING ON WHETHER QUERY PROTOCOL SUPPORT WAS DETECTED (IN CACHE) FOR A TAB'S CONTENT...
    // ...IF USER SWITCHES TO TAB...
    tabs.on('activate', function (tab) {
        changeIconPerTabQuerySupport(tab);
    });
    // ...IF PAGE JUST LOADED AND TAB IS ACTIVE
    tabs.on('ready', function (tab) {
        if (tab === tabs.activeTab) {
            changeIconPerTabQuerySupport(tab);
        }
    });


    // CONDITIONALLY EXECUTE XPATH WITH A NEW REQUEST IF PROTOCOL SUPPORTED OR WITH CACHED COPY OF ALREADY-LOADED DOCUMENT IF NOT
    httpQueryPanel.port.on('query', function (params) {

        var url = removeAnchor(params[0]),
            query = params[1],
            queryType = params[2],
            userFormat = params[3],
            textToDocument = function (text) {
                var parser = Cc['@mozilla.org/xmlextras/domparser;1'].createInstance(Ci.nsIDOMParser);
                return parser.parseFromString(text, 'text/html');
                //return new getCurrentTabContentWindow().DOMParser().parseFromString(text, 'text/html');
            },
            getCurrentTabContentDocument = function () {
                return getCurrentTabContentWindow().document;
            },
            setWindowContents = function (markup) {
                /*
                // This works without opening a new document, but could be
                //   security risk (and user might wish to continue
                //   using current document anyways.
                var oldDoc = getCurrentTabContentDocument(),
                    newDoc = textToDocument(markup);
                oldDoc.replaceChild(newDoc.documentElement, oldDoc.documentElement);
                */
                tabs.open({
                    url: 'about:newtab',
                    // onOpen doesn't have document yet apparently
                    onReady: function (tab) {
                        var oldDoc = getCurrentTabContentDocument(),
                            newDoc = textToDocument(markup);
                        oldDoc.replaceChild(newDoc.documentElement, oldDoc.documentElement);
                    }
                });
            },
            handleMarkup = function (markup) {
                httpQueryPanel.port.emit('dataReceived', markup);
                setWindowContents(markup);
            },
            docEvaluateArray = function (expr, doc, context, resolver) {
                var i, result, a = [];
                doc = doc || (context ? context.ownerDocument : document);
                resolver = resolver || null;
                context = context || doc;

                result = doc.evaluate(expr, context, resolver, 7, null); // getCurrentTabContentWindow().XPathResult.ORDERED_NODE_SNAPSHOT_TYPE == 7
                for(i = 0; i < result.snapshotLength; i++) {
                    a[i] = result.snapshotItem(i);
                }
                return a;
            },
            serializeDOMNodes = function (arr, contentType, format) {
                var serializer = Cc['@mozilla.org/xmlextras/xmlserializer;1'].createInstance(Ci.nsIDOMSerializer),
                    isXML = ['application/xml', 'application/xhtml+xml', 'application/tei+xml'].indexOf(contentType) > -1,
                    mapFunc = (isXML || format === 'xml') ? function (resultItem) {
                        return serializer.serializeToString(resultItem);
                    } : function (resultItem) {
                        return resultItem.outerHTML;
                    };
                return arr.map(mapFunc);
            },
            executeXPath1OnDOMDocument = function (doc, contentType, format) {
                var markup = serializeDOMNodes(docEvaluateArray(query, doc), contentType, format);
                markup = format === 'json' ? JSON.stringify(markup) : markup.join();
                handleMarkup(markup);
            },
            executeCSS3OnDOMDocument = function (doc, contentType, format) {
                var extended = query.match(/(.*?)(?:\:(text|attr)\(([^\)]*)\))$/),
                    markup = extended ?
                        (extended[2] === 'attr' ?
                            doc.querySelector(extended[1]).getAttribute(extended[3]) :
                            [].slice.call(doc.querySelectorAll(extended[1])).map(function (el) {
                                return el.textContent;
                            }).join('')
                        ) :
                        serializeDOMNodes([].slice.call(doc.querySelectorAll(query)), contentType, format);
                markup = format === 'json' ? JSON.stringify(markup) : extended ? markup : markup.join('');
                handleMarkup(markup);
            },
            executeQueryOnDOMDocument = function (doc, queryType, contentType, format) {
                switch (queryType) {
                    case 'xpath1':
                        executeXPath1OnDOMDocument(doc, contentType, format);
                        break;
                    case 'css3':
                        executeCSS3OnDOMDocument(doc, contentType, format);
                        break;
                }
            },
            queryNotSupportedDocument = function (entry) {
                var cacheData, doc, ctype, qctype, contentType, format,
                    scriptableStream = Cc["@mozilla.org/scriptableinputstream;1"].createInstance(Ci.nsIScriptableInputStream),
                    is = entry.openInputStream(0);
                
                scriptableStream.init(is);
                cacheData = scriptableStream.read(scriptableStream.available());
                doc = textToDocument(cacheData);
                qctype = (/^query-content-type:\s*(.*?)\s*(?:\;|$)/mi).exec(
                    entry.getMetaDataElement('response-head')
                );
                ctype = (/^content-type:\s*(.*?)\s*(?:\;|$)/mi).exec(
                    entry.getMetaDataElement('response-head')
                );
                format = qctype && ctype && ctype[1] === 'application/json' ? 'json' : userFormat;
                contentType = (qctype && qctype[1]) || ctype[1];
                executeQueryOnDOMDocument(doc, queryType, contentType, format);
                // Is this faster than cache querying when the document is
                //   already loaded in the tab? (problematic perhaps for
                //   XPath's being chained)
                // var doc = getCurrentTabContentDocument();
                // executeQueryOnDOMDocument(doc, queryType, );
            },
            /**
            * @param {Array} queryType
            */
            makeNewRequest = function (queryType) {
                var requestObj = {
                    url: url,
                    headers: {
                        // 'query-client-support': 'xpath1 css3', // Already being sent?
                    },
                    /*
                    If we make a post request, it will get markup, but subsequent queries to the cache service won't find the URL anymore,
                    whereas if we make a get request (without adding any parameters), it will use the cached (potentially empty) result
                    it already retrieved; however, if we seed it with our own dynamic GET variable, it will have the desired effect
                    */
                    content: {
                        dateXXXXX: (new Date().toString())
                    },
                    onComplete: function (resp) {
                        var markup, doc, qctype, ctype, format, contentType,
                            queryServerSupport = checkQueryServerSupport('query-server-support:'+resp.headers['query-server-support'], queryType);
                        /**
                        for (var headerName in resp.headers) {
                            console.log(headerName + " : " + resp.headers[headerName]);
                        }
                        */
                        if (queryServerSupport) { // Already succeeded to get appropriate query result
                            markup = resp.text;
                            handleMarkup(markup);
                        }
                        else { // We still need to execute query as this did not support the protocol
                            doc = textToDocument(resp.text);
                            
                            qctype = resp.headers['query-content-type'] && (/(.+?)(?:\;|$)/).exec(resp.headers['query-content-type'].trim());
                            ctype = resp.headers['Content-Type'] && (/(.+?)(?:\;|$)/).exec(resp.headers['Content-Type'].trim());
                            format = qctype && ctype && ctype[1] === 'application/json' ? 'json' : userFormat;
                            contentType = (qctype && qctype[1]) || ctype[1];
                            
                            executeQueryOnDOMDocument(doc, queryType, contentType, format);
                        }
                    }
                };
                requestObj.headers['query-request-' + queryType] = query;
                if (userFormat === 'json') {
                    requestObj.headers['query-format'] = 'json';
                }
                Request(requestObj).get();
            };
        // We check whether the page has already been loaded (and so we can
        //   inspect its header info so as to know whether the query protocol
        //   is supported).
        // console.log('URL:'+url);
        // url, supported, notSupported, noEntry
        checkCachePerSupport(url, makeNewRequest, queryNotSupportedDocument, makeNewRequest, queryType);
    });

    // From https://developer.mozilla.org/en-US/docs/Updating_extensions_for_Firefox_3.5#Getting_a_load_context_from_a_request
    // courtesy of https://developer.mozilla.org/en-US/docs/Code_snippets/Tabbed_browser#Getting_the_browser_that_fires_the_http-on-modify-request_notification
    // courtesy of http://stackoverflow.com/questions/10719606/is-it-possible-to-know-the-target-domwindow-for-an-httprequest
    function getWindowForRequest (request){
      if (request instanceof Ci.nsIRequest){
        try{
          if (request.notificationCallbacks){
            return request.notificationCallbacks
                          .getInterface(Ci.nsILoadContext)
                          .associatedWindow;
          }
        } catch(e) {}
        try{
          if (request.loadGroup && request.loadGroup.notificationCallbacks){
            return request.loadGroup.notificationCallbacks
                          .getInterface(Ci.nsILoadContext)
                          .associatedWindow;
          }
        } catch(e2) {}
      }
      return null;
    }
    function changeIconPerResponseQuerySupport (subject, topic, data) {
        if (getCurrentTabContentWindow() === getWindowForRequest(subject)) { // If this is (or is equivalent to) the current tab, check whether to change icon
            var qss, channel = subject.QueryInterface(Ci.nsIHttpChannel);

            try {
                qss = channel.getResponseHeader('query-server-support');
            }
            catch (e) {
                qss = false;
            }
            httpQueryWidget.contentURL = qss ? supportedIcon : notSupportedIcon;
        }

        // Use this if need to inspect content for some reason
        // var trChannel = subject.QueryInterface(Ci.nsITraceableChannel);
        // trChannel.setNewListener(listener);
    }
    examineResponse = observerBuilder('http-on-examine-response', changeIconPerResponseQuerySupport).register();
    examineCachedResponse = observerBuilder('http-on-examine-cached-response', changeIconPerResponseQuerySupport).register();
};

exports.onUnload = function () {
    if (modifyRequest) {
        modifyRequest.unregister();
    }
    if (examineResponse) {
        examineResponse.unregister();
    }
    if (examineCachedResponse) {
        examineCachedResponse.unregister();
    }
};

}());
