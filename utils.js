
function pauseForA(sec) {
  return new Promise(r => setTimeout(r, sec * 1000))
}

module.exports = {
  pauseForA
}
