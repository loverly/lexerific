/**
 *
 *
 * TODO: I'm not exactly sure why we need a class for this yet...
 */
function Token(rawToken) {
  this.type = rawToken.token;
  this.attributeValue = rawToken.attributeValue;;

  /**
   * Maintain metadata about where this token was generated from, this is more
   * useful for file-based parsing
   *
   * TODO: What other future metadata will there be?
   *
   * {
   *   file: '',
   *   line: null,
   *   col: null
   * }
   *
   */
  this._meta = rawToken.meta;
}

/**
 *
 */
Token.prototype.getMetadata = function getMetadata() {
  return this._meta;
};

/**
 * Serialize the token for passing through a stream
 */
Token.prototype.toObject = function toObject() {
  return {token: this.type, attributeValue: this.attributeValue, meta: this._meta};
};


module.exports = Token;

