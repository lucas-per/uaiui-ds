// Comportamento do shell da documentação do UaiUI (porte de src/scripts/site.ts
// do uaiui-ds, sem tema, menu lateral em gaveta e demos de componentes, que
// entram com as páginas da PR B).

const root = document.querySelector<HTMLElement>('.uaiui-docs');

const store = {
  get: (key: string) => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set: (key: string, value: string) => {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* sem armazenamento: a escolha vale só nesta página */
    }
  },
  remove: (key: string) => {
    try {
      localStorage.removeItem(key);
    } catch {
      /* sem armazenamento */
    }
  },
};

/** Mensagem para leitor de tela (role="status" do layout). */
function announce(message: string) {
  const live = document.getElementById('uaiui-docs-live');
  if (!live) return;
  live.textContent = '';
  window.setTimeout(() => (live.textContent = message), 50);
}

if (root) {
  // Densidade: sem atributo é Confortável (comfortable). Cada exemplo tem o seu grupo de rádios (name
  // próprio); a escolha vale para a página toda, então o script marca a mesma
  // opção em todos os grupos. O script inline do layout já aplicou a escolha salva.
  const densityInputs = [...root.querySelectorAll<HTMLInputElement>('input[type="radio"][name$="-densidade"]')];
  densityInputs.forEach((input) => {
    input.addEventListener('change', () => {
      if (!input.checked) return;
      if (input.value === 'comfortable') {
        root.removeAttribute('data-uaiui-density');
        store.remove('uaiui-density');
      } else {
        root.setAttribute('data-uaiui-density', input.value);
        store.set('uaiui-density', input.value);
      }
      for (const other of densityInputs) other.checked = other.value === input.value;
      announce(`Densidade da página: ${input.closest('label')?.textContent?.trim() ?? input.value}.`);
    });
  });

  // "Páginas" (celular): disclosure que abre a lista do menu lateral no lugar.
  // A lista fica com `hidden` quando fechada; do tablet em diante o CSS a mostra sempre.
  const pagesToggle = root.querySelector<HTMLButtonElement>('[data-pages-toggle]');
  const pagesList = pagesToggle && document.getElementById(pagesToggle.getAttribute('aria-controls')!);
  if (pagesToggle && pagesList) {
    const narrow = window.matchMedia('(max-width: 767px)');
    const setOpen = (open: boolean) => {
      pagesToggle.setAttribute('aria-expanded', String(open));
      pagesList.hidden = narrow.matches && !open;
    };
    pagesToggle.addEventListener('click', () => setOpen(pagesToggle.getAttribute('aria-expanded') !== 'true'));
    pagesList.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape' || !narrow.matches) return;
      event.preventDefault();
      setOpen(false);
      pagesToggle.focus();
    });
    narrow.addEventListener('change', () => setOpen(false));
    setOpen(false);
  }

  // Abas Preview / Código: setas, Home e End movem e ativam; o foco acompanha.
  root.querySelectorAll<HTMLElement>('[data-example]').forEach((example) => {
    const tabs = [...example.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
    const select = (tab: HTMLButtonElement, focus = false) => {
      for (const other of tabs) {
        const on = other === tab;
        other.setAttribute('aria-selected', String(on));
        other.tabIndex = on ? 0 : -1;
        const panel = document.getElementById(other.getAttribute('aria-controls')!);
        if (panel) panel.hidden = !on;
      }
      if (focus) tab.focus();
    };
    tabs.forEach((tab, index) => {
      tab.addEventListener('click', () => select(tab));
      tab.addEventListener('keydown', (event) => {
        const last = tabs.length - 1;
        const target = { ArrowRight: index === last ? 0 : index + 1, ArrowLeft: index === 0 ? last : index - 1, Home: 0, End: last }[event.key];
        if (target === undefined) return;
        event.preventDefault();
        select(tabs[target], true);
      });
    });
  });

  // Accordion: Enter e Espaço são do <button>; aqui só aria-expanded e hidden. aria-disabled não abre.
  root.addEventListener('click', (event) => {
    const trigger = (event.target as HTMLElement).closest<HTMLButtonElement>('.uai-accordion-trigger');
    if (!trigger || trigger.getAttribute('aria-disabled') === 'true') return;
    const open = trigger.getAttribute('aria-expanded') !== 'true';
    trigger.setAttribute('aria-expanded', String(open));
    const panel = document.getElementById(trigger.getAttribute('aria-controls')!);
    if (panel) panel.hidden = !open;
  });

  // Toast. O preview segue o padrão que a página ensina: a região viva já está na
  // página e o aviso entra nela (o anúncio vem da região; o toast não tem role).
  // Fechar (botão ou Esc) tira o aviso e devolve o foco ao botão que o abriu. Nada
  // é posicionado sobre o conteúdo e o foco nunca fica preso.
  const closeToast = (toast: HTMLElement) => {
    const region = toast.closest<HTMLElement>('[aria-live], [role="alert"]');
    if (region) {
      const demo = region.closest<HTMLElement>('.uaiui-docs__stage');
      toast.remove();
      demo?.querySelector<HTMLButtonElement>('[data-toast-show]')?.focus();
      return;
    }
    // Toast estático dos exemplos de tons: some e volta depois de 2 s, como no site de docs do DS.
    const stage = toast.closest<HTMLElement>('.uaiui-docs__stage');
    if (stage) {
      stage.tabIndex = -1;
      stage.focus({ preventScroll: true });
    }
    toast.hidden = true;
    window.setTimeout(() => {
      toast.hidden = false;
    }, 2000);
  };

  root.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    const show = target.closest<HTMLButtonElement>('[data-toast-show]');
    if (show) {
      const stage = show.closest<HTMLElement>('.uaiui-docs__stage');
      const region = stage?.querySelector<HTMLElement>('[aria-live]');
      const template = stage?.querySelector<HTMLTemplateElement>('template[data-toast-template]');
      if (!region || !template) return;
      region.replaceChildren(template.content.cloneNode(true));
      return;
    }
    const toast = target.closest<HTMLElement>('.uai-toast');
    if (!toast) return;
    // O botão de fechar e a ação do preview (Desfazer) tiram o aviso.
    if (target.closest('[data-toast-close]') || (toast.closest('[aria-live]') && target.closest('.uai-toast__content .uai-button'))) {
      closeToast(toast);
    }
  });

  root.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || event.defaultPrevented) return;
    const toast = (event.target as HTMLElement).closest<HTMLElement>('.uai-toast');
    if (!toast) return;
    event.preventDefault();
    closeToast(toast);
  });

  // Copiar código
  root.addEventListener('click', async (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-copy]');
    if (!button) return;
    const label = button.getAttribute('aria-label') ?? '';
    const text = button.closest('.uaiui-docs__code')?.querySelector('pre')?.textContent ?? '';
    try {
      await navigator.clipboard.writeText(text);
      button.textContent = 'Copiado';
      button.setAttribute('aria-label', 'Código copiado');
      announce('Código copiado.');
    } catch {
      button.textContent = 'Erro';
      button.setAttribute('aria-label', 'Erro ao copiar');
      announce('Não foi possível copiar o código.');
    }
    window.setTimeout(() => {
      button.textContent = 'Copiar';
      button.setAttribute('aria-label', label);
    }, 1600);
  });

  // Busca (Ctrl/⌘ + K)
  const dialog = root.querySelector<HTMLDialogElement>('[data-search]');
  if (dialog) {
    type Item = { title: string; href: string; description: string; group: string };
    const items: Item[] = JSON.parse(document.getElementById('uaiui-docs-search-index')!.textContent!);
    const input = dialog.querySelector('input')!;
    const list = dialog.querySelector('ul')!;
    const status = document.getElementById('uaiui-docs-search-status')!;
    let shown: Item[] = [];
    let selected = 0;
    const normalize = (text: string) => text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
    const escape = (text: string) =>
      text.replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[char]!);

    const render = () => {
      const query = normalize(input.value.trim());
      shown = items.filter((item) => !query || normalize(`${item.title} ${item.description} ${item.group}`).includes(query));
      selected = Math.min(selected, Math.max(shown.length - 1, 0));
      list.innerHTML = shown.length
        ? shown
            .map(
              (item, index) =>
                `<li role="option" id="uaiui-docs-r${index}" aria-selected="${index === selected}"><a href="${escape(item.href)}" tabindex="-1"><strong>${escape(item.title)}</strong><small>${escape(item.group)} · ${escape(item.description)}</small></a></li>`,
            )
            .join('')
        : '<li class="uaiui-docs__search-empty" role="presentation">Nada encontrado.</li>';
      if (shown.length) input.setAttribute('aria-activedescendant', `uaiui-docs-r${selected}`);
      else input.removeAttribute('aria-activedescendant');
      const message = shown.length === 1 ? '1 resultado.' : shown.length ? `${shown.length} resultados.` : 'Nada encontrado.';
      if (status.textContent !== message) status.textContent = message;
    };

    // Quem abriu a busca recebe o foco de volta ao fechar (pelo atalho, sem botão, o foco sai do campo).
    let opener: HTMLElement | null = null;
    dialog.addEventListener('close', () => {
      if (opener && opener !== document.body && opener.isConnected) opener.focus();
      else if (dialog.contains(document.activeElement)) (document.activeElement as HTMLElement).blur();
      opener = null;
    });

    const open = () => {
      opener = document.activeElement as HTMLElement | null;
      dialog.showModal();
      input.value = '';
      selected = 0;
      render();
      input.focus();
    };

    root.querySelectorAll('[data-search-open]').forEach((button) => button.addEventListener('click', open));
    document.addEventListener('keydown', (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        if (dialog.open) dialog.close();
        else open();
      }
    });
    input.addEventListener('input', () => {
      selected = 0;
      render();
    });
    input.addEventListener('keydown', (event) => {
      // No <input type="search">, o primeiro Esc só limpa o campo; aqui ele fecha a busca de uma vez.
      if (event.key === 'Escape') {
        event.preventDefault();
        dialog.close();
        return;
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        selected = Math.min(selected + 1, shown.length - 1);
        render();
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        selected = Math.max(selected - 1, 0);
        render();
      }
      if (event.key === 'Enter' && shown[selected]) {
        event.preventDefault();
        window.location.href = shown[selected].href;
      }
    });
    // Clique fora do diálogo (no fundo) fecha.
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) dialog.close();
    });
  }
}
