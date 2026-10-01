/* Shared appearance presets. These never select winners or reset draw state. */
(function(root){
  'use strict';
  const themes = {
    festival: {
      wheel:['#ce253b','#ffca54','#942442','#f68535','#ee4b62','#ffe5a1'],
      labels:['#ffffff','#401708','#ffffff','#351006','#34121b','#401708'],
      balls:[['#fff0f1','#ef5166','#a91b39'],['#fff7d2','#ffd25d','#bd7c1d'],['#ffe9cf','#ff9751','#b64e26'],['#fff0d9','#edbd88','#a96547']],
      rim:'#6b142b', metal:'#ffcf72', lamp:'#fff4c2', lowLamp:'#cc974e',
      stand:'#ffb94522', line:'#ffc96377', glow:'#ffb32e40', clear:'#ffb32e00',
      shine:'#fff0bba8', glass:'#ffd58019', winner:'#fff8d5', symbol:'✦'
    },
    neon: {
      wheel:['#7430cb','#38e9e3','#c62b83','#ffe36f','#5536c6','#a9faeb'],
      labels:['#ffffff','#122139','#ffffff','#271341','#ffffff','#122139'],
      balls:[['#f0ddff','#ab70fa','#6131a6'],['#e5fffe','#40ece7','#138b9c'],['#ffe0f1','#f75fae','#a92676'],['#fff9d6','#ffe366','#b89829']],
      rim:'#281545', metal:'#af8cff', lamp:'#68ffef', lowLamp:'#8760b3',
      stand:'#9c69fa22', line:'#ad80ff99', glow:'#a64cff55', clear:'#a64cff00',
      shine:'#dbccffc9', glass:'#a471f522', winner:'#aefff2', symbol:'✧'
    },
    candy: {
      wheel:['#ff9cba','#8ed9ce','#efb1cf','#ffdc8e','#a8d9ee','#ffba95'],
      labels:['#5b2244','#17445c','#432464','#5b3d13','#215346','#63382e'],
      balls:[['#ffeaf1','#f77fa8','#ba3f68'],['#e2fff6','#70cbb6','#347d71'],['#fff0dd','#ffb17f','#b66c40'],['#fff8d5','#f1ce6b','#a68532']],
      rim:'#f8d7df', metal:'#c66786', lamp:'#fff8de', lowLamp:'#d97b9d',
      stand:'#e792aa30', line:'#c76c8dad', glow:'#f28caa27', clear:'#f28caa00',
      shine:'#ffe6eed9', glass:'#ec97b525', winner:'#b43b69', symbol:'♥', idleOpacity:.68
    },
    forest: {
      wheel:['#bcd796','#e8d6ae','#608a76','#d69769','#8faa7a','#eedfc6'],
      labels:['#203329','#203329','#0b2017','#203329','#203329','#203329'],
      balls:[['#eaf5d5','#bdd69c','#708f53'],['#fbf8e9','#e6ddbb','#a69870'],['#cce9df','#87bdab','#417564'],['#f6db9e','#d9b264','#987036']],
      rim:'#203329', metal:'#abbe91', lamp:'#ffdda3', lowLamp:'#899f75',
      stand:'#6c8b6326', line:'#a3bc8e66', glow:'#dea45d24', clear:'#dea45d00',
      shine:'#eff8de8f', glass:'#a5cd8f22', winner:'#fff1c9', symbol:'✦'
    }
  };
  const normalize = name => Object.hasOwn(themes, name) ? name : 'festival';
  const api = {themes, normalize, get:name=>themes[normalize(name)]};
  if(typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.RaffleStyles = api;
})(typeof window === 'undefined' ? {} : window);
