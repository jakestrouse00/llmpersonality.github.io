"use strict";

(function() {
  var currentOverlayId = null;

  function init() {
    renderGallery();
    document.getElementById('btn-clear-gallery').addEventListener('click', function() {
      if (confirm('Clear all saved artworks? This cannot be undone.')) {
        clearGallery(); renderGallery(); showToast('Gallery cleared.');
      }
    });
    document.getElementById('overlay-close').addEventListener('click', closeOverlay);
    document.getElementById('gallery-overlay').addEventListener('click', function(e) { if (e.target === this) closeOverlay(); });
    document.getElementById('overlay-delete').addEventListener('click', function() {
      if (currentOverlayId) { deleteFromGallery(currentOverlayId); closeOverlay(); renderGallery(); showToast('Artwork deleted.'); }
    });
    document.getElementById('overlay-download').addEventListener('click', function() {
      var img = document.getElementById('overlay-img');
      if (img && img.src) {
        var a = document.createElement('a'); a.href = img.src; a.download = 'inkwell-artwork-' + Date.now() + '.jpg'; a.click();
      }
    });
    document.addEventListener('keydown', function(e) { if (e.key === 'Escape') closeOverlay(); });
  }

  function renderGallery() {
    var gallery = loadGallery(), grid = document.getElementById('gallery-grid'), empty = document.getElementById('gallery-empty'), total = document.getElementById('gallery-total');
    grid.innerHTML = '';
    if (gallery.length === 0) { empty.style.display = 'block'; grid.style.display = 'none'; total.textContent = '0 artworks'; return; }
    empty.style.display = 'none'; grid.style.display = 'grid'; total.textContent = gallery.length + ' artwork' + (gallery.length !== 1 ? 's' : '');
    var reversed = gallery.slice().reverse();
    reversed.forEach(function(entry, index) {
      var item = document.createElement('div');
      item.className = 'gallery-item ink-reveal';
      item.style.transitionDelay = (index * 60) + 'ms';
      var img = document.createElement('img'); img.src = entry.data; img.alt = entry.tool + ' artwork'; img.loading = 'lazy';
      var info = document.createElement('div'); info.className = 'gallery-item-info';
      var toolLabel = document.createElement('span'); toolLabel.className = 'gallery-item-tool'; toolLabel.textContent = entry.tool;
      var dateLabel = document.createElement('span'); dateLabel.className = 'gallery-item-date'; dateLabel.textContent = formatDate(entry.timestamp);
      var deleteBtn = document.createElement('button'); deleteBtn.className = 'gallery-item-delete'; deleteBtn.textContent = '✕';
      deleteBtn.addEventListener('click', function(e) { e.stopPropagation(); deleteFromGallery(entry.id); renderGallery(); showToast('Artwork deleted.'); });
      info.appendChild(toolLabel); info.appendChild(dateLabel); info.appendChild(deleteBtn);
      item.appendChild(img); item.appendChild(info);
      item.addEventListener('click', function() { openOverlay(entry); });
      grid.appendChild(item);
    });
    initScrollAnimations();
  }

  function openOverlay(entry) {
    currentOverlayId = entry.id;
    var overlay = document.getElementById('gallery-overlay'), img = document.getElementById('overlay-img');
    img.src = entry.data; img.alt = entry.tool + ' artwork (full size)';
    overlay.classList.add('gallery-overlay--visible');
  }

  function closeOverlay() {
    document.getElementById('gallery-overlay').classList.remove('gallery-overlay--visible');
    currentOverlayId = null;
  }

  function formatDate(timestamp) {
    var d = new Date(timestamp), now = new Date(), diff = now - d;
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
    if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
    if (diff < 604800000) return Math.floor(diff / 86400000) + 'd ago';
    return d.toLocaleDateString();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();