httpquery
=========

*HTTP query protocol with proof-of-concept implementations obtaining
subsets of remote HTML data via XPath or CSS Selectors*

HTTPQuery is an *experimental* protocol with the following tools:
* proof-of-concept Firefox addon (web app to
come) to allow remote HTTPQueries without access
restrictions
* Node.js file handler implementation to allow remote queries to
be made to obtain subsets of HTML or XML data via XPath or CSS selector
syntax. Static HTML/XML files can be read from the desktop before
being transformed by the client-submitted XPath
or CSS Selectors query. (A PHP demo is also planned.)

The CSS Selector syntax has been modified to include the following
pseudo-classes:

* **attr(...)** - Grab the actual attribute content (of the first attribute
in the node set). This is necessary since attribute selectors are used
in CSS to target elements rather than attributes.
* **text()** - Grab the text nodes within the node set

Note that as mentioned the protocol syntax as well as tools are still
very much experimental and are used at your own risk.

While others have pioneered work in this direction (e.g., OData),
it is hoped that this simple protocol will gain support and allow
piecemeal selection of content in a manner reusable by servers
and clients with an absolutely bare minimum of effort by content
creators. The Web IS a database, and it is about time that
its data becomes opened--for the humblest content creator
to experienced mashup developers.

It is also hoped, whether through minor markup changes to schema
attachment, intelligent widgets may become more of a
norm in exposing sophisticated, offlineable, type-aware and
paginated widgets which do not depend on the content creator
being themselves a developer for this functionality to be made
available to users.

JSON support (via JSONPath / RQL?) is also envisaged, but
the first goal is to allow regular website content creators to have
their content available to searches--with HTML/XML being the
inevitable document-centric format.

(UNFINISHED)
