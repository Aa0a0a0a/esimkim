const API = {
  cacheUrl(url) {
    const joiner = url.indexOf('?') === -1 ? '?' : '&';
    return `${url}${joiner}t=${Date.now()}`;
  },
  async request(url) {
    const res = await fetch(this.cacheUrl(url), { cache: 'no-store' });
    if (!res.ok) throw new Error(`接口返回异常：HTTP ${res.status} ${url}`);
    return res.json();
  },
  getSettings() { return this.request('/site.json'); },
  async getArticles(page = 1, country = '') {
    const items = await this.request('/operators.json');
    const filtered = country ? items.filter(item => item.country === country) : items;
    return { items: filtered, total: filtered.length, page, limit: 24 };
  },
  async getCountries() {
    const items = await this.request('/operators.json');
    return Array.from(new Set(items.map(item => item.country).filter(Boolean))).sort();
  },
  getArticle() { return this.request('article.json'); },
  async getAds(position) {
    const settings = await this.request('/site.json');
    return settings.ads && settings.ads[position] ? settings.ads[position] : [];
  }
};
