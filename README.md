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

When creating a lexerific instance, there are two options:

* `mode` - _string_ or _token_
* `specialCharacters` - Only available in _string_ mode

The mode determines what type of input the incoming pipe should expect.  In
`string` mode, it's the typical buffer of binary data that can be converted to
strings.  In `token` mode, it's a list of previously lexed tokens of the format
`{token: 'some-token', attributeValue: {arbitraryValue: true}}`.  Lexerific is
designed to be a multi-pass lexer that can take advantage of the Node.js streams
API `pipe()` interface to create a transformation pipeline.

For performance reasons, in `string` mode, you should specify an array of
special characters which will be used to preprocess the incoming text via regular
expressions for performance reasons.  It will basically separate out normal
text from potentially special character sequences.  Without the preprocessing
step, a markdown parser built on lexerific is about 300 times slower than the
existing `marked` library, with it, it's about 50 times slower.


```javascript

    // Supports character-based states and regex-word based states
    var lexer = new Lexerific({
      mode: 'string',
      specialCharacters: ['<', '>', '(', ')']
    }); 
    
    // A convenience / batch wrapper around lexer.addLexeme();
    
    lexer.addLexemes([
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
    
          // Match an infinite number of text nodes - a self-referencing state
          // within the FSM
          {token: 'text', repeat: true},
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


# API Reference

### Lexerific()

Construct a Lexerific instance.  Lexerific extends from the Node.js 
[streams api](https://nodejs.org/api/stream.html) and therefore implements all
of it's parent's APIs.

In addition the constructor accepts the following options:

* `mode` - _string_ or _token_
* `specialCharacters` - Only available in _string_ mode

See the [specifying a lexicon](#specifying-a-lexicon) section for more details.


```javascript

var lexer = new Lexerific({
  mode: 'string',
  specialCharacters: ['\\{', '\\}', '\\(', '\\)']
});
```

### lexer.addLexeme()

Add a possible token for the lexer.  Configurations are of the following format:

```javascript

lexer.addLexeme({
  token: 'my-output-token',
  pattern: [{token: 'em'}, {token: 'text', repeat: true}, {token: 'em'}],
  attributeValue: function (history, input) {
    history.splice(0, 2); // remove the root and first em tag
    history.pop(); // remove the closing em tag
    
    // Aggregate the text into one string value
    return history.reduce(function (prev, current) {
      return prev + current.input.attributeValue;
    }, '');
  }
});

```


#### Lexeme Patterns

Patterns are objects of the format:

```javascript

[
  {token: 'some-token', repeat: true, inverted: false, optional: true},
  {token: 'other-token', repeat: false, inverted: false, optional: false}
]

```

The `token` is the name of the token that this pattern unit matches against.  The
`repeat` option basically sets a one or more constraint, the `optional` flag sets
a 0 or 1 instances constraint, and the `inverted` flag says match everything EXCEPT
for this token.  This MUST be followed by the inverted token, otherwise it will
match everything.


#### Attribute Value Generators

Attribute values for lexemes can either be a static value, or function that can
be used to generate what the attribute value should be.  The inputs to any
attribute value generating function are `(history, input)` where history is an
array of the states that have been visited to match this token (especially
important when there are a bunch of repeats).  Whatever the return value of the
the function is, is what is used as the attribute value for the resulting lexer
token.

```javascript
  attributeValue: function (history, input) {
    return input.attributeValue;
  }

```


### lexer.addLexemes()

A helper wrapper around `addLexeme()` that accepts an array of lexeme options
vs a single lexeme.


### lexer.setDefaultLexeme()

The default lexeme is the token that gets generated whenever no token patterns
are satisfied.  Default lexemes require no patterns because they are triggered
whenever no other patterns can be satisfied.

In addition to the normal attribute value generator, default lexemes must also
specify what to do in the case of a partial match (basically got half way
through some other token but failed to complete).  It takes the same inputs as
the normal attribute generating function.
