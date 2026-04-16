/* ============================================
   AQUARELLE — Core JavaScript
   Navigation, Scroll Reveal, Modal, Page Transitions
   ============================================ */

(function () {
  'use strict';

  /* --- Story Data (for Gallery modals) --- */
  var stories = [
    {
      title: "The River's Memory",
      wash: 'radial-gradient(ellipse at 30% 40%, rgba(106,154,176,0.3) 0%, rgba(106,154,176,0.08) 50%, transparent 80%)',
      text: '<p>The river does not forget. Beneath its surface, in the silt and the stones, every touch is recorded — the press of a deer\'s hoof, the weight of a fallen branch, the gentle sweep of a child\'s hand trailing through the current on a summer afternoon.</p><p>Maren walked the riverbank each morning, cataloguing what the water remembered. She carried a notebook with pages that curled at the edges from the humidity, and she wrote in ink that bled when the mist rolled in, turning her careful letters into watercolor approximations of themselves.</p><p>\"The river remembers everything,\" she wrote, \"but it tells nothing in order. The memories surface like bubbles — a flash of silver, a glint of sunlight on something buried — and then dissolve back into the current, waiting to surface again in a different place, a different time.\"</p><p>She learned to read the river the way one reads a palimpsest: not for the surface story, but for the traces of all the stories that had been written over, washed away, and written again.</p>'
    },
    {
      title: 'Autumn in Kyoto',
      wash: 'radial-gradient(ellipse at 60% 30%, rgba(194,139,154,0.3) 0%, rgba(194,139,154,0.08) 50%, transparent 80%)',
      text: '<p>In Kyoto, autumn arrives not as a season but as a performance. The maples rehearse for weeks — green deepening to rust, rust brightening to vermillion — before the final act: the letting go.</p><p>Sayuri sat on the engawa of the temple, watching the leaves perform their ancient ritual. Each leaf fell differently. Some spiraled, some drifted, some dropped with the finality of a period at the end of a sentence. Each one, she thought, was a small masterpiece of impermanence.</p><p>\"Mono no aware,\" her grandmother had called it — the pathos of things, the gentle sadness that accompanies the awareness that beauty is fleeting. But Sayuri had never found it sad. The sadness was in permanence, in things that refused to change. The beauty was in the falling.</p><p>She painted the leaves in watercolor, letting the pigment bleed across the wet paper the way the colors bled from the trees into the autumn sky. Each painting was an acceptance: this too will pass, and in passing, it will be beautiful.</p>'
    },
    {
      title: "The Botanist's Dream",
      wash: 'radial-gradient(ellipse at 40% 50%, rgba(148,178,140,0.3) 0%, rgba(148,178,140,0.08) 50%, transparent 80%)',
      text: '<p>Dr. Elara Voss fell asleep in the herbarium on a Tuesday and woke in a garden that should not have existed. The specimens had come alive — not as they were in life, but as they were in her imagination, amplified and transformed.</p><p>The ferns were cathedral-sized, their fronds filtering light into green-gold cathedral rays. The mosses had grown into soft hills that hummed when she walked across them. The lichens painted the stones in colors she had never catalogued — a blue that was almost purple, a yellow that was almost alive.</p><p>\"This is the garden between waking and sleep,\" said a voice. It belonged to no one she could see, but it belonged to every plant she had ever studied, named, pressed, and mounted on herbarium sheets. \"Here, the specimens remember what it was like to grow.\"</p><p>She walked deeper into the garden, and with each step, she forgot a Latin name and remembered a color, forgot a classification and remembered a scent. By the time she reached the center, she had forgotten everything she knew and remembered everything she felt.</p>'
    },
    {
      title: 'Midnight Bloom',
      wash: 'radial-gradient(ellipse at 35% 35%, rgba(154,130,178,0.3) 0%, rgba(154,130,178,0.08) 50%, transparent 80%)',
      text: '<p>The flowers opened at midnight. Not all at once — that would be too simple, too obvious. They opened one by one, each petal unfurling with the deliberateness of a secret being told for the first time.</p><p>Lina watched from the greenhouse doorway, her breath fogging in the cold night air. She had planted these seeds three years ago, brought them back from a market in Marrakech where an old woman had whispered that they only bloom in darkness, only for those who wait.</p><p>As each flower opened, it released not perfume but memory. The scent of her grandmother\'s kitchen. The sound of rain on a tin roof in a country she\'d left behind. The specific quality of afternoon light in a room where someone she loved used to sit.</p><p>By dawn, the flowers had closed again, and the memories had settled back into the soil. But Lina carried them with her now, pressed into her palms like ink stains that wouldn\'t wash away.</p>'
    },
    {
      title: 'Desert Mirage',
      wash: 'radial-gradient(ellipse at 50% 40%, rgba(218,190,130,0.3) 0%, rgba(218,190,130,0.08) 50%, transparent 80%)',
      text: '<p>The desert tells stories through mirages. Not lies — the desert does not lie — but visions of things that exist elsewhere, in other times, carried on waves of superheated air that bend reality like light through water.</p><p>Yusuf had walked the Sahara for forty years, and he had learned to read the mirages the way a sailor reads the sea. A shimmer of blue on the horizon meant water — not here, but three days east. A wavering silhouette of buildings meant a settlement — not ahead, but behind, reflected and projected by the heat.</p><p>But some mirages were different. Some showed things that had never existed in any physical place: a garden of glass flowers, a river of liquid silver, a city built entirely from music. These, Yusuf believed, were the desert\'s own dreams — the stories it told itself during the long hours when no one was watching.</p><p>He painted them in watercolor, these impossible visions, using pigments mixed with sand and distilled from the mirages themselves. Each painting was a window into the desert\'s imagination, and each one faded within a year, as if the mirages refused to be pinned down.</p>'
    },
    {
      title: 'The Last Lighthouse',
      wash: 'radial-gradient(ellipse at 45% 45%, rgba(130,140,154,0.3) 0%, rgba(130,140,154,0.08) 50%, transparent 80%)',
      text: '<p>On the last night, the fog came in like a tide. Not from the sea — the fog always came from the sea — but this time it came from the land, rolling down the cliffs in silence, swallowing the path that led away from the lighthouse.</p><p>Elias lit the lamp as he had every night for forty-seven years. The mechanism still worked, the Fresnel lens still turned, the beam still swept across the water in its patient, unhurried arc. But tonight, the beam seemed to dissolve into the fog before it reached the horizon, as if the light itself were being erased.</p><p>\"It\'s time,\" said the fog, or perhaps the sea, or perhaps the lighthouse itself. Elias wasn\'t sure which. He only knew that the words were true, and that they came not as a command but as an acknowledgment — the way you acknowledge the last page of a book you\'ve been reading for a very long time.</p><p>He sat in the watch room and watched the beam dissolve, stroke by stroke, into the white world outside. And when the last sliver of light was gone, he closed his eyes and listened to the fog, which sounded, he realized, exactly like the silence between waves.</p>'
    }
  ];

  /* --- Navigation: Mobile Toggle --- */
  var navToggle = document.querySelector('.nav__toggle');
  var navLinks = document.querySelector('.nav__links');

  if (navToggle && navLinks) {
    navToggle.addEventListener('click', function () {
      var isOpen = navLinks.classList.toggle('nav__links--open');
      navToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });

    // Close mobile nav when a link is tapped
    navLinks.querySelectorAll('.nav__link').forEach(function (link) {
      link.addEventListener('click', function () {
        navLinks.classList.remove('nav__links--open');
        navToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* --- Page Transitions --- */
  var internalPages = ['index.html', 'gallery.html', 'canvas.html'];
  var transitionTimeout = null;

  document.querySelectorAll('a[href]').forEach(function (link) {
    var href = link.getAttribute('href');
    if (!href || internalPages.indexOf(href) === -1) return;

    link.addEventListener('click', function (e) {
      e.preventDefault();
      if (transitionTimeout) clearTimeout(transitionTimeout);

      document.body.classList.add('page-exit');

      transitionTimeout = setTimeout(function () {
        window.location.href = href;
      }, 400);
    });
  });

  /* --- Scroll Reveal (IntersectionObserver) --- */
  var revealElements = document.querySelectorAll('.reveal');

  if ('IntersectionObserver' in window && revealElements.length > 0) {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('reveal--active');
          revealObserver.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.12,
      rootMargin: '0px 0px -40px 0px'
    });

    revealElements.forEach(function (el) {
      revealObserver.observe(el);
    });
  } else {
    // Fallback: show everything immediately
    revealElements.forEach(function (el) {
      el.classList.add('reveal--active');
    });
  }

  /* --- Modal (Gallery Page) --- */
  var modalOverlay = document.getElementById('modal-overlay');

  if (modalOverlay) {
    var modalClose = document.getElementById('modal-close');
    var modalTitle = document.getElementById('modal-title');
    var modalText = document.getElementById('modal-text');
    var modalWash = document.getElementById('modal-wash');

    function openModal(storyIndex) {
      var story = stories[storyIndex];
      if (!story) return;

      modalTitle.textContent = story.title;
      modalText.innerHTML = story.text;
      modalWash.style.background = story.wash;
      modalOverlay.classList.add('modal-overlay--active');
      modalOverlay.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      modalClose.focus();
    }

    function closeModal() {
      modalOverlay.classList.remove('modal-overlay--active');
      modalOverlay.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }

    // Open on card click
    document.querySelectorAll('.card[data-story]').forEach(function (card) {
      card.addEventListener('click', function () {
        var index = parseInt(this.getAttribute('data-story'), 10);
        openModal(index);
      });

      card.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          var index = parseInt(this.getAttribute('data-story'), 10);
          openModal(index);
        }
      });

      card.setAttribute('tabindex', '0');
      card.setAttribute('role', 'button');
    });

    // Close handlers
    if (modalClose) {
      modalClose.addEventListener('click', closeModal);
    }

    modalOverlay.addEventListener('click', function (e) {
      if (e.target === modalOverlay) closeModal();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && modalOverlay.classList.contains('modal-overlay--active')) {
        closeModal();
      }
    });
  }

})();
