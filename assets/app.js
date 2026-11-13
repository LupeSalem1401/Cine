(function () {
  'use strict';

  var STORAGE_TICKETS = 'cineastra_ticket_ids';

  function qs(sel, root) { return (root || document).querySelector(sel); }
  function qsa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function money(v) {
    var n = Number(v);
    if (!isFinite(n)) n = Number(typeof TICKET_PRICE !== 'undefined' ? TICKET_PRICE : 0) || 0;
    return '$' + n.toFixed(2);
  }
  function param(name) { return new URLSearchParams(location.search).get(name); }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function showConfigWarning() {
    var el = qs('[data-config-warning]');
    if (!el) return;
    if (typeof isSupabaseConfigured !== 'undefined' && isSupabaseConfigured) return;
    el.innerHTML =
      '<div class="empty-state" style="margin-bottom:18px;text-align:left">' +
      '<h3>Falta configurar Supabase</h3>' +
      '<p>Edita <code>simple/assets/config.js</code> y pega tu <strong>Project URL</strong> y <strong>anon key</strong> (Supabase → Project Settings → API). ' +
      'Nunca uses la clave <code>service_role</code> en el navegador. Luego abre esta carpeta con un servidor local (ej. <code>npx serve simple</code>).</p>' +
      '</div>';
  }

  function showError(target, message) {
    var el = typeof target === 'string' ? qs(target) : target;
    if (!el) return;
    el.innerHTML = '<div class="empty-state"><h3>Ocurrió un error</h3><p>' + esc(message) + '</p></div>';
  }

  function ensureDb() {
    if (typeof db !== 'undefined' && db) return db;
    throw new Error('Supabase no está configurado. Revisa simple/assets/config.js y recarga la página desde un servidor local.');
  }

  function ticketPrice() {
    return Number(typeof TICKET_PRICE !== 'undefined' ? TICKET_PRICE : 8.5) || 8.5;
  }

  function getStoredTicketIds() {
    try {
      var raw = JSON.parse(localStorage.getItem(STORAGE_TICKETS) || '[]');
      if (!Array.isArray(raw)) return [];
      return raw.map(function (x) { return Number(x); }).filter(function (x) { return !!x; });
    } catch (e) { return []; }
  }
  function rememberTicketIds(ids) {
    try {
      var set = {};
      getStoredTicketIds().concat(ids || []).forEach(function (id) { if (id) set[Number(id)] = 1; });
      localStorage.setItem(STORAGE_TICKETS, JSON.stringify(Object.keys(set).map(Number)));
    } catch (e) {}
  }

  var POSTERS = {
    'dune: parte dos': 'https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg',
    'oppenheimer': 'https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg',
    'the batman': 'https://image.tmdb.org/t/p/w500/74xTEgt7R36Fpooo50r9T25onhq.jpg',
    'spider-man: across the spider-verse': 'https://image.tmdb.org/t/p/w500/8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg',
    'interstellar': 'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
    'deadpool & wolverine': 'https://image.tmdb.org/t/p/w500/8cdWjvZQUExUUTzyp4t6EDMubfO.jpg'
  };

  function getPoster(titulo) {
    var key = String(titulo || '').trim().toLowerCase();
    if (POSTERS[key]) return POSTERS[key];
    for (var k in POSTERS) {
      if (key.indexOf(k) !== -1 || k.indexOf(key) !== -1) return POSTERS[k];
    }
    return '';
  }

  function posterMedia(titulo, large) {
    var url = getPoster(titulo);
    if (url) {
      return '<img src="' + esc(url) + '" alt="' + esc(titulo || 'Película') + '" loading="lazy" style="width:100%;height:100%;object-fit:cover;display:block">';
    }
    var initial = esc((titulo || 'C').charAt(0).toUpperCase());
    var size = large ? '72px' : '48px';
    return '<div style="display:grid;place-items:center;height:100%;min-height:' + (large ? '360px' : '180px') + ';background:#16161e;color:#6f6f7f;font-family:var(--font-display);font-size:' + size + '">' + initial + '</div>';
  }

  function cardHtml(m) {
    return '<a class="movie-card" href="pelicula.html?id=' + m.id + '">' +
      '<div class="movie-card__media">' + posterMedia(m.titulo) +
      '<div class="movie-card__shade ' + (getPoster(m.titulo) ? '' : 'movie-card__shade--soft') + '"></div>' +
      '<span class="badge badge--rating">' + esc(m.clasificacion || 'NR') + '</span>' +
      '<div class="movie-card__hover"><span class="movie-card__hover-icon">▶</span>Ver funciones</div></div>' +
      '<div class="movie-card__body"><div class="movie-card__title-row"><h3>' + esc(m.titulo || 'Película') + '</h3><span>↗</span></div>' +
      '<p class="movie-card__genres">' + esc(m.genero || 'Cine') + '</p>' +
      '<div class="movie-card__meta"><span>' + (m.duracion ? esc(m.duracion) + ' min' : '—') + '</span><span>' + esc(m.clasificacion || 'NR') + '</span></div>' +
      '<span class="movie-card__cta">Ver funciones</span></div></a>';
  }

  async function fetchPeliculas() {
    var client = ensureDb();
    var res = await client.from('pelicula').select('*').order('id', { ascending: true });
    if (res.error) throw res.error;
    return res.data || [];
  }

  async function renderCarteleraGrids() {
    var grids = ['[data-home-grid]', '[data-cartelera-grid]'].map(function (s) { return qs(s); }).filter(Boolean);
    if (!grids.length) return;
    try {
      var peliculas = await fetchPeliculas();
      var html = peliculas.length ? peliculas.map(cardHtml).join('') : '<div class="empty-state"><h3>No hay películas</h3><p>Inserta registros en la tabla <code>pelicula</code> desde Supabase.</p></div>';
      grids.forEach(function (g) { g.innerHTML = html; });
    } catch (e) {
      grids.forEach(function (g) { showError(g, e.message || e); });
    }
  }

  function renderProximos() {
    var g = qs('[data-proximos-grid]');
    if (!g) return;
    g.innerHTML = '<div class="empty-state"><h3>Sin próximos estrenos</h3><p>Tu esquema no incluye estado/fecha de estreno. Esta sección queda disponible si agregas esos campos.</p></div>';
  }

  async function renderPelicula() {
    var root = qs('[data-pelicula]');
    if (!root) return;
    var id = param('id');
    if (!id) { showError('[data-funciones]', 'Falta el parámetro id de la película.'); return; }
    try {
      var client = ensureDb();
      var pRes = await client.from('pelicula').select('*').eq('id', id).maybeSingle();
      if (pRes.error) throw pRes.error;
      var m = pRes.data;
      if (!m) { showError('[data-funciones]', 'Película no encontrada.'); return; }

      var t = qs('[data-title]', root); if (t) t.textContent = m.titulo || 'Película';
      var meta = qs('[data-meta]', root); if (meta) meta.textContent = (m.clasificacion || 'NR') + ' · ' + (m.duracion ? m.duracion + ' min' : '—') + ' · ' + (m.genero || 'Cine');
      var syn = qs('[data-synopsis]', root); if (syn) syn.textContent = 'Sin sinopsis (tu tabla pelicula no tiene este campo).';
      var posterBox = qs('[data-poster-box]', root);
      if (posterBox) {
        var pUrl = getPoster(m.titulo);
        if (pUrl) {
          posterBox.innerHTML = '<img src="' + esc(pUrl) + '" alt="' + esc(m.titulo || 'Película') + '" style="width:100%;height:100%;object-fit:cover;display:block;border-radius:16px">';
          posterBox.style.background = 'transparent';
        } else {
          posterBox.textContent = (m.titulo || 'C').charAt(0).toUpperCase();
        }
      }

      var fRes = await client.from('funcion')
        .select('*, sala(*)')
        .eq('pelicula_id', id)
        .order('fecha', { ascending: true })
        .order('hora', { ascending: true });
      if (fRes.error) throw fRes.error;
      var funciones = fRes.data || [];

      var today = new Date().toISOString().slice(0, 10);
      var upcoming = funciones.filter(function (f) { return String(f.fecha) >= today; });
      if (!upcoming.length) upcoming = funciones;

      var list = qs('[data-funciones]', root);
      if (!upcoming.length) {
        list.innerHTML = '<div class="empty-state"><h3>No hay funciones disponibles</h3><p>Inserta registros en la tabla <code>funcion</code> para esta película.</p></div>';
        return;
      }
      list.innerHTML = upcoming.map(function (f) {
        var sala = f.sala || {};
        var salaName = sala.numero != null ? ('Sala ' + sala.numero) : ('Sala ' + (f.sala_id || ''));
        var hora = String(f.hora || '').slice(0, 5);
        return '<a class="function-card" href="asientos.html?funcion=' + f.id + '">' +
          '<div class="function-card__time"><strong>' + esc(hora) + '</strong><span>' + esc(f.fecha) + '</span></div>' +
          '<div class="function-card__info"><h3>' + esc(salaName) + '</h3><p>Capacidad: ' + esc(sala.capacidad || '—') + '</p></div>' +
          '<div class="function-card__price"><span>Entrada</span><strong>' + money(ticketPrice()) + '</strong></div>' +
          '<span class="function-card__arrow">→</span></a>';
      }).join('');
    } catch (e) {
      showError('[data-funciones]', e.message || e);
    }
  }

  function rowLabel(i) { var n = i, l = ''; do { l = String.fromCharCode(65 + (n % 26)) + l; n = Math.floor(n / 26) - 1; } while (n >= 0); return l; }

  function seatLayout(capacidad) {
    var cap = Number(capacidad) || 0;
    if (cap <= 0) cap = 96;
    var cols = Math.min(14, Math.max(6, Math.ceil(Math.sqrt(cap))));
    var rows = Math.max(1, Math.ceil(cap / cols));
    return { rows: rows, cols: cols, cap: cap };
  }

  async function renderAsientos() {
    var root = qs('[data-asientos]');
    if (!root) return;
    var id = param('funcion');
    if (!id) { showError('[data-seat-map]', 'Falta el parámetro funcion.'); return; }
    try {
      var client = ensureDb();
      var fRes = await client.from('funcion')
        .select('*, pelicula(*), sala(*)')
        .eq('id', id)
        .maybeSingle();
      if (fRes.error) throw fRes.error;
      var fn = fRes.data;
      if (!fn) { showError('[data-seat-map]', 'Función no encontrada.'); return; }

      var movie = fn.pelicula || {};
      var sala = fn.sala || {};
      var salaName = sala.numero != null ? ('Sala ' + sala.numero) : ('Sala ' + (fn.sala_id || ''));
      var hora = String(fn.hora || '').slice(0, 5);
      var price = ticketPrice();

      var title = qs('[data-fn-title]', root); if (title) title.textContent = movie.titulo || 'Elegí tus asientos';
      var info = qs('[data-fn-info]', root); if (info) info.textContent = (fn.fecha || '') + ' · ' + hora + ' · ' + salaName;
      var priceEl = qs('[data-fn-price]', root); if (priceEl) priceEl.textContent = money(price);

      var tRes = await client.from('ticket').select('asiento').eq('funcion_id', id);
      if (tRes.error) throw tRes.error;
      var occupied = {};
      (tRes.data || []).forEach(function (t) { if (t.asiento) occupied[String(t.asiento)] = 1; });

      var layout = seatLayout(sala.capacidad);
      var selected = {};
      var map = qs('[data-seat-map]', root);
      var selOut = qs('[data-selected]', root);
      var cnt = qs('[data-count]', root);
      var tot = qs('[data-total]', root);
      var ok = qs('[data-confirm]', root);
      var err = qs('[data-seat-error]', root);
      var aisle = Math.ceil(layout.cols / 2);

      function upd() {
        var seats = Object.keys(selected).sort();
        if (selOut) selOut.textContent = seats.length ? seats.join(', ') : 'Ninguno';
        if (cnt) cnt.textContent = seats.length + ' / 10 seleccionados';
        if (tot) tot.textContent = money(seats.length * price);
        if (ok) ok.disabled = seats.length === 0;
      }

      if (map) {
        var h = '<div class="seat-map__screen-wrap"><div class="seat-map__screen"></div><span>Pantalla</span></div><div class="seat-map__scroll"><div class="seat-map__grid">';
        for (var r = 0; r < layout.rows; r++) {
          var label = rowLabel(r);
          h += '<div class="seat-row"><span class="seat-row__label">' + label + '</span>';
          for (var c = 1; c <= layout.cols; c++) {
            var seatNum = r * layout.cols + c;
            if (seatNum > layout.cap) {
              h += '<span class="seat-columns"><span class="seat seat--empty"></span>' + (c === aisle ? '<span class="seat-aisle"></span>' : '') + '</span>';
              continue;
            }
            var seat = label + c;
            var occ = occupied[seat];
            h += '<span class="seat-columns"><button type="button" class="seat ' + (occ ? 'is-occupied' : '') + '" data-seat="' + seat + '" ' + (occ ? 'disabled' : '') + ' aria-label="Asiento ' + seat + '"><span class="seat__shape"></span></button>' + (c === aisle ? '<span class="seat-aisle"></span>' : '') + '</span>';
          }
          h += '<span class="seat-row__label">' + label + '</span></div>';
        }
        h += '</div></div><div class="seat-legend"><span><i class="legend-dot legend-dot--available"></i> Disponible</span><span><i class="legend-dot legend-dot--selected"></i> Seleccionado</span><span><i class="legend-dot legend-dot--occupied"></i> Ocupado</span></div>';
        map.innerHTML = h;
        map.addEventListener('click', function (e) {
          var b = e.target.closest('[data-seat]');
          if (!b || b.disabled) return;
          var s = b.getAttribute('data-seat');
          if (selected[s]) { delete selected[s]; b.classList.remove('is-selected'); }
          else if (Object.keys(selected).length < 10) { selected[s] = 1; b.classList.add('is-selected'); }
          upd();
        });
      }

      if (ok) {
        ok.addEventListener('click', async function () {
          var seats = Object.keys(selected).sort();
          if (!seats.length) return;
          if (err) err.textContent = '';
          ok.disabled = true;
          ok.textContent = 'Procesando…';
          try {
            var rows = seats.map(function (s) { return { funcion_id: Number(fn.id), asiento: s, precio: price }; });
            var ins = await client.from('ticket').insert(rows).select('id');
            if (ins.error) throw ins.error;
            var ids = (ins.data || []).map(function (t) { return t.id; });
            rememberTicketIds(ids);
            location.href = 'mis-entradas.html?ok=1';
          } catch (e) {
            var msg = (e && e.message) || String(e);
            if (/uq_ticket_asiento_funcion|duplicate key/i.test(msg)) {
              msg = 'Uno de los asientos acaba de ocuparse. Recargamos el mapa.';
              setTimeout(function () { location.reload(); }, 1200);
            }
            if (err) err.textContent = msg;
            ok.textContent = 'Confirmar compra';
            upd();
          }
        });
      }
      upd();
    } catch (e) {
      showError('[data-seat-map]', e.message || e);
    }
  }

  async function renderEntradas() {
    var root = qs('[data-entradas]');
    if (!root) return;
    if (param('ok')) { var b = qs('[data-success]'); if (b) b.removeAttribute('hidden'); }
    var list = qs('[data-ticket-list]');
    if (!list) return;

    var ids = getStoredTicketIds();
    if (!ids.length) {
      list.innerHTML = '<div class="empty-state"><h3>Todavía no tenés entradas</h3><p>Cuando compres una entrada aparecerá acá (se buscan por IDs guardados en este navegador).</p><a class="btn btn--primary" href="cartelera.html" style="margin-top:12px">Ver cartelera</a></div>';
      return;
    }
    try {
      var client = ensureDb();
      var res = await client.from('ticket')
        .select('*, funcion(*, pelicula(*), sala(*))')
        .in('id', ids)
        .order('fecha_venta', { ascending: false });
      if (res.error) throw res.error;
      var tickets = res.data || [];
      if (!tickets.length) {
        list.innerHTML = '<div class="empty-state"><h3>No se encontraron entradas</h3><p>Puede que se hayan eliminado o que no tengas permisos de lectura sobre <code>ticket</code>.</p></div>';
        return;
      }
      list.innerHTML = tickets.map(function (t) {
        var fn = t.funcion || {};
        var movie = fn.pelicula || {};
        var sala = fn.sala || {};
        var salaName = sala.numero != null ? ('Sala ' + sala.numero) : 'Sala';
        var hora = String(fn.hora || '').slice(0, 5);
        return '<article class="order-card"><div class="order-card__head"><div class="order-card__movie"><span class="eyebrow">Entrada digital</span><h2>' + esc(movie.titulo || 'Película') + '</h2>' +
          '<div class="order-card__meta"><span>' + esc(fn.fecha || '—') + '</span><span>' + esc(hora) + '</span><span>' + esc(salaName) + '</span></div></div>' +
          '<div class="order-card__total"><span>Asiento</span><strong>' + esc(t.asiento) + '</strong><span class="status-badge">Confirmada</span></div></div>' +
          '<div class="order-card__footer"><span>Ticket #' + esc(t.id) + '</span><span>' + money(t.precio) + '</span><span>' + esc(String(t.fecha_venta || '').replace('T', ' ').slice(0, 16)) + '</span></div></article>';
      }).join('');
    } catch (e) {
      showError(list, e.message || e);
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    showConfigWarning();
    renderProximos();
    renderCarteleraGrids();
    renderPelicula();
    renderAsientos();
    renderEntradas();
  });
})();
