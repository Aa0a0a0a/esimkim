let currentCountry = '';
const list = document.getElementById('articles');
function esc(s = '') { return String(s).replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m])); }
function cacheUrl(url = '') { if (!url || url.indexOf('data:') === 0) return url; return `${url}${url.indexOf('?') === -1 ? '?' : '&'}t=${Date.now()}`; }

async function boot() {
  try {
    const settings = await API.getSettings();
    if (settings.site_title) document.title = settings.site_title;
    document.getElementById('site-title').textContent = settings.site_title || '';
    if (settings.site_description) {
      const desc = document.getElementById('site-desc');
      desc.textContent = settings.site_description;
      desc.classList.add('show');
    }
    document.getElementById('footer-text').textContent = settings.footer_text || '';
    if (settings.site_logo || settings.site_icon) setIcon(settings.site_logo || settings.site_icon);
    setHeaderButton(settings.header_button_text, settings.header_button_url);
    window.carouselInterval = Math.max(1500, parseInt(settings.carousel_interval || '5000', 10));
  } catch (e) {}
  await loadCountries();
  await loadAds('header', document.getElementById('home-ad'));
  await loadArticles();
}

function setIcon(src) {
  const logoImg = document.getElementById('logo-img');
  logoImg.src = cacheUrl(src);
  logoImg.style.display = 'block';
  document.getElementById('logo-fallback').style.display = 'none';
  const link = document.getElementById('favicon') || document.createElement('link');
  link.rel = 'icon';
  link.href = cacheUrl(src);
  document.head.appendChild(link);
}

function setHeaderButton(text, url) {
  const btn = document.getElementById('header-btn');
  if (!btn) return;
  if (text && url) {
    btn.textContent = text;
    btn.href = url;
    btn.style.display = 'inline-flex';
  } else {
    btn.style.display = 'none';
  }
}

async function loadCountries() {
  const box = document.getElementById('countries');
  try {
    const countries = await API.getCountries();
    if (!countries.length) { box.style.display = 'none'; return; }
    box.innerHTML = ['全部', ...countries].map((c, i) => `<button class="country-btn ${i === 0 ? 'active' : ''}" data-country="${i === 0 ? '' : esc(c)}">${esc(c)}</button>`).join('');
    box.addEventListener('click', e => {
      const btn = e.target.closest('.country-btn');
      if (!btn) return;
      currentCountry = btn.dataset.country || '';
      document.querySelectorAll('.country-btn').forEach(x => x.classList.remove('active'));
      btn.classList.add('active');
      loadArticles();
    });
  } catch (e) { box.style.display = 'none'; }
}

async function loadAds(position, mount) {
  try {
    const ads = await API.getAds(position);
    renderCarousel(mount, ads);
  } catch (e) { mount.classList.remove('show'); }
}

function renderCarousel(mount, ads) {
  if (!ads || !ads.length) { mount.classList.remove('show'); return; }
  mount.classList.add('show');
  const perPage = matchMedia('(min-width: 768px)').matches ? 2 : 1;
  const pages = [];
  for (let i = 0; i < ads.length; i += perPage) pages.push(ads.slice(i, i + perPage));
  const slides = pages.map(page => `<div class="ad-slide"><div class="ad-page">${page.map(ad => `<a class="ad-card" href="${esc(ad.link || '#')}" target="_blank" rel="noopener noreferrer">${ad.type === 'image' ? `<img src="${esc(cacheUrl(ad.content))}" alt="广告">` : `<span class="ad-text">${esc(ad.content)}</span>`}</a>`).join('')}</div></div>`).join('');
  mount.innerHTML = `<div class="ad-slider"><div class="ad-track">${slides}</div>${pages.length > 1 ? '<button class="ad-arrow ad-prev" type="button">‹</button><button class="ad-arrow ad-next" type="button">›</button>' : ''}</div>`;
  if (pages.length <= 1) return;
  bindCarousel(mount);
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

async function loadArticles() {
  try {
    const data = await API.getArticles(1, currentCountry);
    document.getElementById('empty').style.display = data.total ? 'none' : 'block';
    list.innerHTML = data.items.map(item => `<a class="article-card" href="${item.url || ('/' + encodeURIComponent(item.carrier_slug) + '/')}" ><div class="cover">${item.logo ? `<img src="${esc(cacheUrl(item.logo))}" alt="">` : 'eSIM'}</div><div class="article-body"><h3>${esc(item.title)}</h3><p class="summary">${esc(item.summary || '查看完整 eSIM 使用教程和配置说明。')}</p><div class="card-bottom"><div class="card-left"><span>${esc(item.country || '全球')}</span><span>-</span><span>${esc(item.carrier || '运营商')}</span></div><div class="card-right"><span>${(item.created_at || '').slice(0, 10)}</span></div></div></div></a>`).join('');
  } catch (e) {
    document.getElementById('empty').textContent = e.message;
    document.getElementById('empty').style.display = 'block';
  }
}
boot();
