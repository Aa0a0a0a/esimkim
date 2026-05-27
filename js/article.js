function esc(s = '') { return String(s).replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m])); }
function cacheUrl(url = '') { if (!url || url.indexOf('data:') === 0) return url; return `${url}${url.indexOf('?') === -1 ? '?' : '&'}t=${Date.now()}`; }

function showPageNotice(message) {
  let el = document.getElementById('page-notice');
  if (!el) {
    el = document.createElement('div');
    el.id = 'page-notice';
    el.className = 'page-notice';
    document.body.appendChild(el);
  }
  el.textContent = message;
}

async function boot() {
  await loadSettings();
  try {
    const article = await API.getArticle();
    document.title = article.title;
    document.getElementById('title').textContent = article.title;
    document.getElementById('meta').innerHTML = `<span>${esc(article.author || 'admin')}</span><span>${esc(article.country || '全球')}</span><span>${esc(article.carrier || '')}</span><span>${(article.created_at || '').slice(0, 10)}</span>`;
    document.getElementById('content').innerHTML = marked.parse(article.content || '');
    document.getElementById('source').innerHTML = article.source_url ? `数据来源：第三方 · <a href="${esc(article.source_url)}" target="_blank" rel="noopener noreferrer">点击查看原文</a>` : '数据来源：本站原创 - 转载请注明出处';
  } catch (e) {
    document.title = '文章不存在';
    document.getElementById('title').textContent = '文章不存在';
    document.getElementById('meta').innerHTML = '';
    document.getElementById('content').innerHTML = '<p>页面不存在，2 秒后返回首页。</p>';
    document.getElementById('source').innerHTML = '';
    showPageNotice('文章不存在，2 秒后返回首页');
    setTimeout(() => { location.href = '/'; }, 2000);
    return;
  }
  await loadAds('footer', document.getElementById('article-ad'));
}

async function loadSettings() {
  try {
    const settings = await API.getSettings();
    if (settings.site_title) document.querySelectorAll('.site-name').forEach(el => el.textContent = settings.site_title);
    document.getElementById('footer-text').textContent = settings.footer_text || '';
    if (settings.site_logo || settings.site_icon) setIcon(settings.site_logo || settings.site_icon);
    window.carouselInterval = Math.max(1500, parseInt(settings.carousel_interval || '5000', 10));
  } catch (e) {}
}

function setIcon(src) {
  const logoImg = document.getElementById('logo-img');
  if (logoImg) { logoImg.src = cacheUrl(src); logoImg.style.display = 'block'; document.getElementById('logo-fallback').style.display = 'none'; }
  let link = document.querySelector('link[rel="icon"]') || document.createElement('link');
  link.rel = 'icon';
  link.href = cacheUrl(src);
  document.head.appendChild(link);
}

async function loadAds(position, mount) {
  try { renderCarousel(mount, await API.getAds(position)); } catch (e) { mount.classList.remove('show'); }
}

function renderCarousel(mount, ads) {
  if (!ads || !ads.length) { mount.classList.remove('show'); return; }
  mount.classList.add('show');
  const slides = ads.map(ad => `<div class="ad-slide"><div class="ad-page single"><a class="ad-card" href="${esc(ad.link || '#')}" target="_blank" rel="noopener noreferrer">${ad.type === 'image' ? `<img src="${esc(cacheUrl(ad.content))}" alt="广告">` : `<span class="ad-text">${esc(ad.content)}</span>`}</a></div></div>`).join('');
  mount.innerHTML = `<div class="ad-slider"><div class="ad-track">${slides}</div>${ads.length > 1 ? '<button class="ad-arrow ad-prev" type="button">‹</button><button class="ad-arrow ad-next" type="button">›</button>' : ''}</div>`;
  if (ads.length > 1) bindCarousel(mount);
}

function bindCarousel(mount) {
  const track = mount.querySelector('.ad-track');
  const slides = [...mount.querySelectorAll('.ad-slide')];
  let index = 0, startX = 0, dragging = false, timer;
  const go = next => { index = (next + slides.length) % slides.length; track.style.transform = `translateX(${-index * 100}%)`; restart(); };
  const restart = () => { clearInterval(timer); timer = setInterval(() => go(index + 1), window.carouselInterval || 5000); };
  mount.querySelector('.ad-prev').onclick = () => go(index - 1);
  mount.querySelector('.ad-next').onclick = () => go(index + 1);
  mount.addEventListener('pointerdown', e => { dragging = true; startX = e.clientX; clearInterval(timer); });
  mount.addEventListener('pointerup', e => { if (!dragging) return; dragging = false; const dx = e.clientX - startX; if (Math.abs(dx) > 35) go(index + (dx < 0 ? 1 : -1)); else restart(); });
  mount.addEventListener('mouseenter', () => clearInterval(timer));
  mount.addEventListener('mouseleave', restart);
  restart();
}
boot();
