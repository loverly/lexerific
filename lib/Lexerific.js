var util = require('util');
var stream = require('stream');
var TransformStream = stream.Transform;

/**
 * The Lexerific library extends the Transform stream class.  Depending on the
 * mode it either takes in buffers as input or a stream of token objects.
 *
 * Configuration options:
 *   * `mode` - Either `string` or `token` depending on what type of input
 *     should be consumed.  `token` mode is for secondary scanning passes
 *
 * In `string` mode, there is an extra pre-processing step to divide the raw strings
 * into special characters and just plain text.
 *
 */
function Lexerific(config, _, FSM, Lexeme, StateGenerator, Token, TreeNode) {
  var _this = this;
  this._ = _;

  // Create a finite state machine for lexing
  this.fsm = new FSM({
    name: 'lexerific',
    debug: true,
    resetAtRoot: true // erase history for every root bound transition
  });

  this.fsm.on('return', function (data) {
    _this.push(data.toObject());
  });

  this.Lexeme = Lexeme;
  this.Token = Token;
  this.stateGenerator = new StateGenerator(this._, this.Token, TreeNode);

  /**
   * Either 'string' or 'token' to determine what type of input stream to expect
   */
  this._mode = config.mode;

  /**
   * In `string` mode, we need a list of regular expression patterns (as strings)
   * to differentiate between text that is important in our lexicon and text
   * that is not.
   */
  this._specialCharacters = config.specialCharacters;

  /**
   * Indicates whether the FSM has been initialized with all of the states
   */
  this._isReady = false;

  // We always read and write token objects
  TransformStream.call(this, {
    objectMode: true,
    readableObjectMode: true,
    writableObjectMode: true
  });
}

util.inherits(Lexerific, TransformStream);

/**
 * The token to use whenever the character sequence fails to match a result
 */
Lexerific.prototype.setDefaultLexeme = function addLexeme (config) {
  config.isDefault = true;
  config.mode = this._mode;
  var lexeme = new this.Lexeme(config, this.Token);
  this.stateGenerator.setDefaultLexeme(lexeme);
};

/**
 * Create a Lexeme instance and add it to the state generator
 */
Lexerific.prototype.addLexeme = function addLexeme(config) {
  config.mode = this._mode;
  var lexeme = new this.Lexeme(config, this.Token);
  this.stateGenerator.addLexeme(lexeme);
};

/**
 * Convenience wrapper around addLexeme()
 */
Lexerific.prototype.addLexemes = function setLexicon(configs) {
  var _this = this;
  this._.forEach(configs, function (config) {
    _this.addLexeme(config);
  });
};

/**
 * The caller should call this method to signal that all of the states have been
 * added.  If not, then it is called on the first call to _transform().
 */
Lexerific.prototype._prepare = function () {
  this._isReady = true;
  var states = this.stateGenerator.generateStateConfigurations();
  this.fsm.addStates(states);
};

/**
 * In string mode, break the string into relevant tokens and text
 */
Lexerific.prototype._preprocess = function preprocess(buffer) {
  // This is the "dumb" case in string mode, there should be a way to differentiate
  // between text and special characters
  if (!this._specialCharacters) {
    return [{token: 'text', attributeValue: buffer.toString()}];
  }

  var str = buffer.toString();
  var regex = new RegExp('(.*?)(' + this._specialCharacters.join('|') + ')', 'g');
  var tokens = [];
  var lastIdx = 0;
  var match;

  while ((match = regex.exec(str)) !== null) {
    if (match[1] !== '') {
      tokens.push({token: 'text', attributeValue: match[1]});
    }

    tokens.push({token: match[2], attributeValue: match[2]});
    lastIdx = regex.lastIndex;
  }

  // Final bit of chunk
  tokens.push({token: 'text', attributeValue: str.substr(lastIdx)});
  return tokens;
};

/**
 *
 */
Lexerific.prototype._transform = function transform(data, encoding, callback) {
  var items;

  if (!this._isReady) {
    this._prepare();
  }

  // Break the data into individual characters
  if (this._mode === 'string') {
    items = this._preprocess(data);
  } else {
    // We only receive one token at a time in object mode
    items = [data];
  }

  this._nextInput('START', items, callback);
};

/**
 *
 */
Lexerific.prototype._nextInput = function nextInput(info, inputs, callback) {
  var _this = this;

  if (info.reset && _this.previousInput.token !== '__FLUSH') {
    // Reuse the previous input when resetting the machine - this is our "peek"
    // or "lookahead" feature in the lexer
    this.fsm.next(_this.previousInput, function (info) {
      _this._nextInput(info, inputs, callback);
    });
  }
  else if (inputs.length) {
    _this.previousInput = inputs.shift();
    _this.fsm.next(_this.previousInput, function (info) {
      _this._nextInput(info, inputs, callback);
    });
  }
  else {
    callback();
  }
};

/**
 * For the final step, make sure that the process returns back to the original
 * position.  Because the lexer uses a catch-all at every step, the token doesn't
 * actually matter, we just need to make the transition action happen.
 */
Lexerific.prototype._flush = function flush(callback) {
  this._nextInput('FLUSH', [{token: '__FLUSH'}], callback);
};

module.exports = Lexerific;