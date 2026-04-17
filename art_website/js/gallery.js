(function() {
  'use strict';

  var GAL = {};
  var items = [];

  var toolPages = {
    'fluid-watercolor': 'fluid-watercolor.html',
    'dynamic-ink': 'dynamic-ink.html',
    'zen-garden': 'zen-garden.html',
    'sumi-e': 'sumi-e.html',
    'bleed-bloom': 'bleed-bloom.html',
    'splatter': 'splatter.html',
    'gradient-weaver': 'gradient-weaver.html'
  };

  var toolNames = {
    'fluid-watercolor': 'Fluid Watercolor',
    'dynamic-ink': 'Dynamic Ink',
    'zen-garden': 'Zen Garden',
    'sumi-e': 'Sumi-e',
    'bleed-bloom': 'Bleed & Bloom',
    'splatter': 'Splatter',
    'gradient-weaver': 'Gradient Weaver'
  };

  function renderGallery() {
    items = Inkwell.loadGallery();
    var grid = document.getElementById('gallery-grid');
    var empty = document.getElementById('gallery-empty');
    var countEl = document.getElementById('work-count');

    grid.innerHTML = '';

    if (items.length === 0) {
      empty.style.display = 'block';
      grid.style.display = 'none';
      countEl.textContent = '0 works';
      return;
    }

    empty.style.display = 'none';
    grid.style.display = 'grid';
    countEl.textContent = items.length + (items.length === 1 ? ' work' : ' works');

    items.forEach(function(item, idx) {
      var container = document.createElement('div');
      container.className = 'gallery-item ink-bleed-in';
      container.style.animationDelay = (idx * 0.06) + 's';

      var thumb = document.createElement('img');
      thumb.className = 'gallery-thumb';
      thumb.src = item.thumbnail || '';
      thumb.alt = (item.label || 'Untitled') + ' — ' + (toolNames[item.tool] || item.tool);
      thumb.loading = 'lazy';

      var info = document.createElement('div');
      info.className = 'gallery-item-info';

      var label = document.createElement('input');
      label.className = 'gallery-item-label';
      label.type = 'text';
      label.value = item.label || '';
      label.placeholder = 'Untitled';
      label.setAttribute('data-id', item.id);

      var toolLabel = document.createElement('div');
      toolLabel.className = 'gallery-item-tool';
      toolLabel.textContent = toolNames[item.tool] || item.tool;

      var actions = document.createElement('div');
      actions.className = 'gallery-item-actions';

      var remixBtn = document.createElement('button');
      remixBtn.className = 'ink-button';
      remixBtn.textContent = 'Remix';
      remixBtn.setAttribute('data-id', item.id);
      remixBtn.setAttribute('data-tool', item.tool);

      var deleteBtn = document.createElement('button');
      deleteBtn.className = 'ink-button ink-button-clear';
      deleteBtn.textContent = 'Delete';
      deleteBtn.setAttribute('data-id', item.id);

      actions.appendChild(remixBtn);
      actions.appendChild(deleteBtn);
      info.appendChild(label);
      info.appendChild(toolLabel);
      info.appendChild(actions);
      container.appendChild(thumb);
      container.appendChild(info);
      grid.appendChild(container);
    });

    bindGalleryEvents();
  }

  function bindGalleryEvents() {
    document.querySelectorAll('.gallery-item-label').forEach(function(input) {
      input.addEventListener('change', function() {
        var id = this.getAttribute('data-id');
        Inkwell.renameInGallery(id, this.value);
      });
    });

    document.querySelectorAll('.gallery-item-actions .ink-button:not(.ink-button-clear)').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var id = this.getAttribute('data-id');
        var tool = this.getAttribute('data-tool');
        var page = toolPages[tool];
        if (page) {
          window.location.href = page + '?remix=' + id;
        }
      });
    });

    document.querySelectorAll('.ink-button-clear[data-id]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var id = this.getAttribute('data-id');
        Inkwell.deleteFromGallery(id);
        Inkwell.showToast('Deleted from gallery');
        renderGallery();
      });
    });
  }

  function randomInspiration() {
    if (items.length === 0) {
      Inkwell.showToast('No works to inspire you yet');
      return;
    }
    var item = items[Math.floor(Math.random() * items.length)];
    var page = toolPages[item.tool];
    if (page) {
      window.location.href = page + '?remix=' + item.id;
    }
  }

  function clearAll() {
    var btn = document.getElementById('btn-clear-all');
    if (btn.getAttribute('data-confirm') === 'true') {
      try {
        localStorage.removeItem('inkwell_gallery');
      } catch (e) {}
      Inkwell.showToast('Atelier cleared');
      renderGallery();
      btn.setAttribute('data-confirm', 'false');
      btn.textContent = 'Clear Atelier';
    } else {
      btn.setAttribute('data-confirm', 'true');
      btn.textContent = 'Confirm Clear?';
      Inkwell.showToast('Click again to confirm');
      setTimeout(function() {
        btn.setAttribute('data-confirm', 'false');
        btn.textContent = 'Clear Atelier';
      }, 3000);
    }
  }

  GAL.init = function() {
    renderGallery();
    document.getElementById('btn-inspire').addEventListener('click', randomInspiration);
    document.getElementById('btn-clear-all').addEventListener('click', clearAll);
  };

  window.Inkwell.Gallery = GAL;
  document.addEventListener('DOMContentLoaded', function() {
    GAL.init();
  });

})();