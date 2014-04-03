httpquery
=========

*HTTP query protocol with proof-of-concept implementations obtaining
subsets of remote HTML data via XPath or CSS Selectors, essentially
providing the likes of a native XML database, but without need for any
importing of data (the server will simply read your static HTML/XML files
on demand and deliver a subset of this data as queried by the user
or application).*

Components
==========

HTTPQuery is an *experimental* protocol with the following tools:
* Proof-of-concept **Firefox addon** (web app to
come) to allow remote HTTPQueries without access
restrictions
* **Node.js and PHP server file handler implementations** to allow remote queries to
be made to obtain subsets of HTML or XML data via XPath or CSS selector
syntax (currently XPath is for XML/XHTML only; CSS Selectors for HTML only?).
Static HTML/XML files can be read from the desktop before
being transformed by the client-submitted XPath
or CSS Selectors query. Files with extension "html", "xhtml", "xml",
or "tei" are currently recognized (files placed within the respective
server subfolder ("Node" or "PHP")). Please see their respective README's.

A PHP demo server is also planned.

INTRODUCTION (IMPORTANT)
=========================

Despite the fact that the ubiquitous files of the web, HTML files, are
THEMSELVES databases, there has been a curious lack of ability
to query these files without first needing to enter their contents into
a database or for a consumer to be forced to download the entire
file and then obtain the subset they desire. Even when
time has been taken to enter file contents into a database, users
are often hamstrung by developer decisions, as they are not usually
empowered to run arbitrary queries.

This HTTP Query protocol, with reference Node.js and Firefox client
implementation are meant to provide users and developers with
a means to overcome these barriers and limitations by letting your
users by default query any document that you allow in the manner
they wish, and with the default behavior allowing you to keep your
data in simple static files, such as arbitrary HTML files or, on
the other hand, HTML files shaped in a manner more similar
in structure to traditional simpler databases (e.g., an HTML
file consisting solely of a single table, hierarchical list, etc.).

Other possible uses may include selective spidering.

**Note that as mentioned the protocol syntax as well as tools are still
very much experimental and are used at your own risk. Allowing
arbitrary XPath or CSS Selector syntax may present some
increased risk of DDOS attacks.**

The Web IS a database, and it is about time that
its data becomes opened--for the humblest content creator
to experienced mashup developers.


Future goals (general)
=================

While the first goal is to allow regular website content creators to
have their content available to searches--with HTML/XML being
the inevitable document-centric format, JSON support (via
JSONPath / RQL?) is also envisaged.

It is also hoped, whether through minor markup changes to schema
attachment, intelligent widgets may become more of a norm in exposing
sophisticated, offlineable, type-aware and paginated widgets which do
not depend on the content creator being themselves a developer for
this functionality to be made available to users.

See the todos for more future goals for the project.

FAQ
====
* *Why require headers rather than GET-friendly bookmarkable/shareable request parameters?* - I wanted the protocol to be able to overlay any dynamic as well as static system which might already be using its own request parameters. However, I would like to see a non-HTTP web protocol be created to work with these headers.

* *If I generate my data dynamically (e.g., because I have files too large to be efficiently queried against a static file), how is the protocol still useful?* - The query mechanism and API will still be reusable by local apps (or remote ones such as the Firefox add-on if the server is enabled in a manner like the included Node server), code libraries, etc., even if you do not wish to restrict yourself to static files. For example, even though your API might filter the raw data as it is, an HTTPQuery could be allowed to run on top of that filtered data.

* *Why not use OData?* - While OData has pioneered work in this direction, it is hoped that this simple protocol will gain support and allow
piecemeal selection of content in a manner reusable by servers and clients with an absolutely bare minimum of effort by content
creators (and even implementers).

Informal, tentative specification for HTTP Query headers
===========================================

1. The client MAY submit a **query-client-support** header including a whitespace-separated list of supported query mechanisms (currently `xpath1` and `css3`). The HTTPQuery server MUST NOT require this header when other HTTPQuery queries are supplied.  (The server MAY utilize the client support header to display minimal content by default since the client user is assumed to be familiar with his own browser's capabilities in utilizing the protocol to query only what he needs. The header **query-full-request** MAY be submitted (instead or in addition) by the client to counter-act this assumption to display minimal content. If the client wishes to make the request for minimal data explicit, it can make a HEAD request.)
2. The server SHOULD advertise **query-server-support** with a space-separated list of supported query types (currently `xpath1` and `css3`) before specific queries are made and MUST advertise the header when queries are successfully returned (and SHOULD return the header if there is a failure). This information MAY be used by clients to inform users of the query mechanisms available to them for the site.
3. Requests are made by headers of the form, "query-request-<QUERY MECHANISM>". Clients and servers should support **query-request-xpath1** and **query-request-css3** and MAY support other custom mechanisms.
4. Since queries may return node sets, the question arises as to how to group nodes in the results. In the case of normal HTML payloads, a query-supporting server MUST join together XPath1 and CSS3 query results as a string and without a separator between elements. In the case of normal XML payloads, since well-formedness will typically be expected and it is possible that more than one item is returned (i.e., without a single root node), a query-supporting server MUST wrap the resulting XML element(s) within a `div` element in the XHTML namespace (i.e., within `<div xmlns="http://www.w3.org/1999/xhtml"></div>`). The query-supporting server of XPath1 or CSS3 queries MUST also support the ability to recognize an additional client-supplied header, **query-format** set to the value `json` which will deliver  the XML or HTML results in the JSON format while also recognizing the header **query-content-type** which will indicate the content-type of the wrapped fragments (i.e., text/html or an XML MIME type) as distinct from the regular **Content-Type** header which for JSON should be `application/json`.
5. The query-supporting server for CSS3 queries MUST support two extensions described below for obtaining an attribute value or text nodes. In such cases, the format will be a string.  The query-supporting server of such queries MUST also support the ability to recognize an additional client-supplied header, **query-format** set to the value `json` so as to deliver the string in JSON format. A **query-content-type** response header MAY be provided if set to `text/plain`. (Headers may be added in the future to distinguish whether JSON delivery should concatenate text node results into a single string or not.)

CSS Selector modifications
=====================

The CSS Selector syntax has been modified to include the following
pseudo-classes:

* **attr(...)** - Grab the actual attribute content (of the first attribute
in the node set). This is necessary since attribute selectors are used
in CSS to target elements rather than attributes.
* **text()** - Grab the text nodes within the node set

Comparison with OData
==================

HTTP Query is a much lighter protocol. HTTP Query does hope to eventually support modification as does OData,
but in a web-friendly, hierarchical manner such as with https://github.com/kriszyp/put-selector.

(INCOMPLETE)

Ideas for possible future todos
========================

1. Add tests (especially ensuring content-type works properly with each mode)
1. Add an Ajax site-independent web application, including ability to supply arbitrary URLs with cross-site headers or making AsYouWish requests (would be facilitated by https://bugzilla.mozilla.org/show_bug.cgi?id=880908 ; see also https://bugzilla.mozilla.org/show_bug.cgi?id=855936 )
    * Do demos against HTML tables, HTML Microdata, TEI (XML)
1. Server todos:
    * Make the Node.js implementation wrappable for use with other existing dynamic code.
    * Make the PHP implementation more easily wrappable for use with dynamic code.
    * Contemplate what error/code to return (instead of full text) if user submits query header but not supported
    * Get XPath to work with HTML DOM and get CSS Selectors to work with XML (if it cannot already)?); test on (Linux) environment with jsdom
    * Fix local xpath query "//a/text()" or "//a/@href" (ORDERED_NODE_SNAPSHOT_TYPE === 7 is ok with arrays but not these apparently)
    * Allow CSS3 :text() nodes to be returned as an array of nodes for JSON (local and remote); allow explicit :html() ?
    * Get server to resolve new HTML Includes (or XInclude's) (and entities?) server-side before performing queries
    * Support by cross-domain access by default (since presence of headers already implies at least some flexibility in querying)?
    * Ability to send Relative XPaths (or CSS Sel.), so if file really big, can start at a certain point
    * Store user access in simple text file and use to check along with BrowserID (not related to protocol but another "powerful-by-default" feature)
    * Tool to auto-generate XML schema for SQL database table along with a single raw `<table>` export URL (but only enabling downloading
    within limits (see limits below); XPath/CSS Selectors (or paginating query mechanism, etc.) can then be translated back into equivalent SQL.
1. Add-on todos:
    * Confirm why queries aren't working for some sites and respond accordingly? (e.g., Yahoo and StackOverflow are detecting automatic Ajax header?)
    * Allow JSON format to be displayed as actual application/json content-type (and XML as application/xml)
    * Query input
        * XPath (or CSS Sel.) syntax coloring? (also update regex coloring for CodeMirror!)
        * XPath (or CSS Sel.) with auto-complete based on header-associated schema (including for HTML-treated-as-XML?) or at least general awareness of language/content-type (HTML/XML)
    * Page-specific preferences on whether to send appropriate headers to load HTTPQuery-supporting sites as empty (or full) by default (instead of possible Ajax pagination by the server); selectively advertise support headers (or at least minimize types on which the "http-on-modify-request" header is sent)?
1. Protocol enhancements
    * JSON support (via JSONPath / RQL?)
    * Schema attachment/markup enhancements for intelligent, type-aware, paginated, offlineable widgets:
        * Schema attachment (or markup) used by browser (or server) to make suitable query interface
            * Server indicates header-specified RelaxNG, Schematron for starters, and browser delivers simultaneously with content if possible
            * Schema-awareness by browser to transform current document into queryable doc could work even if doc only partly loaded (or offline)
            * Types:
                1. Tables
                    * Browser displays the requested data inline with already-loaded data, or as requested by user (for file download, separate dialog, etc.?)
                    * Allow mashable plugins, e.g., for user providing their own Excel-like automated columns (e.g., if user wanted all tables to allow a given column's data to be translated word-for-word and added as a new column)
                1. Lists
                    * Hierarchical drill-down for browsing and search; also as requested by user (for file download, separate dialog, etc.?)
                1. Numbered paragraphs
                    * Detect paragraph elements within a file and auto-number them (or use an attribute)--e.g., TEI's `<p n="">` for an automatic
                    paragraph range selection interface
                1. Arbitrary but type-aware queries (e.g., use a date selector for finding all dates within a range (of any element or a given element anywhere in the document)
            * Allow both browser-side and server-side overlays (strip at least some markup server-side if handling server-side so client doesn't try to redo); might use headers to detect whether to let user use their own browser-supplied one or some Ajax-based, simulating widget; use Custom Elements?
            * Web-based IDE (WIDE) to integrate with CKEditor/CodeMirror allowing inline querying and modification of data for a given large document without needing to load it all into the IDE view unless desired. Schema-driven input could also facilitate more common use of schemas with the query protocol (e.g., the schema for RelaxNG or Schematron could provide auto-complete or XSL on a schema could build a form for input).
                * WYSIWYG table editor to allow adding of types (as well as max, starting point, etc.), so average users can create databases (and schematic info) easily in HTML
            * Some kind of auto-update mechanism for offline storage? (OData ideas?)
            * Limits
                * Client-side size limits - e.g., normally download full load for offline caching (a particular site?) unless over 200 MB/table, etc.
                * Server indicates support limitations (e. g., size limits, max rows/request (page) for tables, lists, etc.) and server ignores if user disregards
                    * Allow server (or browser?) to read header or markup provided XPointers to find only specific elements supporting querying/pagination, etc. and with their limits
                    * Possible default behaviors: avoid resolving includes?, default row count/size per server, or page-specified suggestions for partial loading and query points)
                    * If the HTML is already database-generated, the server could use its own default number of rows/records/size
            * Offline
                * Coordinate full (or even partial) delivery for offline caching and querying (with automatic detection of offline mode, but also option to query offline even if online)
                * Ensure offline storage works with data added after (and before) page load
                * Add-on to allow any page stored for offline use (and cached in user-selected collections); ensure one can also store results when making selective queries
    * (XQuery/XSL/XProc or) jQuery-like syntax for more developer or user-driven complex, server-side reshaping (along with XPath/CSS Selectors) including mashups, though this presents even more challenges re: security
        * Include ability to include & mix other sources declaratively yet query together - e.g., protocol to send current doc to XSL as param to show automated cols
    * Allow data modification, e.g., something friendly like https://github.com/kriszyp/put-selector
    * Create corresponding bookmarkable/shareable protocol (e.g., `query:`) to request and reshape foreign sites with user permission
        * Integrate into privileged AsYouWish HTML pages
        * Add jQuery-like syntax option into add-on dialog with option to save as ayw-HTML (or create HTML content-type based on JS alone without <script></script>) (and then do for my own JML HTML-as-JSON content-type)
    * Other related protocols
        * Implement a related file search protocol to search all files in a folder, etc. (On the desktop, see an analogous proposal for Firefox desktop search, at https://bugzilla.mozilla.org/show_bug.cgi?id=878626 . Implement via Gopher (or METS)-like protocol? Check for <link/> to advertise support and thereby show interface?
        * Consider headers/protocols where you can get just what you want (e.g., Gopher, XMPP Data Forms), but with option for author to surround with arbitrary HTML
