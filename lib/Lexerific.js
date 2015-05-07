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
 */
function Lexerific(config, _, FSM, Lexeme, StateGenerator, Token) {
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
  this.stateGenerator = new StateGenerator(this._, this.Token);

  /**
   * Either 'string' or 'token' to determin what type of input stream to expect
   */
  this._mode = config.mode;

  /**
   * Indicates whether the FSM has been initialized with all of the states
   */
  this._isReady = false;

  TransformStream.call(this, {
    objectMode: true,
    readableObjectMode: (this._mode === 'token'),
    writableObjectMode: true // We always output token objects
  });
}

util.inherits(Lexerific, TransformStream);

/**
 * The token to use whenever the character sequence fails to match a result
 */
Lexerific.prototype.setDefaultLexeme = function addLexeme (config) {
  var lexeme = new this.Lexeme(config, this.Token);
  this.stateGenerator.setDefaultLexeme(lexeme);
};

/**
 * Create a Lexeme instance and add it to the state generator
 */
Lexerific.prototype.addLexeme = function addLexeme(config) {
  var lexeme = new this.Lexeme(config, this.Token);
  this.stateGenerator.addLexeme(lexeme);
};

/**
 * Convenience wrapper around addLexeme()
 */
Lexerific.prototype.addLexemes = function setLexicon(configs) {
  var _this = this;
  this._.forEach(configus, function (config) {
    _this.addLexeme(config);
  });
};

/**
 * The caller should call this method to signal that all of the states have been
 * added.  If not, then it is called on teh first call to _transform().
 */
Lexerific.prototype.prepare = function () {
  this._isReady = true;

  var states = this.stateGenerator.generateStateConfigurations();
  this.fsm.addStates(states);
};

/**
 *
 */
Lexerific.prototype._transform = function transform(data, encoding, callback) {
  var _this = this;
  if (!this._isReady) {
    this.prepare();
  }

  // Break the data into individual characters
  var chars = data.toString().split('');

  function nextChar(info) {
    if (chars.length) {
      _this.fsm.next({token: chars.shift()}, nextChar);
    } else {
      callback();
    }
  }

  nextChar('start');
};

/**
 *
 */
Lexerific.prototype._flush = function flush(callback) {
  this.fsm.next({token: ''}, function (info) {
    callback();
  });
};

module.exports = Lexerific;