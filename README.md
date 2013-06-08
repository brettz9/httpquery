httpquery
=========

*HTTP query protocol with proof-of-concept implementations obtaining
subsets of remote HTML data via XPath or CSS Selectors*

Components
==========

HTTPQuery is an *experimental* protocol with the following tools:
* proof-of-concept Firefox addon (web app to
come) to allow remote HTTPQueries without access
restrictions
* Node.js file handler implementation to allow remote queries to
be made to obtain subsets of HTML or XML data via XPath or CSS selector
syntax (currently XPath is for XML/XHTML only; CSS Selectors for HTML only?).
Static HTML/XML files can be read from the desktop before
being transformed by the client-submitted XPath
or CSS Selectors query. (A PHP demo is also planned.)

INTRODUCTION (IMPORTANT)
=========================

Note that as mentioned the protocol syntax as well as tools are still
very much experimental and are used at your own risk. Allowing
arbitrary XPath or CSS Selector syntax may present some
increased risk of DDOS attacks.

While others have pioneered work in this direction (e.g., OData),
it is hoped that this simple protocol will gain support and allow
piecemeal selection of content in a manner reusable by servers
and clients with an absolutely bare minimum of effort by content
creators. The Web IS a database, and it is about time that
its data becomes opened--for the humblest content creator
to experienced mashup developers.

See the todos for more future goals for the project.

Informal, tentative specification for HTTP Query headers
===========================================

1. The client MAY submit a **query-client-support** header including a whitespace-separated list of supported query mechanisms (currently `xpath1` and `css3`). The HTTPQuery server MUST NOT require this header when other HTTPQuery queries are supplied.  (The server MAY utilize the client support header to display minimal content by default since the client user is assumed to be familiar with his own browser's capabilities in utilizing the protocol to query only what he needs. The header **query-full-request** MAY be submitted (instead or in addition) by the client to counter-act this assumption to display minimal content. If the client wishes to make the request for minimal data explicit, it can make an OPTIONS request.)
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

Ideas for possible future todos
========================

1. While the first goal is to allow regular website content creators to have their content available to searches--with HTML/XML being the inevitable document-centric format, JSON support (via JSONPath / RQL?) is also envisaged.
1. It is also hoped, whether through minor markup changes to schema attachment, intelligent widgets may become more of a norm in exposing sophisticated, offlineable, type-aware and paginated widgets which do not depend on the content creator being themselves a developer for this functionality to be made available to users.
1. Ajax site-independent web application, including ability to supply arbitrary URLs with cross-site headers or making AsYouWish requests (would be facilitated by https://bugzilla.mozilla.org/show_bug.cgi?id=880908 ; see also https://bugzilla.mozilla.org/show_bug.cgi?id=855936 )
* Do demo code for HTML tables, HTML Microdata, TEI (XML)
1. Server todos:
* Make the Node.js implementation wrappable for use with other existing dynamic code.
* Get XPath to work with HTML DOM and get CSS Selectors to work with XML (if it cannot already)?); test on (Linux) environment with jsdom
* Fix local xpath query "//a/text()" or "//a/@href" (ORDERED_NODE_SNAPSHOT_TYPE === 7 is ok with arrays but not these apparently)
* Find out why CSS b:attr(a) ($('b').attr('a')) is not working with cheerio though ok with b:nth-child(2):attr(a)
* Allow CSS3 :text() nodes to be returned as an array of nodes for JSON (local and remote); allow explicit :html() ?
* Implement a PHP-based server (use output buffering to allow working with other existing dynamic code) with equivalent functionality
* Get server to resolve new HTML Includes (and entities?) server-side before performing queries
* Support by cross-domain access by default (since presence of headers already implies at least some flexibility in querying)?
1. Add-on todos:
* Allow JSON format to be displayed as actual application/json content-type
* Confirm why queries aren't working for some sites? (e.g., Yahoo and StackOverflow are detecting automatic Ajax header?)
* Page-specific preferences on whether to send appropriate headers to load HTTPQuery-supporting sites as empty (or full) by default (instead of possible Ajax pagination by the server); selectively advertise support headers (or at least minimize types on which the "http-on-modify-request" header is sent)?
1. Implement a file search protocol to search all files in a folder, etc. (On the desktop, see an analogous proposal for Firefox desktop search, at https://bugzilla.mozilla.org/show_bug.cgi?id=878626 . Implement via Gopher (or METS)-like protocol?

(UNFINISHED)
