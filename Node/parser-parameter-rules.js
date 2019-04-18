var PEG = require('pegjs'),
    // Can call toSource() on parser to get source
    parser = PEG.buildParser("start = ('a' / 'b')+"); // Could take second argument of boolean options, "cache" and "trackLineAndColumn"
    parse.parse(str);

/*
1) Accepts object mapping names (used if reporting and for self-referencing) to:
    a) regular expressions
    b) a string reference or, if not so-named, a literal
    c) a compiled object whose arguments can include any of these other values here in a-d
    d) an array representing a sequence of any of such values here in a-d
2) Regex assumed to be single characters by default
*/
var rfc2616ParameterRules = new Parser(
    {
        /*
        http://tools.ietf.org/html/rfc5987#section-3.2.1
        parameters of RFC 2616 with RFC 2616 implied LWS translated to RFC 5234 LWSP
        parameter     = attribute LWSP "=" LWSP value
        */
        parameter: $(['attribute', 'LWSP', '=', 'LWSP', 'value']),
        // attribute     = token
        attribute: $('token'),
        // value         = token / quoted-string
        'value': $('token', 'quoted-string'),

        /*
        http://tools.ietf.org/html/rfc2616#section-2.2
        quoted-string  = ( <"> *(qdtext | quoted-pair ) <"> )
        */
        'quoted-string': ['"', $('qdtext', 'quoted-pair').zeroOrMore(), '"'],
        // token          = 1*<any CHAR except CTLs or separators>
        // i.e. (reordered hex),   not 09 20 22 28 29 2c 2f 3a 3b 3c 3d 3e 3f 40 5b 5d 7b 7d (between \x20-\x7e)
        token: $('CHAR').except('CTL', 'separators').oneOrMore(),
        //token: /^[\x21\x23-\x27\x2a\x2b\x2d\x2e\x30-\x39\x41-\x5a\x5c\x5e-\x7a\x7c\x7e]+/,
        /*
        CHAR           = <any US-ASCII character (octets 0 - 127)>
        */
        'CHAR': /^[\x00-\x7f]/,
        /*
        CTL            = <any US-ASCII control character
                        (octets 0 - 31) and DEL (127)>
        */
        'CTL': /^[\x00-\x1f\x7f]/,
        /*
        separators     =
                      "(" | ")" | "<" | ">" | "@"
                      | "," | ";" | ":" | "\" | <">
                      | "/" | "[" | "]" | "?" | "="
                      | "{" | "}" | SP | HT
                      // i.e.,   28 29 3c 3e 40 2c 3b 3a 22 2f 5b 5d 3f 3d 7b 7d 20 9
                      // or   40 41 60 62 64 44 59 58 34 47 91 93 63 61 123 125 32 9
        */
        separators: /[()<>@,;:\\"\/\[\]?={} \t]/, // /^[\x09\x20\x22\x28\x29\x2c\x2f\x3a\x3b\x3c\x3d\x3e\x3f\x40\x5b\x5d\x7b\x7d]/,
        /*
            http://tools.ietf.org/html/rfc5234#appendix-B.1
            LWSP           =  *(WSP / CRLF WSP)
            WSP            =  SP / HTAB
            SP             =  %x20
            HTAB           =  %x09
            CRLF           =  CR LF
            CR             =  %x0D
            LF             =  %x0A
        */
        LWSP: $('WSP', ['CRLF', 'WSP']).zeroOrMore(),
        WSP: $('SP', 'HTAB'),
        SP: ' ',
        HTAB: '\t',
        CRLF: $('CR', 'LF'),
        CR: '\r',
        LF: '\n',
        // /^(?:(?:\x0d\x0a)?[ \t])*/,
        // OCTET          = <any 8-bit sequence of data>
        OCTET: $('CHAR'),
        /*
        TEXT           = <any OCTET except CTLs,
                        but including LWS>
        */
        TEXT: $('OCTET').except('CTL').including('LWS'),
        // qdtext         = <any TEXT except <">>
        qdtext: $('TEXT').except('"'), // if not found on object, will assume it is a literal
        // quoted-pair    = "\" CHAR
        'quoted-pair': ['\\', 'CHAR']
    }
);

var rfc5987ParameterRules = new Parser(
    rfc2616ParameterRules,
    /*
    // http://tools.ietf.org/html/rfc5646#section-2.1
    pct-encoded   = "%" HEXDIG HEXDIG
               ; see [RFC3986], Section 2.1
    // http://tools.ietf.org/html/rfc3986#section-2.1
    // http://tools.ietf.org/html/rfc2234
   HEXDIG         =  DIGIT / "A" / "B" / "C" / "D" / "E" / "F"
    */
    {
        'HEXDIG': $('DIGIT', /[A-F]/)
    },
    {
        /*
        http://tools.ietf.org/html/rfc5987#section-3.2.1
        // parameter     = reg-parameter / ext-parameter
        */
        parameter: $('reg-parameter', 'ext-parameter'),
        // reg-parameter = parmname LWSP "=" LWSP value
        'reg-parameter': ['parmname', 'LWSP', '=', 'LWSP', 'value'],
        // ext-parameter = parmname "*" LWSP "=" LWSP ext-value
        'ext-parameter': ['parmname', '*', 'LWSP', '=', 'LWSP', 'ext-value'],
        // parmname      = 1*attr-char
        'parmname': $('attr-char').oneOrMore(),
        /*
        ext-value     = charset  "'" [ language ] "'" value-chars
                   ; like RFC 2231's <extended-initial-value>
                   ; (see [RFC2231], Section 7)
        */
        'ext-value': ['charset', "'", $('language').zeroOrOne(), "'", 'value-chars'],
        /*
        charset       = "UTF-8" / "ISO-8859-1" / mime-charset
        */
        charset: $('UTF-8', 'ISO-8859-1', 'mime-charset'),
        /*
        mime-charset  = 1*mime-charsetc
        */
        'mime-charset': $('mime-charsetc').oneOrMore(),
        /*
        mime-charsetc = ALPHA / DIGIT
                   / "!" / "#" / "$" / "%" / "&"
                   / "+" / "-" / "^" / "_" / "`"
                   / "{" / "}" / "~"
                   ; as <mime-charset> in Section 2.3 of [RFC2978]
                   ; except that the single quote is not included
                   ; SHOULD be registered in the IANA charset registry
        */
        'mime-charsetc': $('ALPHA', 'DIGIT', /[!#$%&+\-\^_`{}~]/),
        // http://tools.ietf.org/html/rfc5234#appendix-B.1
        ALPHA: /[A-Za-z]/, // %x41-5A / %x61-7A
        // http://tools.ietf.org/html/rfc5234#appendix-B.1
        DIGIT: /[0-9]/, // x30-39
        /*
        http://tools.ietf.org/html/rfc5646#section-2.1
        language      = <Language-Tag, defined in [RFC5646], Section 2.1>
        Language-Tag  = langtag             ; normal language tags
                   / privateuse          ; private use tag
                   / grandfathered       ; grandfathered tags
       */
        'Language-Tag': $('langtag', 'privateuse', 'grandfathered'),
        /*
        langtag       = language
                     ["-" script]
                     ["-" region]
                     *("-" variant)
                     *("-" extension)
                     ["-" privateuse]
        */
        langtag: $(['language', $(['-', 'script']).zeroOrOne(), $(['-', 'region']).zeroOrOne(), $(["-", 'variant']).zeroOrMore(),
                        $(["-", 'extension']).zeroOrMore(), $(['-', 'privateuse']).zeroOrOne()]),
         /*
        language      = 2*3ALPHA            ; shortest ISO 639 code
                     ["-" extlang]       ; sometimes followed by
                                         ; extended language subtags
                   / 4ALPHA              ; or reserved for future use
                   / 5*8ALPHA            ; or registered language subtag
        */
        language: $(
            [$('ALPHA').range(2, 3), $(['-', 'extlang']).zeroOrOne()],
            $('ALPHA').exactly(4),
            $('ALPHA').range(5, 8)
        ),
        /*
        extlang       = 3ALPHA              ; selected ISO 639 codes
                     *2("-" 3ALPHA)      ; permanently reserved
        */
        extlang: [$('ALPHA').exactly(3), $(['-', $('ALPHA').exactly(3)]).exactly(2).zeroOrOne()], // Todo: correct?
        /*
        script        = 4ALPHA              ; ISO 15924 code
        */
        script: $('ALPHA').exactly(4),
        /*
        region        = 2ALPHA              ; ISO 3166-1 code
                   / 3DIGIT              ; UN M.49 code
        */
        region: $(
            $('ALPHA').exactly(2),
            $('DIGIT').exactly(3)
        ),
        /*
        variant       = 5*8alphanum         ; registered variants
                   / (DIGIT 3alphanum)
        */
        variant: $(
            $('alphanum').range(5, 8),
            $('DIGIT', $('alphanum').exactly(3))
        ),
        /*
        extension     = singleton 1*("-" (2*8alphanum))

                                         ; Single alphanumerics
                                         ; "x" reserved for private use
        */
        extension: ['singleton', $(['-', $('alphanum').range(2, 8)]).oneOrMore()],
        /*
        singleton     = DIGIT               ; 0 - 9
                   / %x41-57             ; A - W
                   / %x59-5A             ; Y - Z
                   / %x61-77             ; a - w
                   / %x79-7A             ; y - z
        */
        singleton: $('DIGIT', /[A-WY-Z]/i),
        /*
        privateuse    = "x" 1*("-" (1*8alphanum))
        */
        privateuse: ['x', $(['-', $('alphanum').range(1, 8)]).oneOrMore()],
        /*
        grandfathered = irregular           ; non-redundant tags registered
                   / regular             ; during the RFC 3066 era
        */
        grandfathered: $('irregular', 'regular'),
        /*
        irregular     = "en-GB-oed"         ; irregular tags do not match
                   / "i-ami"             ; the 'langtag' production and
                   / "i-bnn"             ; would not otherwise be
                   / "i-default"         ; considered 'well-formed'
                   / "i-enochian"        ; These tags are all valid,
                   / "i-hak"             ; but most are deprecated
                   / "i-klingon"         ; in favor of more modern
                   / "i-lux"             ; subtags or subtag
                   / "i-mingo"           ; combination
                   / "i-navajo"
                   / "i-pwn"
                   / "i-tao"
                   / "i-tay"
                   / "i-tsu"
                   / "sgn-BE-FR"
                   / "sgn-BE-NL"
                   / "sgn-CH-DE"
        */
        irregular: $('en-GB-oed', 'i-ami', 'i-bnn', 'i-default', 'i-enochian', 'i-hak', 'i-klingon', 'i-lux', 'i-mingo', 'i-navajo', 'i-pwn', 'i-tao', 'i-tay', 'i-tsu', 'sgn-BE-FR', 'sgn-BE-NL', 'sgn-CH-DE'),
        /*
        regular       = "art-lojban"        ; these tags match the 'langtag'
                   / "cel-gaulish"       ; production, but their subtags
                   / "no-bok"            ; are not extended language
                   / "no-nyn"            ; or variant subtags: their meaning
                   / "zh-guoyu"          ; is defined by their registration
                   / "zh-hakka"          ; and all of these are deprecated
                   / "zh-min"            ; in favor of a more modern
                   / "zh-min-nan"        ; subtag or sequence of subtags
                   / "zh-xiang"
        */
        regular: $('art-lojban', 'cel-gaulish', 'no-bok', 'no-nyn', 'zh-guoyu', 'zh-hakka', 'zh-min', 'zh-min-nan', 'zh-xiang'),
        /*
        alphanum      = (ALPHA / DIGIT)     ; letters and numbers
        */
        alphanum: $('ALPHA', 'DIGIT'),
        /*
        value-chars   = *( pct-encoded / attr-char )
        */
        'value-chars': $('pct-encoded', 'attr-char').zeroOrMore(),
        /*
        pct-encoded   = "%" HEXDIG HEXDIG
                   ; see [RFC3986], Section 2.1
        */
        'pct-encoded': ['%', 'HEXDIG', 'HEXDIG'],
        /*
        attr-char     = ALPHA / DIGIT
                   / "!" / "#" / "$" / "&" / "+" / "-" / "."
                   / "^" / "_" / "`" / "|" / "~"
                   ; token except ( "*" / "'" / "%" )
        */
        'attr-char': $('ALPHA', 'DIGIT', /[!#$&+-.\^_`|~]/)
    }
);



rfc5987ParameterRules.parse(str, 'parameter', {
    'attribute': function (att, level) {
        alert('attribute:' + att);
    },
    'value': function (val, level) {
        alert('value:' + value);
    }
});
