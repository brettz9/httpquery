<?php

@include('../../phpquery/phpQuery/phpQuery.php'); // For CSS Selectors

class HTTPQuery {

    public $debug = 1;
    public $ignoreQuerySupport = true;
    public $responseHeaders = array();
    public $requireFile;

    public function __construct ($requireFile = false) {
        $this->requireFile = $requireFile;

        // CSS and XPath
        //$file = pathinfo(__FILE__, PATHINFO_FILENAME) ? __FILE__ : 'index.html'; // Cut off initial slash
        //$file = dirname(__FILE__) . '/index.html';
        if (!isset($_GET['__httpQueryOriginalURL'])) {
            $this->exitError('You must configure htaccess properly');
        }
        $file = $_GET['__httpQueryOriginalURL'];

        $this->isXHTML = $isXHTML = preg_match('@\\.xhtml@', $file);
        $isXML = preg_match('@\\.xml@', $file);
        $isTEI = preg_match('@\\.tei@', $file);

        $this->getRequestHeaders();
        $this->isHTML = !($isXHTML || $isXML || $isTEI);
        $this->isJSON = isset($this->requestHeaders['query-format']) && $this->requestHeaders['query-format'] === 'json';

        $this->resultContentType = ($isXHTML ? 'application/xhtml+xml' :
                                    $isXML ? 'application/xml' :
                                        $isTEI ? 'application/tei+xml' : 'text/html');
        $this->file = preg_replace('@\\?.*$@', '', substr($file, -1) === '/' ? $file . 'index.html' : $file);
        $this->setResponseHeaders();
        $this->executeQuery();
    }

    /**
    * (Allow overriding for non-Apache servers)
    */
    protected function getRequestHeaders () {
        $this->requestHeaders = apache_request_headers();
    }

    protected function setResponseHeaders () {
        $requestHeaders = $this->requestHeaders;
        $this->responseHeaders = array(
            'Content-Type' => $this->isJSON ? 'application/json' : $this->resultContentType
        );
        if ($this->isJSON) {
            $this->responseHeaders['query-content-type'] = $this->resultContentType;
        }

        if (isset($requestHeaders['query-client-support']) && !isset($requestHeaders['query-request-xpath1']) && !isset($requestHeaders['query-request-css3']) && !isset($requestHeaders['query-full-request'])) {
            $this->responseHeaders['query-server-support'] = 'xpath1' . (class_exists('phpQuery') ? ' css3' : '');
            $this->write(200, ''); // Don't waste bandwidth if client supports protocol and hasn't asked us to deliver the full document
            // Todo: we should allow delivery of a default payload (e.g., full doc if not specified as requesting empty for feature detection+immediate execution if supported)
        }
        else {
            $this->responseHeaders['query-server-support'] = 'xpath1' . (class_exists('phpQuery') ? ' css3' : '');
        }
    }


    public function write ($code, $fileContents) {
        header(':', true, $code); // http_response_code($code); // PHP >= 5.4

        foreach ($this->responseHeaders as $header => $content) {
            header($header . ': ' . $content);
        }
        echo $fileContents;
        exit;
    }

    protected function exitError ($err = '', $code = 404) {
        $errorMessage = $this->debug ? $err : 'ERROR';
        $this->write($code, '<div style="color:red;font-weight:bold">' . $errorMessage . '</div>');
    }

    protected function clientSupportCheck ($str) {
        return isset($this->requestHeaders['query-client-support']) &&
            in_array($str, preg_split('@\\s+@', trim($this->requestHeaders['query-client-support'])));
    }


    protected function nodeArrayToSerializedArray ($doc, $items) {
        $arr = array();
        if ($this->isHTML) {
            for ($i = 0, $itl = $items->length; $i < $itl; $i++) {
                array_push($arr, $doc->saveHTML($items->item($i)));
            }
        }
        else {
            for ($i = 0, $itl = $items->length; $i < $itl; $i++) {
                array_push($arr, $doc->saveXML($items->item($i)));
            }
        }
        return $arr;
    }

    protected function nodeObjectToSerializedArray ($items) {
        // Convert iterator to normal array
        $arr = array();
        if ($this->isHTML) {
            foreach ($items as $item) {
                array_push($arr, $items->document->saveHTML($item));
            }
        }
        else {
            foreach ($items as $item) {
                array_push($arr, $items->document->saveXML($item));
            }
        }
        return $arr;
    }

    protected function wrapFragment ($frag) {
        if ($this->isHTML) { // || $queryResult.length <= 1) { // No need to wrap for HTML or single result sets as no well-formedness requirements
            return $frag;
        }
        $tag = 'div xmlns="http://www.w3.org/1999/xhtml"';
        $matches = array();
        preg_match('@^\\w*@', $tag, $matches);
        return '<' . $tag . '>' . $frag . '</' . $matches[0] . '>';
    }

    protected function executeQuery () {

        if (!preg_match('@\\w@', $this->file[0]) || preg_match('@\\.\\.@', $this->file)) {
            return $this->exitError('Disallowed character in file name', 404);
        }
        if ($this->requireFile) {
            ob_start();
            require($this->requireFile);
            $fileContents = ob_get_clean();
        }
        else {
            $fileContents = file_get_contents($this->file);
        }

        if (!$fileContents) {
            return $this->exitError('Could not get file', 404);
        }

        $clientXPath1Support = $this->clientSupportCheck('xpath1');
        $clientCSS3Support = $this->clientSupportCheck('css3');
        $queryResult = '';

        if (($this->ignoreQuerySupport || $clientXPath1Support) && isset($this->requestHeaders['query-request-xpath1']) && !isset($this->requestHeaders['query-full-request'])) {

            $doc = new DOMDocument();
            if ($this->isHTML) {
                $doc->loadHTML((string) $fileContents);
            }
            else {
                $doc->loadXML((string) $fileContents);
            }

            $xpath1Request = trim($this->requestHeaders['query-request-xpath1']); // || '//b[position() > 1 and position() < 4]'; // || '//b/text()',

            $xpath = new DOMXPath($doc);
            $queryResult = $xpath->evaluate($xpath1Request);

            $queryResult = $this->isJSON ? $this->nodeArrayToSerializedArray($doc, $queryResult) :
                                                                    $this->wrapFragment(implode('', $this->nodeArrayToSerializedArray($doc, $queryResult)));
        }
        else if (class_exists('phpQuery') && ($this->ignoreQuerySupport || $clientCSS3Support) && isset($this->requestHeaders['query-request-css3']) && !isset($this->requestHeaders['query-full-request'])) {
            // Support our own custom :text() and :attr(...) pseudo-classes (todo: do as (two-colon) pseudo-elements instead)
            if ($this->isHTML) {
                $_ = phpQuery::newDocumentHTML((string) $fileContents);
            }
            else if ($this->isXHTML) {
                $_ = phpQuery::newDocumentXHTML((string) $fileContents);
            }
            else {
                $_ = phpQuery::newDocumentXML((string) $fileContents);
            }
            $css3RequestFull = array();
            preg_match('@(.*?)(?:\\:(text|attr)\\(([^\\)]*)\\))?$@', trim($this->requestHeaders['query-request-css3']), $css3RequestFull); // Allow explicit "html" (toString) or "toArray" (or "json")?
            $css3Request = $css3RequestFull[1];
            $type = isset($css3RequestFull[2]) ? $css3RequestFull[2] : ($this->isJSON ? 'toArray' : '__toString');
            $css3Attr = isset($css3RequestFull[3]) ? $css3RequestFull[3] : null;

            switch ($type) {
                case 'attr': // Only gets one attribute anyways, so no need to handle differently for JSON (except the stringify below)
                    $queryResult = $_[$css3Request][0]->attr($css3Attr);
                    break;
                case 'toArray':
                    $queryResult = $_[$css3Request]; // Don't merge with next line as intermediate $queryResult may be needed by wrapFragment
                    $queryResult = $this->nodeObjectToSerializedArray($queryResult);
                    break;
                // Todo: Change 'text' to return array of text nodes in case of JSON?
                case 'text':
                    $queryResult = rtrim($_[$css3Request]->{$type}()); // Not sure why rtrim is needed here
                    break;
                case '__toString':
                    $queryResult = $this->wrapFragment(trim($_[$css3Request]->{$type}())); // Not sure why we should have to trim this
                    break;
            }
        }
        else {
            $queryResult = $fileContents;
        }

        $fileContents = $this->isJSON ? json_encode($queryResult) : $queryResult;

        $this->write(200, $fileContents);
    }
}

?>
