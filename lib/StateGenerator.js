/**
 * The state generator collects Lexemes within the lexicon and generates a
 * tree, which will eventually be used to generate a state diagram for the
 * [awesome-automata](https://github.com/loverly/awesome-automata) state
 * machine.  All of the leaves are functions representing the return value
 * generators for the state machine.
 *
 * TODO: Create an actual tree object that has flags for terminal nodes and for
 * TODO: various metadata.  It's essentially a linked list with multiple child
 * TODO: nodes.
 *
 * The lexicon will be transformed into the a tree structure with each node
 * representing some transition.  The nodes are actual TreeNode instances with
 * metadata about what that node contains.
 *
 */
function StateGenerator(_, Token, TreeNode) {
  this._ = _;
  this.Token = Token; // The Token class injected in
  this.TreeNode = TreeNode;

  this._lexicon = [];

  // Represents all of the lexeme patterns (and possible state paths)
  this._lexemePatternTree = new this.TreeNode();
  this._lexemePatternTree.setAttribute('stateName', this._ROOT_STATE);
  this._lexemePatternTree.setAttribute('isRoot', true);

  // After the call to generate states, this will be populated with the FSM states
  this._states = [];

  // The lexeme that matches when nothing else does
  this._defaultLexeme = null;
  this._partialMatchHandler = null;
  this._defaultHandler = null;
}


/**
 * Use a special character sequence to indicate the catch-all state at every
 * level.
 */

/**
 *
 */
StateGenerator.prototype._ROOT_STATE = '___ROOT';

StateGenerator.prototype._DEFAULT_STATE = '___DEFAULT';

/**
 *
 */
StateGenerator.prototype._TERMINAL_STATE = '___TERM';


/**
 * This lexeme is used to generate the default token whenever a token pattern
 * is only partially fulfilled.  As a transition action back to the root node,
 * the default token is generated.
 */
StateGenerator.prototype.setDefaultLexeme = function setDefaultLexeme(lexeme) {
  this._defaultLexeme = lexeme;
  this._defaultHandler = lexeme.generateToken.bind(lexeme);
  this._partialMatchHandler = lexeme.generatePartialMatchToken.bind(lexeme);
};


/**
 * Expects a Lexeme instance.  Builds out the tree as each lexeme is added.
 */
StateGenerator.prototype.addLexeme = function addLexeme(lexeme) {
  this._lexicon.push(lexeme);
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
  var currNode = this._lexemePatternTree;
  var prefix = '';
  var nextNode;
  var children;

  // Loop through each step in the lexeme pattern
  lexeme.forEachStepInPattern(function (step) {
    var token = step.token;

    // Add the current step to the node's prefix
    prefix += token;

    // Find a matching node
    nextNode = currNode.getChildren(function (node) {
      return (node.getAttribute('token') === token);
    })[0];

    //
    // The current tree level does not exist
    if (!nextNode) {
      nextNode = currNode.addChild();
      nextNode.setAttribute('token', token);
      nextNode.setAttribute('stateName', prefix);
      nextNode.setAttribute('criteria', function (input) {
        // Use the closure to keep the values
        return (input.token === token);
      });

      // Add the default transition as a child to this node
      _this._addTerminalTransitionNode(nextNode);
    }

    // For states that are loops, add a transition that points back at the current
    // state with no transition action
    // TODO: This only allows for infinite repeats - we can add limitations by
    // TODO: adding a chain of states with different names but the same criteria
    if (step.repeat) {
      nextNode.setAttribute('repeat', true);
    }

    // Traverse downward into the tree
    currNode = nextNode;
    nextNode = false;
  });

  // After hitting the final token within the pattern, reset the catch-all outgoing
  // transition to be the token generator for this lexeme
  children = currNode.getChildren(function (child) {
    return (child.getAttribute('stateName') === _this._TERMINAL_STATE);
  });

  children[0].setAttribute('attributeValue', lexeme.generateToken.bind(lexeme));
};

/**
 *
 */
StateGenerator.prototype._addTerminalTransitionNode = function addDefaultTransitionNode(node) {
  var transition = node.addChild();
  transition.setAttribute('stateName', this._TERMINAL_STATE);
  transition.setAttribute('isCatchall', true);
  transition.setAttribute('attributeValue', this._partialMatchHandler);
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
  var node;
  var terminalNode;

  // Add in the default lexeme node to the root
  if (this._defaultLexeme) {
    node = this._lexemePatternTree.addChild();
    node.setAttribute('stateName', this._DEFAULT_STATE);
    node.setAttribute('isCatchall', true);
    node.setAttribute('attributeValue', this._defaultHandler);
  } else {
    node = this._lexemePatternTree;
  }

  // Add in the terminal node that will reset the machine
  terminalNode = node.addChild();
  terminalNode.setAttribute('stateName', this._TERMINAL_STATE);
  terminalNode.setAttribute('isCatchall', true);
  terminalNode.setAttribute('isTerminal', true);

  // Recursively walk the tree
  this._lexemePatternTree.walk(this._walker.bind(this));

  // Add in the special terminal state which all paths lead to
  this._states.push({
    name: this._TERMINAL_STATE,
    isInitial: false,
    isTerminal: true,
    outgoingTransitions: null
  });

  return this._states.slice();
};


/**
 *
 */
StateGenerator.prototype._walker = function (node) {
  // Skip leaf nodes as these are just terminal transitions, not states
  if (node.isLeaf()) {
    return;
  }

  var excludedKeys = [];
  var token = node.getAttribute('token');
  var isRoot = node.getAttribute('isRoot');
  var children = node.getChildren();
  var state = {
    name: node.getAttribute('stateName'),
    isInitial: isRoot,
    isTerminal: node.getAttribute('isTerminal'),
    outgoingTransitions: []
  };

  // Check if this is a self-referencing node, if so, create the transition
  if (node.getAttribute('repeat')) {
    state.outgoingTransitions.push({
      state: state.name,
      criteria: node.getAttribute('criteria'),
      accept: null
    });
  }

  // Add the appropriate transitions for this state
  children.forEach(function (child) {
    var token = child.getAttribute('token');
    var transition = {
      state: child.getAttribute('stateName'),
      criteria: child.getAttribute('criteria'),
      accept: child.getAttribute('attributeValue')
    };

    state.outgoingTransitions.push(transition);
    excludedKeys.push(token);

    // Captures all tokens that do not match any explicitly defined patterns
    // at this level
    if (child.getAttribute('isCatchall')) {
      transition.criteria = function (input) {
        // Ensure that this is a catch-all except for other child nodes at the
        // same level
        return (excludedKeys.indexOf(input.token) === -1);
      };
    }
  });

  this._states.push(state);
};

module.exports = StateGenerator;