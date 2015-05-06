# Lexerific

A simple streaming tokenizer built on an underlying finite state machine.  The
lexicon can only be specified


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

Below is a graphical representation of the simple state diagram.  The 
`strong-open` or `em-open` labels represent tokens fired during transition back
to the root node.

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

Within the character mode, the only possible regular expression like character

* The `+` symbol, because it can be easily represented by a self-referencing
  state transition to the same node with no transition action (basically repeated
  characters just disappear).


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
      },
      {
        token: 'strong',
        pattern: ['strong-open', 'text+', 'strong-close']
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

