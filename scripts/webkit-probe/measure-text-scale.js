// Evaluated by probe.swift inside a real WKWebView. See README.md.
//
// Builds the reader's real class chain against the SHIPPED stylesheet and walks --text-scale
// through every value that matters, reporting for each: the computed font-size (a report) AND the
// rendered advance width of a ruler span (a measurement of ink). Keep both. The whole reason this
// file exists is that computed font-size is the number that lied — see the table in README.md.
//
// The chain is injected rather than navigated to because the Bible reader is behind the auth gate
// and this probe cannot sign in. .auth-gate is measured for real in the same pass.
(function(){
  var host = document.createElement('div');
  host.className = 'app-body';
  host.innerHTML =
    '<div class="bible-panel" id="bp">' +
      '<div class="bible-panel-scroll" id="bps">' +
        '<div class="bible-verses" id="bv">' +
          '<span class="ruler" id="r0" style="white-space:pre">Almighty God, unto whom all hearts be open.</span>' +
          '<p id="bvp"><span class="ruler" id="r1" style="white-space:pre">Almighty God, unto whom all hearts be open.</span></p>' +
        '</div>' +
      '</div>' +
    '</div>';
  document.body.appendChild(host);

  var out = [];
  [1, 1.45, 0.8, 1.8].forEach(function(s){
    document.documentElement.style.setProperty('--text-scale', String(s));
    document.body.offsetHeight;
    var g = function(id){ return getComputedStyle(document.getElementById(id)); };
    var gate = document.querySelector('.auth-gate');
    var hdr  = document.querySelector('.app-header');
    out.push({
      scale: s,
      biblePanel_fontSize: g('bp').fontSize,
      bibleVerses_fontSize: g('bv').fontSize,
      bibleVerses_zoom: g('bv').zoom,
      bibleVerses_tsa: g('bv').webkitTextSizeAdjust,
      bibleVersesP_fontSize: g('bvp').fontSize,
      ruler_outside_p: document.getElementById('r0').getBoundingClientRect().width.toFixed(2),
      ruler_inside_p:  document.getElementById('r1').getBoundingClientRect().width.toFixed(2),
      authGate_fontSize: gate ? getComputedStyle(gate).fontSize : 'absent',
      authGate_present: !!gate,
      appHeader_fontSize: hdr ? getComputedStyle(hdr).fontSize : 'absent',
      rootTsz: getComputedStyle(document.documentElement).getPropertyValue('--tsz').trim(),
      bvTsz: g('bv').getPropertyValue('--tsz').trim()
    });
  });
  host.remove();
  document.documentElement.style.removeProperty('--text-scale');
  return JSON.stringify(out, null, 1);
})()
