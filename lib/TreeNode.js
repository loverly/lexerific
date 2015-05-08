/**
 * A micro-utility for creating an arbitrary tree structure that can be recursively
 * walked by a handler method.
 */
function TreeNode() {

  /**
   * All of the nodes that this sub-tree is pointing to
   */
  this._children = [];

  /**
   * An arbitrary hash of attributes
   */
  this._attributes = {};
}

/**
 * A node is a child if it has no children
 */
TreeNode.prototype.isLeaf = function isLeaf() {
  return !this._children.length;
};

/**
 * A factory function that will add a new tree node to this node and return it
 */
TreeNode.prototype.addChild = function addChild() {
  var child = new TreeNode();
  this._children.push(child);
  return child;
};

/**
 * Provide an API for setting arbitrary metadata on this node.
 */
TreeNode.prototype.setAttribute = function addAttribute(key, value) {
  this._attributes[key] = value;
  return this;
};

/**
 * Get the metadata value
 */
TreeNode.prototype.getAttribute = function getAttribute(key) {
  return this._attributes[key];
};

/**
 * Return a copy of the _children array, optionally filtered by the filter option.
 */
TreeNode.prototype.getChildren = function getChildren(filter) {
  filter = filter || function () { return true; };
  return this._children.filter(filter);
};

/**
 * For each node in the tree, call the walker function on that node
 */
TreeNode.prototype.walk = function walk(walker, filterFunction, useTailRecursion) {
  var filteredChildren;

  // call the walker on this node - head recursion by default
  if (!useTailRecursion) {
    walker(this);
  }

  if (typeof filterFunction === 'function') {
    filteredChildren = this._children.filter(filterFunction);
  } else {
    filteredChildren = this._children;
  }

  // Call walk on each of this node's child nodes (recursive call downward to
  // the bottom of the tree)
  filteredChildren.forEach(function (child) {
    child.walk(walker, useTailRecursion);
  });

  // tail recursion - call it on the way back up
  if (useTailRecursion) {
    walker(this);
  }
};

module.exports = TreeNode;