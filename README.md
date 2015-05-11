# Lexerific


**WORK IN PROGRESS**


A simple streaming tokenizer built on the finite state machine
[awesome-automata](https://github.com/loverly/awesome-automata).  It implements
the Node.js [streams API](https://nodejs.org/api/stream.html) to make working
with files and pipelining easy (so multiple parallel lexing passes are possible
with good efficiency in I/O limited environments). 

The lexer supports string-based tokenization (by processing patterns
character-by-character).  It also supports secondary lexing of its own tokens
to perform a second or even third scan to further reduce the number of tokens
or to build slightly more complex tokens.

This library is meant to do only the scanning/tokenization based on a lexicon and
does not support syntactic analysis or the building of any Abstract Syntax Tree
typical of a parser.

For character-based lexing, this library doesn't support regular expressions,
but there are some helpful macros to help cover the most common use-cases.  The
primary reason for this is that in most cases (at least the ones I can think of)
the tokens that can be generated via regex can also be generated with multiple,
stratified scanning passes.  If you are using much more complex patterns then
this tool is probably not for you (you can check out the [jison lexer](https://github.com/zaach/jison-lex)
or something that implements a regex-based tokenizer.


# What's so lexerific about it?

Lexerific focuses on being a solution for a very narrow problem set:

1. Make it easy and intuitive to specify a string or token based lexicon that 
   will map (and potentially reduce) an input stream into a series of 
   domain-specific tokens
1. To implement the scanner via the [streams API](https://nodejs.org/api/stream.html)
   to make pipelines of transformations easy from external streams (files, http,
   binary-buffer based databases, etc)

To make the first point even narrower, it is only meant to work on finite character
or token patterns (so no `<.+>` patterns) to make efficiency controllable and to
be very strict about the allowable constructs.  The only infinite pattern allowed
is a single-lexeme loop (so something like `a+`) that allows a character or token-
based Finite State Machine to create a self-referencing node.  The repeated element
must be represented by a single input token so it represents one state within
the FSM (in a raw character stream, every character in the pattern is a separate
state within the machine, whereas in a stream of token objects, states are
specified by token type).

That being said, it is possible to implement such a wild-card pattern approach
via multiple scanning passes.  For example to identify an HTML opening tag:

    '<div>'

The first pass might produce the following series of tokens:


      |<|   |d|   |i|   |v|   |>|
      tag-  text  text  text  tag-
      open                    close

Then the second pass would produce:

    {token: 'open-tag', attributeValue: 'div'}

Because it's pattern would be:

```javascript

    {
      token: 'open-tag',
      pattern: [
        {token: 'tag-open'}, 
        {token: 'text', min: 1, max: false}, // explicit false means repeat
        {token: 'tag-close'}
      ],
      attributeValue: function (inputTokens) {
        var attrVal = '';

        inputTokens.forEach(function (token) {
          if (token.type === 'text') {
            attrVal += token.getAttrVal();
          }
        });
        
        return attrVal;
      }
    }

```

# Specifying a lexicon

```javascript

    // Supports character-based states and regex-word based states
    var lexer = new Lexerific({mode: 'character'}); 
    
    // A convenience / batch wrapper around lexer.addLexeme();
    
    lexer.addLexicon([
      {
        token: 'em-open',
        pattern: ' _',
        attributeValue: null
      },
      {
        token: 'strong-open',
        pattern: ' __',
        attributeValue: null
      }
    ]);
    
    // When nothing else matches - the default terminal state when all other options
    // are exhausted
    lexer.addDefaultLexeme({
      token: 'text',
      attributeValue: true
    });

```


# A character-by-character lexer

The character mode breaks each of the patterns into a sequence of characters.  It
then maps a state diagram from one possible character sequence to the next range
of possible sequences.

Below is a graphical representation of the simple state diagram for Markdown's
`em` and `strong` tokens.  The `strong-open` or `em-open` or `text labels 
represent tokens fired during transition back to the root node.

At the root node, only a space qualifies as a valid transition forward, everything
else results in a text token being fired and the state to transition back to the
root node.

                    strong-open
           <-----------------------------*
          |      em-open                 |
          |<------------------*          |
          |  text             |          |
          |<-------*          |          |
          |        |          |          |
       -->R------ ' ' ------ '_' ------ '_'
      |   |
       ---
       text


This can be represented by the following tree in javascript:

```javascript

    // Default lexeme (for reference)
    var defaultLexeme = {
      token: 'text',
      attributeValue: true
    };
    
    // Tree generated based on lexicon
    var tree = {
      ' ': {
      
        '_': {
        
          '_': {
            // Assumes any character after this point is OK
            terminate: function () {
              return {token: 'strong-open'};
            }
          },
          
          terminate: function () {
            return {token: 'em-open' };
          }
        },
        
        // This was not actually a special character sequence
        terminate: function () {
          return {
            token: defaultLexeme.token,
            attributeValue: ' '
          }
        }
      },
    
      // The root node's default behavior is to return a default token with the
      // current input as the attributeValue (when the current input is not a prefix
      // for any other token
      terminate: function (input) {
        return {
          token: defaultLexeme.token,
          attributeValue: input
        }
      }
    };

```


## Why process each character?

Because it's theoretically faster (if I've done a good job of implementing it) 
than running constant comparisons with a list of regular expressions.


## Won't specifying a complex lexicon be a real pain?

We'll see...


# Patterns with tokens!

If you've previously lexed a set of tokens, you can perform multiple lexical
analyses in order to aggregate and simply tokens further by using the token
mode.

For example:

```javascript

    var lexer = new Lexerific({mode: 'token'}); 
    
    lexer.addLexicon([
      {
        token: 'em',
        pattern: [
          {token: 'em-open'},
    
          // Explicitly setting max to false says text can repeat infinitely and still
          // match
          {token: 'text', min: 1, max: false},
          {token: 'em-close'}
        ]
      }
    ]);
    
    // When nothing else matches - the default terminal state when all other options
    // are exhausted
    lexer.addDefaultLexeme({
      token: 'text',
      attributeValue: true
    });


```

Note that this will probably require a third pass in order to group the tokens
into paragraphs.  The phases for a Markdown parser are as follows:

* Pass 1: Differentiate between text and special tokens
* Pass 2: Identify inline styles
* Pass 3: Identify paragraph and block styles

