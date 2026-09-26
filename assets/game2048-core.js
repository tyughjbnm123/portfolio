(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Game2048 = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const directions = ['left', 'right', 'up', 'down'];
  function slide(board, direction) {
    if (!directions.includes(direction)) throw new Error('Invalid direction');
    const next = Array(16).fill(0), merged = [], paths = [];
    let gain = 0;
    for (let line = 0; line < 4; line++) {
      const indices = Array.from({length: 4}, (_, n) => direction === 'left' ? line * 4 + n : direction === 'right' ? line * 4 + 3 - n : direction === 'up' ? n * 4 + line : (3 - n) * 4 + line);
      const occupied = indices.filter(i => board[i]);
      let target = 0;
      for (let n = 0; n < occupied.length; n++) {
        const from = occupied[n], to = indices[target++];
        let value = board[from];
        paths.push({from, to, value});
        if (n + 1 < occupied.length && value === board[occupied[n + 1]]) {
          paths.push({from: occupied[++n], to, value});
          value *= 2; gain += value; merged.push(to);
        }
        next[to] = value;
      }
    }
    return {board: next, gain, merged, paths, changed: next.some((v, i) => v !== board[i])};
  }
  function spawn(board, random = Math.random, direction = null) {
    if (direction !== null && !directions.includes(direction)) throw new Error('Invalid direction');
    // After a move, new tiles enter from the opposite outer edge.
    // At setup there is no direction, so both starting tiles may use any empty cell.
    const onEntryEdge = i => direction === null ||
      (direction === 'left' && i % 4 === 3) ||
      (direction === 'right' && i % 4 === 0) ||
      (direction === 'up' && i >= 12) ||
      (direction === 'down' && i < 4);
    const empty = board.map((v, i) => !v && onEntryEdge(i) ? i : -1).filter(i => i >= 0);
    if (!empty.length) return {board: board.slice(), index: -1};
    const index = empty[Math.min(empty.length - 1, Math.floor(random() * empty.length))];
    const next = board.slice(); next[index] = 2;
    return {board: next, index};
  }
  function create(random = Math.random) { return spawn(spawn(Array(16).fill(0), random).board, random).board; }
  function canMove(board) { return directions.some(d => slide(board, d).changed); }
  function outcome(board) { return board.includes(2048) ? 'won' : canMove(board) ? 'playing' : 'over'; }
  function normalizeName(name) {
    const value = String(name).normalize('NFKC').trim().replace(/\s+/g, ' ');
    if (!/^[\p{L}\p{N}_ .\-]{1,16}$/u.test(value)) throw new Error('請用 1–16 個中文字、英文字、數字或空格。');
    return value;
  }
  return {slide, spawn, create, canMove, outcome, normalizeName};
});
