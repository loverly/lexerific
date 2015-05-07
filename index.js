/**
 * Provide a basic dependency-injection wrapper around the library's components
 * to simplify unit testing (by allowing mocks to be used instead).
 *
 * This allows the user to see a nice clean interface, but still have the benefits
 * of dependency injection.  The other option would be to provide an object with
 * different factory methods but I see no need for that.
 *
 * Also, with this pattern, none of the sub-classes are exposed externally, which
 * at this point makes sense because they are not individually useful.
 */
module.exports = (function () {

  var _ = require('lodash');

  var Lexerific = require('./lib/Lexerific');
  var Lexeme = require('./lib/Lexeme');
  var StateGenerator = require('./lib/StateGenerator');
  var Token = require('./lib/Token');


  return function LexerificFactory(config) {
    return new Lexerific(config, _, Lexeme, StateGenerator, Token);
  };
}());