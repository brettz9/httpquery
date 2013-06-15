Place static files within this "Node" directory and run "index.js" from this folder.

The following modules must be installed (note, however, that they
are already a part of the repository): xpath, cheerio, and xmldom:
    npm install cheerio
    npm install xpath
    npm install xmldom

These dependencies may change at a later date.

The server currently loads nothing by default for the static page if HTTP Query client support headers are
being sent properly, e.g., from the Firefox add-on (in case the sender wants to take the cue
from the server support response header that he or she can selectively query the desired portions).

See https://github.com/brettz9/httpquery for more information.