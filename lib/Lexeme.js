/**
 * Represents the configuration for a Lexeme within the Lexicon that we are
 * building. Configurations should look like:
 *
 * ## String Mode
 *
 * The lexeme configuration should look like:
 *
 * ```
 *
 *     {
 *       token: 'name-of-this-token-type',
 *       pattern: 'some string to match exactly+',
 *       attributeValue: function (history) {
 *         return 'my token value based on the state history';
 *       }
 *     }
 *
 * ```
 * Where the strings contain only literal characters.  The `attributeValue()`
 * function uses the character history to this point to identify what the return
 * attribute value should be.  Set it to null for a null attributeValue.  Leave
 * it undefined to have it be the input that was received to transition to the
 * current state.
 *
 * TODO: accept only the `+` repeating symbol for an individual letter
 *       or the `\\+` escape sequence for a literal `+` symbol.
 *
 */
function Lexeme(config, Token) {
  this._cleanConfig(config);

  this._Token = Token; // The Token object constructor

  this.mode = config.mode;
  this.token = config.token;

  this._pattern = config.pattern;
  this._attributeValue = config.attributeValue;
  this._partialMatchAttributeValue = config.partialMatchAttributeValue;
  this._isDefault = config.isDefault;
}

/**
 * A static class method that just returns the input as the attribute value.
 */
Lexeme._returnInputAsAttributeValue = function returnInputAsAttributeValue(history, input) {
  return input;
};

/**
 * Standardize messages thrown from within Lexerific
 */
Lexeme.prototype._throwError = function throwError(msg) {
  throw new Error('[Lexerific:Lexeme] ' + msg);
};


/**
 * Validate the configuration and clean it up where possible.
 */
Lexeme.prototype._cleanConfig = function validateConfig(config) {
  var staticAttributeValue;

  if (!config.token || typeof config.token !== 'string') {
    this._throwError('Lexemes must have token type, got:' + config.token);
  }


  if (config.mode !== 'string' && config.mode !== 'token') {
    this._throwError('The Lexeme mode must be either "token" or "string" got:' + config.mode);
  }

  if (typeof config.attributeValue === 'undefined') {
    // Return the input as the attribute value
    config.attributeValue = Lexeme._returnInputAsAttributeValue;
  }
  else if (typeof config.attributeValue !== 'function') {
    // Use a closure to always return the specified static value
    staticAttributeValue = config.attributeValue;
    config.attributeValue = function () {
      return staticAttributeValue;
    }
  }

  // Exit before pattern matching for the default lexeme (which matches all patterns)
  if (config.isDefault) {
    return;
  }

  if (!config.pattern) {
    this._throwError('Lexemes must have an identifying pattern');
  }

  if (config.mode === 'string') {
    if (typeof config.pattern !== 'string' && !(config.pattern instanceof Array)) {
      this._throwError('Lexeme string mode patterns must be a string or an array of characters');
    }

    // Transform the string into an array of characters
    if (!(config.pattern instanceof Array)) {
      config.pattern = config.pattern.split('');

      // Convert them into more of the token pattern
      config.pattern = config.pattern.map(function (char) {
        return {token: char};
      });
    }
  }

  if (config.mode === 'token') {
    if (!(config.pattern instanceof Array)) {
      this._throwError('Lexeme token patterns must be specified by an array');
    }
  }
};

/**
 * This is what is used to generate the return object from within the Finite
 * State Machine
 */
Lexeme.prototype.generateToken = function generateToken(input, history) {
  return new this._Token({
    token: this.token,
    attributeValue: this._attributeValue(history, input) // Generate the attribute value)
  });
};

Lexeme.prototype.generatePartialMatchToken = function generateToken (input, history) {
  return new this._Token({
    token: this.token,
    attributeValue: this._partialMatchAttributeValue(history, input) // Generate the attribute value)
  });
};

/**
 * Provide a copy of the pattern to the caller
 */
Lexeme.prototype.getPattern = function () {
  return this._pattern.slice();
};

module.exports = Lexeme;