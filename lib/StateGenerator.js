/**
 * The state generator collects Lexemes within the lexicon and generates a
 * tree, which will eventually be used to generate a state diagram for the
 * [awesome-automata](https://github.com/loverly/awesome-automata) state
 * machine.  All of the leaves are functions representing the return value
 * generators for the state machine.
 *
 * The lexicon will be transformed into the a tree structure that looks like:
 *
 * ```
 *     // Default lexeme (for reference)
 *    var defaultLexeme = {
 *      token: 'text',
 *      attributeValue: true
 *    };
 *
 *    // Tree generated based on lexicon
 *    var tree = {
 *      ' ': {
 *
 *        '_': {
 *
 *          '_': {
 *            // Assumes any character after this point is OK
 *            __TERM: function () {
 *              return {token: 'strong-open'};
 *            }
 *          },
 *
 *          __TERM: function () {
 *            return {token: 'em-open' };
 *          }
 *        },
 *
 *        // This was not actually a special character sequence
 *        __TERM: function () {
 *          return {
 *            token: defaultLexeme.token,
 *            attributeValue: ' '
 *          }
 *        }
 *      },
 *
 *      // The root node's default behavior is to return a default token with the
 *      // current input as the attributeValue (when the current input is not a prefix
 *      // for any other token
 *      __TERM: function (input) {
 *        return {
 *          token: defaultLexeme.token,
 *          attributeValue: input
 *        }
 *      }
 *    };
 * ```
 */
function StateGenerator(_, Token) {
  this._ = _;
  this.Token = Token; // The Token class injected in
  this.lexicon = [];
  this._tree = {};

  // The lexeme that matches when nothing else does
  this._defaultLexeme = null;

  // Provide a property that holds onto a single bound instance of the token
  // generator function so we don't keep creating functions
  this.__defaultLexemeTokenGenerator = null;
}


/**
 * Use a special character sequence to indicate the catch-all state at every
 * level.
 */
StateGenerator.prototype._DEFAULT_STATE = '___TERM';


/**
 * This lexeme is used to generate the default token whenever a token pattern
 * is only partially fulfilled.  As a transition action back to the root node,
 * the default token is generated.
 */
StateGenerator.prototype.setDefaultLexeme = function setDefaultLexeme(lexeme) {
  this._defaultLexeme = lexeme;
  this._defaultLexemeTokenGenerator = this._defaultLexeme.generateToken.bind(this._defaultLexeme);

  // Add the initial default state to the tree
  this._tree[this._DEFAULT_STATE] = null;
};


/**
 * Expects a Lexeme instance.  Builds out the tree as each lexeme is added.
 */
StateGenerator.prototype.addLexeme = function addLexeme(lexeme) {
  if (!this._defaultLexeme) {
    throw new Error(
      '[Lexerific:StateGenerator] Cannot add a lexeme to the lexicon before ' +
      'defining a default lexeme'
    );
  }

  this.lexicon.push(lexeme);
  this._addLexemeToTree(lexeme);
};


/**
 * Add the new lexeme's pattern and appropriate handlers to the tree.  Loop
 * into the tree and create the appropriate catch-all states (with the default
 * lexeme) as well as the right terminal states based on the token.
 *
 * Each token or character within the pattern corresponds to a level within the
 * tree.
 *
 * NOTE: Duplicate patterns will overwrite each other in this model.
 *
 * TODO: I'm worried that this is an inappropriate data structure for very
 * TODO: wide lexicons (with many pattern variations at every level).  How can
 * TODO: we maintain efficiency without blowing out memory?  Is that even an
 * TODO: issue?
 */
StateGenerator.prototype._addLexemeToTree = function addLexemeToTree(lexeme) {
  var _this = this;
  var currentTreeLevel = this._tree;

  lexeme.forEachStepInPattern(function (step) {
    // The current tree level does not exist
    if (!currentTreeLevel[step.token]) {
      currentTreeLevel[step.token] = {};
      currentTreeLevel[step.token][_this._DEFAULT_STATE] = null;
    }

    // Traverse downward into the tree
    currentTreeLevel = currentTreeLevel[step.token];
  });

  // After hitting the final token within the pattern, set the catch-all state
  // to be the attribute generator for this lexeme
  currentTreeLevel[this._DEFAULT_STATE] = lexeme.generateToken.bind(lexeme);
};


/**
 * Walk the tree to create unique states and transitions that match the lexicon.
 *
 * State configurations have the following format:
 *     {
 *       name: 'my-state',
 *       isInitial: false,
 *       outgoingTransitions: [
 *         {state: 'root', criteria: 'val', accept: function (input, history) {
 *           return 'something-cool';
 *         }}
 *       ]
 *     }
 */
StateGenerator.prototype.generateStateConfigurations = function () {
  var states = [];

  // Recursively walk the tree
  this._walkBranch('', this._tree, states);

  return states;
};


/**
 *
 */
StateGenerator.prototype._walkBranch = function (prefix, branch, states) {
  var _this = this;
  var excludedKeys = this._.keys(branch);
  var isRoot = (prefix === ''); // The root node is signified by no prefix

  var state = {
    name: (isRoot ? 'root' : prefix),
    isInitial: isRoot,
    outgoingTransitions: []
  };

  // Create an accept action for landing on the root node
  if (isRoot) {
    state.accept = function (input, history) {
      return _this._defaultLexemeTokenGenerator(input, history, true);
    }
  }

  // Generate the state with the appropriate outbound transitions

  this._.forEach(branch, function (node, key) {
    var transition = {};
    state.outgoingTransitions.push(transition);

    if (typeof node === 'function' || node === null) {
      transition.state = 'root'; // Ignore the key because it must be the _DEFAULT_STATE

      // Ensure the FSM is deterministic by only matching against inputs that
      // are not a part of another state
      // Inputs are standardized so even the string mode passes in objects
      // as input, just the character they represent is the token type
      transition.criteria = function (input) {
        var key = input.token;
        return (excludedKeys.indexOf(key) === -1);
      };

      transition.accept =  node;
    }
    else {
      transition.state = prefix + key; // Point at the next state

      // Proceed to the next level if the token matches
      transition.criteria = function (input) {
        return (input.token === key);
      };

      // No accept function - this is a transition with no action

      // Recursively walk each of the child branches
      _this._walkBranch(prefix + key, node, states);
    }
  });

  states.push(state);
};

module.exports = StateGenerator;