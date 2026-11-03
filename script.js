/* ==========================================================================
   URATIBU NEWSROOM — INTERACTIVE CLIENT SCRIPT
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // Global State
  const state = {
    articles: typeof URATIBU_ARTICLES !== 'undefined' ? URATIBU_ARTICLES : [],
    currentCategory: 'ALL',
    searchQuery: '',
    viewMode: 'grid', // 'grid' | 'list'
    activeArticleSlug: null
  };

  // DOM Elements
  const featuredContainer = document.getElementById('featuredCardContainer');
  const articlesGrid = document.getElementById('articlesGrid');
  const articlesList = document.getElementById('articlesList');
  const emptyState = document.getElementById('emptyState');
  const categoryTabs = document.getElementById('categoryTabs');
  const searchInput = document.getElementById('searchInput');
  const btnGridView = document.getElementById('btnGridView');
  const btnListView = document.getElementById('btnListView');
  const btnResetFilters = document.getElementById('btnResetFilters');

  // Reader Modal Elements
  const readerOverlay = document.getElementById('readerOverlay');
  const readerContainer = document.getElementById('readerContainer');
  const readerArticleContent = document.getElementById('readerArticleContent');
  const readerProgressBar = document.getElementById('readerProgressBar');
  const btnCloseReader = document.getElementById('btnCloseReader');
  const btnCopyArticleLink = document.getElementById('btnCopyArticleLink');
  const btnShareTwitter = document.getElementById('btnShareTwitter');

  // Briefing Modal Elements
  const briefingModal = document.getElementById('briefingModal');
  const btnOpenBriefingNav = document.getElementById('btnOpenBriefingNav');
  const btnCloseBriefingModal = document.getElementById('btnCloseBriefingModal');
  const briefingForm = document.getElementById('briefingForm');

  // Newsletter & Toast
  const newsletterForm = document.getElementById('newsletterForm');
  const toastNotification = document.getElementById('toastNotification');
  const toastMessage = document.getElementById('toastMessage');

  // Mobile menu toggle
  const btnToggleMobileMenu = document.getElementById('btnToggleMobileMenu');

  // 1. Initialize Featured Spotlight
  function renderFeaturedSpotlight() {
    if (!featuredContainer || state.articles.length === 0) return;
    
    // Choose the featured article or the first article
    const featured = state.articles.find(a => a.featured) || state.articles[0];

    featuredContainer.innerHTML = `
      <div class="nr-featured-media">
        <img class="nr-featured-img" src="${featured.image}" alt="${featured.title}" loading="eager" />
        <div class="nr-featured-badge">
          <span>${featured.badge || 'Featured Deep Dive'}</span>
        </div>
        ${featured.keyMetric ? `
          <div class="nr-featured-metric-callout">
            <div>
              <div class="nr-callout-value">${featured.keyMetric}</div>
              <div class="nr-callout-label">${featured.metricLabel || 'Sovereign Intelligence Metric'}</div>
            </div>
            <div style="font-family: var(--ur-font-mono); font-size: 0.72rem; opacity: 0.8;">Verified Telemetry</div>
          </div>
        ` : ''}
      </div>

      <div class="nr-featured-body">
        <div class="nr-meta-row">
          <span class="nr-meta-cat">${featured.category}</span>
          <span class="nr-meta-dot">·</span>
          <time datetime="${featured.date_iso}">${featured.date_str}</time>
          <span class="nr-meta-dot">·</span>
          <span>${featured.readTime}</span>
        </div>

        <h2 class="nr-featured-title" data-slug="${featured.slug}">${featured.title}</h2>
        <p class="nr-featured-summary">${featured.summary}</p>

        <div class="nr-tag-list">
          ${featured.tags.map(t => `<span class="nr-tag">#${t}</span>`).join('')}
        </div>

        <div class="nr-featured-actions">
          <button type="button" class="ur-cta btn-open-reader" data-slug="${featured.slug}">
            <span>Read Intelligence Brief</span>
            <span aria-hidden="true">→</span>
          </button>
          <button type="button" class="ur-cta ur-cta--ghost btn-share-quick" data-slug="${featured.slug}" title="Copy Link">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
            </svg>
            <span>Share</span>
          </button>
        </div>
      </div>
    `;

    // Attach click events on featured card
    featuredContainer.querySelector('.nr-featured-title')?.addEventListener('click', () => {
      openArticleReader(featured.slug);
    });
    featuredContainer.querySelectorAll('.btn-open-reader').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        openArticleReader(featured.slug);
      });
    });
    featuredContainer.querySelectorAll('.btn-share-quick').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        copyToClipboard(window.location.origin + window.location.pathname + '#' + featured.slug);
        showToast('Link to brief copied to clipboard');
      });
    });
  }

  // 2. Filter & Search Logic
  function getFilteredArticles() {
    return state.articles.filter(article => {
      // Category Match
      const matchesCategory = (state.currentCategory === 'ALL') ||
        (article.category.toUpperCase() === state.currentCategory.toUpperCase());

      if (!matchesCategory) return false;

      // Search Query Match
      if (!state.searchQuery.trim()) return true;
      const query = state.searchQuery.toLowerCase();
      const inTitle = article.title.toLowerCase().includes(query);
      const inSummary = article.summary.toLowerCase().includes(query);
      const inTags = article.tags && article.tags.some(t => t.toLowerCase().includes(query));
      const inBody = article.body_html && article.body_html.toLowerCase().includes(query);

      return inTitle || inSummary || inTags || inBody;
    });
  }

  // 3. Render Articles (Grid & List)
  function renderArticles() {
    const filtered = getFilteredArticles();

    if (filtered.length === 0) {
      articlesGrid.style.display = 'none';
      articlesList.style.display = 'none';
      emptyState.style.display = 'block';
      return;
    }

    emptyState.style.display = 'none';

    if (state.viewMode === 'grid') {
      articlesGrid.style.display = 'grid';
      articlesList.style.display = 'none';
      renderGridView(filtered);
    } else {
      articlesGrid.style.display = 'none';
      articlesList.style.display = 'flex';
      renderListView(filtered);
    }
  }

  // Render Magazine Grid View
  function renderGridView(articles) {
    articlesGrid.innerHTML = articles.map(a => `
      <article class="nr-card" data-slug="${a.slug}">
        <div class="nr-card-media">
          <img class="nr-card-img" src="${a.image}" alt="${a.title}" loading="lazy" />
          <span class="nr-card-tag-pill">${a.badge || a.category}</span>
          <span class="nr-card-readtime">${a.readTime}</span>
          ${a.keyMetric ? `
            <div class="nr-card-metric-overlay">
              <span class="nr-card-metric-val">${a.keyMetric}</span>
              <span class="nr-card-metric-lbl">${a.metricLabel}</span>
            </div>
          ` : ''}
        </div>

        <div class="nr-card-body">
          <div class="nr-card-meta">
            <span class="nr-card-cat">${a.category}</span>
            <span>·</span>
            <time datetime="${a.date_iso}">${a.date_str}</time>
          </div>

          <h3 class="nr-card-title">${a.title}</h3>
          <p class="nr-card-summary">${a.summary}</p>

          <div class="nr-card-footer">
            <span>By ${a.author}</span>
            <span class="nr-card-cta">
              Read Brief <span aria-hidden="true">→</span>
            </span>
          </div>
        </div>
      </article>
    `).join('');

    // Attach card click handlers
    articlesGrid.querySelectorAll('.nr-card').forEach(card => {
      card.addEventListener('click', () => {
        const slug = card.getAttribute('data-slug');
        openArticleReader(slug);
      });
    });
  }

  // Render Executive Compact List View
  function renderListView(articles) {
    articlesList.innerHTML = articles.map(a => `
      <div class="nr-list-row" data-slug="${a.slug}">
        <div class="nr-list-thumb">
          <img src="${a.image}" alt="${a.title}" loading="lazy" />
        </div>

        <div class="nr-list-meta">
          <span class="nr-list-cat">${a.category}</span>
          <time datetime="${a.date_iso}">${a.date_str}</time>
          <span>${a.readTime}</span>
        </div>

        <div class="nr-list-content">
          <h4 class="nr-list-title">${a.title}</h4>
          <p class="nr-list-summary">${a.summary}</p>
        </div>

        <div class="nr-list-arrow" aria-hidden="true">→</div>
      </div>
    `).join('');

    articlesList.querySelectorAll('.nr-list-row').forEach(row => {
      row.addEventListener('click', () => {
        const slug = row.getAttribute('data-slug');
        openArticleReader(slug);
      });
    });
  }

  // 4. Update Tab Counters
  function updateCategoryTabCounts() {
    if (!categoryTabs) return;
    const buttons = categoryTabs.querySelectorAll('.nr-tab-btn');
    buttons.forEach(btn => {
      const cat = btn.getAttribute('data-category');
      let count = 0;
      if (cat === 'ALL') {
        count = state.articles.length;
      } else {
        count = state.articles.filter(a => a.category.toUpperCase() === cat.toUpperCase()).length;
      }
      const countSpan = btn.querySelector('.nr-tab-count');
      if (countSpan) countSpan.textContent = `(${count})`;
    });
  }

  // 5. Open Article Reader Drawer
  function openArticleReader(slug) {
    const article = state.articles.find(a => a.slug === slug);
    if (!article) return;

    state.activeArticleSlug = slug;

    // Build Reader Content
    readerArticleContent.innerHTML = `
      <img class="ur-reader-hero-img" src="${article.image}" alt="${article.title}" />
      ${article.imageCaption ? `<div class="ur-reader-caption">Photo & Analysis: ${article.imageCaption}</div>` : ''}

      <div class="ur-reader-content">
        <div class="ur-reader-meta">
          <span style="color: var(--ur-teal-dark); font-weight: 600;">${article.category}</span>
          <span>·</span>
          <time datetime="${article.date_iso}">${article.date_str}</time>
          <span>·</span>
          <span>${article.readTime}</span>
          <span>·</span>
          <span>${article.author}</span>
        </div>

        <h1 class="ur-reader-title">${article.title}</h1>

        <div class="ur-reader-executive-summary">
          <strong>Executive Takeaway:</strong> ${article.summary}
        </div>

        <div class="ur-reader-body-prose">
          ${article.body_html || `<p>${article.summary}</p>`}
        </div>

        <div style="margin-top: 3.5rem; padding-top: 2rem; border-top: 1px solid var(--ur-line); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
          <button type="button" class="ur-cta" id="btnRequestBriefingInReader">
            Schedule Strategic Briefing on this Topic
          </button>
          <button type="button" class="ur-cta ur-cta--ghost" id="btnShareArticleFooter">
            Share this Intelligence Brief
          </button>
        </div>
      </div>
    `;

    // Hook up internal reader buttons
    document.getElementById('btnRequestBriefingInReader')?.addEventListener('click', () => {
      closeArticleReader();
      openBriefingModal();
    });

    document.getElementById('btnShareArticleFooter')?.addEventListener('click', () => {
      copyToClipboard(window.location.origin + window.location.pathname + '#' + slug);
      showToast('Article link copied to clipboard');
    });

    // Reset scroll & progress bar
    readerContainer.scrollTop = 0;
    readerProgressBar.style.width = '0%';

    // Open Modal
    readerOverlay.classList.add('open');
    document.body.style.overflow = 'hidden';

    // Update URL hash
    window.history.replaceState(null, null, `#${slug}`);
  }

  // Close Article Reader
  function closeArticleReader() {
    readerOverlay.classList.remove('open');
    document.body.style.overflow = '';
    state.activeArticleSlug = null;
    window.history.replaceState(null, null, ' ');
  }

  // Reading progress tracker
  readerContainer?.addEventListener('scroll', () => {
    const scrollHeight = readerContainer.scrollHeight - readerContainer.clientHeight;
    if (scrollHeight > 0) {
      const progress = (readerContainer.scrollTop / scrollHeight) * 100;
      readerProgressBar.style.width = `${progress}%`;
    }
  });

  // 6. Briefing Modal Handlers
  function openBriefingModal() {
    briefingModal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeBriefingModal() {
    briefingModal.classList.remove('open');
    document.body.style.overflow = '';
  }

  btnOpenBriefingNav?.addEventListener('click', openBriefingModal);
  btnCloseBriefingModal?.addEventListener('click', closeBriefingModal);

  briefingModal?.addEventListener('click', (e) => {
    if (e.target === briefingModal) closeBriefingModal();
  });

  briefingForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('briefingName').value;
    closeBriefingModal();
    briefingForm.reset();
    showToast(`Thank you ${name}. Your briefing request has been forwarded to Uratibu's senior team.`);
  });

  // 7. Toast Notification Utility
  function showToast(msg) {
    if (!toastNotification || !toastMessage) return;
    toastMessage.textContent = msg;
    toastNotification.classList.add('show');
    setTimeout(() => {
      toastNotification.classList.remove('show');
    }, 4000);
  }

  function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text);
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
  }

  // 8. Event Listeners for Discovery Toolbar
  categoryTabs?.addEventListener('click', (e) => {
    const btn = e.target.closest('.nr-tab-btn');
    if (!btn) return;
    categoryTabs.querySelectorAll('.nr-tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.currentCategory = btn.getAttribute('data-category');
    renderArticles();
  });

  searchInput?.addEventListener('input', (e) => {
    state.searchQuery = e.target.value;
    renderArticles();
  });

  btnGridView?.addEventListener('click', () => {
    state.viewMode = 'grid';
    btnGridView.classList.add('active');
    btnListView.classList.remove('active');
    renderArticles();
  });

  btnListView?.addEventListener('click', () => {
    state.viewMode = 'list';
    btnListView.classList.add('active');
    btnGridView.classList.remove('active');
    renderArticles();
  });

  btnResetFilters?.addEventListener('click', () => {
    state.currentCategory = 'ALL';
    state.searchQuery = '';
    if (searchInput) searchInput.value = '';
    categoryTabs.querySelectorAll('.nr-tab-btn').forEach(b => {
      if (b.getAttribute('data-category') === 'ALL') b.classList.add('active');
      else b.classList.remove('active');
    });
    renderArticles();
  });

  // Reader Close Button & Overlay Click
  btnCloseReader?.addEventListener('click', closeArticleReader);
  readerOverlay?.addEventListener('click', (e) => {
    if (e.target === readerOverlay) closeArticleReader();
  });

  // Share buttons inside Reader
  btnCopyArticleLink?.addEventListener('click', () => {
    copyToClipboard(window.location.href);
    showToast('Link copied to clipboard');
  });

  btnShareTwitter?.addEventListener('click', () => {
    const article = state.articles.find(a => a.slug === state.activeArticleSlug);
    const text = encodeURIComponent(`"${article ? article.title : 'Uratibu Intelligence Brief'}" via @uratibuu`);
    const url = encodeURIComponent(window.location.href);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
  });

  // Newsletter Form
  newsletterForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('newsletterEmail').value;
    newsletterForm.reset();
    showToast(`Subscribed ${email} to Uratibu Sovereign Dispatches.`);
  });

  // Keyboard Navigation: ESC closes open modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (readerOverlay.classList.contains('open')) closeArticleReader();
      if (briefingModal.classList.contains('open')) closeBriefingModal();
    }
  });

  // Check URL hash for direct article link on load
  if (window.location.hash) {
    const slug = window.location.hash.replace('#', '');
    if (slug) {
      setTimeout(() => {
        openArticleReader(slug);
      }, 200);
    }
  }

  // Initial Render
  renderFeaturedSpotlight();
  updateCategoryTabCounts();
  renderArticles();
});
