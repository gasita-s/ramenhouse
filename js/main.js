/* =========================================================
   Gasita's Ramen House — site scripts
   Sections: Nav toggle · Menu filter · Order summary ·
             Gallery slider · Reservation form validation
   ========================================================= */
document.addEventListener('DOMContentLoaded', function () {

  /* ---------- NAV TOGGLE (mobile) ---------- */
  var navToggle = document.querySelector('.navbar__toggle');
  var navLinks = document.querySelector('.navbar__links');
  if (navToggle && navLinks) {
    navToggle.addEventListener('click', function () {
      var open = navLinks.classList.toggle('is-open');
      navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    navLinks.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        navLinks.classList.remove('is-open');
        navToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* ---------- BACK TO TOP (footer) ---------- */
  var toTop = document.querySelector('.footer__totop');
  if (toTop) {
    toTop.addEventListener('click', function (e) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* =======================================================
     MENU FILTER  (All / Ramen / Sides / Drinks)
     ======================================================= */
  var filterBar = document.querySelector('.menu-filters');
  if (filterBar) {
    var filterButtons = filterBar.querySelectorAll('.filter-btn');
    var menuItems = document.querySelectorAll('.menu-item');

    filterButtons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        filterButtons.forEach(function (b) { b.classList.remove('is-active'); });
        btn.classList.add('is-active');
        var target = btn.getAttribute('data-filter');

        menuItems.forEach(function (item) {
          var cat = item.getAttribute('data-category');
          var show = (target === 'all' || target === cat);
          item.hidden = !show;
        });
      });
    });
  }

  /* =======================================================
     PRE-ORDER SUMMARY  (reservation page)
     Driven by checkboxes + qty inputs in .preorder-row.
     In-memory only — resets on reload/page change by design,
     since this build stores no data in the browser.
     ======================================================= */
  var orderList = document.querySelector('.order-summary__list');
  var preorderRows = document.querySelectorAll('.preorder-row');

  if (orderList && preorderRows.length) {
    var order = {}; // { id: { name, price, qty } }
    var emptyMsg = document.querySelector('.order-summary__empty');
    var subtotalEl = document.querySelector('[data-order="subtotal"]');
    var totalEl = document.querySelector('[data-order="total"]');
    var SERVICE_FEE = 20;

    var peso = function (n) { return '\u20B1' + n.toFixed(0); };

    function render() {
      var ids = Object.keys(order);
      orderList.innerHTML = '';

      if (emptyMsg) emptyMsg.style.display = ids.length === 0 ? 'block' : 'none';

      var subtotal = 0;

      ids.forEach(function (id) {
        var item = order[id];
        subtotal += item.price * item.qty;

        var line = document.createElement('div');
        line.className = 'order-line';
        line.innerHTML =
          '<div class="order-line__name">' + item.name +
          '<small>' + peso(item.price) + ' \u00d7 ' + item.qty + '</small></div>' +
          '<button type="button" class="order-line__remove" data-uncheck="' + id + '">Remove</button>';
        orderList.appendChild(line);
      });

      var total = ids.length ? subtotal + SERVICE_FEE : 0;
      if (subtotalEl) subtotalEl.textContent = peso(subtotal);
      if (totalEl) totalEl.textContent = peso(total);
    }

    function syncRow(row) {
      var checkbox = row.querySelector('input[type="checkbox"]');
      var qtyInput = row.querySelector('input[type="number"]');
      var id = checkbox.getAttribute('data-id');

      if (checkbox.checked) {
        qtyInput.disabled = false;
        var qty = parseInt(qtyInput.value, 10) || 1;
        order[id] = {
          name: checkbox.getAttribute('data-name'),
          price: parseFloat(checkbox.getAttribute('data-price')),
          qty: qty
        };
      } else {
        qtyInput.disabled = true;
        qtyInput.value = 1;
        delete order[id];
      }
      render();
    }

    preorderRows.forEach(function (row) {
      var checkbox = row.querySelector('input[type="checkbox"]');
      var qtyInput = row.querySelector('input[type="number"]');

      checkbox.addEventListener('change', function () { syncRow(row); });
      qtyInput.addEventListener('input', function () {
        var id = checkbox.getAttribute('data-id');
        if (order[id]) {
          var qty = parseInt(qtyInput.value, 10);
          if (!qty || qty < 1) qty = 1;
          if (qty > 10) qty = 10;
          qtyInput.value = qty;
          order[id].qty = qty;
          render();
        }
      });
    });

    // Remove from the summary list itself (unchecks the matching row)
    orderList.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-uncheck]');
      if (!btn) return;
      var id = btn.getAttribute('data-uncheck');
      var row = document.querySelector('.preorder-row input[data-id="' + id + '"]');
      if (row) {
        row.checked = false;
        syncRow(row.closest('.preorder-row'));
      }
    });

    var clearBtn = document.querySelector('[data-order="clear"]');
    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        preorderRows.forEach(function (row) {
          var checkbox = row.querySelector('input[type="checkbox"]');
          if (checkbox.checked) {
            checkbox.checked = false;
            syncRow(row);
          }
        });
      });
    }

    render();

    // Expose a getter so the reservation form can fold pre-order info
    // into its confirmation message.
    window.__gasitaOrder = function () { return order; };
  }

  /* =======================================================
     GALLERY SLIDER
     ======================================================= */
  var slider = document.querySelector('.slider');
  if (slider) {
    var track = slider.querySelector('.slider__track');
    var slides = slider.querySelectorAll('.slide');
    var prevBtn = slider.querySelector('.slider__arrow--prev');
    var nextBtn = slider.querySelector('.slider__arrow--next');
    var dotsWrap = document.querySelector('.slider__dots');
    var thumbs = document.querySelectorAll('.gallery-thumbs button');
    var index = 0;
    var total = slides.length;
    var autoTimer;

    // Build dots
    if (dotsWrap) {
      dotsWrap.innerHTML = '';
      for (var i = 0; i < total; i++) {
        var dot = document.createElement('button');
        dot.type = 'button';
        dot.setAttribute('aria-label', 'Go to slide ' + (i + 1));
        if (i === 0) dot.classList.add('is-active');
        dot.addEventListener('click', function (idx) {
          return function () { goTo(idx); };
        }(i));
        dotsWrap.appendChild(dot);
      }
    }

    function updateDots() {
      if (!dotsWrap) return;
      dotsWrap.querySelectorAll('button').forEach(function (d, i) {
        d.classList.toggle('is-active', i === index);
      });
    }
    function updateThumbs() {
      thumbs.forEach(function (t, i) {
        t.classList.toggle('is-active', i === index);
      });
    }

    function goTo(i) {
      index = (i + total) % total;
      track.style.transform = 'translateX(-' + (index * 100) + '%)';
      updateDots();
      updateThumbs();
    }

    if (prevBtn) prevBtn.addEventListener('click', function () { goTo(index - 1); resetAuto(); });
    if (nextBtn) nextBtn.addEventListener('click', function () { goTo(index + 1); resetAuto(); });

    thumbs.forEach(function (t, i) {
      t.addEventListener('click', function () { goTo(i); resetAuto(); });
    });

    // keyboard arrows
    slider.setAttribute('tabindex', '0');
    slider.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { goTo(index - 1); resetAuto(); }
      if (e.key === 'ArrowRight') { goTo(index + 1); resetAuto(); }
    });

    function startAuto() {
      autoTimer = setInterval(function () { goTo(index + 1); }, 5500);
    }
    function resetAuto() {
      clearInterval(autoTimer);
      startAuto();
    }
    startAuto();
    goTo(0);
  }

  /* =======================================================
     RESERVATION FORM VALIDATION
     ======================================================= */
  var resForm = document.querySelector('.res-form');
  if (resForm) {
    var confirmBox = document.querySelector('.confirm-box');

    // Operating hours: Mon–Fri 11:00 AM–10:00 PM, Sat–Sun 10:00 AM–11:00 PM
    var HOURS = {
      weekday: { min: '11:00', max: '22:00', label: '11:00 AM\u201310:00 PM (Mon\u2013Fri)' },
      weekend: { min: '10:00', max: '23:00', label: '10:00 AM\u201311:00 PM (Sat\u2013Sun)' }
    };

    function dayTypeFor(dateStr) {
      if (!dateStr) return null;
      var d = new Date(dateStr + 'T00:00:00');
      if (isNaN(d.getTime())) return null;
      var day = d.getDay(); // 0 = Sun, 6 = Sat
      return (day === 0 || day === 6) ? 'weekend' : 'weekday';
    }

    var validators = {
      name: function (v) {
        return v.trim().length >= 2 ? '' : 'Please enter your full name.';
      },
      email: function (v) {
        var re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(v.trim()) ? '' : 'Enter a valid email address.';
      },
      phone: function (v) {
        var re = /^[0-9+\-\s()]{7,15}$/;
        return re.test(v.trim()) ? '' : 'Enter a valid phone number.';
      },
      date: function (v) {
        if (!v) return 'Please choose a date.';
        var today = new Date();
        today.setHours(0, 0, 0, 0);
        var chosen = new Date(v);
        return chosen >= today ? '' : 'Date cannot be in the past.';
      },
      time: function (v) {
        if (!v) return 'Please choose a time.';
        var dateVal = resForm.elements['date'].value;
        var type = dayTypeFor(dateVal) || 'weekday';
        var range = HOURS[type];
        if (v < range.min || v > range.max) {
          return 'We\u2019re open ' + range.label + '. Please pick a time in that window.';
        }
        return '';
      },
      guests: function (v) {
        var n = parseInt(v, 10);
        return (n >= 1 && n <= 20) ? '' : 'Guests must be between 1 and 20.';
      }
    };

    function showError(field, message) {
      var wrap = field.closest('.field');
      if (!wrap) return;
      var msg = wrap.querySelector('.error-msg');
      if (message) {
        wrap.classList.add('has-error');
        if (msg) msg.textContent = message;
      } else {
        wrap.classList.remove('has-error');
        if (msg) msg.textContent = '';
      }
    }

    function validateField(field) {
      var rule = validators[field.name];
      if (!rule) return true;
      var message = rule(field.value);
      showError(field, message);
      return message === '';
    }

    Object.keys(validators).forEach(function (name) {
      var field = resForm.elements[name];
      if (!field) return;
      field.addEventListener('blur', function () { validateField(field); });
      field.addEventListener('input', function () {
        // Time is picked via a discrete widget, not typed freeform text,
        // so flag it immediately rather than waiting for blur/re-error.
        if (name === 'time' || field.closest('.field').classList.contains('has-error')) {
          validateField(field);
        }
      });
    });

    // The valid time window depends on which date is picked, so re-check
    // (and re-label) time whenever date changes, not just on its own blur.
    var dateField = resForm.elements['date'];
    var timeField = resForm.elements['time'];
    var timeHint = document.querySelector('[data-time-hint]');

    function timeToMinutes(hhmm) {
      var parts = hhmm.split(':');
      return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
    }
    function minutesToHHMM(min) {
      var h = Math.floor(min / 60), m = min % 60;
      return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
    }
    function formatLabel(hhmm) {
      var parts = hhmm.split(':');
      var h = parseInt(parts[0], 10), m = parts[1];
      var ampm = h >= 12 ? 'PM' : 'AM';
      var h12 = h % 12;
      if (h12 === 0) h12 = 12;
      return h12 + ':' + m + ' ' + ampm;
    }

    function populateTimeOptions() {
      if (!timeField) return;
      var type = dayTypeFor(dateField.value) || 'weekday';
      var range = HOURS[type];
      var startMin = timeToMinutes(range.min);
      var endMin = timeToMinutes(range.max);
      var previousValue = timeField.value;

      timeField.innerHTML = '';
      var placeholder = document.createElement('option');
      placeholder.value = '';
      placeholder.textContent = 'Select a time';
      timeField.appendChild(placeholder);

      for (var m = startMin; m <= endMin; m += 30) {
        var hhmm = minutesToHHMM(m);
        var opt = document.createElement('option');
        opt.value = hhmm;
        opt.textContent = formatLabel(hhmm);
        timeField.appendChild(opt);
      }

      var stillValid = previousValue !== '' && Array.prototype.some.call(timeField.options, function (o) {
        return o.value === previousValue;
      });
      timeField.value = stillValid ? previousValue : '';
    }

    function refreshTimeHint() {
      if (!timeHint) return;
      var type = dayTypeFor(dateField.value) || 'weekday';
      timeHint.textContent = 'Open ' + HOURS[type].label + '.';
    }

    if (dateField && timeField) {
      dateField.addEventListener('change', function () {
        populateTimeOptions();
        refreshTimeHint();
        validateField(timeField);
      });
      timeField.addEventListener('change', function () { validateField(timeField); });
    }
    populateTimeOptions();
    refreshTimeHint();

    resForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var allValid = true;

      Object.keys(validators).forEach(function (name) {
        var field = resForm.elements[name];
        if (!field) return;
        if (!validateField(field)) allValid = false;
      });

      if (!allValid) {
        var firstError = resForm.querySelector('.has-error input, .has-error select, .has-error textarea');
        if (firstError) firstError.focus();
        if (confirmBox) confirmBox.classList.remove('is-visible');
        return;
      }

      var nameVal = resForm.elements['name'].value.trim();
      var dateVal = resForm.elements['date'].value;
      var timeVal = resForm.elements['time'].value;
      var timeLabel = timeVal ? formatLabel(timeVal) : timeVal;
      var guestsVal = resForm.elements['guests'].value;

      var message = 'Thank you, ' + nameVal + '! Your table for ' + guestsVal +
        ' on ' + dateVal + ' at ' + timeLabel + ' has been requested.';

      if (typeof window.__gasitaOrder === 'function') {
        var order = window.__gasitaOrder();
        var ids = Object.keys(order);
        if (ids.length) {
          var items = ids.map(function (id) {
            return order[id].name + ' \u00d7' + order[id].qty;
          }).join(', ');
          message += ' Pre-order noted: ' + items + '.';
        }
      }

      message += ' We\u2019ll confirm shortly by email or phone.';

      if (confirmBox) {
        confirmBox.textContent = message;
        confirmBox.classList.add('is-visible');
        confirmBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      resForm.reset();

      // Reset pre-order checkboxes/quantities after a successful submit
      preorderRows.forEach(function (row) {
        var checkbox = row.querySelector('input[type="checkbox"]');
        if (checkbox && checkbox.checked) {
          checkbox.checked = false;
          syncRow(row);
        }
      });
    });
  }

});
