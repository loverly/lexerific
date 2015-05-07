var utils = require('utils');
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
function Lexerific(config, _, Lexeme, StateManager, Token) {
  this._ = _;
  this.Lexeme = Lexeme;
  this.StateManager = StateManager;
  this.Token = Token;

  /**
   * Either 'string' or 'token' to determin what type of input stream to expect
   */
  this._mode = config.mode;

  TransformStream.call(this, {
    readableObjectMode: (this._mode === 'token'),
    writeableObjectMode: true // We always output token objects
  });
}

util.inherits(Lexerific, TransformStream);

/**
 *
 */
Lexerific.prototype.addLexeme = function addLexeme(config) {

};

/**
 *
 */
Lexerific.prototype.setLexicon = function setLexicon(configs) {

};

//

/**
 *
 */
Lexerific.prototype._transform = function transform(data, encoding, callback) {

};

/**
 *
 */
Lexerific.prototype._flush = function flush(callback) {

};