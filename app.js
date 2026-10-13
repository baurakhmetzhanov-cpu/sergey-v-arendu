(() => {
  'use strict';

  // Прейскурант: rate — ₸ в час, yield — ожидаемая прибыль арендатора на 1 ₸ аренды
  const SERVICES = [
    { id: 'bazaar',  name: 'Торг на базаре',            desc: 'Скидка от 30 % на всё, включая то, на что скидок не бывает.',            rate: 4000, yield: 3.2 },
    { id: 'budget',  name: 'Ревизия семейного бюджета', desc: 'Находит забытые подписки, лишние тарифы и деньги в зимней куртке.',      rate: 3000, yield: 4.1 },
    { id: 'deal',    name: 'Переговоры',                desc: 'Садится за стол, молчит десять секунд — цена уже другая.',               rate: 6000, yield: 5.0 },
    { id: 'debts',   name: 'Возврат долгов',            desc: 'Только вежливый взгляд. Должник сам вспоминает, сколько и кому.',        rate: 5000, yield: 3.6 },
    { id: 'toy',     name: 'Той в плюс',                desc: 'Рассадка, конверты, ресторан — и мероприятие окупается.',                rate: 7000, yield: 2.8 },
    { id: 'plan',    name: 'Бизнес-план на салфетке',   desc: 'Пять минут, одна салфетка, идея, которую потом не стыдно показать банку.', rate: 2500, yield: 6.0 },
    { id: 'car',     name: 'Продажа машины',            desc: 'Продаёт ваш автомобиль дороже, чем вы когда-то его купили.',             rate: 5500, yield: 3.0 },
    { id: 'cashback',name: 'Кэшбэк-стратегия',          desc: 'Раскладывает покупки по картам так, что банк начинает платить вам.',     rate: 1500, yield: 2.5 }
  ];

  // ---------- Анимации ----------
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Плавный счёт итоговой суммы в чеке
  const counting = new WeakMap();
  function countTo(el, to) {
    const from = counting.get(el) ?? 0;
    counting.set(el, to);
    if (still || from === to) { el.textContent = fmt(to); return; }
    const t0 = performance.now(), dur = 500;
    el.classList.remove('is-bump'); void el.offsetWidth; el.classList.add('is-bump');
    const step = t => {
      const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      if (counting.get(el) !== to) return;
      el.textContent = fmt(from + (to - from) * e);
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  // Монетки ₸ разлетаются из элемента
  function coins(el, count, spread) {
    if (still || !el) return;
    const r = el.getBoundingClientRect();
    for (let i = 0; i < count; i++) {
      const c = document.createElement('span');
      c.className = 'coin';
      c.textContent = '₸';
      c.setAttribute('aria-hidden', 'true');
      const a = -Math.PI / 2 + (Math.random() - .5) * Math.PI * 1.1;
      const d = spread * (.6 + Math.random() * .7);
      c.style.left = r.left + r.width / 2 + 'px';
      c.style.top = r.top + r.height / 2 + 'px';
      c.style.setProperty('--dx', Math.cos(a) * d + 'px');
      c.style.setProperty('--dy', Math.sin(a) * d + 'px');
      c.style.setProperty('--dur', (.7 + Math.random() * .5) + 's');
      document.body.appendChild(c);
      c.addEventListener('animationend', () => c.remove());
    }
  }

  const TARIFFS = { hour: 'Час', day: 'Сутки', toy: 'Той-сезон' };
  const fmt = n => Math.round(n).toLocaleString('ru-RU').replace(/,/g, ' ') + ' ₸';
  const $ = (s, root = document) => root.querySelector(s);

  // Меню на мобильных
  const toggle = $('.top__toggle');
  const nav = $('#nav');
  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!open));
    nav.classList.toggle('is-open', !open);
  });
  nav.addEventListener('click', e => {
    if (e.target.closest('a')) {
      toggle.setAttribute('aria-expanded', 'false');
      nav.classList.remove('is-open');
    }
  });

  // Статус в паспорте зависит от времени суток
  const h = new Date().getHours();
  const status = $('#status');
  if (h >= 23 || h < 8) { status.textContent = 'Спит, бронь на утро'; status.classList.add('is-busy'); }
  else if (h >= 13 && h < 14) { status.textContent = 'На обеде, скоро вернётся'; status.classList.add('is-busy'); }

  // Прейскурант
  $('#price-list').innerHTML = SERVICES.map(s => `
    <li class="price__item">
      <div class="price__name"><h3>${s.name}</h3><p>${s.desc}</p></div>
      <span class="price__dots" aria-hidden="true"></span>
      <span class="price__cost">${fmt(s.rate)}<small> / час</small></span>
    </li>`).join('');

  // Калькулятор
  const opts = $('#calc-options');
  opts.innerHTML = SERVICES.map((s, i) => `
    <label class="check">
      <input type="checkbox" value="${s.id}" ${i < 2 ? 'checked' : ''}>
      <span>${s.name}</span>
    </label>`).join('');

  const hours = $('#hours');
  const hoursOut = $('#hours-out');
  const plural = (n, one, few, many) => {
    const m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
    return many;
  };
  const hoursText = n => `${n} ${plural(n, 'час', 'часа', 'часов')}`;

  let lastNet = 0;
  function calc() {
    const n = +hours.value;
    const picked = [...opts.querySelectorAll('input:checked')].map(i => SERVICES.find(s => s.id === i.value));
    // скидка за длительную аренду: сутки и дольше — 25 %
    const discount = n >= 24 ? 0.75 : 1;
    const cost = picked.reduce((a, s) => a + s.rate * n, 0) * discount;
    const profit = picked.reduce((a, s) => a + s.rate * n * s.yield, 0);
    const net = profit - cost;
    lastNet = net;

    hoursOut.textContent = hoursText(n) + (discount < 1 ? ', скидка 25 %' : '');
    $('#cost').textContent = fmt(cost);
    $('#profit').textContent = fmt(profit);
    countTo($('#net'), net);

    let v;
    if (!picked.length) v = 'Отметьте хотя бы одну услугу.';
    else if (net < 100000) v = 'Неплохо для начала. Сергей советует взять подольше.';
    else if (net < 1000000) v = 'Окупается до обеда. Сергей уже потирает руки.';
    else v = 'Это уже не аренда, это инвестиция. Рекомендуем тариф «Той-сезон».';
    $('#verdict').textContent = v;
  }
  opts.addEventListener('change', e => {
    calc();
    if (e.target.checked) coins(e.target.closest('.check'), 5, 70);
  });
  hours.addEventListener('input', calc);
  calc();

  // Перенос расчёта в заявку
  $('#calc-to-order').addEventListener('click', e => {
    coins(e.currentTarget, 16, 160);
    if (lastNet > 0) $('#f-goal').value = Math.round(lastNet).toLocaleString('ru-RU').replace(/,/g, ' ');
    const n = +hours.value;
    $('#f-tariff').value = n >= 24 ? 'day' : 'hour';
  });

  // Заявка → договор
  const form = $('#order-form');
  const date = $('#f-date');
  const todayISO = new Date().toISOString().slice(0, 10);
  date.min = todayISO;
  date.value = todayISO;

  const goalInput = $('#f-goal');
  goalInput.addEventListener('input', () => {
    const digits = goalInput.value.replace(/\D/g, '').slice(0, 12);
    goalInput.value = digits ? (+digits).toLocaleString('ru-RU').replace(/,/g, ' ') : '';
  });

  function setError(input, show) {
    const err = $('#' + input.id + '-err');
    input.setAttribute('aria-invalid', String(show));
    if (show) input.setAttribute('aria-describedby', err.id); else input.removeAttribute('aria-describedby');
    err.hidden = !show;
    return show;
  }

  const humanDate = iso => new Date(iso + 'T12:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });

  form.addEventListener('submit', e => {
    e.preventDefault();
    const name = $('#f-name');
    const goal = goalInput.value.replace(/\D/g, '');
    const bad = [
      setError(name, !name.value.trim()) && name,
      setError(goalInput, !goal) && goalInput,
      setError(date, !date.value || date.value < todayISO) && date
    ].filter(Boolean);
    if (bad.length) { bad[0].focus(); return; }

    const c = $('#contract');
    const set = (k, v) => c.querySelectorAll(`[data-c="${k}"]`).forEach(el => { el.textContent = v; });
    const num = 'СК-' + new Date().getFullYear() + '/' + String(Math.floor(Math.random() * 9000) + 1000);
    set('num', num);
    set('today', humanDate(todayISO));
    set('name', name.value.trim());
    set('date', humanDate(date.value));
    set('tariff', TARIFFS[$('#f-tariff').value]);
    set('goal', fmt(+goal));
    set('task', $('#f-task').value.trim() || 'на усмотрение Объекта, он лучше знает.');
    set('food', $('#f-food').checked
      ? 'Арендатор обязуется кормить Объект согласно п. 1.2 Условий.'
      : 'Арендатор отказался кормить Объект. Стоимость аренды увеличивается вдвое.');
    set('sign', name.value.trim());

    // штамп в договоре — копия большого
    $('.stamp--small', c).innerHTML = $('.passport .stamp').innerHTML.replace('id="ring"', 'id="ring2"').replace('#ring"', '#ring2"');

    c.hidden = false;
    c.classList.remove('is-stamped');
    void c.offsetWidth;
    c.classList.add('is-stamped');
    c.focus({ preventScroll: true });
    setTimeout(() => coins($('.stamp--small', c), 14, 140), 1450);
    c.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  });

  $('#print').addEventListener('click', () => window.print());
  $('#copy').addEventListener('click', async () => {
    const c = $('#contract');
    const text = [...c.querySelectorAll('h3, header p, :scope > p')].map(el => el.textContent.replace(/\s+/g, ' ').trim()).join('\n\n');
    const msg = $('#copy-msg');
    try {
      await navigator.clipboard.writeText(text);
      msg.textContent = 'Текст договора скопирован';
    } catch {
      msg.textContent = 'Браузер не дал скопировать. Выделите текст вручную.';
    }
  });

  if (!still) {
    document.documentElement.classList.add('js-motion');

    // Буквы заголовка
    const title = $('.hero__title');
    let i = 0;
    title.innerHTML = title.innerHTML.split(/(<br>)/).map(part => part === '<br>' ? part
      : [...part].map(ch => `<span class="ch" aria-hidden="true" style="--i:${i++}">${ch}</span>`).join('')).join('');

    // Удар печати встряхивает паспорт
    const passport = $('.passport');
    $('.passport .stamp').addEventListener('animationend', () => {
      passport.classList.add('is-jolt');
      passport.addEventListener('animationend', () => passport.classList.remove('is-jolt'), { once: true });
    }, { once: true });

    // Паспорт наклоняется за курсором
    if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
      const hero = $('.hero');
      hero.addEventListener('pointermove', e => {
        const r = passport.getBoundingClientRect();
        const x = (e.clientX - (r.left + r.width / 2)) / innerWidth;
        const y = (e.clientY - (r.top + r.height / 2)) / innerHeight;
        passport.style.setProperty('--ry', (x * 14).toFixed(2) + 'deg');
        passport.style.setProperty('--rx', (-y * 10).toFixed(2) + 'deg');
      });
      hero.addEventListener('pointerleave', () => {
        passport.style.setProperty('--rx', '0deg');
        passport.style.setProperty('--ry', '0deg');
      });
    }

    // Бегущая строка: дублируем список для бесшовной петли
    const list = $('.ticker__list');
    const clone = list.cloneNode(true);
    clone.setAttribute('aria-hidden', 'true');
    list.after(clone);

    // Появление при прокрутке, с лесенкой внутри группы
    const targets = document.querySelectorAll('.section__head h2, .price__item, .clauses li, .review, .receipt');
    targets.forEach(el => {
      el.setAttribute('data-reveal', '');
      const sibs = [...el.parentElement.children].filter(n => n.matches('.price__item, .clauses li, .review'));
      const k = sibs.indexOf(el);
      if (k > 0) el.style.transitionDelay = (k % 8) * 70 + 'ms';
    });
    // обрезанные clip-path элементы наблюдатель не видит — следим за их родителем
    const watched = new Map();
    targets.forEach(el => {
      const trigger = el.matches('h2, .receipt') ? el.parentElement : el;
      watched.set(trigger, [...(watched.get(trigger) || []), el]);
    });
    const io = new IntersectionObserver(entries => entries.forEach(en => {
      if (!en.isIntersecting) return;
      watched.get(en.target).forEach(el => el.classList.add('is-in'));
      io.unobserve(en.target);
    }), { threshold: .15, rootMargin: '0px 0px -40px 0px' });
    watched.forEach((_, trigger) => io.observe(trigger));
  }

  $('#year').textContent = new Date().getFullYear();
})();
