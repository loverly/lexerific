var Lexerific = require('../index');
var lexer = new Lexerific({mode: 'string'});

lexer.setDefaultLexeme({
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
});

lexer.addLexeme({
  token: 'bell',
  pattern: [
    {token: 'b'},
    {token: 'e', optional: true},
    {token: 'l', optional: true, repeat: true},
    {token: 'a', optional: true, repeat: true},
    {token: 'x', repeat: true}
  ],
  attributeValue: function (history, input) {
    var attr = '';

    history.shift(); // Remove root node
    history.forEach(function (visit) {
      attr += visit.input.token;
    });

    return attr;
  }
});

lexer.addLexeme({
  token: 'other',
  pattern: [
    {token: 'b'},
    {token: 'e', optional: true},
    {token: 's', optional: true, repeat: true},
    {token: 'x', repeat: true}
  ],
  attributeValue: function (history, input) {
    var attr = '';

    history.shift(); // Remove root node
    history.forEach(function (visit) {
      attr += visit.input.token;
    });

    return attr;
  }
});

lexer.on('data', function (data) {
  console.log('TOKEN:', data);
});

lexer.write('bx bxx bex bexx bellxx bellaaxx beaaxx besssxxx');
lexer.end();