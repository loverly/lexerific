var firstPassDefault = {
  mode: 'string',
  token: 'text',
  isDefault: true,
  partialMatchAttributeValue: function (history, input) {
    var attrVal = '';
    history.shift(); // Remove the root node

    // Add each node from the root to where we are
    history.forEach(function (state) {
      attrVal += state.input.token;
    });

    return attrVal;
  },
  attributeValue: function (history, input) {
    return input.token;
  }
};

var firstPassLexicon = [

  // Links/images

  {
    token: 'image-open',
    pattern: '![',
    attributeValue: null
  },

  {
    token: 'open-bracket',
    pattern: '[',
    attributeValue: null
  },

  {
    token: 'close-bracket',
    pattern: ']',
    attributeValue: null
  },

  {
    token: 'open-paren',
    pattern: '(',
    attributeValue: null
  },
  {
    token: 'close-paren',
    pattern: ')',
    attributeValue: null
  },


  // Inline styles

  {
    token: 'em',
    pattern: '_',
    attributeValue: null
  },
  {
    token: 'strong',
    pattern: '__',
    attributeValue: null
  },
  {
    token: 'strong',
    pattern: '**',
    attributeValue: null
  },


  // Whitespace

  {
    token: 'newline',
    pattern: '\n',
    attributeValue: null
  },

  {
    token: 'space', // Spaces are important for <pre> blocks and <ul> indentation
    pattern: ' ',
    attributeValue: null
  },


  // HEADERS

  {
    token: 'h1-open',
    pattern: '\n#',
    attributeValue: null
  },
  {
    token: 'h2-open',
    pattern: '\n##',
    attributeValue: null
  },
  {
    token: 'h3-open',
    pattern: '\n###',
    attributeValue: null
  },

  // Blocks

  {
    token: 'quote-open',
    pattern: '\n>',
    attributeValue: null
  },

  {
    token: 'pre-open',
    pattern: '\n    ',
    attributeValue: null
  },

  {
    token: 'hr',
    pattern: '--',
    attributeValue: null
  },

  // Lists
  {
    token: 'ul',
    pattern: '*',
    attributeValue: null
  },
  {
    token: 'ul',
    pattern: '+',
    attributeValue: null
  },
  {
    token: 'ul',
    pattern: '-',
    attributeValue: null
  },

  {
    token: 'ol',
    pattern: '1. ',
    attributeValue: null
  },

  // Escape sequences for literal versions of special chars

  {
    token: 'text',
    pattern: '\\\\',
    attributeValue: function () {
      return '\\';
    }
  },
  {
    token: 'text',
    pattern: '\\`',
    attributeValue: function () {
      return '`';
    }
  },
  {
    token: 'text',
    pattern: '\\*',
    attributeValue: function () {
      return '*';
    }
  },
  {
    token: 'text',
    pattern: '\\_',
    attributeValue: function () {
      return '_';
    }
  },
  {
    token: 'text',
    pattern: '\\[',
    attributeValue: function () {
      return '[';
    }
  },
  {
    token: 'text',
    pattern: '\\]',
    attributeValue: function () {
      return ']';
    }
  },
  {
    token: 'text',
    pattern: '\\(',
    attributeValue: function () {
      return '(';
    }
  },
  {
    token: 'text',
    pattern: '\\)',
    attributeValue: function () {
      return ')';
    }
  },
  {
    token: 'text',
    pattern: '\\#',
    attributeValue: function () {
      return '#';
    }
  },
  {
    token: 'text',
    pattern: '\\+',
    attributeValue: function () {
      return '+';
    }
  },
  {
    token: 'text',
    pattern: '\\-',
    attributeValue: function () {
      return '-';
    }
  },
  {
    token: 'text',
    pattern: '\\!',
    attributeValue: function () {
      return '!';
    }
  }
];

var secondPassDefault = {
  mode: 'token',
  token: 'unmatched-token',
  partialMatchAttributeValue: function (history, input) {
    history.shift(); // Remove the root node
    return history;
  },
  attributeValue: function (history, input) {
    return [input];
  }
};

var secondPassLexicon = [

  // Links / images
  {
    token: 'link',

    // Inline-styles disallowed from images
    pattern: [
      {token: 'open-bracket'},
      {token: 'text', repeat: true},
      {token: 'close-bracket'},
      {token: 'space', repeat: true},
      {token: 'open-paren'},
      {token: 'text', repeat: true},
      {token: 'close-paren'}
    ],
    attributeValue: function (history, input) {
      return history;
    }
  },
  {
    token: 'image',

    // Inline-styles disallowed from images
    pattern: [
      {token: 'image-open'},
      {token: 'text', repeat: true},
      {token: 'close-bracket'},
      {token: 'space', repeat: true},
      {token: 'open-paren'},
      {token: 'text', repeat: true},
      {token: 'close-paren'}
    ],
    attributeValue: function (history, input) {
      return history;
    }
  },

  // Inline Styles

  {
    token: 'em-text',
    pattern: [
      {token: 'em'},
      {token: 'text', repeat: true},
      {token: 'em'}
    ],
    attributeValue: function (history, input) {
      return history;
    }
  },
  {
    token: 'strong-text',
    pattern: [
      {token: 'strong'},
      {token: 'text', repeat: true},
      {token: 'strong'}
    ],
    attributeValue: function (history, input) {
      return history;
    }
  },

  // Whitespace aggregation
  // TODO: LOOK FOR A SPECIFIC COUNT OF WHITESPACES


  // Headers

  {
    token: 'h1',
    pattern: [
      {token: 'h1-open'},
      {token: 'text', repeat: true},
      {token: 'newline'}
    ],
    attributeValue: function (history, input) {
      return history;
    }
  },
  {
    token: 'h2',
    pattern: [
      {token: 'h2-open'},
      {token: 'text', repeat: true},
      {token: 'newline'}
    ],
    attributeValue: function (history, input) {
      return history;
    }
  },
  {
    token: 'h3',
    pattern: [
      {token: 'h3-open'},
      {token: 'text', repeat: true},
      {token: 'newline'}
    ],
    attributeValue: function (history, input) {
      return history;
    }
  },

  // BLOCKS

  {
    token: 'quote-line',
    pattern: [
      {token: 'quote-open'},
      {token: 'text', repeat: true},
      {token: 'newline'}
    ],
    attributeValue: function (history, input) {
      return history;
    }
  },
  {
    token: 'pre-line',
    pattern: [
      {token: 'pre-open'},
      {token: 'text', repeat: true},
      {token: 'newline'}
    ],
    attributeValue: function (history, input) {
      return history;
    }
  },
  {
    token: 'hr',
    pattern: [
      {token: 'newline'},
      {token: 'hr', repeat: true},
      {token: 'newline'}
    ],
    attributeValue: function (history, input) {
      return history;
    }
  },

  // LISTS
  {
    token: 'ul-line',
    pattern: [
      {token: 'newline'},
      {token: 'space', repeat: true},
      {token: 'ul'},
      {token: 'text', repeat: true},
      {token: 'newline'}
    ],
    attributeValue: function (history, input) {
      return history;
    }
  },

  // Text Aggregation

  {
    token: 'text',
    pattern: [
      {token: 'text', repeat: true}
    ],
    attributeValue: function (history, input) {
      return history;
    }
  }
];

var Lexerific = require('../index');

var firstScan = new Lexerific({mode: 'string'});
firstScan.setDefaultLexeme(firstPassDefault);
firstScan.addLexemes(firstPassLexicon);

var secondScan = new Lexerific({mode: 'token'});
secondScan.setDefaultLexeme(secondPassDefault);
secondScan.addLexemes(secondPassLexicon);

firstScan.on('data', function (token) {
  console.log('TOKEN:', token);
});

secondScan.on('data', function (token) {
  console.log('SECOND TOKEN:', token);
});

firstScan.pipe(secondScan);

firstScan.write('hello_bye*\\*and');
firstScan.end();

