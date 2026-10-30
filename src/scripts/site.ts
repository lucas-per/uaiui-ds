const root = document.documentElement;
const store = {
  get: (k: string) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* sem armazenamento */ } },
  del: (k: string) => { try { localStorage.removeItem(k); } catch { /* sem armazenamento */ } },
};

// Tema e densidade
const themeSel = document.querySelector<HTMLSelectElement>('[data-theme-select]');
const densSel = document.querySelector<HTMLSelectElement>('[data-density-select]');
if (themeSel) {
  themeSel.value = store.get('uai-theme') ?? 'system';
  themeSel.addEventListener('change', () => {
    if (themeSel.value === 'system') { delete root.dataset.theme; store.del('uai-theme'); }
    else { root.dataset.theme = themeSel.value; store.set('uai-theme', themeSel.value); }
  });
}
if (densSel) {
  const saved = store.get('uai-density');
  densSel.value = saved === 'standard' || saved === 'compact' ? saved : 'comfortable';
  densSel.addEventListener('change', () => {
    if (densSel.value === 'comfortable') { delete root.dataset.density; store.del('uai-density'); }
    else { root.dataset.density = densSel.value; store.set('uai-density', densSel.value); }
  });
}

// Menu lateral no mobile
const menuBtn = document.querySelector<HTMLButtonElement>('[data-menu]');
const sidebar = document.querySelector<HTMLElement>('[data-sidebar]');
menuBtn?.addEventListener('click', () => {
  const open = sidebar?.dataset.open !== 'true';
  if (sidebar) sidebar.dataset.open = String(open);
  menuBtn.setAttribute('aria-expanded', String(open));
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && sidebar?.dataset.open === 'true') { sidebar.dataset.open = 'false'; menuBtn?.setAttribute('aria-expanded', 'false'); menuBtn?.focus(); }
});

// Abas Preview / Código
document.querySelectorAll<HTMLElement>('[data-example]').forEach((ex) => {
  const tabs = [...ex.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
  const select = (t: HTMLButtonElement, focus = false) => {
    tabs.forEach((x) => {
      const on = x === t;
      x.setAttribute('aria-selected', String(on)); x.tabIndex = on ? 0 : -1;
      const panel = document.getElementById(x.getAttribute('aria-controls')!); if (panel) panel.hidden = !on;
    });
    if (focus) t.focus();
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => select(t));
    t.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); select(tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length], true); }
    });
  });
});

// Copiar código
document.addEventListener('click', async (e) => {
  const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-copy]');
  if (!btn) return;
  const text = btn.parentElement?.querySelector('pre')?.textContent ?? '';
  try { await navigator.clipboard.writeText(text); btn.textContent = 'Copiado'; } catch { btn.textContent = 'Erro ao copiar'; }
  setTimeout(() => (btn.textContent = 'Copiar'), 1600);
});

// Accordion: Enter/Espaço (nativo do button), aria-expanded e hidden
document.addEventListener('click', (e) => {
  const t = (e.target as HTMLElement).closest<HTMLButtonElement>('.uai-accordion-trigger');
  if (!t || t.getAttribute('aria-disabled') === 'true') return;
  const open = t.getAttribute('aria-expanded') !== 'true';
  t.setAttribute('aria-expanded', String(open));
  const panel = document.getElementById(t.getAttribute('aria-controls')!);
  if (panel) panel.hidden = !open;
});

// Toast: fechar (no demo, o aviso volta depois de 2 s)
document.addEventListener('click', (e) => {
  const b = (e.target as HTMLElement).closest<HTMLElement>('[data-toast-close]');
  const toast = b?.closest<HTMLElement>('.uai-toast');
  if (!toast) return;
  toast.hidden = true;
  setTimeout(() => (toast.hidden = false), 2000);
});

// Índice "Nesta página"
const toc = document.querySelector<HTMLElement>('[data-toc]');
const heads = [...document.querySelectorAll<HTMLElement>('.content h2[id]')];
if (toc && heads.length) {
  toc.hidden = false;
  toc.querySelector('ul')!.innerHTML = heads.map((h) => `<li><a href="#${h.id}">${h.textContent}</a></li>`).join('');
  const links = [...toc.querySelectorAll<HTMLAnchorElement>('a')];
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => { if (en.isIntersecting) links.forEach((l) => l.setAttribute('aria-current', String(l.hash === '#' + en.target.id))); });
  }, { rootMargin: '-80px 0px -70% 0px' });
  heads.forEach((h) => io.observe(h));
}

// Busca (Ctrl/⌘ + K)
const dlg = document.querySelector<HTMLDialogElement>('[data-search]');
if (dlg) {
  type Item = { title: string; href: string; description: string; group: string };
  const items: Item[] = JSON.parse(document.getElementById('search-index')!.textContent!);
  const input = dlg.querySelector('input')!;
  const list = dlg.querySelector('ul')!;
  let shown: Item[] = []; let sel = 0;
  const norm = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
  const render = () => {
    const q = norm(input.value.trim());
    shown = items.filter((i) => !q || norm(i.title + ' ' + i.description + ' ' + i.group).includes(q));
    sel = Math.min(sel, Math.max(shown.length - 1, 0));
    list.innerHTML = shown.length
      ? shown.map((i, n) => `<li role="option" id="r${n}" aria-selected="${n === sel}"><a href="${i.href}"><strong>${i.title}</strong><small>${i.group} · ${i.description}</small></a></li>`).join('')
      : '<li class="search-empty">Nada encontrado.</li>';
    input.setAttribute('aria-activedescendant', shown.length ? 'r' + sel : '');
  };
  const open = () => { dlg.showModal(); input.value = ''; sel = 0; render(); input.focus(); };
  document.querySelectorAll('[data-search-open]').forEach((b) => b.addEventListener('click', open));
  document.addEventListener('keydown', (e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); dlg.open ? dlg.close() : open(); } });
  input.addEventListener('input', () => { sel = 0; render(); });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(sel + 1, shown.length - 1); render(); }
    if (e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(sel - 1, 0); render(); }
    if (e.key === 'Enter' && shown[sel]) { e.preventDefault(); location.href = shown[sel].href; }
  });
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
}
