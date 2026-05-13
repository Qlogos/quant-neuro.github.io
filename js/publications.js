(function () {
  'use strict';

  function getTag(type) {
    return {
      article:       { label: 'Journal Article',  cls: 'pub-item__tag--journal' },
      inproceedings: { label: 'Conference Paper', cls: 'pub-item__tag--conference' },
      conference:    { label: 'Conference Paper', cls: 'pub-item__tag--conference' },
      misc:          { label: 'Preprint',          cls: 'pub-item__tag--preprint' },
    }[type] || { label: 'Journal Article', cls: 'pub-item__tag--journal' };
  }

  // BibTeX "A and B and C" → "A, B &amp; C"
  function formatAuthors(authorStr) {
    var parts = authorStr.split(' and ').map(function (s) { return s.trim(); });
    if (parts.length === 1) return parts[0];
    return parts.slice(0, -1).join(', ') + ' &amp; ' + parts[parts.length - 1];
  }

  // Assembles citation string from parsed BibTeX fields.
  function formatMeta(pub) {
    var authors = formatAuthors(pub.author || '');
    var year    = pub.year || '';
    var title   = pub.title || '';

    if (pub.type === 'article') {
      var venue = pub.journal || '';
      if (pub.volume) venue += ', ' + pub.volume;
      if (pub.number) venue += '(' + pub.number + ')';
      if (pub.pages)  venue += ', ' + pub.pages;
      return authors + ' (' + year + '). ' + title + '. ' + venue + '.';
    }

    if (pub.type === 'inproceedings' || pub.type === 'conference') {
      var venue = pub.booktitle ? 'In ' + pub.booktitle : '';
      if (pub.volume) venue += ' (Vol. ' + pub.volume;
      if (pub.pages)  venue += ', p. ' + pub.pages;
      if (pub.volume) venue += ')';
      if (pub.publisher) venue += '. ' + pub.publisher;
      return authors + ' (' + year + '). ' + title + (venue ? '. ' + venue : '') + '.';
    }

    // misc / preprint
    var note = pub.note || '';
    return authors + ' (' + year + '). ' + title + (note ? '. ' + note : '') + '.';
  }

  function buildCard(pub) {
    var tag  = getTag(pub.type);
    var meta = formatMeta(pub);

    var card = document.createElement('div');
    card.className = 'glass-card pub-item reveal';
    card.innerHTML =
      '<a class="pub-item__link" href="' + (pub.url || '#') + '" target="_blank" rel="noopener" aria-label="Open publication details"></a>' +
      '<div class="pub-item__content">' +
        '<span class="pub-item__tag ' + tag.cls + '">' + tag.label + '</span>' +
        '<h3>' + pub.title + '</h3>' +
        '<p class="pub-item__meta">' + meta + '</p>' +
      '</div>' +
      '<img class="pub-item__thumbnail" src="' + (pub.thumbnail || '') + '" alt="' + (pub.thumbnailalt || '') + '" />';
    return card;
  }

  // Mirrors IntersectionObserver settings from main.js for injected .reveal cards.
  function observeCards(cards) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          var delay = Array.from(e.target.parentNode.children).indexOf(e.target) * 80;
          setTimeout(function () {
            e.target.classList.add('visible');
            io.unobserve(e.target);
          }, delay);
        }
      });
    }, { threshold: 0.10, rootMargin: '0px 0px -30px 0px' });
    cards.forEach(function (el) { io.observe(el); });
  }

  // Converts BibTeX month values to 1-12.
  // Handles: numeric strings ("4"), full names ("April"), BibTeX abbreviations ("apr").
  var MONTH_MAP = {
    january:1, february:2, march:3,     april:4,     may:5,      june:6,
    july:7,    august:8,   september:9, october:10,  november:11, december:12,
    jan:1, feb:2, mar:3, apr:4, jun:6, jul:7, aug:8, sep:9, oct:10, nov:11, dec:12
  };

  function parseMonth(val) {
    if (!val) return 0;
    var n = parseInt(val);
    if (!isNaN(n)) return n;
    return MONTH_MAP[val.toLowerCase().trim()] || 0;
  }

  function renderPublications() {
    var featuredSlot = document.getElementById('pub-featured');
    var listSlot     = document.getElementById('pub-list');
    if (!featuredSlot || !listSlot) return;

    fetch('/js/publications.bib')
      .then(function (res) { return res.text(); })
      .then(function (bibText) {
        var pubs = BibtexParser.parseToJSON(bibText);

        // Sort descending: year first, then month (absent month = 0).
        pubs.sort(function (a, b) {
          var yearDiff = parseInt(b.year || 0) - parseInt(a.year || 0);
          if (yearDiff !== 0) return yearDiff;
          return parseMonth(b.month) - parseMonth(a.month);
        });

        var newCards = [];
        pubs.forEach(function (pub, i) {
          var card = buildCard(pub);
          newCards.push(card);
          (i === 0 ? featuredSlot : listSlot).appendChild(card);
        });
        observeCards(newCards);
      })
      .catch(function (err) {
        console.error('publications.js: failed to load or parse publications.bib —', err);
      });
  }

  renderPublications();
})();
